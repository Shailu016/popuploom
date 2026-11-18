const fs=require('fs'),path=require('path');require('./csp-hashes.js');const out=path.resolve('.cf-build/public');
// Wipe the previous public bundle so removed/renamed files cannot linger in the
// deployed asset set. Everything below is copied from the tracked source files.
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
for(const f of ['ccf2a9f45165c635253d22748df4a573.txt','robots.txt','sitemap.xml','llms.txt','llms-full.txt','templates.html','free-popup-builder-no-limits.html','best-free-popup-builder.html','faq.html','press.html','security.html','guides/install-popups.html','guides/index.html','guides/wordpress-popup.html','guides/wordpress-popup-without-plugin.html','guides/shopify-popup.html','guides/webflow-popup.html','guides/squarespace-wix-popup.html','guides/exit-intent-popup.html','guides/email-signup-popup.html','guides/free-popup-builders-without-pageview-limits.html','guides/collect-and-export-leads.html','guides/popup-not-showing.html','guides/popup-builder-for-ecommerce.html','guides/popup-builder-for-quick-commerce.html','guides/popup-builder-for-lead-generation.html','guides/nextjs-popup.html','guides/react-popup.html','guides/astro-popup.html','guides/google-tag-manager-popup.html','guides/static-html-popup.html','guides/bigcommerce-popup.html','index.html','studio.html','profile.html','demo.html','migration.html','reset-password.html','leads.html','privacy.html','about.html','contact.html','terms.html','.well-known/security.txt','.well-known/api-catalog','.well-known/ard.json','.well-known/ai-catalog.json','openapi.json','lead-csv.js','leads.js','account.js','app.js','studio.js','reset-password.js','verify-email.html','verify-email.js','popuploom.js','ui.css']){fs.mkdirSync(path.dirname(path.join(out,f)),{recursive:true});fs.copyFileSync(f,path.join(out,f));}
// Public template category pages are generated from scripts/generate-template-pages.cjs.
// Copy the whole directory so a new category cannot be forgotten in the build list.
if(fs.existsSync('templates'))fs.cpSync('templates',path.join(out,'templates'),{recursive:true});
// Tool pages and their external scripts/downloads live together. The runtime
// allowlist still decides which individual files are served.
if(fs.existsSync('tools'))fs.cpSync('tools',path.join(out,'tools'),{recursive:true});
// RFC 9116 puts the canonical file at /.well-known/security.txt; the legacy
// /security.txt path is served with the same bytes for scanners that only look
// at the root. The Canonical field keeps the well-known URL authoritative.
fs.copyFileSync('.well-known/security.txt',path.join(out,'security.txt'));
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
// Immutable embed release. Customers can pin this path and verify the hash;
// the live configuration still syncs through the API, so content edits do not
// require a new script URL.
// Every published version keeps its own frozen bytes (embed-releases/<v>/);
// the current runtime ships as the newest version. Never overwrite a release.
const EMBED_CURRENT='1.2.0';
const EMBED_RELEASES={'1.1.0':'embed-releases/1.1.0/popuploom.js',[EMBED_CURRENT]:'popuploom.js'};
const embedDirs=[];
for(const [version,source] of Object.entries(EMBED_RELEASES)){
  const dir=path.join(out,'embed',version);
  fs.mkdirSync(dir,{recursive:true});
  fs.copyFileSync(source,path.join(dir,'popuploom.js'));
  embedDirs.push(dir);
}
if(!fs.readFileSync('popuploom.js','utf8').includes('Runtime.version = "'+EMBED_CURRENT+'"'))throw new Error('popuploom.js version does not match EMBED_CURRENT '+EMBED_CURRENT);
fs.cpSync('assets',path.join(out,'assets'),{recursive:true});

// Line endings must not depend on the machine that built the bundle. A Windows
// checkout writes CRLF, a Linux CI checkout writes LF, and that difference
// changed both the served bytes and the published embed checksum: a customer
// verifying /embed/1.1.0/popuploom.js against SHA256SUMS could see a mismatch
// after a perfectly ordinary deploy. Normalise every text asset to LF once,
// after all copies, so both paths produce byte-identical output. CSP hashes are
// already line-ending tolerant, so script hashes do not change.
const TEXT_ASSET=/\.(?:html?|css|js|mjs|json|xml|txt|svg|webmanifest|md|csv)$/i;
(function normaliseLineEndings(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()){normaliseLineEndings(full);continue;}
    if(!TEXT_ASSET.test(entry.name)&&!/[\\/]\.well-known[\\/]/.test(full))continue;
    const text=fs.readFileSync(full,'utf8');
    if(text.includes('\r\n'))fs.writeFileSync(full,text.replace(/\r\n/g,'\n'));
  }
})(out);

// Hash what is actually served, after normalisation, so the checksum always
// describes the published bytes.
for(const dir of embedDirs){
  const embedHash=require('crypto').createHash('sha256').update(fs.readFileSync(path.join(dir,'popuploom.js'))).digest('hex');
  fs.writeFileSync(path.join(dir,'SHA256SUMS'),embedHash+'  popuploom.js\n');
}
// The frozen 1.1.0 release must keep the exact bytes customers already pinned.
const FROZEN={'1.1.0':'d452116065ed9181726309d96306665ae1d6c95dce9bffe5ea22922ab6e50ac5'};
for(const [version,expected] of Object.entries(FROZEN)){
  const got=require('crypto').createHash('sha256').update(fs.readFileSync(path.join(out,'embed',version,'popuploom.js'))).digest('hex');
  if(got!==expected)throw new Error('Published embed '+version+' changed: '+got+' != '+expected);
}

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
