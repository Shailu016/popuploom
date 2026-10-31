const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'popforge-regression-'));
process.env.DB_PATH=path.join(temp,'test.db');
process.env.JWT_SECRET=crypto.randomBytes(32).toString('hex');
process.env.NODE_ENV='test';
process.env.TRUST_PROXY='';
process.env.GOOGLE_CLIENT_ID='';
const app=require('../server/index');
let server,base,account,widget;
async function api(url,{method='GET',body,token,headers={}}={}){
 const res=await fetch(base+url,{method,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
 const text=await res.text();let data;try{data=JSON.parse(text);}catch{data=text;}
 return {status:res.status,data,headers:res.headers};
}
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
 for(const url of ['/','/studio.html','/profile.html','/demo.html','/app.js','/studio.js','/popforge.js','/ui.css','/assets/winter-gift.jpg'])assert.equal((await api(url)).status,200,url);
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
 assert.equal((await api('/popforge.js',{headers})).status,200);
 assert.equal((await api('/api/widgets',{token:account.token,headers:{Origin:base}})).status,200);
});
test('HTML security headers prevent clickjacking and restrict script execution',async()=>{
 for(const url of ['/','/studio.html','/profile.html','/demo.html','/unknown-page']){
  const r=await api(url);const policy=r.headers.get('content-security-policy');assert.ok(policy.includes("frame-ancestors 'none'"));assert.ok(policy.includes("base-uri 'none'"));assert.ok(policy.includes("object-src 'none'"));
  const scripts=policy.split(';').find(s=>s.trim().startsWith('script-src'));assert.ok(scripts.includes('sha256-'));assert.ok(!scripts.includes("'unsafe-inline'"));assert.equal(r.headers.get('x-frame-options'),'DENY');assert.equal(r.headers.get('x-powered-by'),null);
 }
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
 const src=fs.readFileSync(path.join(root,'popforge.js'),'utf8').replace('  function boot() {','  window.checks={PopupInstance,cardHTML,recordSubmission,submitLike,wireSpin};\n  function boot() {');
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
 const src=fs.readFileSync(path.join(root,'popforge.js'),'utf8').replace('  function boot() {','  window.checkApi=apiFor;\n  function boot() {');
 vm.runInNewContext(src,box);
 assert.equal(box.window.checkApi({getAttribute:()=>null}),'https://default.example');
 assert.equal(box.window.checkApi({getAttribute:()=> 'https://specific.example'}),'https://specific.example');
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
  const behavior=await page.evaluate(async()=>{
   const nativeInterval=window.setInterval;let delay;
   window.setInterval=(fn,ms)=>{delay=ms;return nativeInterval(fn,ms);};
   const proof=PF.cfgFor('proofPulse');proof.content.proof.interval=5;
   const proofPopup=PopForge.show(proof,{test:true});proofPopup.destroy();window.setInterval=nativeInterval;
   const cfg=PF.cfgFor('age18');cfg.id='sticky_regression';cfg.frequency='once:ever';cfg.trigger={type:'load'};cfg.sticky={enabled:true,label:'Reopen regression'};
   const node=document.createElement('div');node.setAttribute('data-popforge',PopForge.encodeCfg(cfg));node.setAttribute('data-popforge-test','1');document.body.appendChild(node);PopForge.scan();
   const inst=PopForge._inst[PopForge._inst.length-1];await new Promise(r=>setTimeout(r,300));inst.close();await new Promise(r=>setTimeout(r,200));inst.stickyEl.click();const reopened=inst.visible;
   const count=PopForge._inst.length;PopForge.scan();const noDuplicate=PopForge._inst.length===count;inst.destroy();node.remove();
   const invalid=PF.cfgFor('age18');invalid.id='invalid_selector_regression';invalid.trigger={type:'click',selector:'['};
   const invalidNode=document.createElement('div');invalidNode.setAttribute('data-popforge',PopForge.encodeCfg(invalid));invalidNode.setAttribute('data-popforge-test','1');document.body.appendChild(invalidNode);PopForge.scan();invalidNode.remove();
   return {delay,reopened,noDuplicate};
  });
  assert.equal(behavior.delay,5000);assert.equal(behavior.reopened,true);assert.equal(behavior.noDuplicate,true);
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
  const code=await page.$eval('#pubBox',e=>e.textContent);const id=code.match(/data-popforge="([^"]+)"/)[1];assert.equal((await api('/api/widgets/'+id+'/config')).status,200);
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
