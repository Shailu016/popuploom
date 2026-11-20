/* tools/popup-html-generator.js — writes a dependency-free popup snippet from
   the visible inputs. No network calls; the page stores nothing. The preview is
   built from DOM nodes with textContent, never from the generated string. */
(function () {
  "use strict";

  var form = document.getElementById("pg-form");
  if (!form) return;

  function $(id) { return document.getElementById(id); }
  function num(id, fallback, max) {
    var n = Number($(id).value);
    if (!isFinite(n) || n < 0) return fallback;
    return Math.min(n, max);
  }
  function color(id, fallback) {
    var v = String($(id).value || "");
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
  }
  /* Only web links, mailto and same-site paths are allowed. Anything else
     (javascript:, data:) becomes "#" so a pasted value cannot run code. */
  function safeHref(v) {
    v = String(v || "").trim();
    return /^(https?:\/\/|mailto:|\/|#)/i.test(v) ? v : "#";
  }
  /* JSON string literal that is also safe inside an inline <script> block. */
  function q(v) {
    return JSON.stringify(String(v || "")).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }

  function read() {
    return {
      headline: $("pg-headline").value || "Before you go",
      body: $("pg-body").value || "",
      cta: $("pg-cta").value || "Continue",
      href: safeHref($("pg-href").value),
      accent: color("pg-accent", "#ff6a1f"),
      delay: Math.round(num("pg-delay", 5, 600)),
      days: Math.round(num("pg-days", 7, 365))
    };
  }

  function build(c) {
    return [
      "<script>",
      "(function () {",
      '  "use strict";',
      '  var KEY = "popup-last-shown";',
      "  var DELAY_MS = " + (c.delay * 1000) + ";",
      "  var COOLDOWN_MS = " + (c.days * 86400000) + ";",
      "  try {",
      "    if (Date.now() - Number(localStorage.getItem(KEY) || 0) < COOLDOWN_MS) return;",
      "  } catch (e) {}",
      "",
      "  function show() {",
      '    var back = document.createElement("div");',
      '    back.setAttribute("role", "dialog");',
      '    back.setAttribute("aria-modal", "true");',
      '    back.setAttribute("aria-label", ' + q(c.headline) + ");",
      '    back.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.6)";',
      '    var box = document.createElement("div");',
      '    box.style.cssText = "position:relative;max-width:420px;width:100%;padding:28px;border-radius:16px;background:#fff;color:#111;font-family:system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.35)";',
      '    var x = document.createElement("button");',
      '    x.type = "button";',
      '    x.setAttribute("aria-label", "Close");',
      '    x.textContent = "\\u00d7";',
      '    x.style.cssText = "position:absolute;top:10px;right:10px;width:34px;height:34px;border:0;border-radius:50%;background:#eee;color:#111;font-size:18px;cursor:pointer";',
      '    var h = document.createElement("h2");',
      "    h.textContent = " + q(c.headline) + ";",
      '    h.style.cssText = "margin:0 0 10px;font-size:24px;line-height:1.2";',
      '    var p = document.createElement("p");',
      "    p.textContent = " + q(c.body) + ";",
      '    p.style.cssText = "margin:0 0 18px;font-size:15px;line-height:1.55;color:#333";',
      '    var a = document.createElement("a");',
      "    a.href = " + q(c.href) + ";",
      "    a.textContent = " + q(c.cta) + ";",
      '    a.style.cssText = "display:block;text-align:center;padding:13px 18px;border-radius:10px;background:' + c.accent + ';color:#fff;font-weight:700;text-decoration:none";',
      "    function close() {",
      "      document.removeEventListener(\"keydown\", onKey);",
      "      back.remove();",
      "    }",
      "    function onKey(e) { if (e.key === \"Escape\") close(); }",
      '    x.addEventListener("click", close);',
      '    back.addEventListener("click", function (e) { if (e.target === back) close(); });',
      '    document.addEventListener("keydown", onKey);',
      "    box.append(x, h, p, a);",
      "    back.appendChild(box);",
      "    document.body.appendChild(back);",
      "    x.focus();",
      "    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}",
      "  }",
      "",
      "  setTimeout(show, DELAY_MS);",
      "})();",
      "</script>"
    ].join("\n");
  }

  function node(tag, css, text) {
    var n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = text;
    return n;
  }

  function preview(c) {
    var host = $("pg-preview");
    host.textContent = "";
    var box = node("div", "position:relative;max-width:420px;width:100%;padding:28px;border-radius:16px;background:#fff;color:#111;font-family:system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.35)");
    box.appendChild(node("h3", "margin:0 0 10px;font-size:24px;line-height:1.2;color:#111", c.headline));
    box.appendChild(node("p", "margin:0 0 18px;font-size:15px;line-height:1.55;color:#333", c.body));
    box.appendChild(node("span", "display:block;text-align:center;padding:13px 18px;border-radius:10px;background:" + c.accent + ";color:#fff;font-weight:700", c.cta));
    host.appendChild(box);
  }

  function render() {
    var c = read();
    $("pg-output").textContent = build(c);
    preview(c);
  }

  form.addEventListener("input", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); });

  $("pg-copy").addEventListener("click", function () {
    var text = $("pg-output").textContent;
    var done = function () { $("pg-status").textContent = "Copied. Paste it before the closing body tag."; };
    var fail = function () { $("pg-status").textContent = "Copy failed. Select the code and copy it by hand."; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fail);
    else fail();
  });

  $("pg-reset").addEventListener("click", function () {
    form.reset();
    $("pg-status").textContent = "";
    render();
  });

  render();
})();
