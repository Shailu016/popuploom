/*!
 * PopForge: self-serve popup runtime (v1.0)
 * Drop-in widget engine. No dependencies. Everything rendered by this file.
 * Usage: <div data-popforge="<url-safe-base64 JSON config>"></div><script src="popforge.js"></script>
 * © You, 2026. MIT-ish. Do what you want.
 */
(function () {
  "use strict";
  if (window.PopForge && window.PopForge.scan) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", window.PopForge.scan);
    else window.PopForge.scan();
    return;
  }

  /* ------------------------------------------------------------------ */
  /* API base detection (for reporting views/submissions to the backend)  */
  /* ------------------------------------------------------------------ */
  function detectApiBase() {
    // Per-widget data-api overrides are handled by apiFor(node).
    // 2) global override
    if (window.POPFORGE_API) return String(window.POPFORGE_API).replace(/\/$/, "");
    // 3) derive from where popforge.js was loaded
    var scripts = document.querySelectorAll('script[src*="popforge.js"]');
    for (var i = 0; i < scripts.length; i++) {
      try { return new URL(scripts[i].src).origin; } catch (e) {}
    }
    return "";
  }
  var API_BASE = detectApiBase();

  function apiFetch(path, opts, base) {
    base = base === undefined ? API_BASE : base;
    if (!base) return Promise.resolve(null);
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;
    return Promise.resolve().then(function () {
      return fetch(base + path, Object.assign({}, opts, controller ? { signal: controller.signal } : {}));
    }).finally(function () { if (timer) clearTimeout(timer); });
  }
  function decodeCfg(b64) {
    try {
      var s = String(b64).replace(/-/g, "+").replace(/_/g, "/");
      while (s.length % 4) s += "=";
      var bin = atob(s);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder("utf-8").decode(bytes));
    } catch (e) { console.error("[PopForge] bad config payload", e); return null; }
  }
  function encodeCfg(obj) {
    var bin = "";
    var bytes = new TextEncoder().encode(JSON.stringify(obj));
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  window.PopForge = window.PopForge || {};
  window.PopForge.encodeCfg = encodeCfg;

  /* ------------------------------------------------------------------ */
  /* Runtime stylesheet (injected once)                                  */
  /* ------------------------------------------------------------------ */
  var CSS = `
:root { --pf-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Inter, Arial, sans-serif; }
.pf-root, .pf-root * { box-sizing: border-box; font-family: var(--pf-font); margin: 0; }
.pf-overlay {
  position: fixed; inset: 0; background: rgba(7,9,13,.6); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  z-index: 2147483000; display: flex; align-items: center; justify-content: center; padding: 20px;
}
.pf-card {
  position: relative; color: var(--pf-text, #101314); background: var(--pf-bg, #fff); border-radius: var(--pf-radius, 20px);
  width: min(430px, 92vw); padding: 30px 28px 28px; text-align: left;
  border: 1px solid rgba(15,20,26,.07);
  box-shadow: 0 1px 0 rgba(255,255,255,.5) inset, 0 2px 6px rgba(0,0,0,.08), 0 30px 80px rgba(0,0,0,.4);
}
.pf-card.pf-ink { border-color: rgba(255,255,255,.09); }
.pf-card.pf-bgimg { background-size: cover; background-position: center; }
.pf-card.pf-bgimg::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(180deg, rgba(8,10,12,.34), rgba(8,10,12,.74)); z-index: 0;
}
.pf-card > .pf-body { position: relative; z-index: 1; }
.pf-close {
  position: absolute; top: 14px; right: 14px; width: 32px; height: 32px; border: none; border-radius: 999px;
  cursor: pointer; font-size: 13px; line-height: 1; display: grid; place-items: center;
  background: rgba(0,0,0,.07); color: inherit; z-index: 2; transition: background .12s ease, transform .12s ease;
}
.pf-ink .pf-close { background: rgba(255,255,255,.1); }
.pf-close:hover { background: rgba(0,0,0,.14); transform: rotate(90deg); }

/* interior blocks */
.pf-badge {
  display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800;
  letter-spacing: .1em; text-transform: uppercase; padding: 6px 12px; border-radius: 999px;
  color: var(--pf-on-accent, #0C110E); background: var(--pf-accent, #F99A1F); margin-bottom: 14px;
}
.pf-title { font-size: 27px; line-height: 1.14; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 10px; }
.pf-text { font-size: 15px; line-height: 1.6; opacity: .82; margin-bottom: 18px; white-space: pre-line; }
.pf-media img { width: 100%; display: block; border-radius: 14px; margin-bottom: 16px; }
.pf-vid { position: relative; width: 100%; aspect-ratio: 16/9; border-radius: 14px; overflow: hidden; margin-bottom: 16px; }
.pf-vid iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.pf-countdown { display: flex; gap: 8px; margin-bottom: 18px; }
.pf-countdown .u {
  flex: 1; text-align: center; padding: 11px 4px 9px; border-radius: 12px;
  background: rgba(127,127,127,.09); border: 1px solid rgba(127,127,127,.16);
}
.pf-countdown .n { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.pf-countdown .l { font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; opacity: .6; margin-top: 2px; }
.pf-coupon {
  display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer;
  border: 1.5px dashed rgba(127,127,127,.5); border-radius: 12px; padding: 12px 15px; margin-bottom: 18px;
  font-weight: 700; background: rgba(127,127,127,.05);
  transition: transform .12s ease, border-color .12s ease;
}
.pf-coupon:hover { transform: translateY(-1px); border-color: currentColor; }
.pf-coupon .code { font-family: ui-monospace, "Cascadia Mono", Menlo, monospace; font-size: 15px; letter-spacing: .08em; }
.pf-coupon .hint { font-size: 10px; font-weight: 700; opacity: .55; text-transform: uppercase; letter-spacing: .08em; }
.pf-form .field { margin-bottom: 10px; }
.pf-form input, .pf-form .inp {
  width: 100%; padding: 12px 14px; border-radius: 12px; font-size: 14.5px; outline: none;
  border: 1px solid rgba(127,127,127,.32); background: rgba(127,127,127,.06); color: inherit;
  transition: border-color .12s ease, background .12s ease;
}
.pf-form input:focus { border-color: var(--pf-accent, #F99A1F); background: rgba(249,154,31,.08); background: color-mix(in srgb, var(--pf-accent, #F99A1F) 10%, transparent); }
.pf-form .err { color: #FF7A66; font-size: 12px; margin-bottom: 8px; display: none; }
.pf-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
  padding: 14px 18px; font-size: 15.5px; font-weight: 700; border: 0; border-radius: 14px; cursor: pointer;
  color: var(--pf-on-accent, #261303); background: var(--pf-accent, #F99A1F); text-decoration: none;
  box-shadow: 0 10px 26px rgba(0,0,0,.16);
  transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
}
.pf-btn.pf-dark { background: var(--pf-text, #14181F); color: var(--pf-bg, #fff); }
.pf-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(0,0,0,.2); filter: brightness(1.03); }
.pf-btn.pf-dark { background: #14181F; color: #fff; }
.pf-choice-row { display: flex; gap: 9px; margin-bottom: 18px; }
.pf-choice {
  flex: 1; padding: 15px 6px 12px; border-radius: 12px; cursor: pointer; text-align: center; border: 1px solid rgba(127,127,127,.26);
  background: rgba(127,127,127,.05); font-size: 22px; transition: transform .1s ease, border-color .1s ease, background .1s ease;
}
.pf-choice small { display: block; font-size: 10.5px; font-weight: 700; opacity: .65; margin-top: 4px; }
.pf-choice:hover { transform: translateY(-2px); border-color: #F99A1F; background: rgba(249,154,31,.1); }
.pf-links { display: flex; gap: 9px; margin-top: 16px; flex-wrap: wrap; }
.pf-links a {
  flex: 1; min-width: 90px; text-align: center; font-size: 13px; font-weight: 700; text-decoration: none;
  color: inherit; padding: 11px 8px; border-radius: 12px; background: rgba(127,127,127,.08);
  border: 1px solid rgba(127,127,127,.18);
}
.pf-links a:hover { border-color: #F99A1F; }
.pf-note { font-size: 11.5px; opacity: .55; margin-top: 12px; text-align: center; }
.pf-thanks { text-align: center; padding: 14px 0 6px; }
.pf-thanks .big { font-size: 34px; margin-bottom: 8px; }

/* placements */
.pf-holder { position: fixed; z-index: 2147483001; }
.pf-modal .pf-overlay { align-items: center; justify-content: center; }
.pf-holder.pf-corner { overflow: visible; }
.pf-holder.pf-corner .pf-card { width: min(400px, 94vw); }
.pf-holder.pf-corner.br { right: 22px; bottom: 22px; }
.pf-holder.pf-corner.bl { left: 22px; bottom: 22px; }
.pf-holder.pf-corner.tr { right: 22px; top: 22px; }
.pf-holder.pf-corner.tl { left: 22px; top: 22px; }
.pf-holder.pf-corner { position: fixed; }
.pf-holder.pf-bar { left: 0; right: 0; }
.pf-holder.pf-bar.top { top: 0; }
.pf-holder.pf-bar.bottom { bottom: 0; }
.pf-holder.pf-bar .pf-card {
  width: 100%; border-radius: 0; padding: 14px 22px; display: flex; align-items: center; gap: 18px;
}
.pf-holder.pf-bar .pf-title { font-size: 15.5px; margin: 0; }
.pf-holder.pf-bar .pf-text { margin: 0; font-size: 13px; flex: 1; }
.pf-holder.pf-bar .pf-badge { display: none; }
.pf-holder.pf-bar .pf-btn { width: auto; padding: 10px 18px; font-size: 13.5px; flex-shrink: 0; }
.pf-holder.pf-bar .pf-close { top: 50%; transform: translateY(-50%); }
.pf-holder.pf-bar .pf-close:hover { transform: translateY(-50%) rotate(90deg); }

/* sticky opener button */
.pf-sticky {
  position: fixed; z-index: 2147482999; right: 22px; bottom: 22px; border: none; cursor: pointer;
  padding: 13px 20px; border-radius: 999px; font-weight: 700; font-size: 14px; color: #261303;
  background: #F99A1F; box-shadow: 0 12px 30px rgba(0,0,0,.3); letter-spacing: -0.01em;
  transition: transform .12s ease, box-shadow .12s ease;
}
.pf-sticky:hover { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(0,0,0,.34); }

/* age gate */
.pf-age-row { display: flex; flex-direction: column; gap: 10px; margin-bottom: 4px; }
.pf-age-deny {
  display: inline-flex; align-items: center; justify-content: center; width: 100%;
  padding: 13px 18px; font-size: 15px; font-weight: 700; border-radius: 14px; cursor: pointer;
  border: 1.5px solid rgba(127,127,127,.32); background: transparent; color: inherit; text-decoration: none;
  transition: border-color .12s ease, background .12s ease;
}
.pf-age-deny:hover { border-color: currentColor; background: rgba(127,127,127,.07); }

/* spin wheel */
.pf-spin { text-align: center; margin-bottom: 14px; }
.pf-spin-stage { position: relative; width: 216px; height: 216px; margin: 0 auto 14px; }
.pf-spin-wheel {
  position: absolute; inset: 0; border-radius: 50%;
  border: 6px solid rgba(255,255,255,.92);
  box-shadow: 0 14px 36px rgba(0,0,0,.28), 0 0 0 1px rgba(0,0,0,.06) inset;
  transition: transform 4.3s cubic-bezier(.12,.72,.08,1);
  will-change: transform;
}
.pf-ink .pf-spin-wheel { border-color: rgba(255,255,255,.14); }
.pf-spin-pointer {
  position: absolute; top: -6px; left: 50%; transform: translateX(-50%); z-index: 3;
  width: 0; height: 0; border-left: 12px solid transparent; border-right: 12px solid transparent;
  border-top: 22px solid #1A1E24; border-radius: 4px;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,.35));
}
.pf-spin-hub {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); z-index: 2;
  width: 64px; height: 64px; border-radius: 50%; border: none; cursor: pointer;
  background: #12161D; color: #fff; font-weight: 800; font-size: 12px; letter-spacing: .04em;
  box-shadow: 0 8px 20px rgba(0,0,0,.4), 0 0 0 4px rgba(255,255,255,.28);
  transition: transform .12s ease;
}
.pf-spin-hub:hover { transform: translate(-50%,-50%) scale(1.07); }
.pf-spin-hub:disabled { cursor: default; opacity: .85; }
.pf-spin-seg {
  position: absolute; left: 50%; top: 50%; width: 76px; margin: -9px 0 0 -38px;
  text-align: center; font-size: 10.5px; font-weight: 800; letter-spacing: .01em; line-height: 1.2;
  text-shadow: 0 1px 2px rgba(0,0,0,.18);
}

/* social proof */
.pf-proof-card .pf-card { width: min(340px, 94vw); padding: 16px 16px 16px 18px; }
.pf-proof { display: flex; align-items: center; gap: 12px; transition: opacity .25s ease; }
.pf-proof .pf-ava {
  width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center;
  font-weight: 800; font-size: 17px; flex-shrink: 0;
  background: var(--pf-accent, #F99A1F); color: var(--pf-on-accent, #261303);
}
.pf-proof .pf-pbody { flex: 1; min-width: 0; }
.pf-proof .pf-pname { font-weight: 800; font-size: 14px; letter-spacing: -0.01em; }
.pf-proof .pf-paction { font-size: 13px; opacity: .78; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pf-proof .pf-pago { font-size: 11px; opacity: .5; margin-top: 2px; }
.pf-proof-card .pf-close { top: 10px; right: 10px; width: 26px; height: 26px; font-size: 11px; }

/* fullscreen takeover */
.pf-holder.pf-fullscreen { inset: 0; }
.pf-holder.pf-fullscreen .pf-card {
  width: min(1080px, 94vw); max-height: 88vh; overflow: auto; padding: 42px 48px;
}

/* animations */
@keyframes pfPop { from { transform: scale(.86); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes pfFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pfSlideUp { from { transform: translateY(28px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes pfSlideDown { from { transform: translateY(-28px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes pfOut { to { transform: scale(.94); opacity: 0; } }
.pf-anim-pop { animation: pfPop .32s cubic-bezier(.2,.9,.3,1.25); }
.pf-anim-fade { animation: pfFade .28s ease; }
.pf-anim-slideUp { animation: pfSlideUp .32s cubic-bezier(.2,.8,.2,1); }
.pf-anim-slideDown { animation: pfSlideDown .32s cubic-bezier(.2,.8,.2,1); }
.pf-anim-out { animation: pfOut .16s ease forwards; }

/* preview mode (editor / gallery) */
.pf-stage { position: relative; overflow: hidden; border-radius: 14px; }
.pf-stage .pf-overlay { position: absolute; }
.pf-stage .pf-holder { position: absolute; z-index: 2; }
.pf-stage .pf-sticky { position: absolute; z-index: 1; }
.pf-stage .pf-holder.pf-modal { inset: 0; }
.pf-stage .pf-holder.pf-fullscreen { inset: 0; }
.pf-stage .pf-card { width: min(430px, 92%); }
.pf-stage .pf-holder.pf-fullscreen .pf-card { width: min(96%, 1080px); max-height: 92%; padding: 24px 28px; }
.pf-stage .pf-holder.pf-corner .pf-card { width: min(400px, 92%); }
.pf-stage .pf-proof-card .pf-card { width: min(300px, 88%); padding: 14px 14px 14px 16px; }
.pf-stage .pf-proof-card .pf-ava { width: 34px; height: 34px; font-size: 14px; }
`;

  /**
   * One embedded widget instance.
   * @param {object} cfg  widget config (schema v1)
   * @param {HTMLElement} mount  optional container (preview mode)
   */
  function PopupInstance(cfg, mount) {
    this.cfg = cfg;
    this.preview = !!mount;
    this.stage = mount;
    this.visible = false;
    this.holders = null;
    buildStylesOnce();
  }
  PopupInstance.prototype = {
    key: function (suffix) {
      var id = this.cfg.id;
      return "pf." + (id || hash(this.cfg.name || "w")) + "." + suffix;
    },
    /* ---- gating ---- */
    deviceOk: function () {
      var d = this.cfg.devices || (this.cfg.devices = { desktop: true, mobile: true });
      var mobile = isMobile();
      return mobile ? !!d.mobile : !!d.desktop;
    },
    pageOk: function () {
      var p = this.cfg.pages || { mode: "all", include: [], exclude: [] };
      if (p.mode === "all") return true;
      var href = location.href.split("#")[0];
      if (p.mode === "include") return (p.include || []).some(glob);
      if (p.mode === "exclude") return !(p.exclude || []).some(glob);
      function glob(g) {
        var pattern = String(g).toLowerCase();
        var text = (pattern.charAt(0) === "/" ? location.pathname : href).toLowerCase();
        var parts = pattern.split("*");
        if (parts.length === 1) return text === pattern;
        if (!text.startsWith(parts[0])) return false;
        var cursor = parts[0].length;
        for (var i = 1; i < parts.length - 1; i++) {
          var at = text.indexOf(parts[i], cursor);
          if (at === -1) return false;
          cursor = at + parts[i].length;
        }
        var tail = parts[parts.length - 1];
        return text.endsWith(tail) && text.length - tail.length >= cursor;
      }
      return true;
    },
    freqOk: function () {
      if (this.preview) return true;
      var rule = (this.cfg.frequency || "always");
      var last = 0, closedAt = 0;
      try {
        last = +(localStorage.getItem(this.key("shown")) || 0);
        closedAt = +(localStorage.getItem(this.key("closed")) || 0);
      } catch (e) { /* Storage may be blocked on customer sites. */ }
      var day = 864e5;
      switch (rule) {
        case "always": return true;
        case "close24h": return Date.now() >= closedAt + day || !closedAt;
        case "once:ever": return !last;
        case "once:day": return !last || !sameDay(last, Date.now());
        case "once:week": return !last || (Date.now() - last) >= 7 * day;
        default: return true;
      }
      function sameDay(a, b) {
        var x = new Date(a), y = new Date(b);
        return x.toDateString() === y.toDateString();
      }
    },
    /* ---- triggers ---- */
    arm: function () {
      var self = this, t = this.cfg.trigger || { type: "load" };
      var fire = function () { self.fire(); };
      if (!this.preview) {
        if (!this.deviceOk() || !this.pageOk() || !this.freqOk()) return;
      }
      switch (t.type) {
        case "load": this.preview ? fire() : setTimeout(fire, 250); break;
        case "delay": this.timer = setTimeout(fire, Math.max(0, (Number.isFinite(+t.delay) ? +t.delay : 5)) * 1000); break;
        case "scrollPct": {
          var pct = Math.min(99, Math.max(1, +t.pct || 50));
          var onScroll = function () {
            var max = document.documentElement.scrollHeight - innerHeight;
            var p = max > 0 ? (scrollY / max) * 100 : 100;
            if (p >= pct) { removeEventListener("scroll", onScroll); fire(); }
          };
          this.scrollHandler = onScroll;
          addEventListener("scroll", onScroll, { passive: true });
          onScroll(); break;
        }
        case "scrollTo": this.io = observeSelector(t.selector, fire); break;
        case "click": {
          var that = t.selector || "#open-popup";
          try { document.querySelector(that); } catch (e) { console.warn("[PopForge] invalid trigger selector"); return; }
          this.clickHandler = function (ev) {
            var target = ev.target.closest && ev.target.closest(that);
            if (target) fire();
          };
          var that = t.selector || "#open-popup";
          try { document.addEventListener("click", this.clickHandler); }
          catch (e) { console.warn("[PopForge] invalid trigger selector"); }
          break;
        }
        case "exitIntent": {
          if (isMobile()) return; // no cursor on touch devices, intentional
          this.exitHandler = function (ev) {
            if (!ev.relatedTarget && ev.clientY <= 0) fire();
          };
          document.addEventListener("mouseout", this.exitHandler); break;
        }
      }
      // sticky opener
      if (!this.preview && this.cfg.sticky && this.cfg.sticky.enabled) {
        var btn = document.createElement("button");
        btn.className = "pf-sticky";
        btn.textContent = this.cfg.sticky.label || "Special offer";
        btn.setAttribute("aria-label", "Open popup");
        btn.onclick = function () { self.show(); };
        document.body.appendChild(btn);
        this.stickyEl = btn;
      }
    },
    fire: function () {
      this.unbind();
      if (!this.preview && !this.freqOk()) return;
      this.show();
      if (!this.preview) {
        try { localStorage.setItem(this.key("shown"), String(Date.now())); } catch (e) {}
      }
    },
    unbind: function () {
      clearTimeout(this.timer);
      if (this.scrollHandler) { removeEventListener("scroll", this.scrollHandler); this.scrollHandler = null; }
      if (this.io) { this.io.disconnect(); this.io = null; }
      if (this.clickHandler) { document.removeEventListener("click", this.clickHandler); this.clickHandler = null; }
      if (this.exitHandler) { document.removeEventListener("mouseout", this.exitHandler); this.exitHandler = null; }
    },
    /* ---- render ---- */
    show: function () {
      if (this.visible) return;
      this.visible = true;
      var c = this.cfg, th = c.theme || {}, mc = c.content || {};
      var isProof = mc.proof && mc.proof.enabled && (mc.proof.items || []).length;
      var holder = document.createElement("div");
      var pc = isProof ? "proof" : placementClass(c.placement);
      var rootCls = pc === "modal" ? "pf-modal"
        : pc === "fullscreen" ? "pf-fullscreen"
        : pc === "corner" ? "pf-corner " + cornerClass(c.placement)
        : pc === "proof" ? "pf-corner bl pf-proof-card"
        : "pf-bar " + (c.placement === "topbar" ? "top" : "bottom");
      holder.className = "pf-root pf-holder " + rootCls;

      holder.innerHTML = (pc === "modal" || pc === "fullscreen")
        ? '<div class="pf-overlay pf-anim' + animCls(th.animation || "pop") + '">' + cardHTML(this) + "</div>"
        : (pc === "proof" ? proofHTML(this) : cardHTML(this));

      // where does it mount?
      if (this.preview) { this.stage.appendChild(holder); this.holderEl = holder; }
      else { document.body.appendChild(holder); this.holderEl = holder; }

      // overlay dismiss
      var ov = holder.querySelector(".pf-overlay");
      if (ov && (!this.preview) && th.overlay !== false) {
        ov.addEventListener("click", function (ev) {
          if (ev.target === ov) self.close();
        });
        this._esc = keydownEscape(this);
        document.addEventListener("keydown", this._esc);
      }
      var self = this;

      // wire interior
      var closeBtn = holder.querySelector(".pf-close");
      if (closeBtn && this.preview !== "stat") closeBtn.onclick = function () { self.close(); };
      if (this.preview && closeBtn) closeBtn.onclick = function () { /* disabled in preview */ };

      var cpn = holder.querySelector(".pf-coupon");
      if (cpn) cpn.onclick = function () { copyText(this.querySelector(".code").textContent, this.querySelector(".hint")); };

      var spinEl = holder.querySelector(".pf-spin");
      if (spinEl) wireSpin(self, spinEl);

      var allowBtn = holder.querySelector('[data-age="allow"]');
      if (allowBtn) allowBtn.onclick = async function () {
        var saved = await submitLike(self, { ageVerified: true }, null);
        if (saved && !self.preview) setTimeout(function () { self.close(); }, 1100);
      };
      var denyBtn = holder.querySelector('[data-age="deny"]');
      if (denyBtn) denyBtn.onclick = function () {
        var ag = mc.ageGate || {};
        if (!self.preview && ag.denyUrl) { location.href = safeUrl(ag.denyUrl, false); return; }
        var cv = self.holderEl.querySelector(".pf-body");
        if (cv) cv.innerHTML = '<div class="pf-thanks"><div class="big">&#128683;</div><div class="pf-title" style="font-size:18px">' + esc(ag.denyMessage || "Sorry, this site is for adults only.") + '</div></div>';
      };

      var choices = holder.querySelectorAll(".pf-choice");
      choices.forEach(function (el) {
        el.onclick = function () {
          submitLike(self, { choice: el.getAttribute("data-v") });
        };
      });

      var form = holder.querySelector("form");
      if (form) form.onsubmit = function (ev) {
        ev.preventDefault();
        var data = Object.create(null); var ok = true;
        (mc.form.fields || []).forEach(function (f) {
          var input = Array.from(form.querySelectorAll("[data-f]")).find(function (el) { return el.getAttribute("data-f") === f.name; });
          var v = (input || {}).value || "";
          v = v.trim();
          if (f.required && !v) { ok = false; }
          data[f.name] = v;
        });
        var errBox = form.querySelector(".err");
        if (!ok) { if (errBox) errBox.style.display = "block"; return; }
        submitLike(self, data, form);
      };

      if (isProof) {
        var proofEl = holder.querySelector(".pf-proof");
        var items = mc.proof.items;
        var pi = 0;
        self._proofInt = setInterval(function () {
          if (!self.visible || !proofEl) return;
          pi = (pi + 1) % items.length;
          proofEl.style.opacity = "0";
          setTimeout(function () {
            if (!self.visible || !proofEl) return;
            proofEl.innerHTML = proofItemHTML(items[pi], th);
            proofEl.style.opacity = "1";
          }, 240);
        }, Math.max(1000, ((+mc.proof.interval || 5) >= 1000 ? +mc.proof.interval : (+mc.proof.interval || 5) * 1000)));
      }

      if (mc.countdown) startCountdown(holder, mc.countdown, self);
      this.holderEl = holder;
      this.notify("view");
      if (!this.preview && !this.test) {
        // local guest counter
        try {
          var vk = "pfview." + (this.cfg.id || hash(this.cfg.name || "w"));
          localStorage.setItem(vk, (+(localStorage.getItem(vk) || 0) + 1).toString());
        } catch (e) {}
        // report to backend (fire-and-forget)
        apiFetch("/api/widgets/" + encodeURIComponent(this.cfg.id) + "/view", { method: "POST" }, this.apiBase).catch(function () {});
        this.notify("open");
      }
    },
    close: function () {
      var self = this, H = this.holderEl;
      if (!H) return;
      clearInterval(this._cdInt);
      clearInterval(this._proofInt);
      var done = function () {
        if (H.parentNode) H.parentNode.removeChild(H);
        self.holderEl = null; self.visible = false;
        self.notify("close");
      };
      if (this.preview) { done(); return; }
      try { localStorage.setItem(this.key("closed"), String(Date.now())); } catch (e) {}
      var card = H.querySelector(".pf-overlay, .pf-card");
      (card || H).classList.add("pf-anim-out");
      setTimeout(done, 170);
      if (this._esc) { document.removeEventListener("keydown", this._esc); this._esc = null; }
    },
    notify: function (evName) {
      if (this.preview || this.test) return;
      try {
        if (window.dataLayer) window.dataLayer.push({ event: "popforge_" + evName, popupId: this.cfg.id, popupName: this.cfg.name });
        dispatchEvent(new CustomEvent("popforge:" + evName, { detail: { id: this.cfg.id, name: this.cfg.name } }));
      } catch (e) {}
    },
    destroy: function () { this.unbind(); if (this.stickyEl) this.stickyEl.remove(); this.close(); }
  };

  /* ------------------------------------------------------------------ */
  /* helpers                                                             */
  /* ------------------------------------------------------------------ */
  function placementClass(p) {
    p = String(p || "modal");
    if (p === "modal") return "modal";
    if (p === "fullscreen") return "fullscreen";
    if (p.indexOf("slide:") === 0) return "corner";
    if (p === "topbar" || p === "bottombar") return p === "topbar" ? "bar top" : "bar bottom";
    return "modal";
  }
  function cornerClass(p) {
    if (p && p.indexOf("slide:") === 0) return ["br", "bl", "tr", "tl"].indexOf(p.split(":")[1]) !== -1 ? p.split(":")[1] : "br";
    return "";
  }
  /* Per-instance theme, written inline on the card itself.
     A global <style> per popup made every popup on the page inherit the last
     one rendered (all templates collapsed to a single look). Inline custom
     properties inherit to children (badge, button, avatar) and stay scoped. */
  function safeColor(value, fallback) {
    var s = String(value || "");
    return /^(#[a-f0-9]{3,8}|[a-z]+|(rgba?|hsla?)\([0-9.,%+\s-]+\))$/i.test(s) ? s : fallback;
  }
  function cardAttrs(th) {
    var A = safeColor(th.accent, "#F99A1F");
    var onA = safeColor(th.accentText, "#261303");
    var text = safeColor(th.text, th.style === "ink" ? "#EDF2F0" : "#101314");
    var bg = safeColor(th.bg, th.style === "ink" ? "#14181F" : "#ffffff");
    var s =
      "--pf-accent:" + A + ";" +
      "--pf-on-accent:" + onA + ";" +
      "--pf-text:" + text + ";" +
      "--pf-bg:" + bg + ";" +
      "color:" + text + ";" +
      "border-radius:" + (+th.radius || 18) + "px;";
    if (th.bgImage) s += "background-color:" + bg + ";background-image:url(" + JSON.stringify(safeUrl(th.bgImage, true)) + ");";
    else s += "background:" + bg + ";";
    return ' style="' + escAttr(s) + '"';
  }
  function cardHTML(self) {
    var c = self.cfg, th = c.theme || {}, mc = c.content || {};
    var p = placementClass(c.placement);
    var cls = ["pf-card", animName(th.animation, c.placement), p === "modal" ? "" : "", th.style === "ink" ? "pf-ink" : ""].join(" ");
    var corner = cornerClass(c.placement);
    var h = '<div class="' + cls + (th.bgImage ? " pf-bgimg" : "") + (corner ? ' pf-corner-' + corner : "") + '"' + cardAttrs(th) + (th.bgImage ? ' data-bg="' + escAttr(th.bgImage) + '"' : "") + ">";
    h += '<button class="pf-close" aria-label="Close">&#10005;</button><div class="pf-body">';
    var A = safeColor(th.accent, "#F99A1F");
    if (mc.badge) h += '<div class="pf-badge">' + esc(mc.badge) + "</div>";
    if (mc.image) h += '<div class="pf-media"><img src="' + escAttr(safeUrl(mc.image, true)) + '" alt=""></div>';
    if (mc.videoEmbed) h += '<div class="pf-vid">' + videoFrame(mc.videoEmbed) + "</div>";
    if (mc.title) h += '<div class="pf-title">' + esc(mc.title) + "</div>";
    if (mc.body) h += '<div class="pf-text">' + esc(mc.body) + "</div>";
    if (mc.countdown && mc.countdown.target) h += '<div class="pf-countdown" data-target="' + escAttr(mc.countdown.target) + '"><div class="u"><div class="n d">00</div><div class="l">Days</div></div><div class="u"><div class="n h">00</div><div class="l">Hrs</div></div><div class="u"><div class="n m">00</div><div class="l">Min</div></div><div class="u"><div class="n s">00</div><div class="l">Sec</div></div></div>';
    if (mc.coupon && mc.coupon.code) h += '<div class="pf-coupon"><span class="code">' + esc(mc.coupon.code) + '</span><span class="hint">Click to copy</span></div>';
    if (mc.spin && mc.spin.enabled && (mc.spin.segments || []).length) {
      var segs = mc.spin.segments;
      var segA = 360 / segs.length;
      h += '<div class="pf-spin"><div class="pf-spin-stage"><div class="pf-spin-wheel" style="background:' + escAttr(wheelGradient(segs, A)) + '">';
      segs.forEach(function (sg, i) {
        var ang = i * segA + segA / 2;
        h += '<span class="pf-spin-seg" style="transform:rotate(' + ang.toFixed(2) + 'deg) translateY(-76px) rotate(' + (-ang).toFixed(2) + 'deg);color:' + escAttr(safeColor(th.accentText, "#FFFFFF")) + '">' + esc(sg.label || "") + "</span>";
      });
      h += '</div><div class="pf-spin-pointer" style="border-top-color:' + escAttr(A) + '"></div><button class="pf-spin-hub" type="button">' + esc(mc.spin.buttonText || "SPIN") + "</button></div></div>";
    }
    if (mc.ageGate && mc.ageGate.enabled) {
      h += '<div class="pf-age-row">' +
        '<button class="pf-btn" type="button" data-age="allow">' + esc(mc.ageGate.allowLabel || "Yes, I'm 18 or older") + "</button>" +
        '<button class="pf-age-deny" type="button" data-age="deny">' + esc(mc.ageGate.denyLabel || "No, I'm under 18") + "</button></div>";
    }
    if (mc.choices && mc.choices.length) {
      h += '<div class="pf-choice-row">';
      mc.choices.forEach(function (ch) { h += '<div class="pf-choice" data-v="' + escAttr(ch.value || ch.label) + '">' + esc(ch.emoji || "") + "<small>" + esc(ch.label || "") + "</small></div>"; });
      h += "</div>";
    }
    if (mc.form && mc.form.enabled) {
      h += '<form class="pf-form"><div class="err">Please fill the required fields.</div>';
      (mc.form.fields || []).forEach(function (f) {
        h += '<div class="field"><input class="inp" data-f="' + escAttr(f.name) + '" type="' + (f.type === "phone" ? "tel" : (["text", "email", "tel", "number", "date", "url"].indexOf(f.type) !== -1 ? f.type : "text")) + '" placeholder="' + escAttr(f.label || "") + '" ' + (f.required ? "" : "") + (f.required ? "required" : "") + "></div>";
      });
      h += '<button class="pf-btn' + (th.buttonStyle === "dark" ? " pf-dark" : "") + '" type="submit">' + esc(mc.form.buttonLabel || "Submit") + "</button></form>";
    } else if (mc.buttonText) {
      h += '<a class="pf-btn' + (th.buttonStyle === "dark" ? " pf-dark" : "") + '" href="' + escAttr(safeUrl(mc.buttonUrl || "#", false)) + '" target="_blank" rel="noopener">' + esc(mc.buttonText) + "</a>";
    }
    var thanks = mc.form && (mc.form.success || "You're in! Check your inbox.");
    if (mc.form && mc.form.enabled) h += '<input type="hidden" data-thanks="' + escAttr(thanks) + '">';
    if (mc.links && mc.links.length) h += '<div class="pf-links">' + mc.links.map(function (l) { return '<a href="' + escAttr(safeUrl(l.url, false)) + '" target="_blank" rel="noopener">' + esc(l.label) + "</a>"; }).join("") + "</div>";
    if (mc.note) h += '<div class="pf-note">' + esc(mc.note) + "</div>";
    h += "</div></div>";
    return h;
  }
  function animName(a, placement) {
    var map = { pop: "pf-anim-pop", fade: "pf-anim-fade", slideUp: "pf-anim-slideUp", slideDown: "pf-anim-slideDown" };
    if (placementClass(placement) === "bar") return "pf-anim-slideDown";
    if (placementClass(placement) === "corner") return a === "pop" ? "pf-anim-pop" : (map[a] || "pf-anim-slideUp");
    return map[a] || "pf-anim-pop";
  }
  function animCls(k) { return ""; } // overlay anim handled on card
  function videoFrame(url) {
    var m;
    if ((m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)))
      url = "https://www.youtube.com/embed/" + m[1];
    else if ((m = String(url).match(/vimeo\.com\/(\d+)/))) url = "https://player.vimeo.com/video/" + m[1];
    try {
      var parsed = new URL(url);
      if (parsed.protocol !== "https:" || ["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"].indexOf(parsed.hostname) === -1) return "";
    } catch (e) { return ""; }
    return '<iframe sandbox="allow-scripts allow-same-origin allow-presentation" referrerpolicy="strict-origin-when-cross-origin" src="' + escAttr(safeUrl(url, false)) + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>';
  }
  function startCountdown(scope, cd, self) {
    var el = scope.querySelector(".pf-countdown");
    if (!el) return;
    var target = new Date(el.getAttribute("data-target")).getTime();
    if (isNaN(target)) { el.remove(); return; }
    var tick = function () {
      var d = Math.max(0, target - Date.now());
      var parts = [0, 0, 0, 0];
      var s = Math.max(0, Math.floor(d / 1e3));
      parts[0] = s / 86400 | 0; parts[1] = s % 86400 / 3600 | 0; parts[2] = s % 3600 / 60 | 0; parts[3] = s % 60 | 0;
      var qs = [".d", ".h", ".m", ".s"];
      parts.forEach(function (n, i) { var cell = el.querySelector(qs[i]); if (cell) cell.textContent = String(n).padStart(2, "0"); });
      if (d <= 0) clearInterval(self._cdInt);
    };
    tick();
    self._cdInt = setInterval(tick, 1000);
  }
  PopupInstance.prototype._cdInt = null;
  function observeSelector(sel, cb) {
    try {
      var el = document.querySelector(sel || "body");
      if (!el) { console.warn("[PopForge] scroll-to selector not found:", sel); return null; }
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { io.disconnect(); cb(); } });
      }, { threshold: 0.15 });
      io.observe(el);
      return io;
    } catch (e) { console.warn("[PopForge] invalid scroll-to selector", e); return null; }
  }
  function shade(hex, f) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "#F99A1F"));
    if (!m) return String(hex || "#F99A1F");
    var n = parseInt(m[1], 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var t = f < 0 ? 0 : 255, p = Math.abs(f);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return "rgb(" + r + "," + g + "," + b + ")";
  }
  function wheelGradient(segs, accent) {
    var n = segs.length, segA = 360 / n, parts = [];
    for (var i = 0; i < n; i++) {
      var f = i % 2 === 0 ? 0.06 : -0.2;
      parts.push(shade(accent, f) + " " + (i * segA).toFixed(2) + "deg " + ((i + 1) * segA).toFixed(2) + "deg");
    }
    return "conic-gradient(" + parts.join(",") + ")";
  }
  function wireSpin(self, spinEl) {
    var cfg = (self.cfg.content && self.cfg.content.spin) || {};
    var segs = cfg.segments || [];
    var wheel = spinEl.querySelector(".pf-spin-wheel");
    var hub = spinEl.querySelector(".pf-spin-hub");
    var segA = 360 / segs.length;
    var prizeView = function (prize) {
      var parent = spinEl.parentNode;
      if (parent) parent.innerHTML = '<div class="pf-thanks"><div class="big">' + esc(prize.emoji || "&#127881;") + '</div><div class="pf-title" style="font-size:20px">' + esc(prize.label || "You won!") + '</div><div class="pf-note">' + ((self.preview || self.test) ? "(preview, nothing was recorded)" : "We logged your spin. Check the fine print below.") + "</div></div>";
    };
    var pendingPrize = null;
    async function savePrize() {
      hub.disabled = true;
      try {
        await recordSubmission(self, { spin: pendingPrize.label });
        if (!self.preview) self.notify("submit");
        prizeView(pendingPrize);
      } catch (e) {
        submissionError(self);
        hub.textContent = "Retry";
        hub.disabled = false;
      }
    }
    hub.onclick = function () {
      if (pendingPrize) { savePrize(); return; }
      if (wheel._spinning) return;
      wheel._spinning = true;
      var idx = Math.floor(Math.random() * segs.length);
      var jitter = segA * (Math.random() * 0.5 - 0.25);
      var target = 360 - (idx * segA + segA / 2) + jitter;
      var cur = wheel._rot || 0;
      wheel._rot = cur + (5 + Math.floor(Math.random() * 2)) * 360 + ((target - (cur % 360) + 360) % 360);
      wheel.style.transform = "rotate(" + wheel._rot + "deg)";
      hub.disabled = true;
      setTimeout(function () {
        pendingPrize = segs[idx];
        savePrize();
      }, 4350);
    };
  }
  function proofItemHTML(it, th) {
    var name = String((it && it.name) || "Someone");
    return '<div class="pf-ava">' + esc(name.charAt(0).toUpperCase()) + "</div>" +
      '<div class="pf-pbody"><div class="pf-pname">' + esc(name) + "</div>" +
      '<div class="pf-paction">' + esc((it && it.action) || "") + "</div>" +
      '<div class="pf-pago">' + esc((it && it.ago) || "just now") + "</div></div>";
  }
  function proofHTML(self) {
    var th = self.cfg.theme || {}, mc = self.cfg.content || {};
    var item = (mc.proof.items || [])[0];
    return '<div class="pf-card pf-anim-slideUp' + (th.style === "ink" ? " pf-ink" : "") + '"' + cardAttrs(th) + ">" +
      '<button class="pf-close" aria-label="Close">&#10005;</button>' +
      '<div class="pf-body"><div class="pf-proof">' + proofItemHTML(item, th) + "</div></div></div>";
  }
  async function recordSubmission(self, data) {
    if (self.preview || self.test) return;
    var fingerprint = JSON.stringify(data);
    if (!self._pendingLead || self._pendingLead.fingerprint !== fingerprint) {
      self._pendingLead = { fingerprint: fingerprint, id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2) };
    }
    var requestId = self._pendingLead.id;
    var response = await apiFetch("/api/widgets/" + encodeURIComponent(self.cfg.id) + "/submit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: data, requestId: requestId })
    }, self.apiBase);
    if (!response || !response.ok) throw new Error("Submission failed");
    var result = await response.json();
    if (!result || result.ok !== true || result.stored === false) throw new Error("Submission was not stored");
    self._pendingLead = null;
  }
  function submissionError(self) {
    var body = self.holderEl && self.holderEl.querySelector(".pf-body");
    if (!body) return;
    var error = body.querySelector(".pf-submit-error");
    if (!error) {
      error = document.createElement("div");
      error.className = "pf-submit-error pf-note";
      error.setAttribute("role", "alert");
      body.appendChild(error);
    }
    error.textContent = "We couldn't save your response. Please try again.";
  }
  async function submitLike(self, data, form) {
    if (self._submitting) return false;
    self._submitting = true;
    var controls = Array.from(self.holderEl.querySelectorAll("button, input"));
    var disabled = controls.map(function (el) { return el.disabled; });
    controls.forEach(function (el) { el.disabled = true; });
    try {
      await recordSubmission(self, data);
      var mc = self.cfg.content || {}, formCfg = mc.form || {};
      if (!self.preview && !self.test) {
        try {
          var sk = "pfsubs." + (self.cfg.id || hash(self.cfg.name || "w"));
          var arr = JSON.parse(localStorage.getItem(sk) || "[]");
          arr.unshift({ at: Date.now(), data: data });
          localStorage.setItem(sk, JSON.stringify(arr.slice(0, 200)));
        } catch (e) {}
        if (formCfg.webhookUrl) {
          apiFetch("", { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ popup: self.cfg.name, id: self.cfg.id, at: Date.now(), data: data })
          }, safeUrl(formCfg.webhookUrl, false)).catch(function () {});
        }
      }
      var thanksMsg = formCfg.success || ((mc.ageGate && mc.ageGate.allowMessage) || mc.thanks || "Done! Thanks a bunch.");
      var cv = self.holderEl && self.holderEl.querySelector(".pf-body");
      if (cv) cv.innerHTML = '<div class="pf-thanks"><div class="big">' + esc(mc.successEmoji || mc.emoji || "🎉") + '</div><div class="pf-title" style="font-size:19px">' + esc(thanksMsg) + '</div><div class="pf-note">' + ((self.preview || self.test) ? "(preview, nothing was recorded)" : "We saved your response.") + "</div></div>";
      self.notify("submit");
      return true;
    } catch (e) {
      submissionError(self);
      return false;
    } finally {
      self._submitting = false;
      controls.forEach(function (el, i) { el.disabled = disabled[i]; });
    }
  }
  function safeUrl(value, image) {
    var raw = String(value || "").trim();
    if (image && /^data:image\/(png|gif|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(raw)) return raw;
    try {
      var parsed = new URL(raw, location.href);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") return raw;
    } catch (e) {}
    return image ? "" : "#";
  }
  function closeAgainHTMLExcluded() { return ""; }
  function copyText(txt, hintEl) {
    var done = function () { if (hintEl) { var old = hintEl.textContent; hintEl.textContent = "Copied!"; setTimeout(function () { hintEl.textContent = old; }, 1400); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { fallback(); done(); });
    else { fallback(); done(); }
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta);
      ta.select(); try { document.execCommand("copy"); } catch (e) {} ta.remove();
    }
  }
  function isMobile() {
    if (matchMedia("(hover: none) and (pointer: coarse)").matches && innerWidth <= 900) return true;
    return /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function escAttr(s) { return esc(s).replace(/\n/g, " "); }
  function keydownEscape(self) {
    return function (ev) { if (ev.key === "Escape") self.close(); };
  }
  function buildStylesOnce() {
    if (!document.getElementById("pf-style")) {
      var st = document.createElement("style");
      st.id = "pf-style"; st.textContent = CSS;
      document.head.appendChild(st);
    }
  }
  /* mount unused arg kept for preview wiring */
  PopupInstance.prototype.mount = function (stage) { this.stage = stage; this.preview = true; };

  window.PopForge = window.PopForge || {};
  window.PopForge.version = "1.0";
  window.PopForge.show = function (cfg, options) {
    if (!window.PopForge.EncodeDemo) window.PopForge.encodeCfg = encodeCfg;
    var inst = new PopupInstance(cfg, null);
    inst.apiBase = options && options.apiBase;
    inst.test = !!(options && options.test);
    inst.show();
    return inst;
  };
  window.PopForge.preview = function (stage, cfg) {
    var inst = new PopupInstance(cfg, stage);
    inst.show();
    inst.preview = true;
    return inst;
  };
  // NOTE: preview instances skip storage + events by design.

  // Hosted widgets: the snippet carries only an id ("wan_xxx") and the live
  // config is fetched from the PopForge API at page load. Inline base64 configs
  // from older snippets keep working (they always start with "eyJ").
  var HOSTED_ID = /^[A-Za-z0-9_-]{3,64}$/;

  function isHostedRef(raw) {
    var s = String(raw || "").trim();
    if (!s || s.length > 64) return false;
    if (s.charAt(0) === "{" || s.slice(0, 3) === "eyJ") return false;
    if (s.indexOf("/") !== -1 || s.indexOf(":") !== -1) return false;
    return HOSTED_ID.test(s);
  }

  function apiFor(node) {
    var override = node && node.getAttribute("data-api");
    return override ? String(override).replace(/\/$/, "") : API_BASE;
  }

  function mountCfg(cfg, node) {
    if (!cfg) return;
    var inst = new PopupInstance(cfg, null);
    inst.apiBase = apiFor(node);
    inst.test = node.getAttribute("data-popforge-test") === "1";
    (window.PopForge._inst || (window.PopForge._inst = [])).push(inst);
    inst.arm();
    node.setAttribute("data-popforge-ready", "1");
  }

  function loadHosted(id, node) {
    var base = apiFor(node);
    if (!base) {
      node.removeAttribute("data-popforge-ready");
      console.warn("[PopForge] no API base found for widget", id);
      return;
    }
    apiFetch("/api/widgets/" + encodeURIComponent(id) + "/config", { headers: { Accept: "application/json" } }, base)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.cfg) {
          node.removeAttribute("data-popforge-ready");
          console.warn("[PopForge] widget " + id + " has no published config");
          return;
        }
        var cfg = data.cfg;
        cfg.id = data.id || id;
        if (!cfg.name && data.name) cfg.name = data.name;
        mountCfg(cfg, node);
      })
      .catch(function () {
        node.removeAttribute("data-popforge-ready");
        console.warn("[PopForge] could not load widget " + id);
      });
  }

  function boot() {
    document.querySelectorAll("[data-popforge]").forEach(function (node) {
      if (node.hasAttribute("data-popforge-ready")) return;
      node.setAttribute("data-popforge-ready", "loading");
      var ref = node.getAttribute("data-popforge");
      if (isHostedRef(ref)) {
        loadHosted(String(ref).trim(), node);
        return;
      }
      try {
        var cfg = decodeCfg(ref);
        if (cfg) mountCfg(cfg, node);
        else node.removeAttribute("data-popforge-ready");
      } catch (e) { node.removeAttribute("data-popforge-ready"); console.warn("[PopForge] invalid inline config"); }
    });
  }
  window.PopForge.scan = boot;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
