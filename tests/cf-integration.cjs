const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{spawn}=require('child_process'),{DatabaseSync}=require('node:sqlite');
(async()=>{const root=path.resolve(__dirname,'..');const {default:worker}=await import(require('url').pathToFileURL(path.join(root,'.cf-build/index.js')));const db=new DatabaseSync(':memory:');for(const f of ['0001_init.sql','0003_rate_limits.sql','0004_password_reset_tokens.sql','0005_webhooks.sql'])db.exec(fs.readFileSync(path.join(root,'worker/migrations',f),'utf8'));
const env={JWT_SECRET:require('crypto').randomBytes(32).toString('hex'),RESEND_API_KEY:'test-resend-key',RESET_EMAIL_FROM:'PopupLoom <reset@popuploom.com>',PUBLIC_ORIGIN:'https://popuploom.com',ALLOW_INSECURE_WEBHOOKS:'true',DB:{prepare(sql){return {bind(...args){return {first:async()=>db.prepare(sql).get(...args),run:async()=>{const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes,last_row_id:r.lastInsertRowid}};},all:async()=>({results:db.prepare(sql).all(...args)})};}};}},ASSETS:{fetch:async r=>{const file=path.join(root,'.cf-build/public',new URL(r.url).pathname);return fs.existsSync(file)&&fs.statSync(file).isFile()?new Response(fs.readFileSync(file),{headers:{'Content-Type':file.endsWith('.html')?'text/html':'application/octet-stream'}}):new Response('',{status:404});}}};
for(const flag of [undefined,'false','true']){
 const enabled=flag==='true';
 for(const path of ['/','/studio.html?tpl=cafeClub','/index.html?ref=1']){
  const url='https://popforge.shailu3597.workers.dev'+path;
  const response=await worker.fetch(new Request(url),{...env,DOMAIN_CUTOVER_ENABLED:flag},{waitUntil(){}});
  const index=path.startsWith('/index.html');
  assert.equal(response.status,enabled||index?308:200);
  assert.equal(response.headers.get('Location'),enabled?'https://popuploom.com'+(index?'/?ref=1':path):index?'https://popforge.shailu3597.workers.dev/?ref=1':null);
 }
}
console.log('PASS Worker legacy cutover disabled by default and explicitly enabled');
{
 const plainEnv={...env,DOMAIN_CUTOVER_ENABLED:'true'},plainHeaders={'cf-visitor':JSON.stringify({scheme:'http'})};
 const cases=[
  ['https://popuploom.com/studio.html?tpl=cafeClub','https://popuploom.com/studio.html?tpl=cafeClub'],
  ['https://popuploom.com/index.html?ref=1','https://popuploom.com/?ref=1'],
  ['https://www.popuploom.com/studio.html?x=1','https://popuploom.com/studio.html?x=1'],
  ['https://www.popuploom.com/api/health','https://www.popuploom.com/api/health'],
  ['https://www.popuploom.com/popforge.js','https://www.popuploom.com/popforge.js'],
  ['https://popforge.shailu3597.workers.dev/templates.html?ref=1','https://popuploom.com/templates.html?ref=1'],
  ['https://popforge.shailu3597.workers.dev/migration.html','https://popforge.shailu3597.workers.dev/migration.html'],
  ['https://popforge.shailu3597.workers.dev/popforge.js','https://popforge.shailu3597.workers.dev/popforge.js']
 ];
 for(const [url,location] of cases){const response=await worker.fetch(new Request(url,{headers:plainHeaders}),plainEnv,{waitUntil(){}});assert.equal(response.status,308,url);assert.equal(response.headers.get('Location'),location,url);}
 const local=await worker.fetch(new Request('http://localhost:3000/studio.html',{headers:plainHeaders}),env,{waitUntil(){}});
 assert.equal(local.status,200);assert.equal(local.headers.get('Location'),null);
 console.log('PASS plaintext production hosts upgrade to HTTPS in one hop, localhost untouched');
}
{
 const home=await worker.fetch(new Request('https://popuploom.com/'),env,{waitUntil(){}});
 const csp=home.headers.get('Content-Security-Policy')||'';
 assert.ok(csp.includes('https://static.cloudflareinsights.com'));
 assert.ok(csp.includes('https://cloudflareinsights.com'));
 const missing=await worker.fetch(new Request('https://popuploom.com/no-such-page-9182'),env,{waitUntil(){}});
 assert.equal(missing.status,404);
 assert.ok((missing.headers.get('Content-Security-Policy')||'').includes("frame-ancestors 'none'"));
 assert.match(missing.headers.get('X-Robots-Tag')||'',/noindex/);
 console.log('PASS CSP permits the Cloudflare Web Analytics beacon and 404s stay hardened');
}
let cancelled=false;const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(65536));},cancel(){cancelled=true;}});const oversized=await worker.fetch(new Request('https://test/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:stream,duplex:'half'}),env,{waitUntil(){}});assert.equal(oversized.status,413);assert.equal(cancelled,true);console.log('PASS streamed bodies stop at limit');
{
 // Provider failures must not change the response or leak the token. Stub the
 // outbound fetch only for the Resend endpoint; the Worker bridge does not use it.
 const email='cf-reset-'+Date.now()+'@example.com';
 let created=await worker.fetch(new Request('https://popuploom.com/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'original-password-123'})}),env,{waitUntil(){}});
 assert.equal(created.status,201);
 let providerCalls=0;const realFetch=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{if(String(url).includes('api.resend.com')){providerCalls++;throw new Error('provider down');}return realFetch(url,init);};
 try{
  const waited=[];
  const response=await worker.fetch(new Request('https://popuploom.com/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})}),env,{waitUntil(p){waited.push(p);}});
  const text=await response.text();const body=JSON.parse(text);
  assert.equal(response.status,200);assert.equal(body.ok,true);
  assert.ok(!text.includes('provider'));assert.ok(!text.includes('token'));
  await Promise.allSettled(waited);
  assert.equal(providerCalls,1,'the Worker attempted exactly one provider request');
  const row=db.prepare('SELECT token_hash, used_at FROM password_reset_tokens WHERE email = ?').get(email);
  assert.ok(row);assert.match(row.token_hash,/^[a-f0-9]{64}$/);assert.equal(row.used_at,null);
 }finally{globalThis.fetch=realFetch;}
 console.log('PASS Worker reset provider failures stay generic and store only a hash');
}

{
  console.log('== lead webhooks ==');
  const crypto = require('crypto');
  const wenv = { ...env, ALLOW_INSECURE_WEBHOOKS: 'true' };
  const call = async (method, pathname, { token, body } = {}) => {
    const headers = {};
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await worker.fetch(new Request('https://popuploom.com' + pathname, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body)
    }), wenv, { waitUntil() {} });
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: response.status, data };
  };
  const received = [];
  const receiver = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString('utf8');
    received.push({ headers: req.headers, body });
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  });
  await new Promise(resolve => receiver.listen(0, '127.0.0.1', resolve));
  try {
    const account = await call('POST', '/api/auth/register', { body: { email: 'webhook.' + Date.now() + '@example.com', password: 'webhook-password-123' } });
    assert.equal(account.status, 201);
    const widget = await call('POST', '/api/widgets', { token: account.data.token, body: { name: 'Webhook test', config: { content: { title: 'Hello' } } } });
    assert.equal(widget.status, 201);
    const base = '/api/widgets/' + widget.data.id + '/webhook';
    const saved = await call('PUT', base, { token: account.data.token, body: { url: 'http://127.0.0.1:' + receiver.address().port + '/hook', enabled: true } });
    assert.equal(saved.status, 200);
    assert.match(saved.data.webhook.secret, /^[a-f0-9]{64}$/);

    const pending = [];
    const submit = async (data, requestId) => {
      const response = await worker.fetch(new Request('https://popuploom.com/api/widgets/' + widget.data.id + '/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, requestId })
      }), wenv, { waitUntil(promise) { pending.push(promise); } });
      assert.equal(response.status, 201);
      await Promise.all(pending.splice(0));
    };
    const firstRequest = 'req-' + Date.now();
    await submit({ email: 'lead@example.com', note: 'first' }, firstRequest);
    assert.equal(received.length, 1, 'one delivery for a stored lead');
    const event = JSON.parse(received[0].body);
    assert.equal(event.event, 'lead.created');
    assert.equal(event.popup.id, widget.data.id);
    assert.equal(event.lead.data.email, 'lead@example.com');
    assert.equal(event.test, false);
    const signature = received[0].headers['x-popuploom-signature'];
    assert.ok(signature && signature.startsWith('t='));
    const parts = Object.fromEntries(signature.split(',').map(part => part.split('=')));
    const expected = crypto.createHmac('sha256', saved.data.webhook.secret).update(parts.t + '.' + received[0].body).digest('hex');
    assert.equal(parts.v1, expected, 'HMAC signature covers timestamp and body');

    await submit({ email: 'lead@example.com', note: 'first' }, firstRequest);
    assert.equal(received.length, 1, 'duplicate request IDs do not deliver twice');

    const deliveries = await call('GET', base + '/deliveries', { token: account.data.token });
    assert.equal(deliveries.status, 200);
    assert.equal(deliveries.data.length, 1);
    assert.equal(deliveries.data[0].status, 'success');
    assert.equal(deliveries.data[0].attempts, 1);
    assert.equal(deliveries.data[0].responseStatus, 200);
    assert.equal(deliveries.data[0].submissionId, event.lead.id);

    const tested = await call('POST', base + '/test', { token: account.data.token });
    assert.equal(tested.status, 200);
    assert.equal(tested.data.ok, true);
    assert.equal(received.length, 2);
    assert.equal(JSON.parse(received[1].body).test, true);

    await call('PUT', base, { token: account.data.token, body: { url: 'http://127.0.0.1:' + receiver.address().port + '/hook', enabled: false } });
    await submit({ email: 'disabled@example.com' }, 'req-' + (Date.now() + 1));
    assert.equal(received.length, 2, 'disabled endpoints receive nothing');

    const other = await call('POST', '/api/auth/register', { body: { email: 'webhook-other.' + Date.now() + '@example.com', password: 'webhook-password-123' } });
    const denied = await call('GET', base, { token: other.data.token });
    assert.equal(denied.status, 404, 'webhook settings stay private to the owner');
    const invalid = await call('PUT', base, { token: account.data.token, body: { url: 'https://10.0.0.1/hook' } });
    assert.equal(invalid.status, 400, 'private addresses are rejected');
    console.log('PASS server-side lead webhooks sign, retry, log and stay private');
  } finally {
    await new Promise(resolve => receiver.close(resolve));
  }
}

const server=http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body}:{} )});const response=await worker.fetch(request,env,{waitUntil:p=>p.catch(()=>{})});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.writeHead(500);res.end(String(e));}});await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const child=spawn(process.execPath,['tests/worker-test.js'],{cwd:root,env:{...process.env,BASE:'http://127.0.0.1:'+server.address().port},stdio:'inherit',windowsHide:true});const code=await new Promise(r=>child.once('exit',r));assert.equal(code,0);}finally{await new Promise(r=>server.close(r));db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
