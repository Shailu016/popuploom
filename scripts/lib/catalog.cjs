/* Loads the template catalog straight from app.js, the file the studio and
   homepage gallery run on. Page generators read names, blurbs and configs from
   here instead of scraping an HTML page, so a renamed template or a new blurb
   can never drift between the app and the public template pages. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..", "..");

function loadCatalog() {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const storage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const window = {
    location: { origin: "https://popuploom.com", href: "https://popuploom.com/", hostname: "popuploom.com", protocol: "https:" },
    localStorage: storage,
    addEventListener: () => {},
    crypto: undefined
  };
  const document = { querySelectorAll: () => [], getElementById: () => null, addEventListener: () => {}, createElement: () => ({ style: {} }) };
  const sandbox = { window, document, localStorage: storage, console, setTimeout, clearTimeout, URL, Promise, JSON, Date, Math };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "app.js" });
  const PF = window.PF;
  if (!PF || !Array.isArray(PF.templates)) throw new Error("app.js did not expose window.PF.templates");
  // Copy out of the sandbox realm so callers get plain objects.
  return JSON.parse(JSON.stringify({ templates: PF.templates, journeys: PF.journeys }));
}

module.exports = { loadCatalog, root };
