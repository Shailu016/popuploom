/* PopupLoom: shared app code. Storage (API + localStorage fallback), auth, template presets */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* API base detection                                                  */
  /* ------------------------------------------------------------------ */
  function apiBase() {
    if (window.POPUPLOOM_API) return String(window.POPUPLOOM_API).replace(/\/$/, "");
    // derive from where this script was loaded (same origin as the server)
    try {
      var scripts = document.querySelectorAll('script[src*="app.js"]');
      for (var i = 0; i < scripts.length; i++) {
        var u = new URL(scripts[i].src);
        return u.origin;
      }
    } catch (e) {}
    return window.location.origin;
  }
  const API = apiBase();

  /* ------------------------------------------------------------------ */
  /* Auth                                                                */
  /* ------------------------------------------------------------------ */
  const Auth = {
    tokenKey: "pf.token",
    getToken: function () { try { return localStorage.getItem(this.tokenKey); } catch (e) { return null; } },
    setToken: function (t) { try { localStorage.setItem(this.tokenKey, t); } catch (e) {} },
    clearToken: function () { try { localStorage.removeItem(this.tokenKey); } catch (e) {} },
    isAuthed: function () { return !!this.getToken(); },
    headers: function () {
      var h = { "Content-Type": "application/json" };
      var t = this.getToken();
      if (t) h["Authorization"] = "Bearer " + t;
      return h;
    },
    register: async function (email, password, name) {
      const res = await fetch(API + "/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      if (data.token) this.setToken(data.token);
      return data;
    },
    login: async function (email, password) {
      const res = await fetch(API + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.error || "Login failed");
        err.code = data.code;
        throw err;
      }
      this.setToken(data.token);
      return data;
    },
    resendVerification: async function (email) {
      const res = await fetch(API + "/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email })
      });
      let data = {};
      try { data = await res.json(); } catch (e) {}
      if (!res.ok) {
        const err = new Error(data.error || "Could not send the verification email.");
        err.code = data.code;
        throw err;
      }
      return data;
    },
    logout: async function () {
      if (!this.getToken()) return;
      const res = await fetch(API + "/api/auth/logout", { method: "POST", headers: this.headers() });
      if (!res.ok && res.status !== 401) throw new Error("Sign out failed. Please try again.");
      this.clearToken();
    },
    me: async function () {
      const t = this.getToken();
      if (!t) return null;
      const res = await fetch(API + "/api/auth/me", { headers: this.headers() });
      if (res.status === 401) { this.clearToken(); return null; }
      if (!res.ok) throw new Error("Could not check your session. Please try again.");
      const data = await res.json();
      return data.user;
    },
    updateProfile: async function (patch) {
      const res = await fetch(API + "/api/auth/profile", { method: "PUT", headers: this.headers(), body: JSON.stringify(patch || {}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save your profile");
      return data.user;
    },
    // Which social providers this server can actually offer (cached).
    config: async function () {
      if (this._config) return this._config;
      try {
        const res = await fetch(API + "/api/auth/config");
        const data = res.ok ? await res.json() : {};
        this._config = { googleClientId: data.googleClientId || null };
      } catch (e) {
        this._config = { googleClientId: null };
      }
      return this._config;
    },
    // Exchange a Google Identity Services credential for a PopupLoom session.
    loginWithGoogle: async function (credential) {
      const res = await fetch(API + "/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credential })
      });
      let data = {};
      try { data = await res.json(); } catch (e) {}
      if (!res.ok) {
        const err = new Error(data.error || "Google sign-in failed");
        err.code = data.code;
        throw err;
      }
      this.setToken(data.token);
      return data;
    }
  };

  /* ------------------------------------------------------------------ */
  /* Storage: API when authed, localStorage (guest) otherwise            */
  /* ------------------------------------------------------------------ */
  const GUEST_KEY = "pf.widgets";
  const MIGRATE_LOCK = "pf.migrating";
  let migrationRun = null;

  function guestViews(id) {
    try { return Math.max(0, Number(localStorage.getItem("pfview." + id)) || 0); } catch (e) { return 0; }
  }

  // Cross-tab lock so two tabs that sign in at the same time cannot both
  // replay the same guest drafts into the account and create duplicates.
  function acquireMigrationLock() {
    var token = uid();
    try {
      var raw = localStorage.getItem(MIGRATE_LOCK);
      if (raw) {
        var held = JSON.parse(raw);
        if (held && Number(held.until) > Date.now()) return null;
      }
      localStorage.setItem(MIGRATE_LOCK, JSON.stringify({ token: token, until: Date.now() + 60000 }));
      return token;
    } catch (e) {
      return "unlocked"; // Blocked storage: still migrate in this tab.
    }
  }
  function releaseMigrationLock(token) {
    if (!token || token === "unlocked") return;
    try {
      var raw = localStorage.getItem(MIGRATE_LOCK);
      var held = raw ? JSON.parse(raw) : null;
      if (held && held.token === token) localStorage.removeItem(MIGRATE_LOCK);
    } catch (e) {}
  }

  const Store = {
    isAuthed: function () { return Auth.isAuthed(); },

    loadAll: async function () {
      if (Auth.isAuthed()) {
        const res = await fetch(API + "/api/widgets", { headers: Auth.headers() });
        if (!res.ok) throw new Error("Couldn't load cloud popups. Please try again.");
        const rows = await res.json();
        return rows.map(function (r) { return { id: r.id, name: r.name, cfg: r.cfg, template: r.template, viewCount: r.viewCount || 0, submissionCount: r.submissionCount || 0, submissions: [], createdAt: r.createdAt, updatedAt: r.updatedAt }; });
      }
      try {
        var list = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
        return (Array.isArray(list) ? list : []).map(function (w) {
          return Object.assign({}, w, { viewCount: guestViews(w.id) });
        });
      } catch (e) { return []; }
    },

    get: async function (id) {
      if (Auth.isAuthed()) {
        const res = await fetch(API + "/api/widgets/" + encodeURIComponent(id), { headers: Auth.headers() });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("Couldn't load this popup. Please try again.");
        return res.json();
      }
      const list = await this.loadAll();
      return list.find(function (w) { return w.id === id; }) || null;
    },

    save: async function (w) {
      if (!w || !w.cfg || typeof w.cfg !== "object" || Array.isArray(w.cfg)) throw new Error("Invalid popup config");
      if (!/^[A-Za-z0-9_-]{3,64}$/.test(String(w.id || ""))) w.id = uid();
      w.cfg.id = w.id;
      if (Auth.isAuthed()) {
        // update if exists, else create
        const existing = await this.get(w.id);
        if (existing) {
          const res = await fetch(API + "/api/widgets/" + encodeURIComponent(w.id), { method: "PUT", headers: Auth.headers(), body: JSON.stringify({ name: w.name, config: w.cfg }) });
          if (!res.ok) throw new Error("save failed");
          const updated = await res.json();
          return Object.assign(w, { viewCount: updated.viewCount, updatedAt: updated.updatedAt });
        } else {
          const res = await fetch(API + "/api/widgets", { method: "POST", headers: Auth.headers(), body: JSON.stringify({ name: w.name, template: w.cfg && w.cfg.template, config: w.cfg }) });
          if (!res.ok) throw new Error("create failed");
          const created = await res.json();
          w.id = created.id;
          // keep the embedded config id in sync with the database id so the
          // runtime can report views/submissions back to this widget
          if (w.cfg) w.cfg.id = created.id;
          return Object.assign(w, { viewCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        }
      }
      // guest: localStorage
      const list = await this.loadAll();
      const i = list.findIndex(function (x) { return x.id === w.id; });
      if (i >= 0) list[i] = w; else list.push(w);
      localStorage.setItem(GUEST_KEY, JSON.stringify(list));
      return w;
    },

    remove: async function (id) {
      if (Auth.isAuthed()) {
        const res = await fetch(API + "/api/widgets/" + encodeURIComponent(id), { method: "DELETE", headers: Auth.headers() });
        if (!res.ok) throw new Error("Delete failed. Please try again.");
        return;
      }
      const list = (await this.loadAll()).filter(function (x) { return x.id !== id; });
      localStorage.setItem(GUEST_KEY, JSON.stringify(list));
    },

    views: function (id) {
      // Guest counters live in this browser; cloud counts arrive on the row.
      return Auth.isAuthed() ? 0 : guestViews(id);
    },

    bumpView: async function (id) {
      if (Auth.isAuthed()) {
        try { await fetch(API + "/api/widgets/" + encodeURIComponent(id) + "/view", { method: "POST" }); } catch (e) {}
        return;
      }
      // guest: localStorage counter
      try {
        var k = "pfview." + id;
        localStorage.setItem(k, (+(localStorage.getItem(k) || 0) + 1).toString());
      } catch (e) {}
    },

    submissions: async function (id) {
      if (Auth.isAuthed()) {
        try {
          const res = await fetch(API + "/api/widgets/" + encodeURIComponent(id) + "/submissions", { headers: Auth.headers() });
          if (!res.ok) return [];
          const rows = await res.json();
          return rows.map(function (r) { return { at: new Date(r.createdAt).getTime(), data: r.data }; });
        } catch (e) { return []; }
      }
      try { return JSON.parse(localStorage.getItem("pfsubs." + id) || "[]"); } catch (e) { return []; }
    },

    putSubmission: async function (id, s) {
      if (!Auth.isAuthed()) {
        // Guest submissions are not persisted: the runtime never stores lead
        // data on the customer's origin, and this legacy path must not either.
        return false;
      }
      try {
        await fetch(API + "/api/widgets/" + encodeURIComponent(id) + "/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: s.data || s }) });
        return true;
      } catch (e) { return false; }
    },

    // After sign-in, move guest drafts from this browser into the account so
    // nobody loses work they did before joining. Returns how many moved.
    migrateGuestDrafts: function () {
      if (!Auth.isAuthed()) return Promise.resolve(0);
      if (migrationRun) return migrationRun;
      var self = this;
      migrationRun = (async function () {
        var lock = acquireMigrationLock();
        if (!lock) return 0;
        try {
          var drafts = [];
          try { drafts = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]"); } catch (e) { drafts = []; }
          if (!Array.isArray(drafts) || !drafts.length) return 0;
          var moved = 0;
          var remaining = [];
          for (var i = 0; i < drafts.length; i++) {
            var w = drafts[i];
            if (!w || !w.cfg) { remaining.push(w); continue; }
            try {
              await self.save(w);
              moved++;
            } catch (e) {
              remaining.push(w);
            }
          }
          try {
            if (remaining.length) localStorage.setItem(GUEST_KEY, JSON.stringify(remaining));
            else localStorage.removeItem(GUEST_KEY);
          } catch (e) {}
          return moved;
        } finally {
          releaseMigrationLock(lock);
        }
      })();
      migrationRun = migrationRun.then(function (n) {
        migrationRun = null;
        return n;
      }, function (e) {
        migrationRun = null;
        throw e;
      });
      return migrationRun;
    }
  };

  /* ------------------------------------------------------------------ */
  /* Lead export: every popup, paged at the API's 500-row maximum.       */
  /* ------------------------------------------------------------------ */
  const Leads = {
    all: async function (onProgress) {
      if (!Auth.isAuthed()) throw new Error("Sign in to export captured leads.");
      const widgets = await Store.loadAll();
      const rows = [];
      for (let wi = 0; wi < widgets.length; wi++) {
        const w = widgets[wi];
        let before = null;
        for (;;) {
          const url = API + "/api/widgets/" + encodeURIComponent(w.id) + "/submissions?limit=500" + (before ? "&before=" + encodeURIComponent(before) : "");
          let res;
          try {
            res = await fetch(url, { headers: Auth.headers(), cache: "no-store" });
          } catch (e) {
            throw new Error("Could not export leads. Check your connection and try again.");
          }
          if (res.status === 401) throw new Error("Session expired. Sign in again.");
          if (res.status === 404) break; // popup was deleted while exporting
          if (!res.ok) throw new Error("Could not export leads. Please try again.");
          let batch;
          try { batch = await res.json(); } catch (e) { throw new Error("Invalid lead response."); }
          if (!Array.isArray(batch)) throw new Error("Invalid lead response.");
          for (let i = 0; i < batch.length; i++) {
            rows.push({
              widgetName: w.name || "Untitled popup",
              widgetId: w.id,
              id: batch[i].id,
              createdAt: batch[i].createdAt,
              data: batch[i].data || {}
            });
          }
          if (onProgress) onProgress(rows.length, widgets.length, wi + 1);
          if (batch.length < 500) break;
          const next = batch[batch.length - 1].id;
          if (before !== null && !(next < before)) throw new Error("Pagination did not advance; export stopped.");
          before = next;
          if (rows.length > 100000) throw new Error("Too many leads for one file. Export a single popup from its lead inbox.");
        }
      }
      rows.sort(function (a, b) {
        const ta = Date.parse(a.createdAt) || 0, tb = Date.parse(b.createdAt) || 0;
        return tb - ta || b.id - a.id;
      });
      return rows;
    },
    csv: function (rows) {
      if (!window.LeadCsv) throw new Error("Lead export is unavailable. Reload the page.");
      return window.LeadCsv.csvWithPopup(rows);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Template presets: categorized catalog (original designs)            */
  /* "@assets/..." resolves to this server; "@48h"-style countdowns      */
  /* resolve to a live future timestamp at copy time.                    */
  /* ------------------------------------------------------------------ */
  /* Six journeys. Every template belongs to exactly one. */
  const JOURNEYS = [
    { id: "capture",  label: "Capture",  blurb: "Turn anonymous traffic into contacts you can keep." },
    { id: "convert",  label: "Convert",  blurb: "Move browsers to checkout with offers, drops and honest urgency." },
    { id: "retain",   label: "Retain",   blurb: "Keep buyers close with loyalty, referrals and feedback." },
    { id: "winback",  label: "Win back", blurb: "Recover carts, exits and lapsing customers." },
    { id: "announce", label: "Announce", blurb: "Broadcast launches, events, shipping news and hours." },
    { id: "trust",    label: "Trust",    blurb: "Age gates, social proof and owner-supplied trust notices." }
  ];

  const TEMPLATES = [
    /* ---------- Discount ---------- */
    { id: "drop48", cat: "discount", name: "48-Hour Drop", tag: "Flash deal", blurb: "Ember-lit modal with a live countdown and a copyable code field.", mock: { style: "ink", accent: "#FF6B4A" },
      cfg: { v: 1, template: "drop48", placement: "modal", trigger: { type: "delay", delay: 4 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "48H Drop" }, theme: { style: "ink", accent: "#FF6B4A", accentText: "#1F0600", text: "#F7F9FC", bg: "#0F1117", radius: 24, animation: "pop", overlay: true }, content: { badge: "Limited time", title: "40% off,\nonly 48 hours", body: "Copy the code below and use it at checkout before the timer runs out.", image: "@assets/art/ember-rings.jpg", countdown: { target: "@48h" }, coupon: { code: "FLASH40" }, buttonText: "Shop now", buttonUrl: "", buttonStyle: "light", note: "While supplies last. Cannot be combined with other offers." } } },
    { id: "chalkhat", cat: "discount", name: "Sticky Note Deal", tag: "Coupon", blurb: "Light welcome-offer modal with soft sage artwork and a copyable code field.", mock: { style: "light", accent: "#22C55E" },
      cfg: { v: 1, template: "chalkhat", placement: "modal", trigger: { type: "load" }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "Deal!" }, theme: { style: "light", accent: "#22C55E", accentText: "#052E16", bg: "#FFFFFF", text: "#0F172A", radius: 20, animation: "pop", overlay: true }, content: { badge: "Welcome offer", title: "Get 10% off\nyour first order", body: "Use the code below at checkout. It covers your first purchase.", image: "@assets/art/sage-paper.jpg", coupon: { code: "WELCOME10" }, buttonText: "Claim and shop", buttonUrl: "", buttonStyle: "light", note: "Valid for first-time customers only." } } },
    { id: "sneakerDrop", cat: "discount", name: "Fresh Kicks Drop", tag: "Product drop", blurb: "Cobalt product-drop modal with a countdown and a code field.", mock: { style: "light", accent: "#3B82F6" },
      cfg: { v: 1, template: "sneakerDrop", placement: "modal", trigger: { type: "delay", delay: 3 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "New Drop" }, theme: { style: "light", accent: "#3B82F6", accentText: "#FFFFFF", text: "#0F172A", bg: "#FFFFFF", radius: 24, animation: "pop", overlay: true }, content: { badge: "New collection", title: "Fresh kicks\njust landed", body: "Get 30% off the newest drop for a limited time. Use the code below at checkout.", image: "@assets/art/cobalt-glass.jpg", countdown: { target: "@72h" }, coupon: { code: "KICKS30" }, buttonText: "Shop the drop", buttonUrl: "", buttonStyle: "light", note: "Limited stock. Free shipping on orders $75+" } } },
    { id: "nightTune", cat: "discount", name: "Midnight Audio Sale", tag: "Electronics", blurb: "Ink modal with a mint glass motif for an after-hours sale code.", mock: { style: "ink", accent: "#35F0B0" },
      cfg: { v: 1, template: "nightTune", placement: "modal", trigger: { type: "scrollPct", pct: 55 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Deal" }, theme: { style: "ink", accent: "#35F0B0", accentText: "#04130D", text: "#E9F2EE", bg: "#0E1216", radius: 20, animation: "pop", overlay: true }, content: { badge: "Midnight drop", title: "The after-hours\naudio sale", body: "Sample offer. The code applies to the audio range for one night.", image: "@assets/art/mint-glass.jpg", coupon: { code: "BASS-15" }, buttonText: "Shop audio", buttonUrl: "", buttonStyle: "light", note: "Sample copy. The owner sets real eligibility." } } },

    /* ---------- Email ---------- */
    { id: "exitOnly", cat: "email", name: "Last Exit Note", tag: "Exit intent", blurb: "Neutral exit-intent modal with one email field for owner follow-up.", mock: { style: "light", accent: "#6366F1" },
      cfg: { v: 1, template: "exitOnly", placement: "modal", trigger: { type: "exitIntent" }, frequency: "close24h", pages: { mode: "all" }, devices: { desktop: true, mobile: false }, sticky: { enabled: false, label: "Deal" }, theme: { style: "light", accent: "#6366F1", accentText: "#FFFFFF", bg: "#FFFFFF", text: "#0F172A", radius: 24, animation: "pop", overlay: true }, content: { badge: "Before you go", title: "Get 15% off\nbefore you leave", body: "Join the list to request the discount. The website owner handles delivery and terms.", image: "@assets/art/linen-arch.jpg", form: { enabled: true, buttonLabel: "Get My Discount", success: "Check your inbox! Your code is on its way.", fields: [{ name: "email", type: "email", label: "Enter your email", required: true }] }, note: "Sample copy. Replace with the website owner's real offer and privacy terms." } } },
    { id: "waitlist", cat: "email", name: "Queue Ticket", tag: "Launch", blurb: "Ink launch modal with a violet light motif and an email field for waitlist interest.", mock: { style: "ink", accent: "#C9A0FF" },
      cfg: { v: 1, template: "waitlist", placement: "modal", trigger: { type: "delay", delay: 10 }, frequency: "once:ever", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Waitlist" }, theme: { style: "ink", accent: "#C9A0FF", accentText: "#150826", bg: "#17131F", text: "#EFEAF8", radius: 20, animation: "pop", overlay: true }, content: { badge: "Early access", title: "Version 2 opens in small batches", body: "Leave an email to register interest in the launch. The website owner manages the list.", image: "@assets/art/violet-orb.jpg", form: { enabled: true, buttonLabel: "Reserve a spot", success: "Ticket held. See you at the opening.", fields: [{ name: "email", type: "email", label: "Email for your ticket", required: true }] }, note: "Sample copy. Replace with real launch terms." } } },
    { id: "glowRitual", cat: "email", name: "Glow Ritual", tag: "Beauty", blurb: "Warm ivory signup modal with an amber arch motif and one email field.", mock: { style: "light", accent: "#B07A4E" },
      cfg: { v: 1, template: "glowRitual", placement: "modal", trigger: { type: "delay", delay: 7 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Ritual" }, theme: { style: "light", accent: "#B07A4E", accentText: "#FFF8F0", text: "#2E2318", bg: "#FFFBF4", radius: 22, animation: "pop", overlay: true }, content: { badge: "The Sunday ritual", title: "Your glow,\non schedule", body: "Join the list for owner-sent skincare updates. Frequency and content are set by the website owner.", image: "@assets/art/amber-arch.jpg", form: { enabled: true, buttonLabel: "Join the ritual", success: "Welcome to the ritual. Sunday, then.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "Sample copy. Replace with the owner's real promise and terms." } } },
    { id: "cafeClub", cat: "email", name: "Morning Club", tag: "Hospitality", blurb: "Café-toned signup modal with a morning horizon motif and one email field.", mock: { style: "light", accent: "#C4772F" },
      cfg: { v: 1, template: "cafeClub", placement: "modal", trigger: { type: "load" }, frequency: "close24h", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Free latte" }, theme: { style: "light", accent: "#C4772F", accentText: "#FFF6EC", text: "#2B1F14", bg: "#FFF9F0", radius: 20, animation: "pop", overlay: true }, content: { badge: "Members", title: "Join the\nmorning list", body: "Join the list to hear about owner-run offers. Any free item is provided by the website owner.", image: "@assets/art/morning-horizon.jpg", form: { enabled: true, buttonLabel: "Claim my free latte", success: "It's yours. Show this at the counter.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "Sample copy. Replace with the store's real offer and terms." } } },

    /* ---------- Gamified ---------- */
    { id: "wheelWin", cat: "gamified", name: "Spin to Win", tag: "Prize wheel", blurb: "Ink modal with a segmented prize wheel; the owner sets real prizes, odds and terms.", mock: { style: "ink", accent: "#F59E0B" },
      cfg: { v: 1, template: "wheelWin", placement: "modal", trigger: { type: "delay", delay: 3 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "Spin & Win" }, theme: { style: "ink", accent: "#F59E0B", accentText: "#1C1917", text: "#F8FAFC", bg: "#0F172A", radius: 24, animation: "pop", overlay: true }, content: { badge: "Spin to win", title: "Spin once for\na welcome offer", body: "Spin the wheel for an owner-configured promotional result.", spin: { enabled: true, buttonText: "Spin now", segments: [{ label: "15% off" }, { label: "25% off" }, { label: "Free shipping" }, { label: "$20 off" }, { label: "Buy one, get one" }, { label: "Gift with order" }] }, note: "Sample prizes. The owner sets real prizes, odds and terms." } } },
    { id: "giveaway", cat: "gamified", name: "Bundle Giveaway", tag: "Contest", blurb: "Ink modal with a gold light motif, countdown and a one-field entry form; the owner runs the draw.", mock: { style: "ink", accent: "#FF4D3D" },
      cfg: { v: 1, template: "giveaway", placement: "modal", trigger: { type: "scrollPct", pct: 60 }, frequency: "once:ever", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Win!" }, theme: { style: "ink", accent: "#FF4D3D", accentText: "#FFFFFF", text: "#F3EDE9", bg: "#131014", radius: 22, animation: "pop", overlay: true }, content: { badge: "Win the bundle", title: "One winner.\nEverything in the bundle.", body: "Enter your email to register interest. The website owner runs any draw and states the rules.", image: "@assets/art/coral-orb.jpg", countdown: { target: "@120h" }, form: { enabled: true, buttonLabel: "Enter the draw", success: "You're in the draw. Good luck.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "Sample copy. The owner must publish real eligibility, dates and prize terms." } } },

    /* ---------- Seasonal ---------- */
    { id: "bfdrop", cat: "seasonal", name: "Black Friday Fortress", tag: "Black Friday", blurb: "Ink modal with crimson light beams, a countdown and a code field.", mock: { style: "ink", accent: "#FF4D3D" },
      cfg: { v: 1, template: "bfdrop", placement: "modal", trigger: { type: "load" }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "BF-40" }, theme: { style: "ink", accent: "#FF4D3D", accentText: "#FFFFFF", text: "#F2ECEA", bg: "#0D0B10", radius: 22, animation: "pop", overlay: true }, content: { badge: "Black Friday", title: "Forty percent off,\nsitewide", body: "Sample offer. Copy the code and apply it at checkout before the timer ends.", image: "@assets/art/crimson-beam.jpg", countdown: { target: "@48h" }, coupon: { code: "BF-40" }, buttonText: "Shop the drop", buttonUrl: "", buttonStyle: "light", note: "Until the timer ends or stock sells out." } } },
    { id: "xmasglow", cat: "seasonal", name: "Winter Unwrap", tag: "Christmas", blurb: "Light seasonal modal with a frosted horizon motif and a copyable code.", mock: { style: "light", accent: "#2E8B57" },
      cfg: { v: 1, template: "xmasglow", placement: "modal", trigger: { type: "delay", delay: 6 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "XMAS-25" }, theme: { style: "light", accent: "#2E8B57", accentText: "#FFFFFF", text: "#22301F", bg: "#FDFDFC", radius: 22, animation: "pop", overlay: true }, content: { badge: "Winter sale", title: "Twenty-five percent\noff the gift shop", body: "Sample offer. Copy the code below and apply it at checkout.", image: "@assets/art/frost-horizon.jpg", coupon: { code: "XMAS-25" }, buttonText: "Shop gifts", buttonUrl: "", buttonStyle: "light", note: "Sample copy. The owner sets the real dates and terms." } } },

    { id: "cyberdrop", cat: "seasonal", name: "Cyber Monday Reload", tag: "Cyber Monday", blurb: "Navy modal with a neon grid motif, a countdown and a code field.", mock: { style: "ink", accent: "#FF3E8A" },
      cfg: { v: 1, template: "cyberdrop", placement: "modal", trigger: { type: "delay", delay: 5 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "CYBER-30" }, theme: { style: "ink", accent: "#FF3E8A", accentText: "#FFFFFF", text: "#F0ECF4", bg: "#0E1220", radius: 22, animation: "pop", overlay: true }, content: { badge: "Cyber Monday", title: "One more night.\nEverything's back.", body: "The sale is back for 24 hours. The code is below.", image: "@assets/art/neon-grid.jpg", countdown: { target: "@24h" }, coupon: { code: "CYBER-30" }, buttonText: "Redeem the reload", buttonUrl: "", buttonStyle: "light", note: "Sample copy. The owner sets the real end time." } } },

    /* ---------- Age gate ---------- */
    { id: "age18", cat: "age", name: "Age Declaration", tag: "Age gate", blurb: "Self-declaration age gate; allow continues, deny shows a message or redirects. Not identity verification.", mock: { style: "light", accent: "#E3A008" },
      cfg: { v: 1, template: "age18", placement: "modal", trigger: { type: "load" }, frequency: "always", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#E3A008", accentText: "#1A1205", text: "#17181C", bg: "#FFFFFF", radius: 6, animation: "fade", overlay: true, layout: "split" }, content: { badge: "Age check", title: "Confirm you meet\nthe age requirement", body: "Ask visitors to confirm they meet the age requirement for your site. Set the minimum age in the studio.", image: "@assets/age-gate-ambient.svg", ageGate: { enabled: true, minAge: 18, allowLabel: "Yes, continue", denyLabel: "No, exit", denyUrl: "", denyMessage: "You must meet the age requirement to enter this site.", allowMessage: "Welcome in." }, note: "Sample copy. A self-declaration is not legal age verification." } } },

    /* ---------- Social proof ---------- */
    { id: "proofPulse", cat: "social", name: "Proof Pulse", tag: "Social proof", blurb: "Bottom-left activity toasts for authentic owner-supplied updates. Sample names are demonstration data.", mock: { style: "light", accent: "#F99A1F" },
      cfg: { v: 1, template: "proofPulse", placement: "slide:bl", trigger: { type: "load" }, frequency: "always", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#F99A1F", accentText: "#261303", text: "#171A1F", bg: "#FFFFFF", radius: 16, animation: "slideUp", overlay: false }, content: { proof: { enabled: true, demo: true, interval: 5000, items: [{ name: "Maya", action: "just unlocked 20% off", ago: "2 min ago" }, { name: "Derek", action: "signed up for the drop list", ago: "6 min ago" }, { name: "Priya", action: "claimed the free-shipping code", ago: "11 min ago" }] } } } },

    /* ---------- Announce ---------- */
    { id: "barnews", cat: "announce", name: "Marquee Masthead", tag: "Announcement", blurb: "Slim top announcement bar with copy, CTA and optional link.", mock: { style: "ink", accent: "#4EA1FF" },
      cfg: { v: 1, template: "barnews", placement: "topbar", trigger: { type: "load" }, frequency: "always", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "ink", accent: "#4EA1FF", accentText: "#04121F", bg: "#0F1420", text: "#EBF2F8", radius: 0, animation: "slideDown", overlay: false }, content: { title: "Free shipping above $45", body: "Sample copy. Replace with the store's real shipping terms and timeframe.", buttonText: "See shipping rules", buttonUrl: "", buttonStyle: "light" } } },
    { id: "freeship", cat: "announce", name: "Free Shipping Rail", tag: "Shipping", blurb: "Bottom announcement bar for a shipping threshold or notice; the owner supplies the real terms.", mock: { style: "ink", accent: "#F99A1F" },
      cfg: { v: 1, template: "freeship", placement: "bottombar", trigger: { type: "delay", delay: 3 }, frequency: "always", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "ink", accent: "#F99A1F", accentText: "#261303", bg: "#10151D", text: "#EAF2EE", radius: 0, animation: "slideUp", overlay: false }, content: { title: "Free shipping unlocks above $50", body: "Sample copy. Replace with the store's real shipping terms and threshold.", buttonText: "Shop to unlock", buttonUrl: "", buttonStyle: "light" } } },

    /* ---------- Engage ---------- */
    { id: "tapMeter", cat: "engage", name: "Tap Meter", tag: "Feedback", blurb: "One-tap page rating with three text choices and an instant thank-you.", mock: { style: "light", accent: "#F99A1F" },
      cfg: { v: 1, template: "tapMeter", placement: "slide:br", trigger: { type: "scrollPct", pct: 65 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Feedback" }, theme: { style: "light", accent: "#F99A1F", accentText: "#261303", bg: "#FFFFFF", text: "#14171C", radius: 18, animation: "pop", overlay: false }, content: { badge: "10-second check", title: "How's this page landing?", body: "One tap. That is the whole survey.", choices: [{ label: "Great", value: "great" }, { label: "It's okay", value: "meh" }, { label: "Not great", value: "rough" }], note: "Anonymous. Used only to improve this page." } } },
    { id: "microYes", cat: "engage", name: "One Small Yes", tag: "Micro-commitment", blurb: "Yes/no micro-commitment prompt; the next step is owner-defined.", mock: { style: "light", accent: "#F99A1F" },
      cfg: { v: 1, template: "microYes", placement: "modal", trigger: { type: "scrollPct", pct: 45 }, frequency: "close24h", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#F99A1F", accentText: "#261303", bg: "#FFFFFF", text: "#14171C", radius: 20, animation: "pop", overlay: true }, content: { badge: "Quick question", title: "One small yes\nopens the door", body: "See a two-minute overview of what is included. The next step is set by the website owner.", choices: [{ label: "Yes, show me", value: "yes" }, { label: "Maybe later", value: "later" }], note: "No email required." } } },
    { id: "cornerPeek", cat: "engage", name: "Corner Peek", tag: "Support", blurb: "Corner card with owner-supplied help hours and three support links.", mock: { style: "light", accent: "#FFC53D" },
      cfg: { v: 1, template: "cornerPeek", placement: "slide:br", trigger: { type: "delay", delay: 8 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "Need help?" }, theme: { style: "light", accent: "#FFC53D", accentText: "#221A00", bg: "#FFFFFF", text: "#171A1F", radius: 18, animation: "pop", overlay: false }, content: { badge: "Support", title: "Stuck on a page?", body: "Sample copy. Replace with the owner's real support hours and response promise.", buttonText: "Open the help desk", buttonUrl: "", buttonStyle: "light", links: [{ label: "Guides", url: "" }, { label: "Email", url: "" }, { label: "Chat", url: "" }], note: "Sample copy. Replace with real support channels." } } },
    { id: "transit", cat: "engage", name: "Transit Card", tag: "Multi link", blurb: "Compact card with configurable shortcut tiles.", mock: { style: "ink", accent: "#F99A1F" },
      cfg: { v: 1, template: "transit", placement: "modal", trigger: { type: "scrollPct", pct: 80 }, frequency: "once:ever", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Links" }, theme: { style: "ink", accent: "#F99A1F", accentText: "#261303", bg: "#10141B", text: "#E8EFF2", radius: 18, animation: "pop", overlay: true }, content: { title: "Your trip shortcuts", body: "Everything travelers hit most, one tap from anywhere.", links: [{ label: "Timetable", url: "" }, { label: "Fare map", url: "" }, { label: "Stops", url: "" }] } } },

    /* ---------- Video ---------- */
    { id: "player", cat: "video", name: "Screen Room", tag: "Video", blurb: "Framed video embed for launches or tutorials, opened by a CTA.", mock: { style: "light", accent: "#151A20" },
      cfg: { v: 1, template: "player", placement: "slide:tl", trigger: { type: "click", selector: "#show-tour" }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Watch" }, theme: { style: "light", accent: "#151A20", accentText: "#FFFFFF", bg: "#FFFFFF", text: "#12151A", radius: 16, animation: "fade", overlay: false }, content: { title: "The 90-second site tour", body: "A fast walkthrough of browsing, buying, and where your orders live.", videoEmbed: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", buttonText: "Watch full film", buttonUrl: "", buttonStyle: "dark", note: "Demo video: Big Buck Bunny, Blender Foundation, CC BY 3.0. Replace with your own media." } } },

    /* ---------- Exit ---------- */
    { id: "fullscreenExit", cat: "exit", name: "Don't Leave Empty", tag: "Exit takeover", blurb: "Fullscreen exit-intent takeover with an ink backdrop and a code field.", mock: { style: "ink", accent: "#F99A1F" },
      cfg: { v: 1, template: "fullscreenExit", placement: "fullscreen", trigger: { type: "exitIntent" }, frequency: "close24h", pages: { mode: "all" }, devices: { desktop: true, mobile: false }, sticky: { enabled: false, label: "" }, theme: { style: "ink", accent: "#F99A1F", accentText: "#261303", text: "#F2F7F4", bg: "#0E1216", bgImage: "@assets/art/mint-glass.jpg", radius: 24, animation: "pop", overlay: true }, content: { badge: "Before you go", title: "Don't leave\nempty-handed", body: "Sample code and offer. Replace with the website owner's real discount and terms.", coupon: { code: "EXIT-15" }, buttonText: "Copy and keep browsing", buttonUrl: "", buttonStyle: "light", note: "Sample copy. The owner sets the real expiry and eligibility." } } },

    /* ---------- Journey: capture (new) ---------- */
    { id: "leadShelf", cat: "email", journey: "capture", name: "Lead Magnet Shelf", tag: "Content upgrade", blurb: "Corner slide-in with an email field for a content upgrade; the owner delivers the file.", mock: { style: "light", accent: "#2D5BFF" },
      cfg: { v: 1, template: "leadShelf", placement: "slide:br", trigger: { type: "scrollPct", pct: 40 }, frequency: "close24h", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Guide" }, theme: { style: "light", accent: "#2D5BFF", accentText: "#FFFFFF", text: "#1B1D2A", bg: "#FBF7EF", radius: 20, animation: "pop", overlay: false }, content: { badge: "Free workbook", title: "The 12-page\nlaunch checklist", body: "Enter your email to request this sample guide. The website owner delivers the file and sets terms.", form: { enabled: true, buttonLabel: "Send the PDF", success: "On its way. Check your inbox.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "Sample copy. The owner must supply the actual file and delivery." } } },
    { id: "smsPass", cat: "email", journey: "capture", name: "SMS Speed Pass", tag: "Text list", blurb: "Phone-first signup layout; the owner handles SMS delivery and consent.", mock: { style: "light", accent: "#0F766E" },
      cfg: { v: 1, template: "smsPass", placement: "slide:bl", trigger: { type: "delay", delay: 12 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Texts" }, theme: { style: "light", accent: "#0F766E", accentText: "#FFFFFF", text: "#0F2E2A", bg: "#F0FDFA", radius: 18, animation: "slideUp", overlay: false }, content: { badge: "Text list", title: "Deals by text,\nnot by algorithm", body: "Join the text list. Message frequency, consent and opt-out are set by the website owner.", form: { enabled: true, buttonLabel: "Join the text list", success: "You are in. First text lands Friday.", fields: [{ name: "phone", type: "phone", label: "+1 (555) 000-0000", required: true }] }, note: "Sample copy. The owner must comply with SMS consent laws and state real terms." } } },
    { id: "webinarSeat", cat: "email", journey: "capture", name: "Webinar Seat", tag: "Live session", blurb: "Ink modal with a countdown and two-field registration; the owner sends any details.", mock: { style: "ink", accent: "#E9B949" },
      cfg: { v: 1, template: "webinarSeat", placement: "modal", trigger: { type: "delay", delay: 8 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "Live seat" }, theme: { style: "ink", accent: "#E9B949", accentText: "#1A1200", text: "#F5F1E6", bg: "#101725", radius: 22, animation: "pop", overlay: true }, content: { badge: "Free live session", title: "Pricing teardowns,\nThursday 4pm", body: "Register interest in this session. The website owner confirms details and sends any invite.", countdown: { target: "@72h" }, form: { enabled: true, buttonLabel: "Save my seat", success: "Seat saved. The calendar invite is on its way.", fields: [{ name: "name", type: "text", label: "First name", required: true }, { name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "Sample copy. The owner supplies real event and replay details." } } },
    { id: "firstCode", cat: "email", journey: "capture", name: "First-Order Code", tag: "Email for code", blurb: "Editorial cream modal that collects an email for a first-order code; the owner sends the code.", mock: { style: "light", accent: "#8E2F3C" },
      cfg: { v: 1, template: "firstCode", placement: "modal", trigger: { type: "scrollPct", pct: 25 }, frequency: "close24h", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "10% in inbox" }, theme: { style: "light", accent: "#8E2F3C", accentText: "#FFF9F4", text: "#2A1518", bg: "#FFF9F4", radius: 4, animation: "fade", overlay: true }, content: { badge: "First order", title: "Ten percent,\nstraight to your inbox", body: "Enter your email to request the first-order code. The website owner sends it and sets the terms.", form: { enabled: true, buttonLabel: "Email me the code", success: "Sent. It is good for seven days.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "Sample copy. The owner sends the code and honors the offer." } } },

    /* ---------- Journey: convert (new) ---------- */
    { id: "backStock", cat: "email", journey: "convert", name: "Back in Stock", tag: "Restock alert", blurb: "Sage slide-in that collects restock requests; the owner provides monitoring and alerts.", mock: { style: "light", accent: "#2F6B4F" },
      cfg: { v: 1, template: "backStock", placement: "slide:br", trigger: { type: "scrollPct", pct: 50 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "Notify me" }, theme: { style: "light", accent: "#2F6B4F", accentText: "#F7FBF6", text: "#16241C", bg: "#F7FBF6", radius: 16, animation: "slideUp", overlay: false }, content: { badge: "Sold out again", title: "Next batch,\nfirst ping", body: "Leave an email to request a restock alert. The website owner provides monitoring and delivery.", form: { enabled: true, buttonLabel: "Notify me first", success: "You are first in line. We write before the shelf goes live.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "Sample copy. The owner must actually monitor stock and delivery." } } },
    { id: "lowStock", cat: "discount", journey: "convert", name: "Low-Stock Batch", tag: "Scarcity", blurb: "Charcoal modal with a batch timer layout and a stock message the owner must verify.", mock: { style: "ink", accent: "#FF8A3D" },
      cfg: { v: 1, template: "lowStock", placement: "modal", trigger: { type: "delay", delay: 8 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "14 left" }, theme: { style: "ink", accent: "#FF8A3D", accentText: "#1A0C00", text: "#F7EDE6", bg: "#15110F", radius: 18, animation: "pop", overlay: true }, content: { badge: "Small batch", title: "Fourteen left\nin this run", body: "Replace this with the website owner's real batch or stock information.", countdown: { target: "@6h" }, buttonText: "Take one", buttonUrl: "", buttonStyle: "light", note: "Sample copy. Only publish stock or timer claims that are true." } } },
    { id: "bundleBuild", cat: "discount", journey: "convert", name: "Bundle Builder", tag: "AOV", blurb: "Ink modal with lime accent and three configurable bundle link tiles.", mock: { style: "ink", accent: "#C7F464" },
      cfg: { v: 1, template: "bundleBuild", placement: "modal", trigger: { type: "scrollPct", pct: 70 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "ink", accent: "#C7F464", accentText: "#0E1408", text: "#F0F6EC", bg: "#0D1117", radius: 20, animation: "pop", overlay: true }, content: { badge: "Build a set", title: "Pick two, save 15.\nPick three, save 25.", body: "Mix anything on the shelf. The discount applies itself at checkout. No code to remember.", links: [{ label: "The starter pair, $48", url: "" }, { label: "The everyday trio, $66", url: "" }, { label: "The full shelf, $120", url: "" }], note: "Prices shown after the bundle discount." } } },
    { id: "priceWatch", cat: "email", journey: "convert", name: "Price Watch", tag: "Price alert", blurb: "Sky-blue slide-in that collects a target price and email; the owner provides monitoring and alerts.", mock: { style: "light", accent: "#3BA7FF" },
      cfg: { v: 1, template: "priceWatch", placement: "slide:tr", trigger: { type: "scrollPct", pct: 60 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#3BA7FF", accentText: "#FFFFFF", text: "#101A26", bg: "#F5F8FC", radius: 18, animation: "slideDown", overlay: false }, content: { badge: "Price watch", title: "Watching this price?", body: "Enter a target price to register interest. The website owner provides monitoring and alerts.", form: { enabled: true, buttonLabel: "Watch the price", success: "Watching. We will only write when it moves.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }, { name: "target", type: "text", label: "Your target price ($)", required: false }] }, note: "Sample copy. The owner must actually monitor prices and state real terms." } } },

    /* ---------- Journey: retain (new) ---------- */
    { id: "loyaltyCard", cat: "engage", journey: "retain", name: "Loyalty Card", tag: "Points club", blurb: "Black-and-rose membership card layout for an owner-operated points or member program.", mock: { style: "ink", accent: "#FF5C8A" },
      cfg: { v: 1, template: "loyaltyCard", placement: "modal", trigger: { type: "delay", delay: 12 }, frequency: "once:ever", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "Points" }, theme: { style: "ink", accent: "#FF5C8A", accentText: "#1A0710", text: "#F7EDF2", bg: "#0F0D12", radius: 24, animation: "pop", overlay: true }, content: { badge: "The counter", title: "Three orders in,\nyou are family", body: "Join the list for owner-run member updates. Points, credit and eligibility are set by the store.", form: { enabled: true, buttonLabel: "Join the counter", success: "You are in. First points post with your next order.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "Sample copy. No loyalty ledger is included; the owner sets real terms." } } },
    { id: "referFriend", cat: "engage", journey: "retain", name: "Refer a Friend", tag: "Referral", blurb: "Plum slide-in with a shareable code field and owner-defined referral terms.", mock: { style: "light", accent: "#6B4EFF" },
      cfg: { v: 1, template: "referFriend", placement: "slide:br", trigger: { type: "scrollPct", pct: 75 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#6B4EFF", accentText: "#FFFFFF", text: "#1B1430", bg: "#FBF8FF", radius: 18, animation: "pop", overlay: false }, content: { badge: "Give ten, get ten", title: "Share the code,\nboth sides win", body: "Share the code with a friend. The store sets the real reward and eligibility.", coupon: { code: "FRIEND-10" }, buttonText: "Copy and share", buttonUrl: "", buttonStyle: "light", note: "Sample copy. The owner sets referral terms." } } },
    { id: "reviewAsk", cat: "engage", journey: "retain", name: "Review Request", tag: "Feedback", blurb: "Three-choice feedback prompt for after an order; the owner follows up.", mock: { style: "light", accent: "#B45309" },
      cfg: { v: 1, template: "reviewAsk", placement: "modal", trigger: { type: "delay", delay: 20 }, frequency: "once:ever", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#B45309", accentText: "#FFFDF7", text: "#241A0E", bg: "#FFFDF7", radius: 14, animation: "pop", overlay: true }, content: { badge: "Two taps", title: "How did the\nlast order land?", body: "One tap is enough. The store may follow up by email.", choices: [{ label: "Loved it", value: "loved" }, { label: "It is fine", value: "fine" }, { label: "Not for me", value: "not-for-me" }], note: "Every answer is read by the team." } } },
    { id: "birthdayClub", cat: "engage", journey: "retain", name: "Birthday Club", tag: "Lifecycle", blurb: "Ink modal with brass accent and an email signup for an owner-run birthday list.", mock: { style: "ink", accent: "#F0B429" },
      cfg: { v: 1, template: "birthdayClub", placement: "modal", trigger: { type: "delay", delay: 15 }, frequency: "once:ever", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "ink", accent: "#F0B429", accentText: "#1C1400", text: "#F8F0E4", bg: "#141014", radius: 20, animation: "fade", overlay: true }, content: { badge: "Birthday list", title: "A gift on\nthe day itself", body: "Join the email list for owner-sent birthday offers. The store sets any credit and terms.", form: { enabled: true, buttonLabel: "Save my date", success: "Saved. We will be there.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "Sample copy. The owner must honor the offer and state real terms." } } },

    /* ---------- Journey: winback (new) ---------- */
    { id: "cartRescue", cat: "exit", journey: "winback", name: "Cart Rescue", tag: "Exit + cart", blurb: "Exit-intent modal with a cart message, code field and owner-set shipping or offer terms.", mock: { style: "ink", accent: "#FF6B4A" },
      cfg: { v: 1, template: "cartRescue", placement: "modal", trigger: { type: "exitIntent" }, frequency: "close24h", pages: { mode: "all" }, devices: { desktop: true, mobile: false }, sticky: { enabled: true, label: "Cart held" }, theme: { style: "ink", accent: "#FF6B4A", accentText: "#1F0600", text: "#F7F1EC", bg: "#12100F", radius: 20, animation: "pop", overlay: true }, content: { badge: "Cart, still warm", title: "Free shipping and\nten percent, held", body: "Sample copy. Replace with the store's real cart, shipping and discount terms.", coupon: { code: "CART-10" }, buttonText: "Back to the cart", buttonUrl: "", buttonStyle: "light", note: "Sample copy. The owner sets real terms; stock is not reserved." } } },
    { id: "comebackCode", cat: "discount", journey: "winback", name: "Comeback Code", tag: "Lapsed buyer", blurb: "Teal modal with a welcome-back code field and countdown; the owner sets eligibility.", mock: { style: "light", accent: "#0D9488" },
      cfg: { v: 1, template: "comebackCode", placement: "modal", trigger: { type: "delay", delay: 10 }, frequency: "once:ever", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#0D9488", accentText: "#F4FBFA", text: "#0E2422", bg: "#F4FBFA", radius: 22, animation: "pop", overlay: true }, content: { badge: "It has been a minute", title: "Twenty percent,\nno guilt attached", body: "Sample copy. Replace with the store's real win-back offer and eligibility.", countdown: { target: "@48h" }, coupon: { code: "COMEBACK-20" }, buttonText: "Use the code", buttonUrl: "", buttonStyle: "light", note: "Sample copy. The owner sets real eligibility and expiry." } } },
    { id: "cancelSave", cat: "exit", journey: "winback", name: "Cancel Saver", tag: "Retention", blurb: "Click-triggered retention prompt with configurable pause, downgrade or leave choices.", mock: { style: "light", accent: "#1E3A8A" },
      cfg: { v: 1, template: "cancelSave", placement: "modal", trigger: { type: "click", selector: "#cancel-plan" }, frequency: "always", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#1E3A8A", accentText: "#FFFFFF", text: "#101A33", bg: "#F7F9FF", radius: 16, animation: "fade", overlay: true }, content: { badge: "Before you cancel", title: "Most people just\nneeded a quiet month", body: "Sample copy. Replace with the service's real pause, downgrade or cancellation options.", choices: [{ label: "Pause a month", value: "pause" }, { label: "Downgrade instead", value: "downgrade" }, { label: "Cancel anyway", value: "cancel" }], note: "Sample copy. The owner supplies actual retention terms." } } },

    /* ---------- Journey: announce (new) ---------- */
    { id: "launchDay", cat: "announce", journey: "announce", name: "Launch Day", tag: "Product drop", blurb: "Violet ink modal with a launch countdown and a reminder CTA.", mock: { style: "ink", accent: "#A78BFA" },
      cfg: { v: 1, template: "launchDay", placement: "modal", trigger: { type: "delay", delay: 6 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "Tonight" }, theme: { style: "ink", accent: "#A78BFA", accentText: "#140A24", text: "#F1ECFA", bg: "#0F0D18", radius: 22, animation: "pop", overlay: true }, content: { badge: "Doors at 8pm", title: "The new collection\nopens tonight", body: "Sample copy. Replace with the real launch time, quantity and restock plan.", countdown: { target: "@24h" }, buttonText: "Set a reminder", buttonUrl: "", buttonStyle: "light", note: "Sample copy. The owner sends any reminder." } } },
    { id: "eventInvite", cat: "announce", journey: "announce", name: "Event Invite", tag: "Store event", blurb: "Rust-corner invitation with two configurable link tiles.", mock: { style: "light", accent: "#C2410C" },
      cfg: { v: 1, template: "eventInvite", placement: "slide:tr", trigger: { type: "delay", delay: 12 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#C2410C", accentText: "#FFF8F2", text: "#2A160D", bg: "#FFF8F2", radius: 18, animation: "slideDown", overlay: false }, content: { badge: "Store night", title: "Thursday, 7pm.\nCoffee is on us.", body: "Sample copy. Replace with the real event details and host terms.", links: [{ label: "Save the date", url: "" }, { label: "Get directions", url: "" }], note: "Sample copy. The owner supplies real event details." } } },
    { id: "shippingDelay", cat: "announce", journey: "announce", name: "Shipping Delay", tag: "Service notice", blurb: "Amber top bar for a shipping notice with a link to details.", mock: { style: "ink", accent: "#F59E0B" },
      cfg: { v: 1, template: "shippingDelay", placement: "topbar", trigger: { type: "load" }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "ink", accent: "#F59E0B", accentText: "#1A1200", text: "#F8F1E3", bg: "#16130E", radius: 0, animation: "slideDown", overlay: false }, content: { title: "Orders placed this week ship Monday", body: "Our courier is catching up after the storm. Tracking still updates normally.", buttonText: "Read the notice", buttonUrl: "", buttonStyle: "light" } } },
    { id: "holidayHours", cat: "announce", journey: "announce", name: "Holiday Hours", tag: "Hours", blurb: "Pine-green bottom rail for closure dates and a link to full hours.", mock: { style: "light", accent: "#14532D" },
      cfg: { v: 1, template: "holidayHours", placement: "bottombar", trigger: { type: "load" }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#14532D", accentText: "#F6FBF6", text: "#12231A", bg: "#F6FBF6", radius: 0, animation: "slideUp", overlay: false }, content: { title: "We are closed December 24 to 26", body: "Orders ship the 27th. Gift cards stay open all week.", buttonText: "See all hours", buttonUrl: "", buttonStyle: "light" } } },

    /* ---------- Journey: trust (new) ---------- */
    { id: "age21", cat: "age", journey: "trust", name: "Age Confirmation", tag: "Age gate", blurb: "Self-declaration age gate with neutral copy. Not legal age verification.", mock: { style: "ink", accent: "#D4A24C" },
      cfg: { v: 1, template: "age21", placement: "modal", trigger: { type: "load" }, frequency: "always", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "ink", accent: "#D4A24C", accentText: "#1A1200", text: "#F5F0E4", bg: "#101A16", radius: 6, animation: "fade", overlay: true }, content: { badge: "Age check", title: "Confirm you meet\nthe age requirement", body: "Ask visitors to confirm they meet the legal age where they live. Set the minimum age in the studio.", ageGate: { enabled: true, minAge: 21, allowLabel: "Yes, continue", denyLabel: "No, exit", denyUrl: "", denyMessage: "You must meet the age requirement to continue.", allowMessage: "Welcome in." }, note: "Sample copy. This is a self-declaration, not legal verification." } } },
    { id: "guaranteeSeal", cat: "social", journey: "trust", name: "Guarantee Seal", tag: "Guarantee", blurb: "Green corner card layout for an owner-supplied return or guarantee statement.", mock: { style: "light", accent: "#15803D" },
      cfg: { v: 1, template: "guaranteeSeal", placement: "slide:br", trigger: { type: "scrollPct", pct: 85 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#15803D", accentText: "#F6FBF7", text: "#12251A", bg: "#F6FBF7", radius: 16, animation: "slideUp", overlay: false }, content: { badge: "Your policy", title: "State your real\nreturn policy", body: "Replace with the store's real return or guarantee policy. PopupLoom does not provide or verify guarantees.", buttonText: "Read the policy", buttonUrl: "", buttonStyle: "light", note: "Sample copy. The owner supplies the actual policy." } } },
    { id: "secureCheckout", cat: "social", journey: "trust", name: "Secure Checkout", tag: "Reassurance", blurb: "Blue slide-in layout for owner-supplied payment, returns and support facts.", mock: { style: "light", accent: "#2563EB" },
      cfg: { v: 1, template: "secureCheckout", placement: "slide:bl", trigger: { type: "scrollPct", pct: 90 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#2563EB", accentText: "#FFFFFF", text: "#101A2E", bg: "#F6F9FF", radius: 18, animation: "pop", overlay: false }, content: { badge: "Checkout, decoded", title: "No fine-print\npanic here", body: "Replace with the store's real security, returns and support facts. PopupLoom does not process payments or verify these claims.", links: [{ label: "Returns policy", url: "" }, { label: "Privacy", url: "" }, { label: "Talk to a human", url: "" }], note: "Sample copy. The owner supplies actual policies." } } },

    /* ---------- Layout and seasonal additions (2026-11-18) ---------- */
    { id: "valentine", cat: "seasonal", journey: "convert", name: "Valentine's Gift Offer", tag: "Valentine's Day", blurb: "Light modal with a rose header image, a copyable code field and a clear gift-shop button.", mock: { style: "light", accent: "#B33A55" },
      cfg: { v: 1, template: "valentine", placement: "modal", trigger: { type: "delay", delay: 5 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Gifts" }, theme: { style: "light", accent: "#B33A55", accentText: "#FFFFFF", text: "#2B1218", bg: "#FFFAFA", radius: 18, animation: "pop", overlay: true, layout: "hero" }, content: { badge: "Valentine's offer", title: "Twenty percent off\ngifts they will keep", body: "Sample offer. Copy the code and apply it at checkout before the deadline.", image: "@assets/art/rose-waves.jpg", coupon: { code: "LOVE20" }, buttonText: "Shop gifts", buttonUrl: "", buttonStyle: "light", note: "Sample copy. The owner sets the real dates and terms." } } },
    { id: "halloween", cat: "seasonal", journey: "convert", name: "Halloween Sale", tag: "Halloween", blurb: "Ink modal with a moonlit header, a countdown and a copyable code field.", mock: { style: "ink", accent: "#FF8A3D" },
      cfg: { v: 1, template: "halloween", placement: "modal", trigger: { type: "delay", delay: 6 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "Sale" }, theme: { style: "ink", accent: "#FF8A3D", accentText: "#1A0C00", text: "#F6EEE6", bg: "#140E1C", radius: 18, animation: "pop", overlay: true, layout: "hero" }, content: { badge: "Halloween sale", title: "Thirty percent off\nuntil midnight", body: "Sample offer. The code applies sitewide while the countdown runs.", image: "@assets/art/dusk-orb.jpg", countdown: { target: "@24h" }, coupon: { code: "SPOOKY30" }, buttonText: "Shop the sale", buttonUrl: "", buttonStyle: "light", note: "Sample copy. The owner sets the real end time." } } },
    { id: "thanksgiving", cat: "seasonal", journey: "convert", name: "Thanksgiving Weekend Offer", tag: "Thanksgiving", blurb: "Warm split modal with a harvest image on the left, a code field and a shop button.", mock: { style: "light", accent: "#B8651B" },
      cfg: { v: 1, template: "thanksgiving", placement: "modal", trigger: { type: "delay", delay: 6 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Offer" }, theme: { style: "light", accent: "#B8651B", accentText: "#FFFFFF", text: "#2A1B0E", bg: "#FFFBF3", radius: 14, animation: "fade", overlay: true, layout: "splitLeft" }, content: { badge: "Thanksgiving weekend", title: "A thank-you\nworth twenty-five percent", body: "Sample offer. Use the code at checkout through the weekend.", image: "@assets/art/harvest-horizon.jpg", coupon: { code: "THANKS25" }, buttonText: "Shop the weekend offer", buttonUrl: "", buttonStyle: "light", note: "Sample copy. The owner sets the real dates and terms." } } },
    { id: "summerSale", cat: "seasonal", journey: "convert", name: "Summer Sale", tag: "Summer", blurb: "Bright modal with an aqua header image, a code field and a shop button.", mock: { style: "light", accent: "#0E7C93" },
      cfg: { v: 1, template: "summerSale", placement: "modal", trigger: { type: "scrollPct", pct: 35 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Summer" }, theme: { style: "light", accent: "#0E7C93", accentText: "#FFFFFF", text: "#0A2A33", bg: "#FFFFFF", radius: 18, animation: "pop", overlay: true, layout: "hero" }, content: { badge: "Summer sale", title: "Fifteen percent off\nthe summer range", body: "Sample offer. Copy the code and apply it at checkout.", image: "@assets/art/lagoon-waves.jpg", coupon: { code: "SUMMER15" }, buttonText: "Shop summer", buttonUrl: "", buttonStyle: "light", note: "Sample copy. The owner sets the real dates and terms." } } },
    { id: "backToSchool", cat: "seasonal", journey: "convert", name: "Back-to-School Offer", tag: "Back to school", blurb: "Navy-accented split modal with an arch image, a code field and a shop button.", mock: { style: "light", accent: "#1F3A6B" },
      cfg: { v: 1, template: "backToSchool", placement: "modal", trigger: { type: "delay", delay: 7 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Offer" }, theme: { style: "light", accent: "#1F3A6B", accentText: "#FFFFFF", text: "#111A2E", bg: "#FFFFFF", radius: 12, animation: "fade", overlay: true, layout: "split" }, content: { badge: "Back to school", title: "Ten percent off\neverything on the list", body: "Sample offer. Apply the code at checkout.", image: "@assets/art/ink-arch.jpg", coupon: { code: "SCHOOL10" }, buttonText: "Shop the list", buttonUrl: "", buttonStyle: "light", note: "Sample copy. The owner sets the real dates and terms." } } },
    { id: "welcomeHero", cat: "email", journey: "capture", name: "Welcome Offer, Image Header", tag: "Welcome signup", blurb: "Light modal with an image running edge to edge above a one-field email signup.", mock: { style: "light", accent: "#0F8A7A" },
      cfg: { v: 1, template: "welcomeHero", placement: "modal", trigger: { type: "delay", delay: 8 }, frequency: "close24h", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Welcome" }, theme: { style: "light", accent: "#0F8A7A", accentText: "#FFFFFF", text: "#0D2420", bg: "#FFFFFF", radius: 18, animation: "pop", overlay: true, layout: "hero" }, content: { badge: "Welcome", title: "Join the list for\nfirst access", body: "Leave your email to register interest. The website owner handles any follow-up.", image: "@assets/art/teal-glass.jpg", form: { enabled: true, buttonLabel: "Join the list", success: "Thanks. Your response has been saved.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "Sample copy. Replace with the owner's real promise and terms." } } },
    { id: "guideSplit", cat: "email", journey: "capture", name: "Free Guide, Split Layout", tag: "Lead magnet", blurb: "Wide split modal with the image on the left and an email field for a content upgrade.", mock: { style: "light", accent: "#2D5BFF" },
      cfg: { v: 1, template: "guideSplit", placement: "modal", trigger: { type: "scrollPct", pct: 45 }, frequency: "close24h", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Guide" }, theme: { style: "light", accent: "#2D5BFF", accentText: "#FFFFFF", text: "#12172B", bg: "#FFFFFF", radius: 14, animation: "fade", overlay: true, layout: "splitLeft" }, content: { badge: "Free guide", title: "The checklist we use\nbefore every launch", body: "Enter your email to request this sample guide. The website owner delivers the file and sets terms.", image: "@assets/art/cobalt-glass.jpg", form: { enabled: true, buttonLabel: "Request the guide", success: "Thanks. Your response has been saved.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "Sample copy. The owner must supply the actual file and delivery." } } },
    { id: "eventSplit", cat: "email", journey: "capture", name: "Event Registration, Split Layout", tag: "Event signup", blurb: "Ink split modal with a countdown and a two-field registration form for an event or webinar.", mock: { style: "ink", accent: "#7FF5CC" },
      cfg: { v: 1, template: "eventSplit", placement: "modal", trigger: { type: "delay", delay: 8 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Register" }, theme: { style: "ink", accent: "#7FF5CC", accentText: "#04130D", text: "#EAF4F0", bg: "#0C1512", radius: 14, animation: "fade", overlay: true, layout: "split" }, content: { badge: "Live event", title: "Reserve a seat\nat the next session", body: "Register interest in this event. The website owner confirms details and sends any invite.", image: "@assets/art/mint-glass.jpg", countdown: { target: "@72h" }, form: { enabled: true, buttonLabel: "Save my seat", success: "Thanks. Your response has been saved.", fields: [{ name: "name", type: "text", label: "First name", required: true }, { name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "Sample copy. The owner supplies real event details." } } }
  ];

  /* Existing catalog entries get their journey here; new ones declare it inline. */
  var JOURNEY_OF = {
    cafeClub: "capture", exitOnly: "capture", waitlist: "capture", glowRitual: "capture", wheelWin: "capture", giveaway: "capture",
    drop48: "convert", chalkhat: "convert", sneakerDrop: "convert", nightTune: "convert", bfdrop: "convert", xmasglow: "convert", cyberdrop: "convert", player: "convert",
    tapMeter: "retain", microYes: "retain", cornerPeek: "retain", transit: "retain",
    fullscreenExit: "winback",
    barnews: "announce", freeship: "announce",
    age18: "trust", proofPulse: "trust"
  };
  TEMPLATES.forEach(function (t) { if (!t.journey) t.journey = JOURNEY_OF[t.id] || "capture"; });

  /* Hand-picked highlights, sorted first inside each journey. */
  ["drop48", "bfdrop", "cafeClub", "waitlist", "firstCode", "loyaltyCard", "tapMeter", "fullscreenExit", "cartRescue", "barnews", "age18", "proofPulse"].forEach(function (id) {
    var t = TEMPLATES.find(function (x) { return x.id === id; });
    if (t) t.best = true;
  });

  function resolveAssets(obj) {
    if (!obj || typeof obj !== "object") return obj;
    for (var k in obj) {
      var v = obj[k];
      if (typeof v === "string") {
        if (v.indexOf("@assets/") === 0) obj[k] = API + "/" + v.slice(1);
        else if (/^@\d+h$/.test(v)) obj[k] = new Date(Date.now() + (+v.slice(1, -1)) * 36e5).toISOString();
      } else if (v && typeof v === "object") resolveAssets(v);
    }
    return obj;
  }

  function cfgFor(templateId) {
    var t = TEMPLATES.find(function (x) { return x.id === templateId; });
    return t ? resolveAssets(JSON.parse(JSON.stringify(Object.assign({ name: t.name }, t.cfg)))) : null;
  }

  /* Fill every schema field so the runtime + encoder never see missing keys */
  function normalize(cfg) {
    var c = (cfg && typeof cfg === "object") ? cfg : {};
    return {
      v: 1,
      id: c.id || uid(),
      template: c.template || "custom",
      placement: c.placement || "modal",
      trigger: Object.assign({ type: "load" }, c.trigger || {}),
      frequency: c.frequency || "always",
      pages: Object.assign({ mode: "all", include: [], exclude: [] }, c.pages || {}),
      devices: Object.assign({ desktop: true, mobile: true }, c.devices || {}),
      sticky: Object.assign({ enabled: false, label: "" }, c.sticky || {}),
      theme: Object.assign({ style: "light", accent: "#F99A1F", accentText: "#261303", text: "#171A20", bg: "#FFFFFF", bgImage: "", radius: 18, animation: "pop", overlay: true }, c.theme || {}),
      content: Object.assign({
        badge: "", title: "", body: "", image: "", videoEmbed: "",
        buttonText: "", buttonUrl: "", buttonStyle: "light",
        coupon: null, countdown: null, choices: null, form: null, links: null, note: "",
        spin: null, ageGate: null, proof: null
      }, c.content || {})
    };
  }
  function hash(str) { var h = 5381, i = 0; for (; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i); return (h >>> 0).toString(36); }
  // Presets collect responses; delivery requires the website owner's integration.
  TEMPLATES.forEach(function(t){var c=t.cfg&&t.cfg.content;if(c&&c.form){c.form.success="Thanks! Your response has been saved.";c.form.buttonLabel="Send details";if(/inbox|email you|we'll email|calendar invite|on its way|send.*PDF/i.test(c.body||""))c.body="Submit your details to register your interest. The website owner handles any follow-up.";}});
  function uid() { return "wan_" + (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID().replace(/-/g, "") : Date.now().toString(36) + Math.random().toString(36).slice(2, 14)); }

  /* ------------------------------------------------------------------ */
  /* Install snippets                                                     */
  /* An account-owned widget is installed by id; the runtime then pulls   */
  /* the live config from the API, so studio edits sync without re-paste. */
  /* The script origin follows the host that served this page, so a       */
  /* snippet copied on popuploom.com points at popuploom.com.             */
  /* ------------------------------------------------------------------ */
  function snippetFor(id) {
    if (!/^[A-Za-z0-9_-]{3,64}$/.test(String(id || ""))) return "";
    var base = API || (window.location && window.location.origin) || "";
    return "<!-- PopupLoom: paste once, before </body> -->\n" +
      '<div data-popuploom="' + String(id) + '"></div>\n' +
      '<script src="' + base + '/embed/1.2.0/popuploom.js"></script>';
  }

  /* ------------------------------------------------------------------ */
  /* Google Identity Services button                                     */
  /* ------------------------------------------------------------------ */
  function loadGis() {
    if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve();
    if (loadGis._p) return loadGis._p;
    loadGis._p = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("Could not load Google sign-in")); };
      document.head.appendChild(s);
    });
    return loadGis._p;
  }

  var PFGoogle = {
    render: function (container, onCredential) {
      if (!container) return Promise.resolve(false);
      return Auth.config().then(function (cfg) {
        if (!cfg || !cfg.googleClientId) return false;
        return loadGis().then(function () {
          if (!window.google || !google.accounts || !google.accounts.id) return false;
          google.accounts.id.initialize({
            client_id: cfg.googleClientId,
            auto_select: false,
            cancel_on_tap_outside: true,
            callback: function (response) {
              if (response && response.credential) onCredential(response.credential);
            }
          });
          container.innerHTML = "";
          var width = Math.max(200, Math.min(320, container.clientWidth || 320));
          google.accounts.id.renderButton(container, {
            type: "standard",
            theme: "filled_black",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: Math.round(width)
          });
          return true;
        }).catch(function () { return false; });
      });
    },
    disableAutoSelect: function () {
      try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
    }
  };

  /* ------------------------------------------------------------------ */
  /* Shared auth modal                                                    */
  /* Pages provide the markup (ids below); this wires behaviour, Google  */
  /* and draft migration. Returns handles for pages that need them.      */
  /* ------------------------------------------------------------------ */
  function mountAuthUI(opts) {
    opts = opts || {};
    var modal = document.getElementById("authModal");
    if (!modal) return null;

    function notifyAuthChange(moved) {
      if (typeof opts.onAuthChange !== "function") return;
      Promise.resolve().then(function () { return opts.onAuthChange(moved); }).catch(function (e) {
        if (typeof window.toast === "function") window.toast(e.message || "Could not refresh your account", false);
      });
    }
    var mode = "login";
    var errEl = document.getElementById("authErr");
    var submitEl = document.getElementById("authSubmit");
    var resendEl = document.getElementById("authResend");
    if (!resendEl && errEl && errEl.parentNode) {
      resendEl = document.createElement("button");
      resendEl.type = "button";
      resendEl.id = "authResend";
      resendEl.textContent = "Email me a new verification link";
      resendEl.style.cssText = "display:none;border:0;background:none;padding:0 0 12px;color:var(--acc);font-size:12.5px;cursor:pointer;font-family:inherit;text-align:left";
      errEl.parentNode.insertBefore(resendEl, errEl.nextSibling);
    }

    function showErr(msg, allowResend) {
      if (!errEl) return;
      errEl.textContent = msg || "";
      errEl.style.display = msg ? "block" : "none";
      if (resendEl) resendEl.style.display = msg && allowResend ? "block" : "none";
    }
    if (resendEl) resendEl.onclick = async function () {
      var emailEl = document.getElementById("authEmail");
      var email = (emailEl && emailEl.value || "").trim();
      if (!email) { showErr("Enter your email address first.", true); return; }
      var label = resendEl.textContent;
      resendEl.disabled = true;
      resendEl.textContent = "Sending…";
      try {
        var data = await Auth.resendVerification(email);
        showErr(data.message || "If that address still needs verification, a new link is on its way.", true);
        if (typeof window.toast === "function") window.toast("Verification email requested", true);
      } catch (e) {
        showErr(e.message || "Could not send the verification email. Try again later.", true);
      } finally {
        resendEl.textContent = label;
        resendEl.disabled = false;
      }
    };
    function setMode(next) {
      mode = next === "register" ? "register" : "login";
      var isLogin = mode === "login";
      var title = document.getElementById("authTitle");
      var sub = document.getElementById("authSub");
      var swText = document.getElementById("authSwitchText");
      var swLink = document.getElementById("authSwitchLink");
      var nameRow = document.getElementById("authNameRow");
      var passEl = document.getElementById("authPass");
      var forgotEl = document.getElementById("authForgot");
      if (title) title.textContent = isLogin ? "Sign in" : "Create your account";
      if (sub) sub.textContent = isLogin
        ? "Welcome back. Your saved popups and install codes are waiting."
        : "Free to start. Your popups live in your account, and every saved popup gets its own install code.";
      if (submitEl) submitEl.textContent = isLogin ? "Sign in" : "Create account";
      if (swText) swText.textContent = isLogin ? "New to PopupLoom?" : "Already have an account?";
      if (swLink) swLink.textContent = isLogin ? "Create one" : "Sign in";
      if (nameRow) nameRow.style.display = isLogin ? "none" : "block";
      if (passEl) passEl.setAttribute("autocomplete", isLogin ? "current-password" : "new-password");
      if (forgotEl) forgotEl.style.visibility = isLogin ? "visible" : "hidden";
      showErr("");
    }
    function open() {
      modal.style.display = "flex";
      setMode(mode);
      var wrap = document.getElementById("authGoogleWrap");
      var box = document.getElementById("authGoogleBtn");
      if (wrap && box) {
        wrap.style.display = "none";
        PFGoogle.render(box, googleSignIn).then(function (ok) {
          wrap.style.display = ok ? "block" : "none";
        });
      }
      var email = document.getElementById("authEmail");
      if (email) setTimeout(function () { try { email.focus(); } catch (e) {} }, 40);
    }
    function close() {
      modal.style.display = "none";
      showErr("");
    }
    function finish(data, isNew) {
      close();
      updateAuthButton();
      Store.migrateGuestDrafts().then(function (moved) {
        if (moved && typeof window.toast === "function") {
          window.toast(moved + " local draft" + (moved === 1 ? "" : "s") + " moved to your account", true);
        }
        notifyAuthChange(moved);
      }).catch(function () {
        notifyAuthChange(0);
      });
      if (typeof window.toast === "function") {
        var who = data && data.user && (data.user.name || data.user.email);
        window.toast((isNew ? "Account created" : "Signed in") + (who ? " as " + who : ""), true);
      }
    }
    async function googleSignIn(credential) {
      showErr("");
      try {
        var data = await Auth.loginWithGoogle(credential);
        finish(data, false);
      } catch (e) {
        if (e.code === "GOOGLE_NOT_CONFIGURED") {
          showErr("Google sign-in isn't set up on this server yet. Use email for now.");
        } else {
          showErr(e.message || "Google sign-in failed");
        }
      }
    }
    async function submit() {
      var emailEl = document.getElementById("authEmail");
      var passEl = document.getElementById("authPass");
      var nameEl = document.getElementById("authName");
      var email = (emailEl && emailEl.value || "").trim();
      var pass = (passEl && passEl.value) || "";
      showErr("");
      if (!email || !pass) { showErr("Enter your email and password."); return; }
      if (submitEl) { submitEl.disabled = true; submitEl.textContent = mode === "login" ? "Signing in…" : "Creating…"; }
      try {
        var data = mode === "login"
          ? await Auth.login(email, pass)
          : await Auth.register(email, pass, (nameEl && nameEl.value || "").trim());
        if (passEl) passEl.value = "";
        if (data && data.verificationRequired && !data.token) {
          // Signup no longer returns a session when email verification is on.
          setMode("login");
          if (emailEl) emailEl.value = email;
          showErr(data.message || "Check your email to verify your account, then sign in.", true);
          if (typeof window.toast === "function") window.toast("Check your email to verify your account", true);
          return;
        }
        finish(data, mode === "register");
      } catch (e) {
        showErr(e.message || "Something went wrong", e.code === "EMAIL_NOT_VERIFIED");
      } finally {
        if (submitEl) {
          submitEl.disabled = false;
          submitEl.textContent = mode === "login" ? "Sign in" : "Create account";
        }
      }
    }
    var acctMenu = null;
    function closeAcctMenu() { if (acctMenu) acctMenu.style.display = "none"; }
    function ensureAcctMenu() {
      if (acctMenu) return acctMenu;
      acctMenu = document.createElement("div");
      acctMenu.className = "pf-acct-menu";
      var acct = document.createElement("a");
      acct.className = "pf-acct-item";
      acct.href = "./profile.html";
      acct.textContent = "Your account";
      acct.onclick = function () { closeAcctMenu(); };
      acctMenu.appendChild(acct);
      var out = document.createElement("button");
      out.className = "pf-acct-item";
      out.textContent = "Sign out";
      out.onclick = async function () {
        out.disabled = true;
        try {
          await Auth.logout();
          closeAcctMenu();
          PFGoogle.disableAutoSelect();
          updateAuthButton();
          notifyAuthChange(0);
          if (typeof window.toast === "function") window.toast("Signed out", true);
        } catch (e) { if (typeof window.toast === "function") window.toast(e.message, false); }
        finally { out.disabled = false; }
      };
      acctMenu.appendChild(out);
      document.body.appendChild(acctMenu);
      document.addEventListener("click", function (ev) {
        if (acctMenu.style.display !== "block") return;
        var btn = document.getElementById(opts.buttonId || "btnAuth");
        if (!(btn && btn.contains(ev.target)) && !acctMenu.contains(ev.target)) closeAcctMenu();
      });
      return acctMenu;
    }
    function updateAuthButton() {
      var btn = document.getElementById(opts.buttonId || "btnAuth");
      if (!btn) return;
      if (!Auth.isAuthed()) {
        btn.textContent = "Sign in";
        btn.className = "btn small ghost";
        btn.onclick = open;
        closeAcctMenu();
        return;
      }
      var seq = (btn._chipSeq || 0) + 1;
      btn._chipSeq = seq;
      btn.textContent = "";
      btn.className = "btn small ghost pf-acct";
      btn.title = "Account";
      btn.onclick = function (ev) {
        ev.stopPropagation();
        var m = ensureAcctMenu();
        if (m.style.display === "block") { closeAcctMenu(); return; }
        var r = btn.getBoundingClientRect();
        m.style.display = "block";
        var mw = m.offsetWidth || 190;
        m.style.top = (r.bottom + 8) + "px";
        m.style.left = Math.max(4, Math.min(r.right - mw, innerWidth - mw - 4)) + "px";
      };
      Auth.me().then(function (u) {
        if (btn._chipSeq !== seq) return; // a newer render superseded this one
        if (!u || !Auth.isAuthed()) { updateAuthButton(); return; }
        var full = String(u.name || "").trim();
        var label = full || String(u.email || "").split("@")[0] || "You";
        var first = label.split(/\s+/)[0];
        var av = document.createElement("span");
        av.className = "pf-acct-ava";
        if (u.avatarUrl) {
          var img = document.createElement("img");
          img.src = u.avatarUrl; img.alt = "";
          av.appendChild(img);
        } else {
          av.textContent = first.charAt(0).toUpperCase();
        }
        var nm = document.createElement("span");
        nm.className = "pf-acct-name";
        nm.textContent = first;
        var care = document.createElement("span");
        care.className = "pf-acct-care";
        care.textContent = "▾";
        btn.appendChild(av); btn.appendChild(nm); btn.appendChild(care);
      }).catch(function () { /* network hiccup: keep the empty chip */ });
    }

    window.openAuthModal = open;
    window.closeAuthModal = close;
    window.toggleAuthMode = function () { setMode(mode === "login" ? "register" : "login"); };
    window.submitAuth = submit;
    window.updateAuthButton = updateAuthButton;

    // Any element can request the modal with data-open-auth.
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("[data-open-auth]") : null;
      if (!t) return;
      e.preventDefault();
      open();
    });

    setMode("login");
    updateAuthButton();
    return { open: open, close: close, update: updateAuthButton, setMode: setMode };
  }

  window.PF = {
    store: Store,
    leads: Leads,
    auth: Auth,
    apiBase: API,
    journeys: JOURNEYS,
    templates: TEMPLATES,
    cfgFor: cfgFor,
    normalize: normalize,
    hashCode: hash,
    uid: uid,
    snippet: snippetFor,
    google: PFGoogle,
    mountAuthUI: mountAuthUI
  };
  // The runtime owns the scan/show/preview helpers; app.js only adds the
  // shared API base and snippet helper.
  var shared = window.PopupLoom || {};
  shared.API = API;
  shared.snippet = snippetFor;
  window.PopupLoom = shared;
})();
