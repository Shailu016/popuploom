/* scripts/capture-press-screenshots.cjs
   Retakes the three product screenshots linked from press.html, from the live
   site as a signed-out guest so no account name appears in them.

   Usage: node scripts/capture-press-screenshots.cjs [origin]
   The default origin is https://popuploom.com. Set POPUPLOOM_BROWSER to a
   Chrome or Edge binary if the default paths are wrong. */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "assets", "press");
const origin = (process.argv[2] || "https://popuploom.com").replace(/\/$/, "");
const browserPath = process.env.POPUPLOOM_BROWSER || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe"
].find((candidate) => fs.existsSync(candidate));
if (!browserPath) throw new Error("No Chrome or Edge binary found. Set POPUPLOOM_BROWSER.");

(async () => {
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    // A fresh browser context has no cookies or storage, so the studio opens as a guest.
    const page = await browser.newPage();
    async function go(url) {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      await new Promise((r) => setTimeout(r, 1500));
    }
    async function shot(name) {
      await page.screenshot({ path: path.join(out, name) });
      console.log("captured", name);
    }

    await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });
    await go(origin + "/templates.html");
    await shot("popuploom-templates-desktop.png");

    await go(origin + "/studio.html?tpl=drop48");
    await shot("popuploom-studio-desktop.png");

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await go(origin + "/studio.html?tpl=drop48");
    await shot("popuploom-studio-mobile.png");
  } finally {
    await browser.close();
  }
})().catch((err) => { console.error(err); process.exit(1); });
