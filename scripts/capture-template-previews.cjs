/* Renders a static preview image of every catalog template.

   Each template is drawn by the real runtime (popuploom.js) in its real
   placement over a neutral sample website, then saved as:
     assets/templates/<id>.webp      1200x750, gallery and detail pages
     assets/templates/<id>-600.webp   600x375, srcset for narrow cards
     assets/templates/<id>.jpg       1200x750, Open Graph / Twitter cards
   The images make the template pages useful without JavaScript and give
   search engines something to index for each design.

   Run after changing app.js templates or popuploom.js styles:
     node scripts/capture-template-previews.cjs
   Needs a local Chrome or Edge (set POPFORGE_BROWSER to override). */
const fs = require("fs");
const path = require("path");
const http = require("http");
const sharp = require("sharp");
const puppeteer = require("puppeteer-core");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "assets", "templates");
fs.mkdirSync(out, { recursive: true });

const browserPath = process.env.POPFORGE_BROWSER || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].find((candidate) => fs.existsSync(candidate));
if (!browserPath) throw new Error("No Chrome or Edge binary found; set POPFORGE_BROWSER");

/* The sample website behind each popup: quiet, brand-neutral, clearly a mock. */
const PAGE_CSS = `
  html, body { margin: 0; background: #fff; }
  #cap { position: relative !important; left: 0 !important; top: 0 !important; transform: none !important;
         width: 1280px !important; height: 800px !important; overflow: hidden; border-radius: 0 !important;
         box-shadow: none !important; background: #F4F5F7 !important; font-family: system-ui, sans-serif; }
  #cap .pf-root, #cap .pf-root * { animation: none !important; transition: none !important; }
  #cap .pf-preview-tag { display: none !important; }
  .mk-nav { height: 64px; background: #fff; border-bottom: 1px solid #E6E8EC; display: flex; align-items: center; gap: 28px; padding: 0 48px; }
  .mk-logo { width: 116px; height: 22px; border-radius: 6px; background: #1C2026; }
  .mk-link { width: 64px; height: 10px; border-radius: 5px; background: #D5D9E0; }
  .mk-cta { margin-left: auto; width: 120px; height: 38px; border-radius: 8px; background: #1C2026; }
  .mk-hero { display: grid; grid-template-columns: 1.1fr 1fr; gap: 48px; padding: 64px 48px 0; }
  .mk-h { height: 40px; border-radius: 8px; background: #CDD2DA; margin-bottom: 16px; }
  .mk-p { height: 14px; border-radius: 7px; background: #DDE1E7; margin-bottom: 12px; }
  .mk-btns { display: flex; gap: 12px; margin-top: 30px; }
  .mk-btns i { display: block; width: 150px; height: 46px; border-radius: 10px; background: #1C2026; }
  .mk-btns i + i { background: #fff; border: 1px solid #D5D9E0; }
  .mk-img { height: 320px; border-radius: 16px; background: linear-gradient(135deg, #E3E6EB, #D3D8DF); }
  .mk-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 48px 48px 0; }
  .mk-cards div { height: 220px; border-radius: 14px; background: #fff; border: 1px solid #E6E8EC; }
`;
const PAGE_HTML = `
  <div class="mk-nav"><span class="mk-logo"></span><span class="mk-link"></span><span class="mk-link"></span><span class="mk-link"></span><span class="mk-cta"></span></div>
  <div class="mk-hero"><div><div class="mk-h" style="width:88%"></div><div class="mk-h" style="width:62%"></div>
    <div class="mk-p" style="width:80%;margin-top:28px"></div><div class="mk-p" style="width:70%"></div><div class="mk-p" style="width:52%"></div>
    <div class="mk-btns"><i></i><i></i></div></div><div class="mk-img"></div></div>
  <div class="mk-cards"><div></div><div></div><div></div><div></div></div>`;

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app).listen(0, "127.0.0.1", () => resolve(server));
  });
}

(async () => {
  process.env.NODE_ENV = process.env.NODE_ENV || "development";
  const app = require(path.join(root, "server", "index.js"));
  const server = await listen(app);
  const origin = "http://127.0.0.1:" + server.address().port;
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  let count = 0;
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1.5 });
    // The studio page already loads the catalog (app.js) and the runtime.
    await page.goto(origin + "/studio.html?tpl=blank", { waitUntil: "networkidle0", timeout: 60000 });
    const ids = await page.evaluate(() => PF.templates.map((t) => t.id));
    await page.evaluate((css) => {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
    }, PAGE_CSS);
    for (const id of ids) {
      await page.evaluate((tplId, html) => {
        document.body.innerHTML = "";
        document.body.style.cssText = "margin:0;overflow:hidden";
        const cap = document.createElement("div");
        cap.id = "cap";
        // tpl-canvas makes the runtime draw an inert poster instead of a live video player.
        cap.className = "pf-stage tpl-canvas";
        cap.innerHTML = html;
        document.body.appendChild(cap);
        const cfg = PF.cfgFor(tplId);
        window.__inst = PopupLoom.preview(cap, cfg);
      }, id, PAGE_HTML);
      await page.evaluate(() => Promise.all(Array.from(document.images).map((img) => img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
      await new Promise((r) => setTimeout(r, 150));
      const el = await page.$("#cap");
      const png = await el.screenshot({ type: "png" });
      const base = sharp(png).resize(1200, 750);
      await base.clone().webp({ quality: 82 }).toFile(path.join(out, id + ".webp"));
      await sharp(png).resize(600, 375).webp({ quality: 80 }).toFile(path.join(out, id + "-600.webp"));
      await base.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(out, id + ".jpg"));
      count++;
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log("captured " + count + " template previews into assets/templates");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
