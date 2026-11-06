// Lightweight tracked-file secret scan for CI. This is not a replacement for a
// dedicated scanner; it catches the credential shapes most likely to be
// committed to this repository without adding a network dependency.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const skip = /^(package-lock\.json|\.cf-build\/|node_modules\/|private-data\/|\.git\/)/;
const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => !skip.test(file));

const patterns = [
  ["private key block", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Stripe live secret", /\bsk_live_[0-9A-Za-z]{20,}\b/],
  ["Resend API key", /\bre_[0-9A-Za-z]{20,}\b/],
  ["assigned JWT secret", /\bJWT_SECRET\s*=\s*["']?[0-9A-Za-z_\-]{32,}/],
  ["assigned Resend key", /\bRESEND_API_KEY\s*=\s*["']?[0-9A-Za-z_\-]{16,}/],
  ["assigned Cloudflare token", /\bCLOUDFLARE_API_TOKEN\s*=\s*["']?[0-9A-Za-z_\-]{20,}/],
];

const allow = [
  /process\.env/,
  /\.env\.example/,
  /example|placeholder|change-me|your[-_]/i,
  /test[-_]?(key|secret|token)/i,
  /x{8,}/i,
];

let findings = 0;
for (const file of files) {
  let text;
  try { text = fs.readFileSync(path.join(root, file), "utf8"); } catch (e) { continue; }
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const [name, re] of patterns) {
      if (!re.test(line)) continue;
      if (allow.some((rx) => rx.test(line))) continue;
      findings++;
      console.error(file + ":" + (i + 1) + " possible " + name);
    }
  }
}

if (findings) {
  console.error("Secret scan failed: " + findings + " possible credential(s).");
  process.exit(1);
}
console.log("Secret scan: no credential-shaped strings in tracked files.");
