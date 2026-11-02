const fs=require('fs'),path=require('path');require('./csp-hashes.js');const out=path.resolve('.cf-build/public');
// Wipe the previous public bundle so removed/renamed files cannot linger in the
// deployed asset set. Everything below is copied from the tracked source files.
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
for(const f of ['robots.txt','sitemap.xml','llms.txt','llms-full.txt','templates.html','guides/install-popups.html','index.html','studio.html','profile.html','demo.html','migration.html','leads.html','privacy.html','leads.js','account.js','app.js','studio.js','popuploom.js','ui.css']){fs.mkdirSync(path.dirname(path.join(out,f)),{recursive:true});fs.copyFileSync(f,path.join(out,f));}
// Search Console / Bing verification drop files are owner-provided; copy every
// one that exists instead of hardcoding names that only the owner can know.
const verification=require('../shared/verification');
for(const name of fs.readdirSync('.')){
  try{
    if(!verification.verificationFile(name)||!fs.statSync(name).isFile())continue;
    fs.copyFileSync(name,path.join(out,name));
    console.log('copied verification file '+name);
  }catch(e){/* unreadable entries are skipped */}
}
// Inject owner-provided verification meta tags into every built HTML head.
// Comma-separated name=content pairs from SITE_VERIFICATION_METAS; the shared
// module rejects unsafe characters, so this cannot inject markup.
const metaTags=verification.metaTags(process.env);
if(metaTags){
  const files=fs.readdirSync(out,{withFileTypes:true,recursive:true}).filter(e=>e.isFile()&&e.name.endsWith('.html'));
  for(const entry of files){
    const file=path.join(entry.parentPath||entry.path||out,entry.name);
    let html=fs.readFileSync(file,'utf8');
    if(!/<\/head>/i.test(html))continue;
    fs.writeFileSync(file,html.replace(/<\/head>/i,metaTags+'</head>'));
  }
  console.log('injected '+verification.verificationMetas(process.env).length+' verification meta tag(s)');
}
// The legacy filename is a byte-for-byte build alias of the one runtime, so an
// old installed snippet and a new one can never drift apart.
fs.copyFileSync('popuploom.js',path.join(out,'popforge.js'));
fs.cpSync('assets',path.join(out,'assets'),{recursive:true});
