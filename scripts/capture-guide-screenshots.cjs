const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "assets", "guides");
const browserPath = process.env.POPUPLOOM_BROWSER || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
].find((candidate) => fs.existsSync(candidate));
if (!browserPath) throw new Error("No Chrome or Edge binary found");

(async () => {
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });

    async function go(url) {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      await new Promise((r) => setTimeout(r, 1200));
    }

    await go("https://popuploom.com/");
    await page.screenshot({ path: path.join(out, "home-hero-desktop.png") });
    console.log("captured home-hero-desktop.png");

    await go("https://popuploom.com/studio.html?tpl=drop48");
    await page.click('[data-p="publish"]');
    await new Promise((r) => setTimeout(r, 900));
    await page.screenshot({ path: path.join(out, "studio-publish-guest.png") });
    console.log("captured studio-publish-guest.png");

    await go("https://popuploom.com/studio.html?tpl=leadShelf");
    await page.screenshot({ path: path.join(out, "studio-editor-lead-shelf.png") });
    console.log("captured studio-editor-lead-shelf.png");

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await go("https://popuploom.com/templates.html");
    await page.evaluate(() => {
      const heading = document.querySelector("main h2");
      if (heading) window.scrollTo(0, heading.getBoundingClientRect().top + window.scrollY - 24);
    });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(out, "template-catalog-mobile.png") });
    console.log("captured template-catalog-mobile.png");
  } finally {
    await browser.close();
  }
})();
