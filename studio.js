/* PopupLoom Studio: editor logic */
(function () {
  "use strict";

  var stageEl = document.getElementById("stage");
  stageEl.classList.add("pf-stage"); // lets the runtime scope its position inside the stage
  var toastEl = document.getElementById("toast");
  function toast(msg, ok) {
    toastEl.textContent = msg;
    toastEl.className = "toast show" + (ok ? " ok" : "");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.className = "toast"; }, 2200);
  }

  /* ---------------- simple/advanced mode ---------------- */
  var countdownChoice = null;
  var ADV_KEY = "pf.studio.advanced";
  var advOn = false;
  try { advOn = localStorage.getItem(ADV_KEY) === "1"; } catch (e) {}
  function applyAdv() {
    document.body.classList.toggle("simple", !advOn);
    var t = document.getElementById("advToggle");
    if (t) t.checked = advOn;
    var h = document.getElementById("advHint");
    if (h) h.textContent = advOn ? "on" : "off";
    syncToggles();
  }
  var advToggleEl = document.getElementById("advToggle");
  if (advToggleEl) advToggleEl.addEventListener("change", function () {
    advOn = advToggleEl.checked;
    try { localStorage.setItem(ADV_KEY, advOn ? "1" : "0"); } catch (e) {}
    applyAdv();
  });
  applyAdv();

  /* toggle switches: CSS keys the lit state off a class, sync it from the checkbox */
  function syncToggles() {
    document.querySelectorAll(".toggle").forEach(function (lb) {
      var cb = lb.querySelector('input[type="checkbox"]');
      lb.classList.toggle("on", !!(cb && cb.checked));
    });
  }
  document.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t && t.type === "checkbox" && t.closest) {
      var lb = t.closest(".toggle");
      if (lb) lb.classList.toggle("on", t.checked);
    }
  });

  /* ---------------- state ---------------- */
  var qs = new URLSearchParams(location.search);
  var widgetId = null;
  var widgetName = "";
  var tplId = qs.get("tpl") || "";
  var editing = qs.get("id") || "";
  var state = blankCfg();

  async function initState() {
    if (editing) {
      var wob = await PF.store.get(editing);
      if (wob) {
        widgetId = wob.id;
        widgetName = wob.name;
        state = PF.normalize(wob.cfg);
        state.id = wob.id;
      }
    } else if (tplId && tplId !== "blank") {
      state = PF.cfgFor(tplId) || state;
      widgetName = (state && state.name) ? state.name : "";
    }
  }

  function blankCfg() {
    return {
      v: 1, template: tplId || "blank", placement: "modal",
      trigger: { type: "delay", delay: 5 },
      frequency: "once:day",
      pages: { mode: "all", include: [], exclude: [] },
      devices: { desktop: true, mobile: true },
      sticky: { enabled: false, label: "Hey!" },
      theme: { style: "light", accent: "#F99A1F", accentText: "#261303", text: "#171A20", bg: "#FFFFFF", radius: 18, animation: "pop", overlay: true },
      content: {
        badge: "", title: "New popup", body: "Write what matters here.",
        image: "", videoEmbed: "", buttonText: "", buttonUrl: "", buttonStyle: "light",
        coupon: null, countdown: null, choices: null, form: null, links: null, note: "",
        spin: null, ageGate: null, proof: null
      }
    };
  }

  /* ---------------- shared bits ---------------- */
  // ensure blank template shows in saved-book "build" column, harmless if unknown.
  var BLANK_OK = true;

  /* ---------------- async init ---------------- */
  async function init() {
    PF.mountAuthUI({
      buttonId: "btnAuth",
      onAuthChange: async function () {
        if (!PF.auth.isAuthed()) {
          // Never keep a previous account's widget id in memory.
          widgetId = null;
          renderPublish();
          return;
        }
        // After draft migration, only expose a code for a widget this account owns.
        if (widgetId) {
          var owned = await PF.store.get(widgetId);
          if (!owned) widgetId = null;
        }
        renderPublish();
      }
    });
    var btnFromPublish = document.getElementById("btnSaveFromPublish");
    if (btnFromPublish) btnFromPublish.onclick = saveWidget;

    if (PF.auth.isAuthed()) {
      var me = await PF.auth.me();
      if (!me) {
        PF.auth.logout();
        if (window.updateAuthButton) window.updateAuthButton();
      }
    }
    await initState();
    document.getElementById("nameInput").value = widgetName || "Untitled popup";
    var t = PF.templates.find(function (x) { return x.id === (state && state.template); });
    document.getElementById("tplPill").textContent = t ? t.name : "custom";
    fill();
    refresh();
    renderPublish();
  }

  /* tabs */
  document.querySelectorAll(".tab").forEach(function (btn) {
    btn.onclick = function () {
      document.querySelectorAll(".tab").forEach(function (b) { b.classList.toggle("on", b === btn); });
      var pid = btn.getAttribute("data-p");
      document.querySelectorAll(".panel").forEach(function (p) { p.classList.toggle("on", p.id === "panel_" + pid); });
    };
  });

  /* device pill */
  document.querySelectorAll("[data-dev]").forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll("[data-dev]").forEach(function (x) { x.classList.toggle("on", x === b); });
      stageEl.classList.toggle("mobile", b.getAttribute("data-dev") === "mobile");
    };
  });

  /* dynamic lists */
  function choiceRow(d) {
    var row = document.createElement("div");
    row.className = "row2";
    row.style.marginBottom = "8px";
    row.innerHTML =
      '<input class="inp" data-c="emoji" placeholder="🚀" value="' + escAttr((d && d.emoji) || "") + '" maxlength="4">' +
      '<input class="inp" data-c="label" placeholder="Label" value="' + escAttr((d && d.label) || "") + '">';
    return row;
  }
  function linkRow(d) {
    var row = document.createElement("div");
    row.className = "row2";
    row.style.marginBottom = "8px";
    row.innerHTML =
      '<input class="inp" data-l="label" placeholder="Link label" value="' + escAttr((d && d.label) || "") + '">' +
      '<input class="inp" data-l="url" placeholder="https://…" value="' + escAttr((d && d.url) || "") + '">';
    return row;
  }
  function fieldRow(d) {
    var row = document.createElement("div");
    row.style.cssText = "margin-bottom:8px;display:grid;grid-template-columns:1fr 92px 1fr;gap:6px;align-items:center";
    row.innerHTML =
      '<input class="inp" data-f="name" placeholder="field id (email)" value="' + escAttr((d && d.name) || "") + '">' +
      '<select class="sel" data-f="type"><option value="email"' + (d && d.type === "email" ? " selected" : "") + '>email</option><option value="text"' + (d && d.type === "text" ? " selected" : "") + '>text</option><option value="phone"' + (d && d.type === "phone" ? " selected" : "") + '>phone</option><option value="number"' + (d && d.type === "number" ? " selected" : "") + '>number</option></select>' +
      '<input class="inp" data-f="label" placeholder="Field placeholder" value="' + escAttr((d && d.label) || "") + '">' +
      '<label class="check" style="grid-column:1/4;margin:0"><input type="checkbox" data-f="req"' + (d && d.required ? " checked" : "") + '><span class="mut" style="font-size:12.5px">required</span></label>';
    return row;
  }
  function spinRow(d) {
    var row = document.createElement("div");
    row.className = "row2";
    row.style.marginBottom = "8px";
    row.innerHTML =
      '<input class="inp" data-s="emoji" placeholder="🎁" value="' + escAttr((d && d.emoji) || "") + '" maxlength="4">' +
      '<input class="inp" data-s="label" placeholder="Prize (10% off)" value="' + escAttr((d && d.label) || "") + '">';
    return row;
  }
  function proofRow(d) {
    var row = document.createElement("div");
    row.style.cssText = "margin-bottom:8px;display:grid;grid-template-columns:1fr 1.4fr .8fr;gap:6px;align-items:center";
    row.innerHTML =
      '<input class="inp" data-pf="name" placeholder="Maya" value="' + escAttr((d && d.name) || "") + '">' +
      '<input class="inp" data-pf="action" placeholder="unlocked 20% off" value="' + escAttr((d && d.action) || "") + '">' +
      '<input class="inp" data-pf="ago" placeholder="2 min ago" value="' + escAttr((d && d.ago) || "") + '">';
    return row;
  }
  document.getElementById("addChoice").onclick = function () { document.getElementById("choicesList").appendChild(choiceRow()); refresh(); };
  document.getElementById("addLink").onclick = function () { document.getElementById("linksList").appendChild(linkRow()); refresh(); };
  document.getElementById("addField").onclick = function () { document.getElementById("fieldsList").appendChild(fieldRow()); refresh(); };
  document.getElementById("addSpinSeg").onclick = function () { document.getElementById("spinList").appendChild(spinRow()); refresh(); };
  document.getElementById("addProofItem").onclick = function () { document.getElementById("proofList").appendChild(proofRow()); refresh(); };

  /* ---------------- fill and read ---------------- */
  function fill() {
    var c = state.content, th = state.theme, tr = state.trigger, sm = state.sticky;
    // content
    setVal("f-badge", c.badge); setVal("f-title", c.title); setVal("f-body", c.body);
    setVal("f-image", c.image || ""); setVal("f-video", c.videoEmbed || "");
    setVal("f-btnLabel", c.buttonText || ""); setVal("f-btnUrl", c.buttonUrl || "");
    setSel("f-btnStyle", c.buttonStyle || "light");
    setVal("f-couponCode", (c.coupon && c.coupon.code) || "");
    setVal("f-note", c.note || "");
    // countdown: map the stored target back onto the nearest preset
    var cdSel = document.getElementById("f-countdownPreset");
    var cdPreset = "";
    if (c.countdown && c.countdown.target) {
      var cdT = new Date(c.countdown.target).getTime();
      var cdHrs = (cdT - Date.now()) / 36e5;
      if (cdHrs > 0 && cdHrs <= 2) cdPreset = "1";
      else if (cdHrs > 22 && cdHrs <= 26) cdPreset = "24";
      else if (cdHrs > 46 && cdHrs <= 50) cdPreset = "48";
      else if (cdHrs > 70 && cdHrs <= 74) cdPreset = "72";
      else cdPreset = "custom";
      if (cdPreset === "custom") setVal("f-countdownTarget", toLocalDT(new Date(c.countdown.target)));
    }
    setSel("f-countdownPreset", cdPreset);
    countdownChoice = cdPreset;
    document.getElementById("cdCustomRow").style.display = cdPreset === "custom" ? "block" : "none";
    // choices / links / form
    var cl = document.getElementById("choicesList"); cl.innerHTML = "";
    (c.choices || []).forEach(function (d) { cl.appendChild(choiceRow(d)); });
    var ll = document.getElementById("linksList"); ll.innerHTML = "";
    (c.links || []).forEach(function (d) { ll.appendChild(linkRow(d)); });
    document.getElementById("formEnabled").checked = !!(c.form && c.form.enabled);
    document.getElementById("formBlock").style.display = (c.form && c.form.enabled) ? "block" : "none";
    setVal("formBtnLabel", (c.form && c.form.buttonLabel) || "Submit");
    setVal("formSuccess", (c.form && c.form.success) || "Thanks, you're in!");
    setVal("formHook", (c.form && c.form.webhookUrl) || "");
    var fll = document.getElementById("fieldsList"); fll.innerHTML = "";
    ((c.form && c.form.fields) || []).forEach(function (d) {
      fll.appendChild(fieldRow(d));
    });
    // spin / age gate / social proof
    document.getElementById("spinEnabled").checked = !!(c.spin && c.spin.enabled);
    document.getElementById("spinBlock").style.display = (c.spin && c.spin.enabled) ? "block" : "none";
    setVal("spinBtnLabel", (c.spin && c.spin.buttonText) || "SPIN");
    var sl = document.getElementById("spinList"); sl.innerHTML = "";
    ((c.spin && c.spin.segments) || []).forEach(function (d) { sl.appendChild(spinRow(d)); });
    document.getElementById("ageEnabled").checked = !!(c.ageGate && c.ageGate.enabled);
    document.getElementById("ageBlock").style.display = (c.ageGate && c.ageGate.enabled) ? "block" : "none";
    setVal("ageAllow", (c.ageGate && c.ageGate.allowLabel) || "Yes, I'm 18 or older");
    setVal("ageDeny", (c.ageGate && c.ageGate.denyLabel) || "No, I'm under 18");
    setVal("ageDenyUrl", (c.ageGate && c.ageGate.denyUrl) || "");
    setVal("ageDenyMsg", (c.ageGate && c.ageGate.denyMessage) || "Sorry, you must be 18 or older to enter.");
    document.getElementById("proofEnabled").checked = !!(c.proof && c.proof.enabled);
    document.getElementById("proofBlock").style.display = (c.proof && c.proof.enabled) ? "block" : "none";
    var proofInterval = (c.proof && c.proof.interval) || 5;
    setVal("proofInterval", String(proofInterval >= 1000 ? proofInterval / 1000 : proofInterval));
    var pl = document.getElementById("proofList"); pl.innerHTML = "";
    ((c.proof && c.proof.items) || []).forEach(function (d) { pl.appendChild(proofRow(d)); });
    var proofReal = document.getElementById("proofReal");
    if (proofReal) proofReal.checked = !!(c.proof && (c.proof.items || []).length && !c.proof.demo);

    // design
    setSel("d-style", th.style || "light");
 setSel("d-layout", th.layout || "stack");
    document.querySelectorAll(`#palette .sw`).forEach(function (sw) {
      sw.classList.toggle("on", (sw.getAttribute("data-color") || "").toLowerCase() === (th.accent || "").toLowerCase());
    });
    document.getElementById("d-accent").value = th.accent || "#F99A1F";
    document.getElementById("d-accentText").value = th.accentText || "#07130E";
    document.getElementById("d-text").value = th.text || "#171A20";
    document.getElementById("d-bg").value = th.bg || "#FFFFFF";
    document.getElementById("d-radius").value = th.radius == null ? 18 : th.radius;
    document.getElementById("d-radiusOut").textContent = (th.radius == null ? 18 : th.radius) + "px";
    setSel("d-anim", th.animation || "pop");
    setVal("d-bgImg", th.bgImage || "");
    document.getElementById("d-overlay").checked = th.overlay !== false;
    // behavior
    setSel("b-placement", state.placement || "modal");
    setSel("b-trigger", tr.type);
    document.getElementById("wf-delay").style.display = tr.type === "delay" ? "block" : "none";
    document.getElementById("wf-pct").style.display = tr.type === "scrollPct" ? "block" : "none";
    document.getElementById("wf-sel").style.display = (tr.type === "click" || tr.type === "scrollTo") ? "block" : "none";
    document.getElementById("b-switchHint").style.display = "";
    setVal("_dummy", "");
    document.getElementById("t-delay").value = (+tr.delay || 5);
    document.getElementById("t-pct").value = (+tr.pct || 50);
    document.getElementById("t-pctOut").textContent = (+tr.pct || 50) + "%";
    setVal("t-selector", tr.selector || "");
    document.getElementById("t-selectorHint").textContent = (tr.type === "scrollTo" ? "CSS selector of the element to scroll past, e.g. #pricing-row" : "CSS selector of the button to watch, e.g. .buy-btn or #video-thumb");
    setSel("b-frequency", state.frequency || "once:day");
    var mode = (state.pages && state.pages.mode) || "all";
    document.querySelectorAll("[data-pmode]").forEach(function (r) {
      r.checked = (r.getAttribute("data-pmode") === mode);
    });
    document.getElementById("b-includeBox").style.display = mode === "include" ? "block" : "none";
    document.getElementById("b-excludeBox").style.display = mode === "exclude" ? "block" : "none";
    setVal("b-include", ((state.pages && state.pages.include) || []).join("\n"));
    setVal("b-exclude", ((state.pages && state.pages.exclude) || []).join("\n"));
    document.getElementById("b-devDesktop").checked = state.devices.desktop !== false;
    document.getElementById("b-devMobile").checked = state.devices.mobile !== false;
    // sticky
    document.getElementById("stickyEnabled").checked = !!(sm && sm.enabled);
    setVal("stickyLabel", (sm && sm.label) || "Hey!");
    document.getElementById("stickyLabelRow").style.display = (sm && sm.enabled) ? "block" : "none";
    syncToggles();
  }

  function gather() {
    var c = state.content || (state.content = {});
    c.badge = gval("f-badge"); c.title = gval("f-title"); c.body = gval("f-body");
    c.image = clean(gval("f-image")); c.videoEmbed = clean(gval("f-video"));
    c.buttonText = gval("f-btnLabel"); c.buttonUrl = gval("f-btnUrl");
    c.buttonStyle = gsell("f-btnStyle");
    var code = gval("f-couponCode").trim();
    c.coupon = code ? { code: code } : null;
    c.note = gval("f-note");
    var cdP = gsell("f-countdownPreset");
    if (cdP === "custom") {
      var ct = gval("f-countdownTarget");
      var targetDate = new Date(ct);
      if (!ct || isNaN(targetDate.getTime())) c.countdown = null;
      else if (countdownChoice !== "custom" || !c.countdown || !c.countdown.target || toLocalDT(new Date(c.countdown.target)) !== ct) c.countdown = { target: targetDate.toISOString() };
    } else if (cdP) {
      if (countdownChoice !== cdP || !c.countdown || !c.countdown.target) c.countdown = { target: new Date(Date.now() + (+cdP) * 36e5).toISOString() };
    } else {
      c.countdown = null;
    }
    countdownChoice = cdP;
    var chs = [];
    document.querySelectorAll("#choicesList .row2").forEach(function (row) {
      var em = row.querySelector('[data-c="emoji"]').value.trim();
      var lb = row.querySelector('[data-c="label"]').value.trim();
      if (em || lb) chs.push({ emoji: em, label: lb, value: lb.toLowerCase() || em });
    });
    c.choices = chs.length ? chs : null;
    var lks = [];
    document.querySelectorAll("#linksList .row2").forEach(function (row) {
      var lb = row.querySelector('[data-l="label"]').value.trim();
      var url = clean(row.querySelector('[data-l="url"]').value.trim());
      if (lb && url) lks.push({ label: lb, url: url });
    });
    c.links = lks.length ? lks : null;
    var fe = document.getElementById("formEnabled").checked;
    if (fe) {
      var fls = [];
      document.querySelectorAll("#fieldsList > div").forEach(function (row) {
        var nm = row.querySelector('[data-f="name"]').value.trim().replace(/\s+/g, "-").toLowerCase();
        var tp = row.querySelector('[data-f="type"]').value;
        var lb = row.querySelector('[data-f="label"]').value.trim() || nm;
        var rq = row.querySelector('[data-f="req"]').checked;
        if (nm) fls.push({ name: nm, type: tp, label: lb, required: rq });
      });
      c.form = {
        enabled: true,
        buttonLabel: gval("formBtnLabel") || "Submit",
        success: gval("formSuccess") || "Thanks!",
        webhookUrl: clean(gval("formHook")) || "",
        fields: fls.length ? fls : [{ name: "email", type: "email", label: "Email", required: true }]
      };
    } else { c.form = null; }
    // spin wheel
    if (document.getElementById("spinEnabled").checked) {
      var sgs = [];
      document.querySelectorAll("#spinList .row2").forEach(function (row) {
        var em = row.querySelector('[data-s="emoji"]').value.trim();
        var lb = row.querySelector('[data-s="label"]').value.trim();
        if (lb) sgs.push({ emoji: em, label: lb });
      });
      c.spin = {
        enabled: true,
        buttonText: gval("spinBtnLabel") || "SPIN",
        segments: sgs.length ? sgs : [{ emoji: "🎁", label: "10% off" }, { emoji: "🎉", label: "20% off" }, { emoji: "🚚", label: "Free shipping" }]
      };
    } else { c.spin = null; }
    // age gate
    if (document.getElementById("ageEnabled").checked) {
      c.ageGate = {
        enabled: true, minAge: 18,
        allowLabel: gval("ageAllow") || "Yes, I'm 18 or older",
        denyLabel: gval("ageDeny") || "No, I'm under 18",
        denyUrl: clean(gval("ageDenyUrl")) || "",
        denyMessage: gval("ageDenyMsg") || "Sorry, you must be 18 or older to enter.",
        allowMessage: "Welcome in."
      };
    } else { c.ageGate = null; }
    // social proof
    if (document.getElementById("proofEnabled").checked) {
      var pts = [];
      document.querySelectorAll("#proofList > div").forEach(function (row) {
        var nm = row.querySelector('[data-pf="name"]').value.trim();
        var ac = row.querySelector('[data-pf="action"]').value.trim();
        var ag = row.querySelector('[data-pf="ago"]').value.trim();
        if (nm) pts.push({ name: nm, action: ac || "just joined", ago: ag || "just now" });
      });
      c.proof = {
        enabled: true,
        demo: !document.getElementById("proofReal").checked,
        interval: Math.max(3, +gval("proofInterval") || 5),
        items: pts
      };
    } else { c.proof = null; }

    // design
    var th = state.theme || (state.theme = {});
    th.style = gsell("d-style");
 th.layout = gsell("d-layout") === "split" ? "split" : "stack";
    th.accent = document.getElementById("d-accent").value;
    th.accentText = document.getElementById("d-accentText").value;
    th.text = document.getElementById("d-text").value;
    th.bg = document.getElementById("d-bg").value;
    th.radius = +document.getElementById("d-radius").value;
    th.animation = gsell("d-anim");
    th.bgImage = clean(gval("d-bgImg")) || "";
    th.overlay = document.getElementById("d-overlay").checked;
    // behavior
    var tr = state.trigger || (state.trigger = {});
    tr.type = gsell("b-trigger");
    if (tr.type === "delay") tr.delay = +document.getElementById("t-delay").value || 5;
    if (tr.type === "scrollPct") tr.pct = +document.getElementById("t-pct").value || 50;
    if (tr.type === "click" || tr.type === "scrollTo") tr.selector = gval("t-selector").trim();
    state.placement = gsell("b-placement");
    state.frequency = gsell("b-frequency");
    var pmel = document.querySelector('[data-pmode]:checked');
    var pm = pmel ? pmel.getAttribute("data-pmode") : "all";
    state.pages = {
      mode: pm,
      include: pm === "include" ? lines(gval("b-include")) : (state.pages.include || []),
      exclude: pm === "exclude" ? lines(gval("b-exclude")) : (state.pages.exclude || [])
    };
    state.devices = {
      desktop: document.getElementById("b-devDesktop").checked,
      mobile: document.getElementById("b-devMobile").checked
    };
    state.sticky = {
      enabled: document.getElementById("stickyEnabled").checked,
      label: gval("stickyLabel") || "Hey!"
    };
    state.name = undefined; // name lives on the wrapper, not config
  }

  function clean(s) { return String(s || "").trim().replace(/^javascript:/i, ""); }
  function lines(s) { return String(s || "").split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function toLocalDT(d) {
    var p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function setVal(id, v) { var el = document.getElementById(id); if (el) el.value = v == null ? "" : v; }
  function gval(id) { var el = document.getElementById(id); return el ? el.value : ""; }
  function setSel(id, v) { var el = document.getElementById(id); if (el) el.value = v; }
  function gsell(id) { var el = document.getElementById(id); return el ? el.value : ""; }
  function escAttr(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function escHtml(s) { return escAttr(s).replace(/\n/g, "<br>"); }

  /* ---------------- live preview ---------------- */
  var previewInst = null;
  var saving = false;
  var refreshT = 0;
  function refresh() {
    gather();
    clearTimeout(refreshT);
    refreshT = setTimeout(function () {
      // re-render preview
      if (previewInst) {
        previewInst.destroy();
        previewInst = null;
      }
      var cfg = JSON.parse(JSON.stringify(state));
      cfg.frequency = "always";
      previewInst = PopupLoom.preview(stageEl, cfg);
      // publish tab
      var pill = document.getElementById("tplPill");
      var t = PF.templates.find(function (x) { return x.id === state.template; });
      if (t) pill.textContent = t.name;
      renderPublish();
    }, 120);
  }

  function innerName() {
    var el = document.getElementById("nameInput");
    return (el.value || "").trim() || "Untitled popup";
  }
  function wrapped() {
    var cfg = PF.normalize(state);
    var id = widgetId || cfg.id;
    cfg.id = id;
    return { id: id, name: innerName(), cfg: cfg, updatedAt: Date.now() };
  }
  // Install codes exist only for popups saved to an account. The snippet
  // carries the widget id; the runtime fetches the live config from the API.
  function snippetText() {
    if (!PF.auth.isAuthed() || !widgetId) return "";
    return PF.snippet(widgetId);
  }

  function renderPublish() {
    var gate = document.getElementById("pubGate");
    var unsaved = document.getElementById("pubUnsaved");
    var ready = document.getElementById("pubReady");
    var wrap = document.getElementById("pubSnippetWrap");
    if (!gate || !unsaved || !ready || !wrap) return;
    var authed = PF.auth.isAuthed();
    var saved = authed && !!widgetId;
    gate.style.display = authed ? "none" : "block";
    unsaved.style.display = authed && !widgetId ? "block" : "none";
    ready.style.display = saved ? "block" : "none";
    wrap.style.display = saved ? "block" : "none";
    var nameEl = document.getElementById("pubName");
    if (nameEl) nameEl.textContent = innerName();
    if (saved) {
      document.getElementById("pubBox").textContent = snippetText();
      var acc = document.getElementById("pubAccount");
      if (acc) acc.textContent = "Signed in · config syncs live";
    }
  }

  /* ---------------- wire inputs ---------------- */
  document.getElementById("panel-rail").addEventListener("input", refresh);
  document.getElementById("panel-rail").addEventListener("change", refresh);
  document.getElementById("nameInput").addEventListener("input", function () {
    document.getElementById("pubName").textContent = innerName();
  });

  /* trigger-type dependent fields */
  document.getElementById("b-trigger").addEventListener("change", function () {
    var v = this.value;
    document.getElementById("wf-delay").style.display = v === "delay" ? "block" : "none";
    document.getElementById("wf-pct").style.display = v === "scrollPct" ? "block" : "none";
    document.getElementById("wf-sel").style.display = (v === "click" || v === "scrollTo") ? "block" : "none";
    document.getElementById("t-selectorHint").textContent = (v === "scrollTo" ? "CSS selector of the element to scroll past, e.g. #pricing-row" : "CSS selector of the button to watch, e.g. .buy-btn or #video-thumb");
    refresh();
  });

  /* countdown preset: reveal the date picker only for "custom" */
  document.getElementById("f-countdownPreset").addEventListener("change", function () {
    document.getElementById("cdCustomRow").style.display = this.value === "custom" ? "block" : "none";
  });

  /* pages mode radios show/hide lists */
  document.querySelectorAll("[data-pmode]").forEach(function (r) {
    r.addEventListener("change", function () {
      var m = r.getAttribute("data-pmode");
      document.getElementById("b-includeBox").style.display = m === "include" ? "block" : "none";
      document.getElementById("b-excludeBox").style.display = m === "exclude" ? "block" : "none";
    });
  });

  /* radius output */
  document.getElementById("d-radius").addEventListener("input", function () {
    document.getElementById("d-radiusOut").textContent = this.value + "px";
  });
  /* scroll pct output */
  document.getElementById("t-pct").addEventListener("input", function () {
    document.getElementById("t-pctOut").textContent = this.value + "%";
  });
  /* sticky label row toggle */
  document.getElementById("stickyEnabled").addEventListener("change", function () {
    document.getElementById("stickyLabelRow").style.display = this.checked ? "block" : "none";
  });
  /* form toggle row */
  document.getElementById("formEnabled").addEventListener("change", function () {
    document.getElementById("formBlock").style.display = this.checked ? "block" : "none";
  });
  /* spin / age / proof toggle rows */
  document.getElementById("spinEnabled").addEventListener("change", function () {
    document.getElementById("spinBlock").style.display = this.checked ? "block" : "none";
  });
  document.getElementById("ageEnabled").addEventListener("change", function () {
    document.getElementById("ageBlock").style.display = this.checked ? "block" : "none";
  });
  document.getElementById("proofEnabled").addEventListener("change", function () {
    document.getElementById("proofBlock").style.display = this.checked ? "block" : "none";
  });

  /* accent palette */
  document.querySelectorAll("#palette .sw").forEach(function (sw) {
    sw.onclick = function () {
      document.querySelectorAll("#palette .sw").forEach(function (x) { x.classList.toggle("on", x === sw); });
      document.getElementById("d-accent").value = sw.getAttribute("data-color");
      refresh();
    };
  });
  ["d-accent", "d-accentText", "d-text", "d-bg"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", refresh);
  });

  /* ---------------- save / test / delete ---------------- */
  async function saveWidget() {
    if (saving) return;
    saving = true;
    try {
      gather();
      state.id = widgetId || PF.uid();
      var w = wrapped();
      var saved = await PF.store.save(w);
      if (saved && saved.id) { widgetId = saved.id; state.id = saved.id; }
      w.name = innerName();
      document.getElementById("pubName").textContent = w.name;
      renderPublish();
      if (PF.auth.isAuthed()) toast('Saved "' + w.name + '". Install code ready.', true);
      else toast('Draft saved in this browser. Sign in to get the install code.', true);
      var btn = document.getElementById("btnSave");
      if (btn) {
        btn.textContent = "Saved ✓";
        setTimeout(function () { btn.textContent = "Save widget"; }, 1600);
      }
    } catch (e) {
      toast("Save failed: " + e.message, false);
    } finally { saving = false; }
  }
  document.getElementById("btnSave").onclick = saveWidget;
  document.getElementById("btnTest").onclick = function () {
    gather();
    var cfg = JSON.parse(JSON.stringify(state));
    cfg.frequency = "always";
    cfg.id = "test_" + Date.now().toString(36);
    window.PopupLoom.show(cfg, { test: true });
    toast("Test popup running. Escape or the ✕ closes it", true);
  };
  document.getElementById("btnDel").onclick = async function () {
    if (!widgetId) { toast("Not saved yet. Nothing to delete.", false); return; }
    if (!confirm("Delete this popup from your shelf?")) return;
    try {
      await PF.store.remove(widgetId);
      widgetId = null;
      state.id = PF.uid();
      renderPublish();
      toast("Deleted", true);
    } catch (e) { toast("Delete failed: " + e.message, false); }
  };
  document.getElementById("btnCopySnippet").onclick = function () {
    var text = snippetText();
    if (!text) {
      toast("Sign in and save this widget to get its install code", false);
      if (window.openAuthModal) window.openAuthModal();
      return;
    }
    var fallback = function () {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta);
      ta.select(); try { document.execCommand("copy"); } catch (e) {}
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(fallback);
    else fallback();
    toast("Install code copied. Paste it once before </body>.", true);
  };

  /* fill once + first paint */
  init().catch(function (e) { toast("Could not load the studio: " + e.message, false); });
})();
