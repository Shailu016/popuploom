/* tools/exit-intent-generator.js — writes a dependency-free desktop
   exit-intent snippet from the visible inputs. No network calls, no storage
   beyond the preview's own state. */
(function () {
  "use strict";

  var form = document.getElementById("xg-form");
  if (!form) return;

  var ids = {
    sensitivity: "xg-sensitivity",
    delay: "xg-delay",
    cooldown: "xg-cooldown",
    color: "xg-color",
    headline: "xg-headline",
    body: "xg-body",
    cta: "xg-cta"
  };

  function el(name) { return document.getElementById(ids[name]); }
  function val(name) { return el(name).value; }
  function num(name, fallback) {
    var n = Number(val(name));
    return isFinite(n) && n >= 0 ? n : fallback;
  }

  function hexToRgba(hex, alpha) {
    var h = String(hex || "#111827").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (!isFinite(n)) n = 0x111827;
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function q(value) { return JSON.stringify(String(value || "")); }

  function build() {
    var sensitivity = Math.round(num("sensitivity", 20));
    var delay = Math.round(num("delay", 5) * 1000);
    var cooldown = Math.round(num("cooldown", 7) * 86400000);
    var overlay = hexToRgba(val("color"), 0.78);
    var headline = q(val("headline") || "Wait — before you go");
    var body = q(val("body") || "");
    var cta = q(val("cta") || "Continue");

    return [
      "(function () {",
      '  "use strict";',
      "  // Desktop exit intent. Touch devices never see this.",
      '  var KEY = "pl-exit-intent";',
      "  var SENSITIVITY = " + sensitivity + ";",
      "  var MIN_TIME_MS = " + delay + ";",
      "  var COOLDOWN_MS = " + cooldown + ";",
      "",
      '  if (window.matchMedia && !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;',
      "  try {",
      "    var last = Number(window.localStorage.getItem(KEY) || 0);",
      "    if (Date.now() - last < COOLDOWN_MS) return;",
      "  } catch (e) {}",
      "",
      "  var shown = false;",
      "  var started = Date.now();",
      '  var overlay = document.createElement("div");',
      '  overlay.setAttribute("role", "dialog");',
      '  overlay.setAttribute("aria-modal", "true");',
      '  overlay.setAttribute("aria-label", "Offer");',
      '  overlay.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;background:' + overlay + '";',
      '  var panel = document.createElement("div");',
      '  panel.style.cssText = "max-width:420px;width:100%;padding:28px;border-radius:18px;background:#fff;color:#111;position:relative;font-family:system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.35)";',
      '  var close = document.createElement("button");',
      '  close.type = "button";',
      '  close.setAttribute("aria-label", "Close");',
      '  close.textContent = "\\u00d7";',
      '  close.style.cssText = "position:absolute;top:10px;right:10px;width:34px;height:34px;border:0;border-radius:50%;background:#eee;color:#111;font-size:18px;cursor:pointer";',
      '  var h = document.createElement("h2");',
      "  h.textContent = " + headline + ";",
      '  h.style.cssText = "margin:0 0 10px;font-size:24px;line-height:1.2";',
      '  var p = document.createElement("p");',
      "  p.textContent = " + body + ";",
      '  p.style.cssText = "margin:0 0 18px;font-size:15px;line-height:1.55;color:#333";',
      '  var cta = document.createElement("button");',
      '  cta.type = "button";',
      "  cta.textContent = " + cta + ";",
      '  cta.style.cssText = "display:block;width:100%;padding:13px 18px;border:0;border-radius:10px;background:#111;color:#fff;font:inherit;font-weight:700;cursor:pointer";',
      '  cta.addEventListener("click", function () {',
      "    // Replace this with your form, link or checkout step.",
      "    closeOverlay();",
      "  });",
      "  panel.appendChild(close);",
      "  panel.appendChild(h);",
      "  panel.appendChild(p);",
      "  panel.appendChild(cta);",
      "  overlay.appendChild(panel);",
      "",
      "  function closeOverlay() {",
      "    if (!shown) return;",
      "    shown = false;",
      "    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);",
      '    document.removeEventListener("keydown", onKey);',
      "  }",
      "  function onKey(e) { if (e.key === \"Escape\") closeOverlay(); }",
      "  function onExit(e) {",
      "    if (shown) return;",
      "    if (Date.now() - started < MIN_TIME_MS) return;",
      "    if (e.relatedTarget || e.toElement) return;",
      "    if (e.clientY > SENSITIVITY) return;",
      "    shown = true;",
      '    try { window.localStorage.setItem(KEY, String(Date.now())); } catch (err) {}',
      "    document.body.appendChild(overlay);",
      "    close.focus();",
      "  }",
      "",
      '  close.addEventListener("click", closeOverlay);',
      '  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeOverlay(); });',
      '  document.addEventListener("keydown", onKey);',
      '  document.addEventListener("mouseout", onExit);',
      "})();"
    ].join("\n");
  }

  function render() {
    document.getElementById("xg-output").textContent = build();
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);

  var copyBtn = document.getElementById("xg-copy");
  var status = document.getElementById("xg-status");
  copyBtn.addEventListener("click", function () {
    var text = build();
    function done() {
      status.textContent = "Copied. Paste it before </body> and test on a desktop.";
      setTimeout(function () { status.textContent = ""; }, 4000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "readonly");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { status.textContent = "Copy failed. Select the code and copy it manually."; }
      document.body.removeChild(ta);
    }
  });

  var resetBtn = document.getElementById("xg-reset");
  resetBtn.addEventListener("click", function () {
    document.getElementById("xg-sensitivity").value = "20";
    document.getElementById("xg-delay").value = "5";
    document.getElementById("xg-cooldown").value = "7";
    document.getElementById("xg-color").value = "#111827";
    document.getElementById("xg-headline").value = "Wait — before you go";
    document.getElementById("xg-cta").value = "Get 10% off";
    document.getElementById("xg-body").value = "Enter your email and we will send the code. One use per customer.";
    render();
  });

  var preview = document.getElementById("xg-preview");
  var previewClose = document.getElementById("xg-preview-close");
  var lastFocus = null;

  function openPreview() {
    document.getElementById("xg-preview-headline").textContent = val("headline") || "Wait — before you go";
    document.getElementById("xg-preview-body").textContent = val("body") || "";
    document.getElementById("xg-preview-cta").textContent = val("cta") || "Continue";
    lastFocus = document.activeElement;
    preview.classList.add("on");
    preview.setAttribute("aria-hidden", "false");
    previewClose.focus();
  }
  function closePreview() {
    preview.classList.remove("on");
    preview.setAttribute("aria-hidden", "true");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.getElementById("xg-preview-btn").addEventListener("click", openPreview);
  previewClose.addEventListener("click", closePreview);
  preview.addEventListener("click", function (e) { if (e.target === preview) closePreview(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && preview.classList.contains("on")) closePreview();
  });

  render();
})();
