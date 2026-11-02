// shared/verification.js — Search Console / Bing site-verification support.
// Values always come from the owner (GitHub Actions secret or local env); no
// token is ever invented here. Used by the production build (meta injection)
// and by both runtimes' static allowlists (verification drop files).
const FILE_RE = /^google[a-z0-9]{12,32}\.html$|^BingSiteAuth\.xml$/i;

// Returns true for the exact file names Search Console and Bing hand out.
function verificationFile(name) {
  return FILE_RE.test(String(name || ""));
}

// Parses SITE_VERIFICATION_METAS = "name=content,name=content".
// Rejects anything that is not a safe attribute value, and anything that
// could smuggle HTML, so injection is impossible by construction.
function verificationMetas(env) {
  const raw = String((env || {}).SITE_VERIFICATION_METAS || "");
  return raw.split(",").map(v => v.trim()).filter(Boolean).map(pair => {
    const eq = pair.indexOf("=");
    if (eq <= 0) return null;
    const name = pair.slice(0, eq).trim();
    const content = pair.slice(eq + 1).trim();
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(name) || !/^[A-Za-z0-9._-]{1,200}$/.test(content)) return null;
    return { name, content };
  }).filter(Boolean);
}

// Pre-rendered meta tags for build-time injection into public HTML heads.
function metaTags(env) {
  return verificationMetas(env).map(m => `<meta name="${m.name}" content="${m.content}">`).join("");
}

module.exports = { verificationFile, verificationMetas, metaTags };
