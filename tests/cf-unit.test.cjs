const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {DatabaseSync}=require('node:sqlite');
const root=path.resolve(__dirname,'..'),auth=require('../worker/auth'),http=require('../worker/http'),widgets=require('../worker/widgets');
const verification=require('../shared/verification');
function setup(){const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(path.join(root,'worker/migrations/0001_init.sql'),'utf8'));db.exec(fs.readFileSync(path.join(root,'worker/migrations/0003_rate_limits.sql'),'utf8'));db.exec(fs.readFileSync(path.join(root,'worker/migrations/0004_password_reset_tokens.sql'),'utf8'));db.exec(fs.readFileSync(path.join(root,'worker/migrations/0005_webhooks.sql'),'utf8'));return {db,env:{JWT_SECRET:'a'.repeat(64),RESEND_API_KEY:'test-resend-key',RESET_EMAIL_FROM:'PopupLoom <reset@popuploom.com>',PUBLIC_ORIGIN:'https://popuploom.com',DB:{prepare(sql){return {bind(...args){return {first:async()=>db.prepare(sql).get(...args),run:async()=>{const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes,last_row_id:r.lastInsertRowid}};},all:async()=>({results:db.prepare(sql).all(...args)})};}};}}}};}
test('legacy bcrypt login preserves passwords and upgrades to PBKDF2',async()=>{const {db,env}=setup();try{const hash=require('bcryptjs').hashSync('original-password',10);db.prepare('INSERT INTO users(email,password_hash) VALUES (?,?)').run('legacy@example.com',hash);const login=await auth.login(env,'legacy@example.com','original-password');assert.ok(login.token);assert.match(db.prepare('SELECT password_hash FROM users').get().password_hash,/^pbkdf2\$/);await assert.rejects(auth.login(env,'legacy@example.com','wrong-password'));}finally{db.close();}});
test('all Worker environments require a stable secret',async()=>{const {db,env}=setup();try{const user=await auth.register(env,'new@example.com','original-password','Name');assert.ok(user.token);await assert.rejects(auth.signToken({...env,JWT_SECRET:''},user.user),/JWT_SECRET/);}finally{db.close();}});
test('rate counters are shared between independently created limiters',async()=>{const {db,env}=setup();try{const a=http.rateLimit('test',2,60000),b=http.rateLimit('test',2,60000),r=new Request('https://example.com');await a(r,env);await b(r,env);await assert.rejects(a(r,env),e=>e.status===429);}finally{db.close();}});
test('new widgets always use server-generated ids and cannot reclaim a deleted id',async()=>{
 const {db,env}=setup();
 try{
  db.prepare('INSERT INTO users(email,password_hash) VALUES (?,?)').run('owner@example.com','unusable');
  const payload=id=>({env,user:{id:1},body:{name:'Test widget',config:{id}}});
  const first=await widgets.createWidget(payload('deleted-claim-test'));
  const created=await first.json();
  assert.equal(first.status,201);
  assert.notEqual(created.id,'deleted-claim-test');
  assert.match(created.id,/^wan_[a-f0-9]{24}$/);
  assert.equal(created.cfg.id,created.id);
  await widgets.deleteWidget({env,user:{id:1},params:{id:created.id}});
  const second=await (await widgets.createWidget(payload('deleted-claim-test'))).json();
  assert.notEqual(second.id,'deleted-claim-test');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM widgets').get().n,1);
 }finally{db.close();}
});
test('login fails generically for unknown and Google-only accounts',async()=>{
 const {db,env}=setup();
 try{
  await assert.rejects(auth.login(env,'nobody@example.com','some-password-123'),e=>e.status===401&&e.message==='Invalid email or password');
  db.prepare('INSERT INTO users(email,password_hash,google_id) VALUES (?,?,?)').run('google@example.com','unusable','google-subject-1');
  await assert.rejects(auth.login(env,'google@example.com','some-password-123'),e=>e.status===401&&e.message==='Invalid email or password');
 }finally{db.close();}
});
test('site verification files, names and meta pairs are validated strictly',()=>{
 assert.ok(verification.verificationFile('googled9222a9e1190a4db.html'));
 assert.ok(verification.verificationFile('googlezonecheck1a2b3c4d5e6f7g8.html'));
 assert.ok(verification.verificationFile('BingSiteAuth.xml'));
 assert.ok(!verification.verificationFile('google-not-mine.html'));          // hyphens are not allowed in the random part
 assert.ok(!verification.verificationFile('googled9222a9e1190a4db.html.txt'));
 assert.ok(!verification.verificationFile('../.env'));
 assert.ok(!verification.verificationFile('googlefake/evil.html'));
 assert.ok(!verification.verificationFile(''));
 const env={SITE_VERIFICATION_METAS:'google-site-verification = g-abc123 , msvalidate.01=bxyz789'};
 assert.deepEqual(verification.verificationMetas(env),[
  {name:'google-site-verification',content:'g-abc123'},
  {name:'msvalidate.01',content:'bxyz789'}
 ]);
 assert.equal(verification.metaTags(env),'<meta name="google-site-verification" content="g-abc123"><meta name="msvalidate.01" content="bxyz789">');
 for(const bad of ['',' =x','name=','name','name=<script>','name="x"','name=x"onerror','name= >','name=x y','name=a&b','=x'])
  assert.deepEqual(verification.verificationMetas({SITE_VERIFICATION_METAS:bad}),[]);
});
test('production build injects verification meta tags only from the owner env',()=>{
 const {execFileSync}=require('node:child_process');
 const build=v=>execFileSync(process.execPath,['scripts/build-cf.cjs'],{cwd:root,env:{...process.env,SITE_VERIFICATION_METAS:v},encoding:'utf8'});
 build('');
 const clean=fs.readFileSync(path.join(root,'.cf-build/public/index.html'),'utf8');
 assert.ok(!clean.includes('google-site-verification')&&!clean.includes('msvalidate.01'),'no owner values are invented without the env var');
 build('google-site-verification = tok-ABC_123,msvalidate.01=0123456789ABCDEF');
 for(const rel of ['index.html','templates.html','guides/install-popups.html']){
  const html=fs.readFileSync(path.join(root,'.cf-build/public',rel),'utf8');
  assert.ok(html.includes('<meta name="google-site-verification" content="tok-ABC_123">'),rel);
  assert.ok(/<meta name="msvalidate\.01" content="0123456789ABCDEF"><\/head>/i.test(html),rel+' metas sit inside <head>');
 }
 build('');
 assert.ok(!fs.readFileSync(path.join(root,'.cf-build/public/index.html'),'utf8').includes('google-site-verification'),'final build is clean');
});
test('production build copies an owner verification drop file placed at the root',()=>{
 const {execFileSync}=require('node:child_process');
 const build=()=>execFileSync(process.execPath,['scripts/build-cf.cjs'],{cwd:root,encoding:'utf8'});
 const name='googled9222a9e1190a4db.html';
 const abs=path.join(root,name),out=path.join(root,'.cf-build/public',name);
 const owned=fs.existsSync(abs);
 if(!owned)fs.writeFileSync(abs,'build copy marker\n');
 try{
  build();
  assert.ok(fs.existsSync(out),name+' copied into the public bundle');
  if(!owned)assert.equal(fs.readFileSync(out,'utf8'),'build copy marker\n');
  const home=fs.readFileSync(path.join(root,'.cf-build/public/index.html'),'utf8');
  assert.ok(!home.includes('build copy marker'),'drop files stay separate from HTML');
 }finally{
  if(!owned)fs.rmSync(abs,{force:true});
  build();
 }
 assert.equal(fs.existsSync(out),owned,'final build matches the repository state');
});
test('private snapshots and credentials are excluded from packaging',()=>{const files=fs.readdirSync(path.join(root,'.cf-build/public'));assert.ok(files.includes('llms.txt')&&files.includes('llms-full.txt'));assert.ok(!files.some(f=>f.includes('.env')||f==='worker'||f==='private-data'||f==='node_modules'));assert.ok(fs.readFileSync(path.join(root,'.gitignore'),'utf8').includes('private-data/'));});

test('worker password reset stores only a hash, is single-use and revokes sessions',async()=>{
 const {db,env}=setup();const reset=require('../worker/password-reset');const email=require('../shared/email');const sent=[];const original=email.sendPasswordResetEmail;
 email.sendPasswordResetEmail=async(cfg,msg)=>{sent.push({cfg,msg});return {ok:true};};
 try{
  const account=await auth.register(env,'reset.worker@example.com','original-password-123');
  const delivery=await reset.forgotPassword(env,' Reset.Worker@Example.com ');
  assert.equal(delivery.to,'reset.worker@example.com');
  assert.match(delivery.token,/^[A-Za-z0-9_-]{43}$/);
  const row=db.prepare('SELECT * FROM password_reset_tokens').get();
  assert.match(row.token_hash,/^[a-f0-9]{64}$/);
  assert.notEqual(row.token_hash,delivery.token);
  assert.equal(row.used_at,null);
  assert.equal(JSON.stringify(row).includes(delivery.token),false,'raw token never reaches the database');
  await email.sendPasswordResetEmail(reset.requireEmailConfig(env),delivery);
  assert.equal(sent.length,1);
  assert.ok(sent[0].msg.token===delivery.token);
  await assert.rejects(reset.resetPassword(env,delivery.token,'short'),e=>e.status===400&&e.code==='WEAK_PASSWORD');
  await assert.rejects(reset.resetPassword(env,delivery.token,'x'.repeat(73)),e=>e.code==='WEAK_PASSWORD');
  const result=await reset.resetPassword(env,delivery.token,'brand-new-password-123');
  assert.equal(result.ok,true);
  await assert.rejects(reset.resetPassword(env,delivery.token,'another-password-123'),e=>e.code==='INVALID_RESET_TOKEN');
  await assert.rejects(auth.login(env,'reset.worker@example.com','original-password-123'),/Invalid/);
  assert.ok((await auth.login(env,'reset.worker@example.com','brand-new-password-123')).token);
  await assert.rejects(auth.authMiddleware(env,new Request('https://example.com/api/auth/me',{headers:{Authorization:'Bearer '+account.token}})),e=>e.status===401);
 }finally{email.sendPasswordResetEmail=original;db.close();}
});

test('worker password reset stays generic for unknown, Google-only and expired tokens',async()=>{
 const {db,env}=setup();const reset=require('../worker/password-reset');
 try{
  assert.equal(await reset.forgotPassword(env,'nobody@example.com'),null);
  await auth.findOrCreateGoogleUser(env,{sub:'google-reset-sub',email:'googleonly@example.com',emailVerified:true});
  assert.equal(await reset.forgotPassword(env,'googleonly@example.com'),null);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM password_reset_tokens').get().n,0);
  await auth.register(env,'expired@example.com','expired-password-123');
  const delivery=await reset.forgotPassword(env,'expired@example.com');
  db.prepare('UPDATE password_reset_tokens SET expires_at = ?').run(Math.floor(Date.now()/1000)-1);
  for(const token of [delivery.token,'x','a'.repeat(42),'a'.repeat(44),'b!'.repeat(21)+'b']){
   await assert.rejects(reset.resetPassword(env,token,'replacement-password-123'),e=>e.status===400&&e.code==='INVALID_RESET_TOKEN');
  }
  // A new request invalidates the previous outstanding link.
  await auth.register(env,'rotate@example.com','rotate-password-123');
  const first=await reset.forgotPassword(env,'rotate@example.com');
  const second=await reset.forgotPassword(env,'rotate@example.com');
  await assert.rejects(reset.resetPassword(env,first.token,'replacement-password-123'),e=>e.code==='INVALID_RESET_TOKEN');
  assert.equal((await reset.resetPassword(env,second.token,'replacement-password-123')).ok,true);
  // Missing email configuration is a clear setup failure, not a silent success.
  const unconfigured={...env,RESEND_API_KEY:''};
  assert.throws(()=>reset.requireEmailConfig(unconfigured),e=>e.status===503&&e.code==='RESET_EMAIL_NOT_CONFIGURED'&&/RESEND_API_KEY/.test(e.message));
 }finally{db.close();}
});

test('worker email rate limits are normalized and hashed',async()=>{
 const {db,env}=setup();try{
  const limit=http.emailRateLimit('reset-email-test',1,60000);
  const request=new Request('https://example.com/api/auth/forgot-password');
  await limit(request,env,'Person@Example.com');
  await assert.rejects(limit(request,env,' person@example.com '),e=>e.status===429);
  const keys=db.prepare('SELECT key FROM rate_limits').all().map(r=>r.key);
  assert.equal(keys.length,1);
  assert.ok(!keys[0].includes('person@example.com'),'raw address is never stored in the counter table');
  await limit(request,env,'other@example.com');
 }finally{db.close();}
});

test('production build keeps advertising disabled and gates ads.txt',()=>{
 const {execFileSync}=require('node:child_process');
 const out=path.join(root,'.cf-build','public');
 const base={...process.env,ADSENSE_ENABLED:'false',ADSENSE_CLIENT:'',ADSENSE_CMP:'',ADSENSE_PUBLISHER_ID:''};
 execFileSync(process.execPath,['scripts/build-cf.cjs'],{cwd:root,env:base});
 assert.ok(!fs.existsSync(path.join(out,'ads.txt')),'no ads.txt without a real publisher id');
 for(const rel of ['index.html','studio.html','leads.html','guides/install-popups.html']){
  const html=fs.readFileSync(path.join(out,rel),'utf8');
  assert.ok(!/adsbygoogle|googlesyndication|doubleclick|fundingchoicesmessages/i.test(html),rel+' contains no advertising code');
 }
 const runtime=fs.readFileSync(path.join(out,'popuploom.js'),'utf8');
 assert.ok(!/adsbygoogle|googlesyndication|doubleclick|fundingchoicesmessages/i.test(runtime),'customer runtime contains no advertising code');
 execFileSync(process.execPath,['scripts/build-cf.cjs'],{cwd:root,env:{...base,ADSENSE_PUBLISHER_ID:'pub-1234567890123456'}});
 assert.equal(fs.readFileSync(path.join(out,'ads.txt'),'utf8'),'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
 assert.throws(()=>execFileSync(process.execPath,['scripts/build-cf.cjs'],{cwd:root,env:{...base,ADSENSE_ENABLED:'true'},stdio:'pipe'}),/ADSENSE_CLIENT|ADSENSE_SLOT|approval|CMP/);
 const valid={...base,ADSENSE_ENABLED:'true',ADSENSE_APPROVED:'true',ADSENSE_PUBLISHER_ID:'pub-1234567890123456',ADSENSE_CLIENT:'ca-pub-1234567890123456',ADSENSE_CMP:'google-privacy-messaging',ADSENSE_SLOT:'1234567890'};
 execFileSync(process.execPath,['scripts/build-cf.cjs'],{cwd:root,env:valid});
 assert.ok(fs.existsSync(path.join(out,'ads.txt')),'valid publisher build keeps ads.txt');
 assert.ok(!/adsbygoogle|googlesyndication|doubleclick|fundingchoicesmessages/i.test(fs.readFileSync(path.join(out,'guides/install-popups.html'),'utf8')),'build injects no ad code; it is runtime-gated');
 // Restore the default clean bundle for later tests.
 execFileSync(process.execPath,['scripts/build-cf.cjs'],{cwd:root,env:base});
});
