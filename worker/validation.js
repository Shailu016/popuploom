// worker/validation.js — verbatim port of server/validation.js (no Node deps)
function object(value) { return !!value && typeof value === "object" && !Array.isArray(value); }
function validateConfig(cfg) {
  if (!object(cfg)) return "config must be an object";
  const shapeError = validateShape(cfg);
  if (shapeError) return shapeError;
  if (new TextEncoder().encode(JSON.stringify(cfg)).length > 131072) return "config is too large (128 KB maximum)";
  for (const key of ["theme", "content", "trigger", "devices", "sticky", "pages"]) {
    if (cfg[key] !== undefined && !object(cfg[key])) return key + " must be an object";
  }
  const options = { placement: ["modal", "fullscreen", "slide:br", "slide:bl", "slide:tr", "slide:tl", "topbar", "bottombar"], frequency: ["always", "once:day", "once:week", "once:ever", "close24h"] };
  for (const [key, allowed] of Object.entries(options)) if (cfg[key] !== undefined && !allowed.includes(cfg[key])) return "Invalid " + key;
  if (cfg.credit !== undefined && typeof cfg.credit !== "boolean") return "credit must be a boolean";
  if (cfg.trigger?.type !== undefined && !["load", "delay", "scrollPct", "scrollTo", "click", "exitIntent"].includes(cfg.trigger.type)) return "Invalid trigger type";
  if (cfg.pages) {
    if (cfg.pages.mode !== undefined && !["all", "include", "exclude"].includes(cfg.pages.mode)) return "Invalid page mode";
    for (const key of ["include", "exclude"]) if (cfg.pages[key] !== undefined && (!Array.isArray(cfg.pages[key]) || cfg.pages[key].length > 100 || cfg.pages[key].some(v => typeof v !== "string" || v.length > 2048))) return "Invalid page patterns";
  }
  const content = cfg.content || {};
  for (const key of ["form", "spin", "proof", "ageGate", "coupon", "countdown"]) if (content[key] != null && !object(content[key])) return key + " must be an object";
  const lists = [[content.choices, "choices"], [content.links, "links"], [content.form?.fields, "fields"], [content.spin?.segments, "segments"], [content.proof?.items, "proof items"]];
  for (const [list, name] of lists) if (list != null && (!Array.isArray(list) || list.length > 50 || list.some(v => !object(v)))) return "Invalid " + name;
  const names = new Set();
  for (const field of content.form?.fields || []) {
    if (typeof field.name !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(field.name) || names.has(field.name) || ["__proto__", "constructor", "prototype"].includes(field.name)) return "Form field names must be unique letters, numbers, underscores or hyphens";
    names.add(field.name);
  }
  return null;
}
function validateShape(cfg) {
  let count = 0;
  function scan(value, depth) {
    if (++count > 5000 || depth > 12) return false;
    if (!value || typeof value !== "object") return true;
    for (const [key, entry] of Object.entries(value)) {
      if (["__proto__", "constructor", "prototype"].includes(key) || !scan(entry, depth + 1)) return false;
    }
    return true;
  }
  return scan(cfg, 0) ? null : "Config is too complex or contains unsafe keys";
}
module.exports = { object, validateConfig, validateShape };
