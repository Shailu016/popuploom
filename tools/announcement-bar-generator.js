/* tools/announcement-bar-generator.js — writes a dependency-free sticky
   announcement bar from the visible inputs. No network calls; the page stores
   nothing. The preview is built from DOM nodes with textContent. */
(function () {
  "use strict";

  var form = document.getElementById("ab-form");
  if (!form) return;

  function $(id) { return document.getElementById(id); }
  function color(id, fallback) {
    var v = String($(id).value || "");
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
  }
  function safeHref(v) {
    v = String(v || "").trim();
    if (!v) return "";
    return /^(https?:\/\/|mailto:|\/|#)/i.test(v) ? v : "";
  }
  function q(v) {
    return JSON.stringify(String(v || "")).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }

  function read() {
    var days = Number($("ab-days").value);
    return {
      text: $("ab-text").value || "Your announcement",
      link: $("ab-link").value || "",
      href: safeHref($("ab-href").value),
      bg: color("ab-bg", "#111827"),
      fg: color("ab-fg", "#ffffff"),
      pos: $("ab-pos").value === "bottom" ? "bottom" : "top",
      dismiss: $("ab-dismiss").checked,
      days: isFinite(days) && days >= 0 ? Math.min(Math.round(days), 365) : 3
    };
  }

  function build(c) {
    var edge = c.pos === "bottom" ? "bottom:0" : "top:0";
    var lines = [
      "<script>",
      "(function () {",
      '  "use strict";',
      '  var KEY = "announcement-dismissed";',
      "  var HIDE_MS = " + (c.days * 86400000) + ";"
    ];
    if (c.dismiss) {
      lines.push(
        "  try {",
        "    if (Date.now() - Number(localStorage.getItem(KEY) || 0) < HIDE_MS) return;",
        "  } catch (e) {}"
      );
    }
    lines.push(
      "",
      '  var bar = document.createElement("div");',
      '  bar.setAttribute("role", "region");',
      '  bar.setAttribute("aria-label", "Announcement");',
      '  bar.style.cssText = "position:fixed;left:0;right:0;' + edge + ';z-index:2147483000;display:flex;align-items:center;justify-content:center;gap:14px;padding:10px 44px 10px 16px;background:' + c.bg + ';color:' + c.fg + ';font:600 14px/1.4 system-ui,sans-serif;text-align:center";',
      '  var t = document.createElement("span");',
      "  t.textContent = " + q(c.text) + ";",
      "  bar.appendChild(t);"
    );
    if (c.href && c.link) {
      lines.push(
        '  var a = document.createElement("a");',
        "  a.href = " + q(c.href) + ";",
        "  a.textContent = " + q(c.link) + ";",
        '  a.style.cssText = "color:inherit;text-decoration:underline";',
        "  bar.appendChild(a);"
      );
    }
    if (c.dismiss) {
      lines.push(
        '  var x = document.createElement("button");',
        '  x.type = "button";',
        '  x.setAttribute("aria-label", "Dismiss announcement");',
        '  x.textContent = "\\u00d7";',
        '  x.style.cssText = "position:absolute;right:8px;top:50%;transform:translateY(-50%);width:30px;height:30px;border:0;border-radius:50%;background:transparent;color:inherit;font-size:18px;cursor:pointer";',
        '  x.addEventListener("click", function () {',
        "    bar.remove();",
        "    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}",
        "  });",
        "  bar.appendChild(x);"
      );
    }
    lines.push(
      "  document.body.appendChild(bar);",
      "})();",
      "</script>"
    );
    return lines.join("\n");
  }

  function preview(c) {
    var host = $("ab-preview");
    host.textContent = "";
    var bar = document.createElement("div");
    bar.style.cssText = "display:flex;align-items:center;justify-content:center;gap:14px;padding:10px 44px 10px 16px;background:" + c.bg + ";color:" + c.fg + ";font:600 14px/1.4 system-ui,sans-serif;text-align:center;position:relative;border-radius:8px";
    var t = document.createElement("span");
    t.textContent = c.text;
    bar.appendChild(t);
    if (c.href && c.link) {
      var a = document.createElement("span");
      a.style.cssText = "text-decoration:underline";
      a.textContent = c.link;
      bar.appendChild(a);
    }
    if (c.dismiss) {
      var x = document.createElement("span");
      x.setAttribute("aria-hidden", "true");
      x.style.cssText = "position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:18px";
      x.textContent = "×";
      bar.appendChild(x);
    }
    host.appendChild(bar);
  }

  function render() {
    var c = read();
    $("ab-output").textContent = build(c);
    preview(c);
    $("ab-days-field").style.display = c.dismiss ? "" : "none";
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); });

  $("ab-copy").addEventListener("click", function () {
    var text = $("ab-output").textContent;
    var done = function () { $("ab-status").textContent = "Copied. Paste it before the closing body tag."; };
    var fail = function () { $("ab-status").textContent = "Copy failed. Select the code and copy it by hand."; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fail);
    else fail();
  });

  $("ab-reset").addEventListener("click", function () {
    form.reset();
    $("ab-status").textContent = "";
    render();
  });

  render();
})();
