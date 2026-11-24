/* scripts/build-plugin-assets.cjs
   Draws the WordPress.org plugin icon and banner from the PopupLoom mark and the
   site's own self-hosted fonts. Original artwork, no stock images.

   Output goes to wordpress-plugin/assets/ (not into the plugin ZIP):
     icon-128x128.png, icon-256x256.png, banner-772x250.png, banner-1544x500.png
   Usage: node scripts/build-plugin-assets.cjs
   Set POPUPLOOM_BROWSER to a Chrome or Edge binary if the default paths are wrong. */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "wordpress-plugin", "assets");
fs.mkdirSync(out, { recursive: true });
const fontUrl = (name) => "file:///" + path.join(root, "assets", "fonts", name).replace(/\\/g, "/");
const browserPath = process.env.POPUPLOOM_BROWSER || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe"
].find((p) => fs.existsSync(p));
if (!browserPath) throw new Error("No Chrome or Edge binary found. Set POPUPLOOM_BROWSER.");

const MARK = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="16" fill="#0A0B10"/><g fill="none" stroke-linecap="round" stroke-width="5.6"><circle cx="24.4" cy="32" r="10.8" stroke="#FF9B63"/><circle cx="39.6" cy="32" r="10.8" stroke="#FF6A1F"/></g></svg>`;

const FONTS = `@font-face{font-family:B;src:url(${fontUrl("bricolage-grotesque-normal-latin.a79fdb52d4.woff2")});font-weight:200 800}
@font-face{font-family:G;src:url(${fontUrl("geist-normal-latin.19f9c92546.woff2")});font-weight:100 900}`;

const iconHtml = (s) => `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style>${MARK(s)}`;

const bannerHtml = (w, h) => `<!doctype html><meta charset="utf-8"><style>${FONTS}
*{box-sizing:border-box}html,body{margin:0}
body{width:${w}px;height:${h}px;overflow:hidden;position:relative;font-family:G,system-ui,sans-serif;color:#fff;
background:radial-gradient(ellipse 60% 120% at 88% 40%,rgba(255,106,31,.34),transparent 62%),radial-gradient(ellipse 40% 80% at 8% 100%,rgba(255,155,99,.14),transparent 70%),#0A0B10}
.copy{position:absolute;left:${h * 0.16}px;top:50%;transform:translateY(-50%);max-width:${w * 0.52}px}
.brand{display:flex;align-items:center;gap:${h * 0.05}px;margin-bottom:${h * 0.07}px}
.brand svg{width:${h * 0.15}px;height:${h * 0.15}px}
.brand b{font:700 ${h * 0.11}px/1 B,sans-serif;letter-spacing:-.02em}
.brand b i{font-style:normal;color:#FF6A1F}
h1{font:700 ${h * 0.115}px/1.08 B,sans-serif;letter-spacing:-.02em;margin:0 0 ${h * 0.05}px}
p{margin:0;font-size:${h * 0.058}px;line-height:1.45;color:#C9CBD4}
.pill{display:inline-block;margin-top:${h * 0.07}px;padding:${h * 0.02}px ${h * 0.045}px;border:1px solid rgba(255,106,31,.6);border-radius:999px;font-size:${h * 0.05}px;color:#FFB287}
.card{position:absolute;right:${w * 0.07}px;top:50%;transform:translateY(-50%) rotate(2deg);width:${w * 0.27}px;padding:${h * 0.075}px;border-radius:${h * 0.05}px;background:#fff;color:#111;box-shadow:0 ${h * 0.08}px ${h * 0.2}px rgba(0,0,0,.5)}
.card .x{position:absolute;right:${h * 0.04}px;top:${h * 0.03}px;font-size:${h * 0.06}px;color:#999}
.card .t{font:700 ${h * 0.07}px/1.15 B,sans-serif;margin-bottom:${h * 0.03}px}
.card .s{font-size:${h * 0.04}px;color:#555;margin-bottom:${h * 0.05}px;line-height:1.4}
.card .f{height:${h * 0.075}px;border:1px solid #D6D8E0;border-radius:${h * 0.02}px;margin-bottom:${h * 0.03}px;padding:${h * 0.02}px ${h * 0.03}px;font-size:${h * 0.036}px;color:#9A9CA8}
.card .b{height:${h * 0.085}px;border-radius:${h * 0.022}px;background:#FF6A1F;color:#fff;font-weight:700;font-size:${h * 0.04}px;display:flex;align-items:center;justify-content:center}
</style>
<div class="copy"><div class="brand">${MARK(100)}<b>Popup<i>Loom</i></b></div>
<h1>Popups for WordPress, built free in the studio</h1>
<p>Paste one widget ID. Templates, triggers and a lead inbox, with no pageview cap.</p>
<span class="pill">Free · no credit card</span></div>
<div class="card"><span class="x">×</span><div class="t">Join the list for first access</div><div class="s">Sample popup. Replace the words with your own.</div><div class="f">you@example.com</div><div class="b">Send details</div></div>`;

(async () => {
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ["--no-sandbox", "--allow-file-access-from-files"] });
  try {
    const page = await browser.newPage();
    async function shot(html, w, h, file, transparent) {
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      const tmp = path.join(out, "_tmp.html");
      fs.writeFileSync(tmp, html);
      await page.goto("file:///" + tmp.replace(/\\/g, "/"), { waitUntil: "networkidle0" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(out, file), omitBackground: !!transparent, clip: { x: 0, y: 0, width: w, height: h } });
      fs.unlinkSync(tmp);
      console.log("wrote", file);
    }
    await shot(iconHtml(256), 256, 256, "icon-256x256.png", true);
    await shot(iconHtml(128), 128, 128, "icon-128x128.png", true);
    await shot(bannerHtml(1544, 500), 1544, 500, "banner-1544x500.png");
    await shot(bannerHtml(772, 250), 772, 250, "banner-772x250.png");
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
