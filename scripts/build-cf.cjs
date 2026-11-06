const fs=require('fs'),path=require('path');require('./csp-hashes.js');const out=path.resolve('.cf-build/public');
// Wipe the previous public bundle so removed/renamed files cannot linger in the
// deployed asset set. Everything below is copied from the tracked source files.
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
for(const f of ['ccf2a9f45165c635253d22748df4a573.txt','robots.txt','sitemap.xml','llms.txt','llms-full.txt','templates.html','faq.html','press.html','security.html','guides/install-popups.html','guides/index.html','guides/wordpress-popup.html','guides/shopify-popup.html','guides/webflow-popup.html','guides/collect-and-export-leads.html','guides/popup-not-showing.html','guides/popup-builder-for-ecommerce.html','guides/popup-builder-for-quick-commerce.html','guides/popup-builder-for-lead-generation.html','index.html','studio.html','profile.html','demo.html','migration.html','reset-password.html','leads.html','privacy.html','about.html','contact.html','terms.html','.well-known/security.txt','lead-csv.js','leads.js','account.js','app.js','studio.js','reset-password.js','popuploom.js','ui.css']){fs.mkdirSync(path.dirname(path.join(out,f)),{recursive:true});fs.copyFileSync(f,path.join(out,f));}
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

// Immutable embed release. Customers can pin this path and verify the hash;
// the live configuration still syncs through the API, so content edits do not
// require a new script URL.
const embedVersion='1.1.0',embedDir=path.join(out,'embed',embedVersion);
fs.mkdirSync(embedDir,{recursive:true});
fs.copyFileSync('popuploom.js',path.join(embedDir,'popuploom.js'));
fs.copyFileSync('popuploom.js',path.join(embedDir,'popforge.js'));
const embedHash=require('crypto').createHash('sha256').update(fs.readFileSync('popuploom.js')).digest('hex');
fs.writeFileSync(path.join(embedDir,'SHA256SUMS'),embedHash+'  popuploom.js\n'+embedHash+'  popforge.js\n');
fs.cpSync('assets',path.join(out,'assets'),{recursive:true});

// ---- Advertising readiness (enabled only by a complete reviewed config) ----
// ads.txt is published only when the owner supplies a real publisher ID.
// Runtime ad injection is fail-closed in shared/ads.js; this build validates
// that an explicitly enabled configuration has every account/CMP/slot gate.
const publisherId=String(process.env.ADSENSE_PUBLISHER_ID||'').trim();
if(publisherId){
  if(!/^pub-\d{16}$/.test(publisherId)) throw new Error('ADSENSE_PUBLISHER_ID must look like pub-0000000000000000');
  fs.writeFileSync(path.join(out,'ads.txt'),'google.com, '+publisherId+', DIRECT, f08c47fec0942fa0\n');
  console.log('wrote ads.txt for the configured publisher ID');
}
const ads=require('../shared/ads');
const adConfig=ads.config(process.env);
if(process.env.ADSENSE_ENABLED==='true' && !adConfig.enabled){
  throw new Error('ADSENSE_ENABLED requires a valid ADSENSE_CLIENT, ADSENSE_SLOT, ADSENSE_APPROVED=true and ADSENSE_CMP=google-privacy-messaging (reason: '+adConfig.reason+')');
}
