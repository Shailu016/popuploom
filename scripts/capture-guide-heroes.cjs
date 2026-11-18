/* Hero scenes for the top guides: a popup running on a realistic sample page.

   Each scene is a small original web page (store, grocery, blog, cart) built
   from project artwork, with the real runtime (popuploom.js) drawing a catalog
   template over it. Nothing here is a photograph, a stock image or someone
   else's product; the pages are plainly sample pages.

   Output: assets/guides/scene-<name>.webp (1200x750) and -600.webp.
   Run: node scripts/capture-guide-heroes.cjs   (needs local Chrome or Edge) */
const fs = require("fs");
const path = require("path");
const http = require("http");
const sharp = require("sharp");
const puppeteer = require("puppeteer-core");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "assets", "guides");
fs.mkdirSync(out, { recursive: true });

const browserPath = process.env.POPFORGE_BROWSER || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].find((p) => fs.existsSync(p));
if (!browserPath) throw new Error("No Chrome or Edge binary found; set POPFORGE_BROWSER");

const A = (n) => "/assets/art/" + n + ".jpg";
const CSS = `
  html, body { margin: 0; }
  #cap { position: relative !important; left: 0 !important; top: 0 !important; transform: none !important; width: 1280px !important; height: 800px !important; overflow: hidden; border-radius: 0 !important; box-shadow: none !important; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1c2026; }
  #cap .pf-root, #cap .pf-root * { animation: none !important; transition: none !important; }
  #cap .pf-preview-tag { display: none !important; }
  .nav { height: 66px; display: flex; align-items: center; gap: 30px; padding: 0 48px; background: #fff; border-bottom: 1px solid #e6e8ec; }
  .brand { font-weight: 800; font-size: 21px; letter-spacing: -.03em; }
  .nav i { font-style: normal; font-size: 14px; color: #5b6472; }
  .nav .sp { margin-left: auto; display: flex; gap: 22px; align-items: center; }
  .pill { background: #1c2026; color: #fff; font-size: 13px; padding: 9px 16px; border-radius: 999px; }
  .hero { display: grid; grid-template-columns: 1.1fr 1fr; gap: 40px; padding: 48px; align-items: center; }
  .hero h2 { font-size: 46px; line-height: 1.02; letter-spacing: -.04em; margin: 0 0 14px; }
  .hero p { font-size: 17px; line-height: 1.5; color: #5b6472; margin: 0 0 22px; max-width: 34ch; }
  .btn { display: inline-block; background: #1c2026; color: #fff; padding: 13px 22px; border-radius: 10px; font-weight: 600; font-size: 15px; }
  .btn.o { background: #fff; color: #1c2026; border: 1px solid #cfd4db; margin-left: 10px; }
  .img { border-radius: 18px; background-size: cover; background-position: center; }
  .grid { display: grid; gap: 18px; padding: 0 48px; }
  .g4 { grid-template-columns: repeat(4, 1fr); }
  .g5 { grid-template-columns: repeat(5, 1fr); }
  .card { background: #fff; border: 1px solid #e6e8ec; border-radius: 14px; padding: 12px; }
  .card .img { height: 150px; border-radius: 10px; }
  .card b { display: block; margin: 12px 0 2px; font-size: 15px; }
  .card span { font-size: 13px; color: #5b6472; }
  .tile { background: #fff; border: 1px solid #e6e8ec; border-radius: 14px; padding: 14px; text-align: center; font-size: 14px; font-weight: 600; }
  .tile .img { height: 84px; margin-bottom: 10px; border-radius: 12px; }
  .row { display: flex; align-items: center; justify-content: space-between; padding: 0 48px; margin: 6px 0 16px; }
  .row h3 { margin: 0; font-size: 22px; letter-spacing: -.02em; }
  .row span { font-size: 14px; color: #5b6472; }
  .post { display: grid; grid-template-columns: 1fr 360px; gap: 48px; padding: 44px 64px; }
  .post h2 { font-size: 40px; line-height: 1.05; letter-spacing: -.04em; margin: 0 0 14px; }
  .line { height: 12px; border-radius: 6px; background: #dfe3e9; margin: 0 0 12px; }
  .cart { display: grid; grid-template-columns: 1fr 340px; gap: 28px; padding: 36px 48px; }
  .item { display: flex; gap: 16px; background: #fff; border: 1px solid #e6e8ec; border-radius: 14px; padding: 14px; margin-bottom: 14px; align-items: center; }
  .item .img { width: 88px; height: 88px; border-radius: 10px; flex: none; }
  .item b { display: block; font-size: 16px; margin-bottom: 4px; }
  .item span { font-size: 14px; color: #5b6472; }
  .sum { background: #fff; border: 1px solid #e6e8ec; border-radius: 14px; padding: 20px; height: fit-content; }
  .sum .btn { display: block; text-align: center; margin-top: 16px; }
  .sum div { display: flex; justify-content: space-between; font-size: 15px; padding: 8px 0; }
`;
const tiles = (arr) => arr.map(([n, a]) => `<div class="tile"><div class="img" style="background-image:url(${A(a)})"></div>${n}</div>`).join("");
const cards = (arr) => arr.map(([n, p, a]) => `<div class="card"><div class="img" style="background-image:url(${A(a)})"></div><b>${n}</b><span>${p}</span></div>`).join("");

const SCENES = {
  store: {
    tpl: "drop48",
    bg: "#f6f5f2",
    html: `<div class="nav"><span class="brand">Northfield</span><i>Shop</i><i>New in</i><i>Sale</i><div class="sp"><i>Search</i><span class="pill">Cart (2)</span></div></div>
      <div class="hero"><div><h2>Everyday pieces, made to last</h2><p>A sample storefront page used to show a popup in context.</p><span class="btn">Shop the range</span><span class="btn o">Our story</span></div><div class="img" style="height:300px;background-image:url(${A("amber-arch")})"></div></div>
      <div class="row"><h3>Popular this week</h3><span>View all</span></div>
      <div class="grid g4">${cards([["Canvas tote", "$38", "linen-arch"], ["Ceramic mug set", "$46", "morning-horizon"], ["Wool throw", "$92", "harvest-horizon"], ["Desk lamp", "$64", "sage-paper"]])}</div>`
  },
  grocery: {
    tpl: "barnews",
    cfg: { content: { title: "Sample notice: check if we deliver to your area", body: "Enter a postcode on the next page. Sample copy; the owner sets real delivery terms.", buttonText: "Check my area" } },
    bg: "#f4f8f5",
    html: `<div class="nav"><span class="brand" style="color:#0f7a4c">Freshly</span><i>Groceries</i><i>Dairy</i><i>Snacks</i><div class="sp"><i>Deliver to: Add address</i><span class="pill" style="background:#0f7a4c">Basket</span></div></div>
      <div class="hero" style="padding-top:34px"><div><h2>Groceries at your door, fast</h2><p>A sample grocery page. Delivery times depend on your address.</p><span class="btn" style="background:#0f7a4c">Start shopping</span></div><div class="img" style="height:250px;background-image:url(${A("frost-horizon")})"></div></div>
      <div class="row"><h3>Shop by aisle</h3><span>All categories</span></div>
      <div class="grid g5">${tiles([["Fruit", "frost-horizon"], ["Bakery", "morning-horizon"], ["Dairy", "sage-paper"], ["Pantry", "harvest-horizon"], ["Drinks", "lagoon-waves"]])}</div>`
  },
  blog: {
    tpl: "leadShelf",
    bg: "#fbf9f4",
    html: `<div class="nav"><span class="brand">The Field Guide</span><i>Articles</i><i>Guides</i><i>About</i><div class="sp"><span class="pill">Subscribe</span></div></div>
      <div class="post"><div><div class="img" style="height:210px;margin-bottom:26px;background-image:url(${A("ink-arch")})"></div><h2>How small teams plan a launch week</h2><div class="line" style="width:92%"></div><div class="line" style="width:86%"></div><div class="line" style="width:94%"></div><div class="line" style="width:70%"></div><div class="line" style="width:90%;margin-top:22px"></div><div class="line" style="width:84%"></div><div class="line" style="width:60%"></div></div>
      <div><div class="card" style="padding:18px"><b>Popular reads</b><div class="line" style="margin-top:14px;width:90%"></div><div class="line" style="width:78%"></div><div class="line" style="width:86%"></div></div></div></div>`
  },
  cart: {
    tpl: "cartRescue",
    bg: "#f6f5f2",
    html: `<div class="nav"><span class="brand">Northfield</span><i>Shop</i><i>Sale</i><div class="sp"><span class="pill">Cart (2)</span></div></div>
      <div class="cart"><div><h3 style="margin:0 0 16px;font-size:26px;letter-spacing:-.03em">Your cart</h3>
        <div class="item"><div class="img" style="background-image:url(${A("linen-arch")})"></div><div><b>Canvas tote</b><span>Natural, one size</span></div></div>
        <div class="item"><div class="img" style="background-image:url(${A("morning-horizon")})"></div><div><b>Ceramic mug set</b><span>Set of four</span></div></div></div>
        <div class="sum"><div><span>Subtotal</span><b>$84.00</b></div><div><span>Shipping</span><span>Calculated next</span></div><span class="btn">Checkout</span></div></div>`
  },
  welcome: {
    tpl: "firstCode",
    bg: "#f6f5f2",
    html: `<div class="nav"><span class="brand">Northfield</span><i>Shop</i><i>New in</i><i>Journal</i><div class="sp"><span class="pill">Cart (0)</span></div></div>
      <div class="hero"><div><h2>Quiet, well-made essentials</h2><p>A sample storefront page used to show a signup popup in context.</p><span class="btn">Browse the shop</span></div><div class="img" style="height:320px;background-image:url(${A("sage-paper")})"></div></div>
      <div class="grid g4">${cards([["Linen shirt", "$78", "linen-arch"], ["Stoneware bowl", "$34", "harvest-horizon"], ["Candle", "$28", "amber-arch"], ["Throw pillow", "$42", "rose-waves"]])}</div>`
  }
};

(async () => {
  process.env.NODE_ENV = process.env.NODE_ENV || "development";
  const app = require(path.join(root, "server", "index.js"));
  const server = await new Promise((r) => { const s = http.createServer(app).listen(0, "127.0.0.1", () => r(s)); });
  const origin = "http://127.0.0.1:" + server.address().port;
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  let n = 0;
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1.5 });
    await page.goto(origin + "/studio.html?tpl=blank", { waitUntil: "networkidle0", timeout: 60000 });
    await page.evaluate((css) => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }, CSS);
    for (const [name, sc] of Object.entries(SCENES)) {
      await page.evaluate((scene) => {
        document.body.innerHTML = "";
        document.body.style.cssText = "margin:0;overflow:hidden";
        const cap = document.createElement("div");
        cap.id = "cap";
        cap.className = "pf-stage tpl-canvas";
        cap.style.background = scene.bg;
        cap.innerHTML = scene.html;
        document.body.appendChild(cap);
        const cfg = PF.cfgFor(scene.tpl);
        if (scene.cfg && scene.cfg.content) Object.assign(cfg.content, scene.cfg.content);
        window.__inst = PopupLoom.preview(cap, cfg);
      }, sc);
      await page.evaluate(() => Promise.all(Array.from(document.images).concat([]).map((img) => img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
      await new Promise((r) => setTimeout(r, 700));
      const png = await (await page.$("#cap")).screenshot({ type: "png" });
      await sharp(png).resize(1200, 750).webp({ quality: 84 }).toFile(path.join(out, "scene-" + name + ".webp"));
      await sharp(png).resize(600, 375).webp({ quality: 80 }).toFile(path.join(out, "scene-" + name + "-600.webp"));
      n++;
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log("captured " + n + " guide hero scenes into assets/guides");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
