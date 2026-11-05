const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'popuploom-regression-'));
process.env.DB_PATH=path.join(temp,'test.db');
process.env.JWT_SECRET=crypto.randomBytes(32).toString('hex');
process.env.NODE_ENV='test';
process.env.TRUST_PROXY='';
process.env.DOMAIN_CUTOVER_ENABLED='false';
process.env.GOOGLE_CLIENT_ID='';
process.env.ALLOW_INSECURE_WEBHOOKS='true';
const app=require('../server/index');
let server,base,account,widget;
async function api(url,{method='GET',body,token,headers={}}={}){
 const res=await fetch(base+url,{method,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
 const text=await res.text();let data;try{data=JSON.parse(text);}catch{data=text;}
 return {status:res.status,data,headers:res.headers};
}
async function until(check,ms=5000){const started=Date.now();while(!check()){if(Date.now()-started>ms)throw new Error('Timed out waiting for webhook delivery');await new Promise(r=>setTimeout(r,25));}}
before(async()=>{
 server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 base='http://127.0.0.1:'+server.address().port;
 account=(await api('/api/auth/register',{method:'POST',body:{email:'owner@example.com',password:'owner-test-password'}})).data;
 widget=(await api('/api/widgets',{method:'POST',token:account.token,body:{name:'Original',config:{content:{title:'Hello'}}}})).data;
});
after(async()=>{
 if(server)await new Promise(resolve=>server.close(resolve));
 require('../server/db').close();
 // The directory is created above under the OS temp directory, never the project database.
 fs.rmSync(temp,{recursive:true,force:true});
});
test('private files stay private including encoded separators and extensions',async()=>{
 for(const url of ['/popforge.db','/popforge.%64b','/server/auth.js','/server%2fauth.js','/%73erver/auth.js','/package-lock.json','/.env','/node_modules/jsonwebtoken/package.json']){
  const r=await api(url);assert.ok(r.status===404||r.headers.get('content-type').includes('text/html'),url);
  assert.ok(!String(r.data).includes('SQLite format 3')&&!String(r.data).includes('JWT_SECRET=')&&!String(r.data).includes('const JWT_SECRET'),url);
 }
 for(const url of ['/','/templates.html','/guides/install-popups.html','/migration.html','/studio.html','/profile.html','/demo.html','/reset-password.html','/app.js','/lead-csv.js','/studio.js','/reset-password.js','/popuploom.js','/popforge.js','/ui.css','/robots.txt','/sitemap.xml','/llms.txt','/llms-full.txt','/assets/winter-gift.jpg','/assets/favicon.svg','/assets/og-popuploom.png'])assert.equal((await api(url)).status,200,url);
});
test('every template asset reference points at a shipped file',()=>{
 const src=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const refs=[...src.matchAll(/@assets\/([A-Za-z0-9._-]+\.(?:jpg|jpeg|png|svg|webp|gif))/g)].map(m=>m[1]);
 assert.ok(refs.length>=10,'catalog should ship real artwork references');
 for(const file of new Set(refs))assert.ok(fs.existsSync(path.join(root,'assets',file)),'template references a missing asset: '+file);
});
test('owner verification drop files serve exactly and lookalikes stay hardened 404s',async()=>{
 // Drop files are owner-provided, so a name is only written when absent and
 // removed in finally — a real owner file is asserted to serve but never
 // overwritten or deleted. Everything is also gitignored as a second guard.
 const created=[];
 const want=[
  ['googled9222a9e1190a4db.html','google-site-verification: regression d9222a9e1190a4db\n',/text\/html/],
  ['BingSiteAuth.xml','<?xml version="1.0" encoding="UTF-8"?><users><user>regression</user></users>',/xml/]
 ];
 try{
  for(const [name,body,typeRe] of want){
   const abs=path.join(root,name);
   const owned=fs.existsSync(abs);
   if(!owned){fs.writeFileSync(abs,body);created.push(abs);}
   const got=await api('/'+name);
   assert.equal(got.status,200,name);
   assert.match(String(got.headers.get('content-type')||''),typeRe,name);
   assert.match(String(got.headers.get('cache-control')||''),/no-store/,name);
   if(!owned)assert.equal(got.data,body,name);
   const head=await fetch(base+'/'+name,{method:'HEAD'});
   assert.equal(head.status,200,name+' HEAD');
  }
 }finally{
  for(const abs of created)fs.rmSync(abs,{force:true});
 }
 for(const bad of ['googled9222a9e1190a4db.htmlx','google-notmine000000000000.html','google123456789012.html','bingsiteauth.xml','BingSiteAuth.xml.bak','googled9222a9e1190a4db.html/','%2e%2e%2fpackage.json','.env']){
  const r=await api('/'+bad);
  assert.equal(r.status,404,bad);
  assert.ok(String(r.headers.get('content-security-policy')||'').length>0,bad+' 404 keeps CSP');
  assert.ok(String(r.data).includes('noindex'),bad+' 404 stays out of indexes');
 }
});
test('owner CRUD, validation, live config and lead isolation',async()=>{
 const other=(await api('/api/auth/register',{method:'POST',body:{email:'other@example.com',password:'other-test-password'}})).data;
 assert.equal((await api('/api/widgets/'+widget.id,{token:other.token})).status,404);
 assert.equal((await api('/api/widgets/'+widget.id,{method:'PUT',token:other.token,body:{name:'Hacked'}})).status,404);
 for(const config of [null,[],{content:{form:{fields:'bad'}}},{pages:{include:5}},{content:{form:{fields:[{name:'__proto__'}]}}}]){
  assert.equal((await api('/api/widgets/'+widget.id,{method:'PUT',token:account.token,body:{name:'Must not save',config}})).status,400);
 }
 assert.equal((await api('/api/widgets/'+widget.id,{token:account.token})).data.name,'Original');
 assert.equal((await api('/api/widgets/'+widget.id,{method:'PUT',token:account.token,body:{name:'Updated',config:{content:{title:'New headline'}}}})).status,200);
 const live=await api('/api/widgets/'+widget.id+'/config');assert.equal(live.data.cfg.content.title,'New headline');assert.equal(live.data.cfg.id,widget.id);
 const chosen=await api('/api/widgets',{method:'POST',token:account.token,body:{name:'Chosen id',config:{id:'customer-chosen-id'}}});
 assert.equal(chosen.status,201);assert.notEqual(chosen.data.id,'customer-chosen-id');assert.equal(chosen.data.cfg.id,chosen.data.id);
 assert.equal((await api('/api/widgets/'+chosen.data.id,{method:'DELETE',token:account.token})).status,200);
 assert.equal((await api('/api/widgets/'+widget.id+'/submit',{method:'POST',body:{data:{email:'lead@example.com'}}})).status,201);
 assert.equal((await api('/api/widgets/'+widget.id+'/submit',{method:'POST',body:{data:[]}})).status,400);
 assert.equal((await api('/api/widgets/'+widget.id+'/submissions',{token:other.token})).status,404);
 assert.equal((await api('/api/widgets/'+widget.id+'/submissions',{token:account.token})).data.length,1);
 assert.equal((await api('/api/does-not-exist')).status,404);
 const bad=await fetch(base+'/api/widgets',{method:'POST',headers:{'Content-Type':'application/json'},body:'{' });assert.equal(bad.status,400);assert.equal(typeof (await bad.json()).error,'string');
 const forged=require('jsonwebtoken').sign({userId:account.user.id},'popforge-dev-secret-change-in-prod');
 assert.equal((await api('/api/widgets',{token:forged})).status,401);
});
test('verified Google linking revokes unverified passwords and previous sessions',async()=>{
 const auth=require('../server/auth');
 const pre=auth.register('victim@gmail.com','attacker-password');
 assert.throws(()=>auth.findOrCreateGoogleUser({sub:'victim-sub',email:'victim@gmail.com'}),/verified/);
 const linked=auth.findOrCreateGoogleUser({sub:'victim-sub',email:'victim@gmail.com',emailVerified:true});
 assert.equal(pre.user.id,linked.user.id);
 assert.throws(()=>auth.login('victim@gmail.com','attacker-password'),/Invalid/);
 assert.equal((await api('/api/widgets',{token:pre.token})).status,401);
 assert.equal((await api('/api/widgets',{token:linked.token})).status,200);
 assert.equal(auth.findOrCreateGoogleUser({sub:'victim-sub',email:'victim@gmail.com',emailVerified:true}).user.id,linked.user.id);
 assert.throws(()=>auth.findOrCreateGoogleUser({sub:'different-google-sub',email:'victim@gmail.com',emailVerified:true}),/different Google account/);
});
test('third-party Google email cannot take over an existing password account',async()=>{
 const auth=require('../server/auth');const pre=auth.register('third-party@example.com','legitimate-password');
 assert.throws(()=>auth.findOrCreateGoogleUser({sub:'third-party-sub',email:'third-party@example.com',emailVerified:true}),/existing email and password/);
 assert.equal(auth.login('third-party@example.com','legitimate-password').user.id,pre.user.id);
 const workspace=auth.findOrCreateGoogleUser({sub:'workspace-sub',email:'third-party@example.com',emailVerified:true,hostedDomain:'example.com'});assert.equal(workspace.user.id,pre.user.id);
 const fresh=auth.findOrCreateGoogleUser({sub:'fresh-third-party',email:'new-third-party@example.net',emailVerified:true});assert.equal(auth.findOrCreateGoogleUser({sub:'fresh-third-party',email:'new-third-party@example.net',emailVerified:true}).user.id,fresh.user.id);
});
test('logout revokes exactly one session even when issued in the same second',async()=>{
 const auth=require('../server/auth'),user=auth.register('logout@example.com','logout-test-password').user;
 const token=auth.signToken(user),other=auth.signToken(user);assert.notEqual(token,other);
 assert.equal((await api('/api/auth/logout',{method:'POST',token})).status,200);
 assert.equal((await api('/api/widgets',{token})).status,401);
 assert.equal((await api('/api/widgets',{token:other})).status,200);
});
test('origin isolation keeps private APIs private while allowing public embeds',async()=>{
 const headers={Origin:'https://untrusted.example'};
 assert.equal((await api('/api/widgets',{token:account.token,headers})).status,403);
 assert.equal((await api('/API/auth/me',{token:account.token,headers})).status,403);
 assert.equal((await api('/api/auth/register',{method:'OPTIONS',headers:{...headers,'Access-Control-Request-Method':'POST'}})).status,403);
 const publicConfig=await api('/api/widgets/'+widget.id+'/config',{headers});assert.equal(publicConfig.status,200);assert.equal(publicConfig.headers.get('access-control-allow-origin'),'*');
 assert.equal((await api('/popuploom.js',{headers})).status,200);
 assert.equal((await api('/popforge.js',{headers})).status,200);
 assert.equal((await api('/api/widgets',{token:account.token,headers:{Origin:base}})).status,200);
});
test('HTML security headers prevent clickjacking and restrict script execution',async()=>{
 for(const url of ['/','/studio.html','/profile.html','/demo.html','/unknown-page']){
  const r=await api(url);const policy=r.headers.get('content-security-policy');assert.ok(policy.includes("frame-ancestors 'none'"));assert.ok(policy.includes("base-uri 'none'"));assert.ok(policy.includes("object-src 'none'"));
  const scripts=policy.split(';').find(s=>s.trim().startsWith('script-src'));assert.ok(scripts.includes('sha256-'));assert.ok(!scripts.includes("'unsafe-inline'"));assert.ok(scripts.includes('https://static.cloudflareinsights.com'));assert.ok(policy.includes('connect-src')&&policy.includes('https://cloudflareinsights.com'));assert.equal(r.headers.get('x-frame-options'),'DENY');assert.equal(r.headers.get('x-powered-by'),null);
 }
 const reset=await api('/reset-password.html');
 const resetPolicy=reset.headers.get('content-security-policy')||'';
 assert.ok(resetPolicy.includes("frame-ancestors 'none'")&&resetPolicy.includes("object-src 'none'")&&resetPolicy.includes("base-uri 'none'"));
 assert.ok(!(resetPolicy.split(';').find(s=>s.trim().startsWith('script-src'))||'').includes("'unsafe-inline'"));
 assert.equal(reset.headers.get('x-frame-options'),'DENY');
 assert.match(reset.headers.get('x-robots-tag')||'',/noindex, nofollow/);
 assert.match(String(reset.data),/name="robots" content="noindex,nofollow"/);
 assert.match(String(reset.data),/name="referrer" content="no-referrer"/);
});
test('CSP hashes normalize line endings and update when the HTML file changes',()=>{
 let html='<script>window.example=1;\r\n</script>',mtime=1;const headers={};
 const box={module:{exports:{}},__dirname:path.join(root,'server'),process:{env:{NODE_ENV:'production'}},URL,require:name=>name==='fs'?{readFileSync:()=>html,statSync:()=>({mtimeMs:mtime,size:html.length})}:require(name)};
 vm.runInNewContext(fs.readFileSync(path.join(root,'server/security.js'),'utf8'),box);
 const res={setHeader:(key,value)=>headers[key]=value};box.module.exports.htmlHeaders(res,'index.html');
 const first=headers['Content-Security-Policy'];assert.ok(first.includes(crypto.createHash('sha256').update('window.example=1;\n').digest('base64')));
 html='<script>window.example=2;</script>';mtime++;box.module.exports.htmlHeaders(res,'index.html');assert.notEqual(first,headers['Content-Security-Policy']);
 box.module.exports.headers({secure:true},res,()=>{});assert.equal(headers['Strict-Transport-Security'],'max-age=31536000');
});
test('Google verifier preserves signed hosted-domain claims and fails closed',async()=>{
 let payload={sub:'verified-sub',email:'owner@example.com',email_verified:true,hd:'example.com'},fail=false;
 const box={module:{exports:{}},process:{env:{GOOGLE_CLIENT_ID:'test-client'}},require:name=>{assert.equal(name,'google-auth-library');return {OAuth2Client:class {async verifyIdToken(){if(fail)throw Error('bad signature');return {getPayload:()=>payload};}}};}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'server/google.js'),'utf8'),box);
 const verify=box.module.exports.verifyCredential;assert.equal((await verify('fixture')).hostedDomain,'example.com');
 payload.email_verified=false;await assert.rejects(verify('fixture'),{code:'EMAIL_UNVERIFIED'});
 await assert.rejects(verify('x'.repeat(16385)),{code:'BAD_REQUEST'});fail=true;await assert.rejects(verify('fixture'),{code:'BAD_TOKEN'});
});
test('invalid passwords, deep JSON, oversized and compressed bodies are rejected safely',async()=>{
 assert.equal((await api('/api/auth/register',{method:'POST',body:{email:'weak@example.com',password:'short'}})).status,400);
 const deep='{"name":"Deep","config":{"content":{},"nested":'+'['.repeat(2000)+'0'+']'.repeat(2000)+'}}';
 const r=await fetch(base+'/api/widgets',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+account.token},body:deep});assert.equal(r.status,400);assert.ok(!(await r.text()).includes('stack'));
 const large=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:'x'.repeat(200000)})});assert.equal(large.status,413);
 const zipped=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json','Content-Encoding':'gzip'},body:require('node:zlib').gzipSync('{}')});assert.equal(zipped.status,415);
});
test('production rejects missing or placeholder signing secrets',()=>{
 const src=fs.readFileSync(path.join(root,'server/auth.js'),'utf8');
 function load(env){const box={module:{exports:{}},process:{env},require:n=>n==='./db'?{}:require(n)};vm.runInNewContext(src+'\nglobalThis.secret=JWT_SECRET;',box);return box;}
 assert.throws(()=>load({NODE_ENV:'production'}),/required/);
 for(const secret of ['short','popforge-dev-secret-change-in-prod','change-me-to-a-long-random-string'])assert.throws(()=>load({JWT_SECRET:secret}),/unique random/);
 assert.notEqual(load({}).secret,load({}).secret);
 load({NODE_ENV:'production',JWT_SECRET:crypto.randomBytes(32).toString('hex')});
});
test('submission retries are idempotent and listing reports accurate counts',async()=>{
 const body={requestId:'regression_retry_123',data:{email:'retry@example.com'}};
 assert.equal((await api('/api/widgets/'+widget.id+'/submit',{method:'POST',body})).status,201);
 assert.equal((await api('/api/widgets/'+widget.id+'/submit',{method:'POST',body})).status,201);
 const leads=(await api('/api/widgets/'+widget.id+'/submissions',{token:account.token})).data;
 assert.equal(leads.filter(r=>r.data.email==='retry@example.com').length,1);
 const list=(await api('/api/widgets',{token:account.token})).data;
 assert.equal(list.find(r=>r.id===widget.id).submissionCount,leads.length);
 for(const data of [null,false,0,[], 'bad'])assert.equal((await api('/api/widgets/'+widget.id+'/submit',{method:'POST',body:{data}})).status,400);
});
test('lead access is paginated and public view writes are rate limited',async()=>{
 const first=(await api('/api/widgets/'+widget.id+'/submissions?limit=1',{token:account.token})).data;assert.equal(first.length,1);
 const next=(await api('/api/widgets/'+widget.id+'/submissions?limit=1&before='+first[0].id,{token:account.token})).data;assert.ok(next.every(r=>r.id<first[0].id));
 assert.equal((await api('/api/widgets/'+widget.id+'/submissions?limit=10000',{token:account.token})).status,400);
 for(let i=0;i<600;i++)assert.equal((await api('/api/widgets/'+widget.id+'/view',{method:'POST'})).status,200);
 assert.equal((await api('/api/widgets/'+widget.id+'/view',{method:'POST'})).status,429);
});
test('rate limit cannot be bypassed with spoofed forwarded IP addresses',async()=>{
 for(let i=0;i<40;i++)assert.equal((await api('/api/auth/login',{method:'POST',headers:{'X-Forwarded-For':'192.0.2.'+i},body:{email:'missing@example.com',password:'wrong'}})).status,401);
 assert.equal((await api('/api/auth/login',{method:'POST',headers:{'X-Forwarded-For':'203.0.113.200'},body:{email:'missing@example.com',password:'wrong'}})).status,429);
});
function loadApp(fetchImpl,guest=[]){
 const box={window:{location:{origin:'https://pf.example'}},document:{querySelectorAll:()=>[]},URL,console,localStorage:{getItem:key=>key==='pf.token'?'token':JSON.stringify(guest)},fetch:fetchImpl};
 vm.runInNewContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),box);return box.window.PF;
}
test('cloud read failures cannot create duplicate widgets or report successful deletes',async()=>{
 let calls=0;const pf=loadApp(async()=>{calls++;return {ok:false,status:503};});
 await assert.rejects(pf.store.save({id:'existing_widget',name:'Edit',cfg:{}}),/load/);assert.equal(calls,1);
 await assert.rejects(pf.store.loadAll(),/load/);
 await assert.rejects(pf.store.remove('existing_widget'),/Delete failed/);
 await assert.rejects(pf.auth.me(),/session/);assert.equal(pf.auth.getToken(),'token');
});
test('every catalog template satisfies the saved config schema',()=>{
 const pf=loadApp(async()=>{throw Error('Unexpected request');});const {validateConfig}=require('../server/validation');
 for(const t of pf.templates)assert.equal(validateConfig(pf.cfgFor(t.id)),null,t.id);
});
test('legacy database migration preserves accounts and revokes old Google sessions',()=>{
 const legacy=path.join(temp,'legacy.db');
 const code=`const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.env.DB_PATH);d.exec("CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP,google_id TEXT,name TEXT,avatar_url TEXT); INSERT INTO users(email,password_hash,google_id) VALUES ('legacy@example.com','legacy-hash','legacy-google')");d.close();const migrated=require('./server/db');const row=migrated.prepare('SELECT * FROM users').get();if(row.email!=='legacy@example.com'||row.token_version!==1)throw Error('Account migration failed');if(!migrated.prepare('PRAGMA table_info(submissions)').all().some(c=>c.name==='request_id'))throw Error('Lead migration failed');migrated.close();`;
 const result=require('node:child_process').spawnSync(process.execPath,['-e',code],{cwd:root,env:{...process.env,DB_PATH:legacy},encoding:'utf8',windowsHide:true});
 assert.equal(result.status,0,result.stderr);
});
function runtime(){
 let response={ok:true,json:async()=>({ok:true})};const timers=[];
 const box={window:{},document:{readyState:'loading',querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({setAttribute(){}})},location:{href:'https://shop.example/shop/item?ref=x',pathname:'/shop/item'},console,URL,TextEncoder,TextDecoder,setTimeout:fn=>timers.push(fn),clearTimeout(){},setInterval:()=>1,clearInterval(){},addEventListener(){},removeEventListener(){},localStorage:{getItem(){throw Error('blocked');},setItem(){}},fetch:async()=>{if(response instanceof Error)throw response;return response;}};
 const src=fs.readFileSync(path.join(root,'popuploom.js'),'utf8').replace('  function boot() {','  window.checks={PopupInstance,cardHTML,recordSubmission,submitLike,wireSpin};\n  function boot() {');
 vm.runInNewContext(src,box);return {box,c:box.window.checks,timers,setResponse:r=>response=r};
}
test('targeting, untrusted rendering, storage restrictions and explicit test mode',async()=>{
 const {box,c}=runtime(),p=c.PopupInstance.prototype;
 assert.equal(p.pageOk.call({cfg:{pages:{mode:'include',include:['/shop/*']}}}),true);
 assert.equal(p.pageOk.call({cfg:{pages:{mode:'exclude',exclude:['/shop/*']}}}),false);
 assert.equal(p.freqOk.call({cfg:{frequency:'always'},key:()=>''}),true);
 const html=c.cardHTML({cfg:{placement:'slide:br" onmouseover="alert(1)',theme:{accent:'red" onclick="alert(1)'},content:{buttonText:'Bad',buttonUrl:'javascript:alert(1)',form:{enabled:true,fields:[{name:'email',type:'text" autofocus onfocus="alert(1)'}]}}}});
 assert.ok(!html.includes(' onmouseover="')&&!html.includes(' onclick="')&&!html.includes(' autofocus '));
 await c.recordSubmission({preview:false,test:true,cfg:{id:'test_123'}},{});
 const started=Date.now();assert.equal(p.pageOk.call({cfg:{pages:{mode:'include',include:['/shop/'+('*a'.repeat(40))+'b']}}}),false);assert.ok(Date.now()-started<1000);
 const bad=c.cardHTML({cfg:{content:{videoEmbed:'https://untrusted.example/steal'}}});assert.ok(!bad.includes('<iframe'));
 const good=c.cardHTML({cfg:{content:{videoEmbed:'https://www.youtube.com/watch?v=abcdefghijk'}}});assert.ok(good.includes('sandbox="allow-scripts allow-same-origin allow-presentation"'));
});
test('one widget API override does not change the default API for other widgets',()=>{
 const box={window:{},document:{readyState:'loading',querySelector:()=>({getAttribute:()=> 'https://override.example'}),querySelectorAll:selector=>selector.startsWith('script')?[{src:'https://default.example/popforge.js'}]:[],addEventListener(){}},URL,console};
 const src=fs.readFileSync(path.join(root,'popuploom.js'),'utf8').replace('  function boot() {','  window.checkApi=apiFor;\n  function boot() {');
 vm.runInNewContext(src,box);
 assert.equal(box.window.checkApi({getAttribute:()=>null}),'https://default.example');
 assert.equal(box.window.checkApi({getAttribute:()=> 'https://specific.example'}),'https://specific.example');
});
test('shared namespace, dual attributes and API override precedence',()=>{
 const src=fs.readFileSync(path.join(root,'popuploom.js'),'utf8').replace('  function boot() {','  window.checkApi=apiFor;window.checkRef=refFor;window.checkReady=isReady;window.checkSetReady=setReady;window.Runtime=Runtime;\n  function boot() {');
 function load(document,win={}){const box={window:win,document:Object.assign({readyState:'loading',querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}},document),location:{href:'https://shop.example/'},console,URL,TextEncoder,TextDecoder,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},addEventListener(){},removeEventListener(){},localStorage:{getItem(){return null;},setItem(){}},fetch:async()=>null};vm.runInNewContext(src,box);return box;}
 // Script-derived origin works for both filenames.
 const oldScript=load({currentScript:{src:'https://old.example/popforge.js'}});
 assert.equal(oldScript.window.checkApi({getAttribute:()=>null}),'https://old.example');
 const newScript=load({currentScript:{src:'https://new.example/popuploom.js'}});
 assert.equal(newScript.window.checkApi({getAttribute:()=>null}),'https://new.example');
 // New global override wins over the legacy one, which still works alone.
 assert.equal(load({currentScript:{src:'https://script.example/popuploom.js'}},{POPUPLOOM_API:'https://new-api.example/',POPFORGE_API:'https://legacy-api.example'}).window.checkApi({getAttribute:()=>null}),'https://new-api.example');
 assert.equal(load({currentScript:{src:'https://script.example/popuploom.js'}},{POPFORGE_API:'https://legacy-api.example/'}).window.checkApi({getAttribute:()=>null}),'https://legacy-api.example');
 // Per-node data-api wins over both globals.
 assert.equal(newScript.window.checkApi({getAttribute:()=> 'https://node-api.example/'}),'https://node-api.example');
 // Both public names share one object, so a second script load is a no-op.
 const box=load({currentScript:{src:'https://new.example/popuploom.js'}});
 assert.equal(box.window.PopupLoom,box.window.PopForge);
 const before=box.window.Runtime;
 vm.runInNewContext(src,box);
 assert.equal(box.window.Runtime,before);
 // data-popuploom wins deterministically; one node, one ready marker pair.
 const both={attrs:{'data-popuploom':'wan_new','data-popforge':'wan_old'},hasAttribute(k){return k in this.attrs;},getAttribute(k){return this.attrs[k]||null;},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}};
 assert.equal(box.window.checkRef(both),'wan_new');
 box.window.checkSetReady(both,'1');
 assert.equal(box.window.checkReady(both),true);
 assert.equal(both.attrs['data-popforge-ready'],'1');
 assert.equal(both.attrs['data-popuploom-ready'],'1');
 const legacyOnly={attrs:{'data-popforge':'wan_old'},hasAttribute(k){return k in this.attrs;},getAttribute(k){return this.attrs[k]||null;},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}};
 assert.equal(box.window.checkReady(legacyOnly),false);
 box.window.checkSetReady(legacyOnly,'loading');
 assert.equal(box.window.checkReady(legacyOnly),true);
 assert.equal(box.window.checkRef(legacyOnly),'wan_old');
});
test('host policy only moves known pages and never crosses hosts for API or runtime files',()=>{
 const {pageRedirect:policy}=require('../shared/host-policy');
 const pageRedirect=(url,method)=>policy(url,method,true);
 const apex='https://popuploom.com',old='https://popforge.shailu3597.workers.dev';
 assert.equal(pageRedirect(apex+'/','GET'),null);
 assert.equal(pageRedirect(apex+'/templates.html','GET'),null);
 assert.equal(pageRedirect(apex+'/index.html','GET'),apex+'/');
 assert.equal(pageRedirect(apex+'/index.html?x=1','GET'),apex+'/?x=1');
 assert.equal(pageRedirect('https://www.popuploom.com/studio.html?tpl=cafeClub','GET'),apex+'/studio.html?tpl=cafeClub');
 assert.equal(pageRedirect('https://www.popuploom.com/index.html','GET'),apex+'/');
 assert.equal(pageRedirect('https://www.popuploom.com/api/health','GET'),null);
 assert.equal(pageRedirect('https://www.popuploom.com/popforge.js','GET'),null);
 assert.equal(pageRedirect(old+'/','GET'),apex+'/');
 assert.equal(pageRedirect(old+'/index.html','GET'),apex+'/');
 assert.equal(pageRedirect(old+'/templates.html?ref=1','GET'),apex+'/templates.html?ref=1');
 assert.equal(pageRedirect(old+'/guides/install-popups.html','GET'),apex+'/guides/install-popups.html');
 assert.equal(pageRedirect(old+'/studio.html?id=wan_123','GET'),apex+'/studio.html?id=wan_123');
 assert.equal(pageRedirect(old+'/migration.html','GET'),null);
 assert.equal(pageRedirect(old+'/reset-password.html','GET'),null);
 assert.equal(pageRedirect(old+'/popforge.js','GET'),null);
 assert.equal(pageRedirect(old+'/popuploom.js','GET'),null);
 assert.equal(pageRedirect(old+'/assets/favicon.svg','GET'),null);
 assert.equal(pageRedirect(old+'/api/widgets/wan_1/config','GET'),null);
 assert.equal(pageRedirect(old+'/api/widgets/wan_1/view','POST'),null);
 assert.equal(pageRedirect(old+'/unknown','GET'),null);
 assert.equal(pageRedirect(old+'/','POST'),null);
 assert.equal(pageRedirect('http://localhost:3000/index.html','GET'),'http://localhost:3000/');
 assert.equal(pageRedirect('http://localhost:3000/','GET'),null);
});
test('plaintext production hosts upgrade to HTTPS in one hop',()=>{
 const {secureRedirect}=require('../shared/host-policy');
 const apex='https://popuploom.com',old='https://popforge.shailu3597.workers.dev',oldHttp='http://popforge.shailu3597.workers.dev';
 assert.equal(secureRedirect('http://popuploom.com/','true'),apex+'/');
 assert.equal(secureRedirect('http://popuploom.com/index.html?x=1',true),apex+'/?x=1');
 assert.equal(secureRedirect('http://popuploom.com/templates.html?ref=1',true),apex+'/templates.html?ref=1');
 assert.equal(secureRedirect('http://www.popuploom.com/studio.html?tpl=cafeClub',true),apex+'/studio.html?tpl=cafeClub');
 assert.equal(secureRedirect('http://www.popuploom.com/index.html',true),apex+'/');
 assert.equal(secureRedirect('http://www.popuploom.com/api/health',true),'https://www.popuploom.com/api/health');
 assert.equal(secureRedirect('http://www.popuploom.com/popforge.js',true),'https://www.popuploom.com/popforge.js');
 assert.equal(secureRedirect('http://www.popuploom.com/assets/favicon.svg',true),'https://www.popuploom.com/assets/favicon.svg');
 assert.equal(secureRedirect(oldHttp+'/','true'),apex+'/');
 assert.equal(secureRedirect(oldHttp+'/templates.html?ref=1',true),apex+'/templates.html?ref=1');
 assert.equal(secureRedirect(oldHttp+'/migration.html',true),old+'/migration.html');
 assert.equal(secureRedirect(oldHttp+'/popforge.js',true),old+'/popforge.js');
 assert.equal(secureRedirect(oldHttp+'/unknown',true),old+'/unknown');
 assert.equal(secureRedirect(oldHttp+'/index.html',false),old+'/');
 assert.equal(secureRedirect(oldHttp+'/studio.html',false),old+'/studio.html');
 assert.equal(secureRedirect('http://localhost:3000/','true'),null);
 assert.equal(secureRedirect('http://127.0.0.1:8080/studio.html',true),null);
 assert.equal(secureRedirect('http://preview.example.com/studio.html',true),null);
 assert.equal(secureRedirect(apex+'/','true'),null);
});
test('HowTo and breadcrumb structured data mirror only visible page content',async()=>{
 const decode=t=>t.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
 const plain=html=>decode(html.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ');
 const blocks=html=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
 const visibleCrumbs=html=>{
  const nav=html.match(/aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/);
  if(!nav) return [];
  return [...nav[1].matchAll(/<a href="(\/[^"]*)"[^>]*>([^<]+)<\/a>/g)].map(m=>({name:m[2],first:false,url:'https://popuploom.com'+m[1]}))
   .concat([...nav[1].matchAll(/<span>([^<]+)<\/span>/g)].map(m=>({name:m[1],last:true})));
 };
 for(const [url,name2] of [['/templates.html','Popup templates'],['/guides/install-popups.html','Installation guide']]){
  const htmlText=await (await api(url)).data;
  const crumbs=blocks(htmlText).find(b=>b['@type']==='BreadcrumbList'&&Array.isArray(b.itemListElement)&&b.itemListElement.length===2);
  assert.ok(crumbs,url);
  const seen=visibleCrumbs(htmlText);
  assert.equal(seen.length,crumbs.itemListElement.length,url);
  for(let i=0;i<seen.length;i++){
   assert.equal(seen[i].name,crumbs.itemListElement[i].name,url);
   if(!seen[i].last)assert.equal(seen[i].url,crumbs.itemListElement[i].item,url);
   else assert.equal(crumbs.itemListElement[i].item,'https://popuploom.com'+url,url);
  }
  assert.equal(crumbs.itemListElement[1].name,name2,url);
 }
 const guide=await (await api('/guides/install-popups.html')).data;
 const text=plain(guide);
 const howTo=blocks(guide).find(b=>b['@type']==='HowTo');
 assert.ok(howTo&&!('totalTime' in howTo)&&!('performTime' in howTo)&&!('aggregateRating' in howTo));
 const headings=[...guide.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map(m=>decode(m[1]).replace(/^\d+\.\s*/,''));
 assert.equal(howTo.step.length,4);
 let lastAt=-1;
 howTo.step.forEach((step,i)=>{
  assert.equal(step.position,i+1);
  const at=headings.indexOf(step.name);
  assert.ok(at>lastAt,step.name+' must appear after the previous step heading or not at all');
  lastAt=at;
  assert.ok(!/<(?!(\/body>))|&lt;|https?:/.test(step.text),step.name);
  for(const sentence of step.text.split(/(?<=\.)\s+/))assert.ok(text.includes(sentence),step.name+': '+sentence);
 });
 });
test('legacy cutover defaults off and requires an explicit enable value',()=>{
 const {pageRedirect}=require('../shared/host-policy');
 const old='https://popforge.shailu3597.workers.dev';
 for(const flag of [undefined,false,'false','0','TRUE','yes']){
  for(const path of ['/','/studio.html?tpl=cafeClub','/templates.html','/profile.html'])assert.equal(pageRedirect(old+path,'GET',flag),null);
  assert.equal(pageRedirect(old+'/index.html?ref=1','HEAD',flag),old+'/?ref=1');
 }
 for(const flag of [true,'true'])assert.equal(pageRedirect(old+'/studio.html?tpl=cafeClub','GET',flag),'https://popuploom.com/studio.html?tpl=cafeClub');
});
function rawRequest(path,{method='GET',host}={}){
 return new Promise((resolve,reject)=>{
  const u=new URL(base);const req=require('node:http').request({hostname:u.hostname,port:u.port,path,method,headers:host?{Host:host}:{}},res=>{
   const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8')}));
  });req.on('error',reject);req.end();
 });
}
test('Express redirects match the shared policy and leave API/runtime requests alone',async()=>{
 const old='popforge.shailu3597.workers.dev';
 let r=await rawRequest('/index.html');assert.equal(r.status,308);assert.equal(r.headers.location,base+'/');
 r=await rawRequest('/',{host:old});assert.equal(r.status,200);assert.equal(r.headers.location,undefined);
 r=await rawRequest('/studio.html?tpl=cafeClub',{host:old});assert.equal(r.status,200);assert.equal(r.headers.location,undefined);
 r=await rawRequest('/index.html?ref=1',{host:old});assert.equal(r.status,308);assert.equal(r.headers.location,'http://'+old+'/?ref=1');
 r=await rawRequest('/migration.html',{host:old});assert.equal(r.status,200);assert.match(r.headers['x-robots-tag']||'',/noindex/);assert.ok(r.body.includes('pf.widgets'));
 r=await rawRequest('/popforge.js',{host:old});assert.equal(r.status,200);assert.match(r.headers['content-type']||'',/javascript/);
 r=await rawRequest('/api/health',{host:old});assert.equal(r.status,200);assert.ok(r.body.includes('"ok":true'));
 r=await rawRequest('/unknown-page',{host:old});assert.equal(r.status,404);assert.ok(r.body.includes('Page not found'));
 r=await rawRequest('/',{host:old,method:'POST'});assert.equal(r.status,404);assert.equal(r.headers.location,undefined);
});
test('identity, metadata and crawler files agree on the apex origin',async()=>{
 const pages={
  '/':['PopupLoom — Free Popup Builder for Websites','https://popuploom.com/'],
  '/templates.html':['Free Website Popup Templates | PopupLoom','https://popuploom.com/templates.html'],
  '/guides/install-popups.html':['How to Add a Popup to Your Website | PopupLoom','https://popuploom.com/guides/install-popups.html']
 };
 for(const [url,[title,canonical]] of Object.entries(pages)){
  const html=(await api(url)).data;
  assert.ok(html.includes('<title>'+title+'</title>'),url);
  assert.ok(html.includes('rel="canonical" href="'+canonical+'"'),url);
  assert.ok(html.includes('property="og:site_name" content="PopupLoom"'),url);
  assert.ok(html.includes('https://popuploom.com/assets/og-popuploom.png'),url);
  assert.ok(!html.includes('og-popforge.png'),url);
  assert.ok(!html.includes('content="noindex'),url);
  if(url==='/')assert.ok(html.includes('Popup<span><i>Loom</i></span>'),url);
  if(url!=='/')assert.ok(!/popforge\.shailu3597\.workers\.dev/.test(html),url);
  for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){const data=JSON.parse(match[1]);assert.ok(JSON.stringify(data).includes('popuploom.com'),url);}
 }
 const studio=(await api('/studio.html')).data;
 assert.ok(studio.includes('<title>PopupLoom Studio</title>'));
 assert.ok(studio.includes('name="robots" content="noindex,follow"'));
 const account=(await api('/profile.html')).data;
 assert.ok(account.includes('<title>Your Account | PopupLoom</title>'));
 const robots=(await api('/robots.txt')).data;
 assert.ok(robots.includes('Sitemap: https://popuploom.com/sitemap.xml'));
 const sitemap=(await api('/sitemap.xml')).data;
 assert.ok(!sitemap.includes('popforge'));
 assert.ok(!sitemap.includes('studio.html')&&!sitemap.includes('migration.html'));
 const llms=(await api('/llms.txt')).data;
 assert.ok(llms.startsWith('# PopupLoom')&&llms.includes('https://popuploom.com/'));
 assert.ok(llms.includes('https://popuploom.com/llms-full.txt'));
 const llmsFull=(await api('/llms-full.txt')).data;
 assert.ok(llmsFull.startsWith('# PopupLoom')&&llmsFull.includes('45 templates')&&llmsFull.includes('data-popuploom')&&!llmsFull.includes('<!doctype'));
 const home=(await api('/')).data;
 assert.ok(home.includes('popuploom-widgets-backup.json'));
 assert.ok(home.includes('data-popuploom="wan_your_widget_id"'));
 assert.ok(home.includes('https://popuploom.com/popuploom.js'));
});
test('failed leads preserve entered data, retry safely, escape success text, and keep spin prize',async()=>{
 const {c,setResponse,timers}=runtime();let body={innerHTML:'form',querySelector:()=>null,appendChild(el){this.error=el;}};
 const field={disabled:false,value:'lead@example.com'},button={disabled:false};let events=0;
 const self={cfg:{id:'widget',content:{successEmoji:'<img src=x onerror=alert(1)>',form:{success:'Saved'},spin:{segments:[{label:'Prize A'},{label:'Prize B'}]}}},apiBase:'https://api.example',holderEl:{querySelector:()=>body,querySelectorAll:()=>[field,button]},notify(){events++;}};
 setResponse(Error('offline'));assert.equal(await c.submitLike(self,{}),false);assert.equal(body.innerHTML,'form');assert.equal(field.value,'lead@example.com');assert.equal(button.disabled,false);
 setResponse({ok:true,json:async()=>({ok:false,stored:false})});assert.equal(await c.submitLike(self,{}),false);
 setResponse({ok:true,json:async()=>({ok:true})});assert.equal(await c.submitLike(self,{}),true);assert.ok(body.innerHTML.includes('&lt;img'));assert.equal(events,1);
 const wheel={style:{}},hub={},prizeBody={innerHTML:'wheel'},spin={parentNode:prizeBody,querySelector:s=>s==='.pf-spin-wheel'?wheel:hub};
 c.wireSpin(self,spin);setResponse(Error('offline'));hub.onclick();timers.pop()();await new Promise(r=>setImmediate(r));assert.equal(prizeBody.innerHTML,'wheel');assert.equal(hub.textContent,'Retry');
 const rotation=wheel.style.transform;setResponse({ok:true,json:async()=>({ok:true})});hub.onclick();await new Promise(r=>setImmediate(r));assert.equal(wheel.style.transform,rotation);assert.ok(prizeBody.innerHTML.includes('We logged your spin'));
});
test('closing a popup during submission does not reject or lose a stored lead',async()=>{
 const {c,setResponse}=runtime();let resolve;
 setResponse({ok:true,json:()=>new Promise(r=>resolve=r)});
 const self={cfg:{id:'widget',content:{}},apiBase:'https://api.example',holderEl:{querySelectorAll:()=>[]},notify(){}};
 const result=c.submitLike(self,{email:'closing@example.com'});
 await new Promise(r=>setImmediate(r));self.holderEl=null;resolve({ok:true});assert.equal(await result,true);
});
test('account changes require reauthentication, revoke sessions and cascade deletion',async()=>{
 const a=(await api('/api/auth/register',{method:'POST',body:{email:'controls@example.com',password:'original-password-123'}})).data;
 const w=(await api('/api/widgets',{method:'POST',token:a.token,body:{name:'Controls',config:{content:{title:'Hello'}}}})).data;
 assert.equal((await api('/api/auth/account',{method:'POST',token:a.token,body:{action:'delete',currentPassword:'wrong',confirmation:a.user.email}})).status,400);
 assert.equal((await api('/api/auth/account',{method:'POST',token:a.token,body:{action:'password',currentPassword:'original-password-123',newPassword:'new-password-12345'}})).status,200);
 assert.equal((await api('/api/auth/me',{token:a.token})).status,401);
 const b=require('../server/auth').login(a.user.email,'new-password-12345');
 assert.equal((await api('/api/auth/account',{method:'POST',token:b.token,body:{action:'delete',currentPassword:'new-password-12345',confirmation:'wrong@example.com'}})).status,400);
 assert.equal((await api('/api/auth/account',{method:'POST',token:b.token,body:{action:'delete',currentPassword:'new-password-12345',confirmation:a.user.email}})).status,200);
 assert.equal((await api('/api/widgets/'+w.id+'/config')).status,404);
 assert.equal((await api('/api/auth/me',{token:b.token})).status,401);
});
test('CSV preserves Unicode and escapes spreadsheet formulas, quotes and multiline data',()=>{
 const {csv,csvWithPopup}=require('../lead-csv');const text=csv([{id:1,createdAt:'2026-01-01',data:{email:'=HYPERLINK("evil")',name:'Maya, \"hi\"',note:'line1\nline2',unicode:'नमस्ते'}},{id:2,data:{extra:'  +CMD'}}]);
 assert.ok(text.startsWith('\uFEFF'));assert.ok(text.includes("'=HYPERLINK"));assert.ok(text.includes("'  +CMD"));assert.ok(text.includes('नमस्ते'));assert.ok(text.includes('Field: extra'));
 const combined=csvWithPopup([{id:1,createdAt:'2026-01-01',widgetName:'Popup A',widgetId:'wan_a',data:{email:'=1+1'}}]);
 assert.ok(combined.startsWith('\uFEFF"Popup","Popup ID","Lead ID","Submitted at (UTC)","Field: email"'));
 assert.ok(combined.includes('"Popup A","wan_a","1","2026-01-01"'));
 assert.ok(combined.includes("'=1+1"));assert.ok(text.includes('line1\nline2'));
});
test('lead webhooks deliver once, sign payloads, log attempts and stay private',async()=>{
 const http=require('node:http');
 const received=[];
 const receiver=http.createServer(async(req,res)=>{const chunks=[];for await(const c of req)chunks.push(c);received.push({headers:req.headers,body:Buffer.concat(chunks).toString('utf8')});res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok');});
 await new Promise(r=>receiver.listen(0,'127.0.0.1',r));
 try{
  const hookWidget=(await api('/api/widgets',{method:'POST',token:account.token,body:{name:'Hook test',config:{content:{title:'Hook'}}}})).data;
  const hook='/api/widgets/'+hookWidget.id+'/webhook';
  const saved=await api(hook,{method:'PUT',token:account.token,body:{url:'http://127.0.0.1:'+receiver.address().port+'/hook',enabled:true}});
  assert.equal(saved.status,200);assert.match(saved.data.webhook.secret,/^[a-f0-9]{64}$/);
  const requestId='req-'+Date.now();
  const submit=(data,id=requestId)=>api('/api/widgets/'+hookWidget.id+'/submit',{method:'POST',body:{data,requestId:id}});
  assert.equal((await submit({email:'lead@example.com',note:'first'})).status,201);
  await until(()=>received.length===1);
  const event=JSON.parse(received[0].body);
  assert.equal(event.event,'lead.created');assert.equal(event.popup.id,hookWidget.id);assert.equal(event.popup.name,'Hook test');assert.equal(event.lead.data.email,'lead@example.com');assert.equal(event.test,false);
  const signature=received[0].headers['x-popuploom-signature'];assert.ok(signature&&signature.startsWith('t='));
  const parts=Object.fromEntries(signature.split(',').map(part=>part.split('=')));
  const expected=crypto.createHmac('sha256',saved.data.webhook.secret).update(parts.t+'.'+received[0].body).digest('hex');
  assert.equal(parts.v1,expected);
  assert.equal((await submit({email:'lead@example.com',note:'first'})).status,201);
  await new Promise(r=>setTimeout(r,200));assert.equal(received.length,1,'duplicate request IDs do not deliver twice');
  await new Promise(r=>setTimeout(r,100));
  const deliveries=await api(hook+'/deliveries',{token:account.token});
  assert.equal(deliveries.status,200);assert.equal(deliveries.data.length,1);assert.equal(deliveries.data[0].status,'success');assert.equal(deliveries.data[0].attempts,1);assert.equal(deliveries.data[0].responseStatus,200);assert.equal(deliveries.data[0].submissionId,event.lead.id);
  const tested=await api(hook+'/test',{method:'POST',token:account.token});
  assert.equal(tested.status,200);assert.equal(tested.data.ok,true);assert.equal(received.length,2);assert.equal(JSON.parse(received[1].body).test,true);
  const disabled=await api(hook,{method:'PUT',token:account.token,body:{url:'http://127.0.0.1:'+receiver.address().port+'/hook',enabled:false}});
  assert.equal(disabled.status,200);assert.equal(disabled.data.webhook.enabled,false);
  await submit({email:'disabled@example.com'},'req-'+(Date.now()+1));await new Promise(r=>setTimeout(r,200));assert.equal(received.length,2);
  const invalidPrivate=await api(hook,{method:'PUT',token:account.token,body:{url:'https://10.0.0.1/hook'}});
  assert.equal(invalidPrivate.status,400);
  const invalidCreds=await api(hook,{method:'PUT',token:account.token,body:{url:'https://user:pass@example.com/hook'}});
  assert.equal(invalidCreds.status,400);
  const other=(await api('/api/auth/register',{method:'POST',body:{email:'webhook-other@example.com',password:'other-password-123'}})).data;
  assert.equal((await api(hook,{token:other.token})).status,404);
  assert.equal((await api(hook,{method:'PUT',token:other.token,body:{url:'https://example.com/hook'}})).status,404);
  const removed=await api(hook,{method:'DELETE',token:account.token});assert.equal(removed.status,200);
  assert.equal((await api(hook,{token:account.token})).data.webhook,null);
 }finally{await new Promise(r=>receiver.close(r));}
});
test('webhook URL validation blocks insecure and private destinations',()=>{
 const {validateUrl}=require('../shared/webhook');
 for(const url of ['http://example.com/hook','https://127.0.0.1/hook','https://2130706433/hook','https://0177.0.0.1/hook','https://127.1/hook','https://[::1]/hook','https://user:pass@example.com/hook','https://10.0.0.1/hook','https://192.168.1.1/hook','ftp://example.com/hook'])assert.ok(validateUrl(url,{allowInsecure:false}),url);
 assert.equal(validateUrl('https://example.com/hook',{allowInsecure:false}),null);
 assert.equal(validateUrl('http://127.0.0.1:8080/hook',{allowInsecure:true}),null);
 assert.ok(validateUrl('http://10.0.0.1/hook',{allowInsecure:true}));
});
test('webhook delivery retries transient failures and stops on 4xx',async()=>{
 const http=require('node:http');
 const {deliver}=require('../shared/webhook');
 const calls={retry:0,stop:0};
 const receiver=http.createServer((req,res)=>{
  req.resume();
  if(req.url==='/retry'){calls.retry++;res.writeHead(calls.retry<3?500:200);}
  else{calls.stop++;res.writeHead(400);}
  res.end('result');
 });
 await new Promise(r=>receiver.listen(0,'127.0.0.1',r));
 try{
  const base='http://127.0.0.1:'+receiver.address().port;
  const event={event:'lead.created',id:'evt_test'};
  const retried=await deliver({url:base+'/retry',secret:'a'.repeat(64)},event,{delays:[0,0,0]});
  assert.equal(retried.ok,true);assert.equal(retried.attempts,3);assert.equal(retried.status,200);assert.equal(calls.retry,3);
  const stopped=await deliver({url:base+'/stop',secret:'a'.repeat(64)},event,{delays:[0,0,0]});
  assert.equal(stopped.ok,false);assert.equal(stopped.attempts,1);assert.equal(stopped.status,400);assert.equal(calls.stop,1);
 }finally{await new Promise(r=>receiver.close(r));}
});
const browserPath=process.env.POPFORGE_BROWSER||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
test('browser: all templates, save failures, installation, test mode, delete and hostile imports',{skip:!browserPath,timeout:120000},async()=>{
 const puppeteer=require('puppeteer-core');const browser=await puppeteer.launch({executablePath:browserPath,headless:true,args:['--no-sandbox'],userDataDir:path.join(temp,'browser')});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle0'});
  await page.evaluate(()=>openAuthModal());
  await page.click('#authModal a[onclick*="closeAuthModal"]');
  assert.equal(await page.$eval('#authModal',el=>el.style.display),'none');
  const injections=await page.evaluate(()=>{const s=document.createElement('script');s.textContent='window.injectedScriptRan=true';document.body.appendChild(s);const b=document.createElement('button');b.setAttribute('onclick','window.injectedHandlerRan=true');document.body.appendChild(b);b.click();return [!!window.injectedScriptRan,!!window.injectedHandlerRan];});
  assert.deepEqual(injections,[false,false]);
  const templates=await page.evaluate(()=>{const stage=document.createElement('div');document.body.appendChild(stage);return PF.templates.map(t=>{try{const p=PopForge.preview(stage,PF.cfgFor(t.id));if(!stage.querySelector('.pf-card'))throw Error('No popup card');p.destroy();return {id:t.id,ok:true};}catch(e){return {id:t.id,error:e.message};}});});
  assert.ok(templates.length>=40);assert.deepEqual(templates.filter(t=>!t.ok),[]);
  const layouts=await page.evaluate(()=>{
   const mount=(id,w)=>{const stage=document.createElement('div');stage.className='pf-stage';stage.style.width=w+'px';stage.style.height='640px';document.body.appendChild(stage);const p=PopForge.preview(stage,PF.cfgFor(id));const card=stage.querySelector('.pf-card');const info={split:card.classList.contains('pf-split'),media:!!card.querySelector(':scope > .pf-media'),body:!!card.querySelector(':scope > .pf-body'),cols:getComputedStyle(card).gridTemplateColumns.split(' ').filter(Boolean).length,w:Math.round(card.getBoundingClientRect().width)};p.destroy();stage.remove();return info;};
   return {age18:mount('age18',1200),drop48:mount('drop48',1200)};
  });
  assert.equal(layouts.age18.split,true,'age18 uses the split layout');
  assert.equal(layouts.age18.media,true,'split image is a direct card child');
  assert.equal(layouts.age18.body,true,'split text column stays intact');
  assert.equal(layouts.age18.cols,2,'split renders two columns');
  assert.ok(layouts.age18.w>=700,'split card is wide: '+layouts.age18.w);
  assert.equal(layouts.drop48.split,false,'split layout is opt-in per widget');
  const behavior=await page.evaluate(async()=>{
   const nativeInterval=window.setInterval;let delay;
   window.setInterval=(fn,ms)=>{delay=ms;return nativeInterval(fn,ms);};
   const proof=PF.cfgFor('proofPulse');proof.content.proof.interval=5;
   const proofPopup=PopForge.show(proof,{test:true});proofPopup.destroy();window.setInterval=nativeInterval;
   const cfg=PF.cfgFor('age18');cfg.id='sticky_regression';cfg.frequency='once:ever';cfg.trigger={type:'load'};cfg.sticky={enabled:true,label:'Reopen regression'};
   const node=document.createElement('div');node.setAttribute('data-popforge',PopForge.encodeCfg(cfg));node.setAttribute('data-popforge-test','1');document.body.appendChild(node);PopForge.scan();
   const inst=PopForge._inst[PopForge._inst.length-1];await new Promise(r=>setTimeout(r,300));inst.close();await new Promise(r=>setTimeout(r,200));inst.stickyEl.click();const reopened=inst.visible;
   const count=PopForge._inst.length;PopForge.scan();const noDuplicate=PopForge._inst.length===count;inst.destroy();node.remove();
   const dual=document.createElement('div');dual.setAttribute('data-popforge',PopForge.encodeCfg(cfg));dual.setAttribute('data-popuploom',PopForge.encodeCfg(cfg));dual.setAttribute('data-popuploom-test','1');document.body.appendChild(dual);
   const beforeDual=PopupLoom._inst.length;PopupLoom.scan();const dualDelta=PopupLoom._inst.length-beforeDual;PopupLoom._inst[PopupLoom._inst.length-1].destroy();dual.remove();
   const load=document.createElement('script');load.src='/popforge.js';document.body.appendChild(load);await new Promise(r=>{load.onload=r;load.onerror=r;});
   const afterSecondScript=PopupLoom._inst.length;PopupLoom.scan();const noSecondMount=PopupLoom._inst.length===afterSecondScript;load.remove();
   const invalid=PF.cfgFor('age18');invalid.id='invalid_selector_regression';invalid.trigger={type:'click',selector:'['};
   const invalidNode=document.createElement('div');invalidNode.setAttribute('data-popforge',PopForge.encodeCfg(invalid));invalidNode.setAttribute('data-popforge-test','1');document.body.appendChild(invalidNode);PopForge.scan();invalidNode.remove();
   return {delay,reopened,noDuplicate,dualDelta,noSecondMount,sameNamespace:PopupLoom===PopForge,hasScan:typeof PopupLoom.scan==='function'};
  });
  assert.equal(behavior.delay,5000);assert.equal(behavior.reopened,true);assert.equal(behavior.noDuplicate,true);assert.equal(behavior.dualDelta,1);assert.equal(behavior.noSecondMount,true);assert.equal(behavior.sameNamespace,true);assert.equal(behavior.hasScan,true);
  for(const template of templates){
   await page.goto(base+'/studio.html?tpl='+template.id,{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#stage .pf-card');
   assert.ok(await page.$eval('#nameInput',el=>el.value.length>0),template.id);
  }
  for(const width of [390,768,1440]){
   await page.setViewport({width,height:900});
   await page.goto(base+'/studio.html?tpl=cafeClub',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#stage .pf-card');
   const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(dimensions.scroll<=dimensions.width+2,JSON.stringify(dimensions));
  }
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.evaluate(token=>localStorage.setItem('pf.token',token),account.token);
  await page.goto(base+'/studio.html?tpl=age18',{waitUntil:'networkidle0'});
  await page.waitForSelector('#stage .pf-card');
  let rejectSave=true;await page.setRequestInterception(true);page.on('request',req=>{if(rejectSave&&req.method()==='POST'&&new URL(req.url()).pathname==='/api/widgets')req.abort();else req.continue();});
  await page.click('#btnSave');await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Save failed'));
  await page.evaluate(()=>{document.querySelector('#f-title').value='Edited after failure';document.querySelector('#f-title').dispatchEvent(new Event('input',{bubbles:true}));});
  await new Promise(r=>setTimeout(r,180));
  assert.equal(await page.$eval('#pubSnippetWrap',e=>e.style.display),'none');
  rejectSave=false;
  await Promise.all([page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/widgets'&&r.status()===201),page.click('#btnSave')]);
  await page.waitForFunction(()=>document.querySelector('#pubSnippetWrap').style.display==='block');
  const code=await page.$eval('#pubBox',e=>e.textContent);const id=code.match(/data-popuploom="([^"]+)"/)[1];assert.equal((await api('/api/widgets/'+id+'/config')).status,200);
  const submissions=[];page.on('request',req=>{if(req.url().includes('/submit'))submissions.push(req.url());});
  await page.click('#btnTest');await page.waitForSelector('.pf-holder:not(#stage .pf-holder) [data-age="allow"]');
  await page.evaluate(()=>{const holder=Array.from(document.querySelectorAll('.pf-holder')).find(e=>!e.closest('#stage'));holder.querySelector('[data-age="allow"]').click();});
  await page.waitForFunction(()=>!Array.from(document.querySelectorAll('.pf-holder')).some(e=>!e.closest('#stage')));
  assert.equal(submissions.length,0);
  page.once('dialog',d=>d.accept());await page.click('#btnDel');await page.waitForFunction(()=>document.querySelector('#toast').textContent==='Deleted');
  assert.equal(await page.$eval('#pubSnippetWrap',e=>e.style.display),'none');assert.equal((await api('/api/widgets/'+id+'/config')).status,404);
  await page.goto(base,{waitUntil:'networkidle0'});
  await page.evaluate(()=>{localStorage.removeItem('pf.token');localStorage.setItem('pf.widgets',JSON.stringify([{id:"x'><img src=x onerror=window.importXss=true>",name:'Imported',cfg:{},viewCount:'<img src=x onerror=window.importXss=true>'}]));});
  await page.reload({waitUntil:'networkidle0'});assert.equal(await page.evaluate(()=>window.importXss),undefined);
  await page.evaluate(()=>localStorage.setItem('pf.widgets',JSON.stringify([{id:'wan_recover',name:'Newer draft',cfg:{content:{title:'Keep this newer work'}}}])));
  await page.reload({waitUntil:'networkidle0'});
  const backup=path.join(temp,'migration-backup.json');
  fs.writeFileSync(backup,JSON.stringify([{id:'wan_recover',name:'Old backup',cfg:{content:{title:'Recovered old work'}}}]));
  const [chooser]=await Promise.all([page.waitForFileChooser(),page.click('#btnImport')]);
  await chooser.accept([backup]);
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pf.widgets')||'[]').length===2);
  const recovered=await page.evaluate(()=>JSON.parse(localStorage.getItem('pf.widgets')));
  assert.equal(recovered.find(w=>w.id==='wan_recover').cfg.content.title,'Keep this newer work');
  assert.ok(recovered.some(w=>w.id!=='wan_recover'&&w.cfg.content.title==='Recovered old work'));
  // Seed only the temporary test DB to exercise more than one API/export page.
  await page.goto(base+'/studio.html?tpl=drop48',{waitUntil:'networkidle0'});
  await page.click('#btnSave');await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Draft saved'));
  const savedDeadline=await page.evaluate(()=>JSON.parse(localStorage.getItem('pf.widgets')).find(w=>w.cfg.template==='drop48').cfg.content.countdown.target);
  await new Promise(r=>setTimeout(r,1100));
  await page.$eval('#f-title',e=>{e.value='A changed title';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.click('#btnSave');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pf.widgets')).find(w=>w.cfg.template==='drop48').cfg.content.countdown.target),savedDeadline);
  const inboxWidget=(await api('/api/widgets',{method:'POST',token:account.token,body:{name:'Inbox test',config:{content:{title:'Inbox'}}}})).data;
  const testDb=require('../server/db');
  for(let i=0;i<502;i++)testDb.prepare('INSERT INTO submissions(widget_id,data) VALUES (?,?)').run(inboxWidget.id,JSON.stringify({email:'lead'+i+'@example.com',note:i===501?'=2+2':'<img src=x onerror=window.leadXss=true>'}));
  await page.evaluate(token=>localStorage.setItem('pf.token',token),account.token);
  await page.goto(base+'/leads.html?id='+inboxWidget.id,{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>document.querySelectorAll('#leadsTable tbody tr').length===100);
  await page.waitForFunction(()=>document.querySelector('#webhookPanel').hidden===false);
  assert.equal(await page.$eval('#webhookStatus',e=>e.textContent),'No webhook configured yet.');
  await page.$eval('#webhookUrl',e=>{e.value='https://example.com/hook';});
  await page.click('#webhookSave');
  await page.waitForFunction(()=>document.querySelector('#webhookStatus').textContent==='Webhook saved.');
  assert.match(await page.$eval('#webhookSecret',e=>e.textContent),/^[a-f0-9]{64}$/);
  await page.click('#more');await page.waitForFunction(()=>document.querySelectorAll('#leadsTable tbody tr').length===200);
  assert.equal(await page.evaluate(()=>window.leadXss),undefined);
  await page.evaluate(()=>{URL.createObjectURL=blob=>{blob.text().then(t=>window.exportedCSV=t);return 'blob:qa-export';};HTMLAnchorElement.prototype.click=function(){};});
  await page.click('#export');await page.waitForFunction(()=>window.exportedCSV&&document.querySelector('#status').textContent==='Exported 502 leads.');
  const csv=await page.evaluate(()=>window.exportedCSV);assert.ok(csv.includes('lead0@example.com')&&csv.includes('lead501@example.com'));assert.ok(csv.includes("'=2+2"));
  await page.goto(base,{waitUntil:'networkidle0'});
 await page.evaluate(()=>{URL.createObjectURL=blob=>{blob.text().then(t=>window.exportedLeadsCSV=t);return 'blob:qa-all-leads';};HTMLAnchorElement.prototype.click=function(){};});
 const expectedLeads=testDb.prepare('SELECT COUNT(*) AS n FROM submissions').get().n;
 await page.click('#btnExportLeads');
 await page.waitForFunction(n=>window.exportedLeadsCSV&&document.querySelector('#toast').textContent==='Exported '+n+' leads',{},expectedLeads);
 const allCsv=await page.evaluate(()=>window.exportedLeadsCSV);
 assert.ok(allCsv.includes('"Popup","Popup ID","Lead ID","Submitted at (UTC)"'));
 assert.ok(allCsv.includes('lead0@example.com')&&allCsv.includes('lead501@example.com'));
 assert.ok(allCsv.includes('Inbox test')&&allCsv.includes("'=2+2"));
 await page.goto(base+'/leads.html?id='+inboxWidget.id,{waitUntil:'networkidle0'});
 await page.evaluate(()=>{localStorage.removeItem('pf.token');dispatchEvent(new StorageEvent('storage',{key:'pf.token',newValue:null}));});await page.waitForFunction(()=>document.querySelector('#leadsTable').hidden);await page.reload({waitUntil:'networkidle0'});assert.equal(await page.$eval('#export',e=>e.disabled),true);assert.equal(await page.$eval('#leadsTable',e=>e.hidden),true);
  await page.goto(base,{waitUntil:'networkidle0'});
  const logoutToken=require('../server/auth').signToken(account.user);
  await page.evaluate(token=>{localStorage.setItem('pf.token',token);localStorage.removeItem('pf.widgets');},logoutToken);
  await page.reload({waitUntil:'networkidle0'});await page.click('#btnAuth');
  await page.waitForSelector('.pf-acct-menu',{visible:true});
  await page.evaluate(()=>Array.from(document.querySelectorAll('.pf-acct-item')).find(el=>el.textContent==='Sign out').click());
  await page.waitForFunction(()=>!localStorage.getItem('pf.token'));
  assert.equal((await api('/api/widgets',{token:logoutToken})).status,401);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
