const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {DatabaseSync}=require('node:sqlite');
const root=path.resolve(__dirname,'..'),auth=require('../worker/auth'),http=require('../worker/http'),widgets=require('../worker/widgets');
function setup(){const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(path.join(root,'worker/migrations/0001_init.sql'),'utf8'));db.exec(fs.readFileSync(path.join(root,'worker/migrations/0003_rate_limits.sql'),'utf8'));return {db,env:{JWT_SECRET:'a'.repeat(64),DB:{prepare(sql){return {bind(...args){return {first:async()=>db.prepare(sql).get(...args),run:async()=>{const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes,last_row_id:r.lastInsertRowid}};},all:async()=>({results:db.prepare(sql).all(...args)})};}};}}}};}
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
test('private snapshots and credentials are excluded from packaging',()=>{const files=fs.readdirSync(path.join(root,'.cf-build/public'));assert.ok(!files.some(f=>f.includes('.env')||f==='worker'||f==='private-data'||f==='node_modules'));assert.ok(fs.readFileSync(path.join(root,'.gitignore'),'utf8').includes('private-data/'));});
