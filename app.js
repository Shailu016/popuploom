/* PopForge: shared app code. Storage (API + localStorage fallback), auth, template presets */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* API base detection                                                  */
  /* ------------------------------------------------------------------ */
  function apiBase() {
    if (window.POPFORGE_API) return String(window.POPFORGE_API).replace(/\/$/, "");
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
      this.setToken(data.token);
      return data;
    },
    login: async function (email, password) {
      const res = await fetch(API + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      this.setToken(data.token);
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
    // Exchange a Google Identity Services credential for a PopForge session.
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

  const Store = {
    isAuthed: function () { return Auth.isAuthed(); },

    loadAll: async function () {
      if (Auth.isAuthed()) {
        const res = await fetch(API + "/api/widgets", { headers: Auth.headers() });
        if (!res.ok) throw new Error("Couldn't load cloud popups. Please try again.");
        const rows = await res.json();
        return rows.map(function (r) { return { id: r.id, name: r.name, cfg: r.cfg, template: r.template, viewCount: r.viewCount || 0, submissionCount: r.submissionCount || 0, submissions: [], createdAt: r.createdAt, updatedAt: r.updatedAt }; });
      }
      try { return JSON.parse(localStorage.getItem(GUEST_KEY) || "[]"); } catch (e) { return []; }
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
      // sync read from cached list; for authed, view_count is on the widget
      return 0;
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
      if (Auth.isAuthed()) {
        try {
          await fetch(API + "/api/widgets/" + encodeURIComponent(id) + "/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: s.data || s }) });
        } catch (e) {}
        return;
      }
      try {
        var arr = JSON.parse(localStorage.getItem("pfsubs." + id) || "[]");
        arr.unshift(s);
        localStorage.setItem("pfsubs." + id, JSON.stringify(arr.slice(0, 300)));
      } catch (e) {}
    },

    // After sign-in, move guest drafts from this browser into the account so
    // nobody loses work they did before joining. Returns how many moved.
    migrateGuestDrafts: async function () {
      if (!Auth.isAuthed()) return 0;
      var drafts = [];
      try { drafts = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]"); } catch (e) { drafts = []; }
      if (!Array.isArray(drafts) || !drafts.length) return 0;
      var moved = 0;
      var remaining = [];
      for (var i = 0; i < drafts.length; i++) {
        var w = drafts[i];
        if (!w || !w.cfg) { remaining.push(w); continue; }
        try {
          await this.save(w);
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
    { id: "trust",    label: "Trust",    blurb: "Compliance and confidence: age gates, proof, guarantees." }
  ];

  const TEMPLATES = [
    /* ---------- Discount ---------- */
    { id: "drop48", cat: "discount", name: "48-Hour Drop", tag: "Flash deal", blurb: "Watch shot, live countdown, copyable code.", mock: { style: "ink", accent: "#FF6B4A" },
      cfg: { v: 1, template: "drop48", placement: "modal", trigger: { type: "delay", delay: 4 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "48H Drop" }, theme: { style: "ink", accent: "#FF6B4A", accentText: "#1F0600", text: "#F7F9FC", bg: "#0F1117", radius: 24, animation: "pop", overlay: true }, content: { badge: "Limited time", title: "40% off,\nonly 48 hours", body: "Copy the code below and use it at checkout before the timer runs out.", image: "@assets/flash-watch.jpg", countdown: { target: "@48h" }, coupon: { code: "FLASH40" }, buttonText: "Shop now", buttonUrl: "#", buttonStyle: "light", note: "While supplies last. Cannot be combined with other offers." } } },
    { id: "chalkhat", cat: "discount", name: "Sticky Note Deal", tag: "Coupon", blurb: "Warm light modal with a mug shot and a copyable code.", mock: { style: "light", accent: "#22C55E" },
      cfg: { v: 1, template: "chalkhat", placement: "modal", trigger: { type: "load" }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "Deal!" }, theme: { style: "light", accent: "#22C55E", accentText: "#052E16", bg: "#FFFFFF", text: "#0F172A", radius: 20, animation: "pop", overlay: true }, content: { badge: "Welcome offer", title: "Get 10% off\nyour first order", body: "Use the code below at checkout. It covers your first purchase.", image: "@assets/sticky-mug.jpg", coupon: { code: "WELCOME10" }, buttonText: "Claim and shop", buttonUrl: "#", buttonStyle: "light", note: "Valid for first-time customers only." } } },
    { id: "sneakerDrop", cat: "discount", name: "Fresh Kicks Drop", tag: "Product drop", blurb: "Sneaker shot, live timer, launch code.", mock: { style: "light", accent: "#3B82F6" },
      cfg: { v: 1, template: "sneakerDrop", placement: "modal", trigger: { type: "delay", delay: 3 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "New Drop" }, theme: { style: "light", accent: "#3B82F6", accentText: "#FFFFFF", text: "#0F172A", bg: "#FFFFFF", radius: 24, animation: "pop", overlay: true }, content: { badge: "New collection", title: "Fresh kicks\njust landed", body: "Get 30% off the newest drop for a limited time. Use the code below at checkout.", image: "@assets/sneaker-flash.jpg", countdown: { target: "@72h" }, coupon: { code: "KICKS30" }, buttonText: "Shop the drop", buttonUrl: "#", buttonStyle: "light", note: "Limited stock. Free shipping on orders $75+" } } },
    { id: "nightTune", cat: "discount", name: "Midnight Audio Sale", tag: "Electronics", blurb: "Moody headphones shot on an ink card with a neon-mint rim light.", mock: { style: "ink", accent: "#35F0B0" },
      cfg: { v: 1, template: "nightTune", placement: "modal", trigger: { type: "scrollPct", pct: 55 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Deal" }, theme: { style: "ink", accent: "#35F0B0", accentText: "#04130D", text: "#E9F2EE", bg: "#0E1216", radius: 20, animation: "pop", overlay: true }, content: { badge: "Midnight drop", title: "Quiet hours,\nloud deals", body: "Studio-grade sound at living-room prices. The code covers the whole audio shelf tonight.", image: "@assets/headphones-night.jpg", coupon: { code: "BASS-15" }, buttonText: "Hear the deal", buttonUrl: "#", buttonStyle: "light", note: "Ends at sunrise. Works on sale items too." } } },

    /* ---------- Email ---------- */
    { id: "exitOnly", cat: "email", name: "Last Exit Note", tag: "Exit intent", blurb: "Linen shot and a one-field exit-intent form.", mock: { style: "light", accent: "#6366F1" },
      cfg: { v: 1, template: "exitOnly", placement: "modal", trigger: { type: "exitIntent" }, frequency: "close24h", pages: { mode: "all" }, devices: { desktop: true, mobile: false }, sticky: { enabled: false, label: "Deal" }, theme: { style: "light", accent: "#6366F1", accentText: "#FFFFFF", bg: "#FFFFFF", text: "#0F172A", radius: 24, animation: "pop", overlay: true }, content: { badge: "Wait, don't go!", title: "Get 15% off\nbefore you leave", body: "Join our list and we'll email you a 15% discount code right now.", image: "@assets/linen-shirt.jpg", form: { enabled: true, buttonLabel: "Get My Discount", success: "Check your inbox! Your code is on its way.", fields: [{ name: "email", type: "email", label: "Enter your email", required: true }] }, note: "We respect your privacy. Unsubscribe anytime." } } },
    { id: "waitlist", cat: "email", name: "Queue Ticket", tag: "Launch", blurb: "Violet product teaser. Leave an email to claim an early spot.", mock: { style: "ink", accent: "#C9A0FF" },
      cfg: { v: 1, template: "waitlist", placement: "modal", trigger: { type: "delay", delay: 10 }, frequency: "once:ever", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Waitlist" }, theme: { style: "ink", accent: "#C9A0FF", accentText: "#150826", bg: "#17131F", text: "#EFEAF8", radius: 20, animation: "pop", overlay: true }, content: { badge: "Queue pass", title: "Version 2 opens in small batches", body: "Leave a name and we'll hold your place in the ticket line around the launch drop.", image: "@assets/earbuds-violet.jpg", form: { enabled: true, buttonLabel: "Reserve a spot", success: "Ticket held. See you at the opening.", fields: [{ name: "email", type: "email", label: "Email for your ticket", required: true }] }, note: "Early tickets get a founder badge on their account." } } },
    { id: "glowRitual", cat: "email", name: "Glow Ritual", tag: "Beauty", blurb: "Amber-bottle photo and a one-field signup.", mock: { style: "light", accent: "#B07A4E" },
      cfg: { v: 1, template: "glowRitual", placement: "modal", trigger: { type: "delay", delay: 7 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Ritual" }, theme: { style: "light", accent: "#B07A4E", accentText: "#FFF8F0", text: "#2E2318", bg: "#FFFBF4", radius: 22, animation: "pop", overlay: true }, content: { badge: "The Sunday ritual", title: "Your glow,\non schedule", body: "A three-step routine letter every Sunday, plus first dibs on new batches before they sell out.", image: "@assets/skincare-ritual.jpg", form: { enabled: true, buttonLabel: "Join the ritual", success: "Welcome to the ritual. Sunday, then.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "No spam. Skincare is calm, and so is our inbox." } } },
    { id: "cafeClub", cat: "email", name: "Morning Club", tag: "Hospitality", blurb: "Latte-and-croissant shot with a warm signup.", mock: { style: "light", accent: "#C4772F" },
      cfg: { v: 1, template: "cafeClub", placement: "modal", trigger: { type: "load" }, frequency: "close24h", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Free latte" }, theme: { style: "light", accent: "#C4772F", accentText: "#FFF6EC", text: "#2B1F14", bg: "#FFF9F0", radius: 20, animation: "pop", overlay: true }, content: { badge: "First visit?", title: "Your first latte\nis on us", body: "Join the morning club and the next one's free. There is a secret menu drop every Friday too.", image: "@assets/coffee-warm.jpg", form: { enabled: true, buttonLabel: "Claim my free latte", success: "It's yours. Show this at the counter.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "One free latte per human. Fair's fair." } } },

    /* ---------- Gamified ---------- */
    { id: "wheelWin", cat: "gamified", name: "Spin to Win", tag: "Prize wheel", blurb: "Prize bundle photo over a real wheel with six rewards.", mock: { style: "ink", accent: "#F59E0B" },
      cfg: { v: 1, template: "wheelWin", placement: "modal", trigger: { type: "delay", delay: 3 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "Spin & Win" }, theme: { style: "ink", accent: "#F59E0B", accentText: "#1C1917", text: "#F8FAFC", bg: "#0F172A", radius: 24, animation: "pop", overlay: true }, content: { badge: "Spin to win", title: "Try your luck", body: "Spin for a discount, free shipping, or a mystery gift.", image: "@assets/prize-bundle.jpg", spin: { enabled: true, buttonText: "Spin now", segments: [{ emoji: "🎁", label: "15% OFF" }, { emoji: "🎉", label: "25% OFF" }, { emoji: "🚚", label: "FREE SHIPPING" }, { emoji: "💸", label: "$20 OFF" }, { emoji: "🎯", label: "BUY 1 GET 1" }, { emoji: "⭐", label: "MYSTERY GIFT" }] }, note: "One spin per day. Prizes valid for 24 hours." } } },
    { id: "giveaway", cat: "gamified", name: "Bundle Giveaway", tag: "Contest", blurb: "Prize bundle photo, live countdown, one-field entry.", mock: { style: "ink", accent: "#FF4D3D" },
      cfg: { v: 1, template: "giveaway", placement: "modal", trigger: { type: "scrollPct", pct: 60 }, frequency: "once:ever", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Win!" }, theme: { style: "ink", accent: "#FF4D3D", accentText: "#FFFFFF", text: "#F3EDE9", bg: "#131014", radius: 22, animation: "pop", overlay: true }, content: { badge: "Win the bundle", title: "One winner.\nEverything in the photo.", body: "Enter once before the timer dies. The draw runs on the 1st, and the winner hears by email.", image: "@assets/giftbox-bf.jpg", countdown: { target: "@120h" }, form: { enabled: true, buttonLabel: "Enter the draw", success: "You're in the draw. Good luck.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "No purchase needed. One entry per email." } } },

    /* ---------- Seasonal ---------- */
    { id: "bfdrop", cat: "seasonal", name: "Black Friday Fortress", tag: "Black Friday", blurb: "Stacked black gift boxes, red accent, 40% code and a hard timer.", mock: { style: "ink", accent: "#FF4D3D" },
      cfg: { v: 1, template: "bfdrop", placement: "modal", trigger: { type: "load" }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "BF-40" }, theme: { style: "ink", accent: "#FF4D3D", accentText: "#FFFFFF", text: "#F2ECEA", bg: "#0D0B10", radius: 22, animation: "pop", overlay: true }, content: { badge: "Black Friday", title: "Everything 40% off.\nNo codes, no gates.", body: "The code below is already the whole sale. Copy it, shop it, done.", image: "@assets/giftbox-bf.jpg", countdown: { target: "@48h" }, coupon: { code: "BF-40" }, buttonText: "Shop the drop", buttonUrl: "#", buttonStyle: "light", note: "Until the timer ends or stock sells out." } } },
    { id: "xmasglow", cat: "seasonal", name: "Winter Unwrap", tag: "Christmas", blurb: "Frosted gift box in snow bokeh, deep green accent, unwrap-a-code CTA.", mock: { style: "light", accent: "#2E8B57" },
      cfg: { v: 1, template: "xmasglow", placement: "modal", trigger: { type: "delay", delay: 6 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "XMAS-25" }, theme: { style: "light", accent: "#2E8B57", accentText: "#FFFFFF", text: "#22301F", bg: "#FDFDFC", radius: 22, animation: "pop", overlay: true }, content: { badge: "Winter sale", title: "Gifts that\nwrap themselves", body: "25% off everything that fits under a tree. The code unwraps itself when you tap it.", image: "@assets/winter-gift.jpg", coupon: { code: "XMAS-25" }, buttonText: "Unwrap the code", buttonUrl: "#", buttonStyle: "light", note: "Runs through New Year. Warm wishes included." } } },

    { id: "cyberdrop", cat: "seasonal", name: "Cyber Monday Reload", tag: "Cyber Monday", blurb: "Neon-pink keyboard shot on navy with a 24-hour code.", mock: { style: "ink", accent: "#FF3E8A" },
      cfg: { v: 1, template: "cyberdrop", placement: "modal", trigger: { type: "delay", delay: 5 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "CYBER-30" }, theme: { style: "ink", accent: "#FF3E8A", accentText: "#FFFFFF", text: "#F0ECF4", bg: "#0E1220", radius: 22, animation: "pop", overlay: true }, content: { badge: "Cyber Monday", title: "One more night.\nEverything's back.", body: "The sale you missed is back for 24 screen-lit hours. Code's already below.", image: "@assets/cyber-keys.jpg", countdown: { target: "@24h" }, coupon: { code: "CYBER-30" }, buttonText: "Redeem the reload", buttonUrl: "#", buttonStyle: "light", note: "Ends midnight. Then it's really over." } } },

    /* ---------- Age gate ---------- */
    { id: "age18", cat: "age", name: "Eighteen Check", tag: "18+ age gate", blurb: "One-tap 18+ verification gate. Allow passes through; deny shows a message or redirects.", mock: { style: "ink", accent: "#EF4444" },
      cfg: { v: 1, template: "age18", placement: "modal", trigger: { type: "load" }, frequency: "always", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "ink", accent: "#EF4444", accentText: "#FFFFFF", text: "#F8FAFC", bg: "#0F172A", radius: 24, animation: "pop", overlay: true }, content: { badge: "18+ only", title: "Are you 18\nor older?", body: "This page carries age-restricted products. Please confirm your age to enter.", ageGate: { enabled: true, minAge: 18, allowLabel: "Yes, I'm 18 or older", denyLabel: "No, I'm under 18", denyUrl: "", denyMessage: "Sorry, you must be 18 or older to enter this site.", allowMessage: "Welcome in. Enjoy responsibly." }, note: "By entering, you confirm you meet the legal age requirement." } } },

    /* ---------- Social proof ---------- */
    { id: "proofPulse", cat: "social", name: "Proof Pulse", tag: "Social proof", blurb: "Bottom-left toasts: real-sounding recent actions, rotating quietly.", mock: { style: "light", accent: "#F99A1F" },
      cfg: { v: 1, template: "proofPulse", placement: "slide:bl", trigger: { type: "load" }, frequency: "always", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#F99A1F", accentText: "#261303", text: "#171A1F", bg: "#FFFFFF", radius: 16, animation: "slideUp", overlay: false }, content: { proof: { enabled: true, interval: 5000, items: [{ name: "Maya", action: "just unlocked 20% off", ago: "2 min ago" }, { name: "Derek", action: "signed up for the drop list", ago: "6 min ago" }, { name: "Priya", action: "claimed the free-shipping code", ago: "11 min ago" }] } } } },

    /* ---------- Announce ---------- */
    { id: "barnews", cat: "announce", name: "Marquee Masthead", tag: "Announcement", blurb: "Slim top bar with a promise and a CTA. Sits above your header.", mock: { style: "ink", accent: "#4EA1FF" },
      cfg: { v: 1, template: "barnews", placement: "topbar", trigger: { type: "load" }, frequency: "always", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "ink", accent: "#4EA1FF", accentText: "#04121F", bg: "#0F1420", text: "#EBF2F8", radius: 0, animation: "slideDown", overlay: false }, content: { title: "Standard shipping is now free above $45", body: "Lands everywhere in 3–5 days. No minimum rush.", buttonText: "See shipping rules", buttonUrl: "#", buttonStyle: "light" } } },
    { id: "freeship", cat: "announce", name: "Free Shipping Rail", tag: "Shipping", blurb: "Bottom anchor bar that flips to a success line once the threshold is clear.", mock: { style: "ink", accent: "#F99A1F" },
      cfg: { v: 1, template: "freeship", placement: "bottombar", trigger: { type: "delay", delay: 3 }, frequency: "always", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "ink", accent: "#F99A1F", accentText: "#261303", bg: "#10151D", text: "#EAF2EE", radius: 0, animation: "slideUp", overlay: false }, content: { title: "Free shipping unlocks above $50", body: "You're close. Every order ships tracked.", buttonText: "Shop to unlock", buttonUrl: "#", buttonStyle: "light" } } },

    /* ---------- Engage ---------- */
    { id: "tapMeter", cat: "engage", name: "Tap Meter", tag: "Feedback", blurb: "One-tap mood check: three choices, instant thanks, zero form fields.", mock: { style: "light", accent: "#F99A1F" },
      cfg: { v: 1, template: "tapMeter", placement: "slide:br", trigger: { type: "scrollPct", pct: 65 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Feedback" }, theme: { style: "light", accent: "#F99A1F", accentText: "#261303", bg: "#FFFFFF", text: "#14171C", radius: 18, animation: "pop", overlay: false }, content: { badge: "10-second check", title: "How's this page landing?", body: "Tap a face. That's the whole survey.", choices: [{ emoji: "😀", label: "Great", value: "great" }, { emoji: "😐", label: "Meh", value: "meh" }, { emoji: "😡", label: "Rough", value: "rough" }], note: "Honest answers only improve things." } } },
    { id: "microYes", cat: "engage", name: "One Small Yes", tag: "Micro-commitment", blurb: "Yes/no micro-commitment. The yes unlocks the next step.", mock: { style: "light", accent: "#F99A1F" },
      cfg: { v: 1, template: "microYes", placement: "modal", trigger: { type: "scrollPct", pct: 45 }, frequency: "close24h", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#F99A1F", accentText: "#261303", bg: "#FFFFFF", text: "#14171C", radius: 20, animation: "pop", overlay: true }, content: { badge: "Quick question", title: "One small yes\nopens the door", body: "Ready to see what the fuss is about? Tap yes and the good stuff unlocks.", choices: [{ emoji: "👍", label: "Yes, show me", value: "yes" }, { emoji: "👀", label: "Maybe later", value: "later" }], note: "No email needed. Yet." } } },
    { id: "cornerPeek", cat: "engage", name: "Corner Peek", tag: "Support", blurb: "Friendly corner card with help hours and links.", mock: { style: "light", accent: "#FFC53D" },
      cfg: { v: 1, template: "cornerPeek", placement: "slide:br", trigger: { type: "delay", delay: 8 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "Need help?" }, theme: { style: "light", accent: "#FFC53D", accentText: "#221A00", bg: "#FFFFFF", text: "#171A1F", radius: 18, animation: "pop", overlay: false }, content: { badge: "Quick hello", title: "Stuck on a page?", body: "A human answers all support mail within the hour, weekdays 9–5.", buttonText: "Open the help desk", buttonUrl: "#", buttonStyle: "light", links: [{ label: "Guides", url: "#" }, { label: "Email", url: "#" }, { label: "Chat", url: "#" }], note: "Or close me. No hard feelings." } } },
    { id: "transit", cat: "engage", name: "Transit Card", tag: "Multi link", blurb: "Compact card of shortcut tiles.", mock: { style: "ink", accent: "#F99A1F" },
      cfg: { v: 1, template: "transit", placement: "modal", trigger: { type: "scrollPct", pct: 80 }, frequency: "once:ever", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Links" }, theme: { style: "ink", accent: "#F99A1F", accentText: "#261303", bg: "#10141B", text: "#E8EFF2", radius: 18, animation: "pop", overlay: true }, content: { title: "Your trip shortcuts", body: "Everything travelers hit most, one tap from anywhere.", links: [{ label: "Timetable", url: "#" }, { label: "Fare map", url: "#" }, { label: "Stops", url: "#" }] } } },

    /* ---------- Video ---------- */
    { id: "player", cat: "video", name: "Screen Room", tag: "Video", blurb: "Framed video embed for launches and tutorials; click-to-open via CTA.", mock: { style: "light", accent: "#151A20" },
      cfg: { v: 1, template: "player", placement: "slide:tl", trigger: { type: "click", selector: "#show-tour" }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Watch" }, theme: { style: "light", accent: "#151A20", accentText: "#FFFFFF", bg: "#FFFFFF", text: "#12151A", radius: 16, animation: "fade", overlay: false }, content: { title: "The 90-second site tour", body: "A fast walkthrough of browsing, buying, and where your orders live.", videoEmbed: "https://www.youtube.com/watch?v=G6Dp2Ly3aO0", buttonText: "Watch full film", buttonUrl: "#", buttonStyle: "dark" } } },

    /* ---------- Exit ---------- */
    { id: "fullscreenExit", cat: "exit", name: "Don't Leave Empty", tag: "Exit takeover", blurb: "Fullscreen exit-intent takeover over a moody photo, code front and center.", mock: { style: "ink", accent: "#F99A1F" },
      cfg: { v: 1, template: "fullscreenExit", placement: "fullscreen", trigger: { type: "exitIntent" }, frequency: "close24h", pages: { mode: "all" }, devices: { desktop: true, mobile: false }, sticky: { enabled: false, label: "" }, theme: { style: "ink", accent: "#F99A1F", accentText: "#261303", text: "#F2F7F4", bg: "#0E1216", bgImage: "@assets/headphones-night.jpg", radius: 24, animation: "pop", overlay: true }, content: { badge: "Before you go", title: "Don't leave\nempty-handed", body: "Take 15% with you. It's already in the code below.", coupon: { code: "EXIT-15" }, buttonText: "Copy and keep browsing", buttonUrl: "#", buttonStyle: "light", note: "Good for 72 hours, on anything." } } },

    /* ---------- Journey: capture (new) ---------- */
    { id: "leadShelf", cat: "email", journey: "capture", name: "Lead Magnet Shelf", tag: "Content upgrade", blurb: "Corner slide-in that trades a real workbook for an email.", mock: { style: "light", accent: "#2D5BFF" },
      cfg: { v: 1, template: "leadShelf", placement: "slide:br", trigger: { type: "scrollPct", pct: 40 }, frequency: "close24h", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Guide" }, theme: { style: "light", accent: "#2D5BFF", accentText: "#FFFFFF", text: "#1B1D2A", bg: "#FBF7EF", radius: 20, animation: "pop", overlay: false }, content: { badge: "Free workbook", title: "The 12-page\nlaunch checklist", body: "Everything we use to ship a popup in an afternoon. No fluff, no pitch.", form: { enabled: true, buttonLabel: "Send the PDF", success: "On its way. Check your inbox.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "One email, then the guide. That is the whole trade." } } },
    { id: "smsPass", cat: "email", journey: "capture", name: "SMS Speed Pass", tag: "Text list", blurb: "Phone-first capture with a one-a-week promise.", mock: { style: "light", accent: "#0F766E" },
      cfg: { v: 1, template: "smsPass", placement: "slide:bl", trigger: { type: "delay", delay: 12 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "Texts" }, theme: { style: "light", accent: "#0F766E", accentText: "#FFFFFF", text: "#0F2E2A", bg: "#F0FDFA", radius: 18, animation: "slideUp", overlay: false }, content: { badge: "Text list", title: "Deals by text,\nnot by algorithm", body: "One message a week, maximum. Reply STOP and we are gone for good.", form: { enabled: true, buttonLabel: "Join the text list", success: "You are in. First text lands Friday.", fields: [{ name: "phone", type: "phone", label: "+1 (555) 000-0000", required: true }] }, note: "No numbers sold, ever." } } },
    { id: "webinarSeat", cat: "email", journey: "capture", name: "Webinar Seat", tag: "Live session", blurb: "Ink modal with a live countdown and a two-field seat reservation.", mock: { style: "ink", accent: "#E9B949" },
      cfg: { v: 1, template: "webinarSeat", placement: "modal", trigger: { type: "delay", delay: 8 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "Live seat" }, theme: { style: "ink", accent: "#E9B949", accentText: "#1A1200", text: "#F5F1E6", bg: "#101725", radius: 22, animation: "pop", overlay: true }, content: { badge: "Free live session", title: "Pricing teardowns,\nThursday 4pm", body: "Forty-five minutes, three real stores, zero slides. Bring one question.", countdown: { target: "@72h" }, form: { enabled: true, buttonLabel: "Save my seat", success: "Seat saved. The calendar invite is on its way.", fields: [{ name: "name", type: "text", label: "First name", required: true }, { name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "Replay goes to everyone who registers." } } },
    { id: "firstCode", cat: "email", journey: "capture", name: "First-Order Code", tag: "Email for code", blurb: "Editorial cream modal: the discount arrives by email, not by popup theatre.", mock: { style: "light", accent: "#8E2F3C" },
      cfg: { v: 1, template: "firstCode", placement: "modal", trigger: { type: "scrollPct", pct: 25 }, frequency: "close24h", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "10% in inbox" }, theme: { style: "light", accent: "#8E2F3C", accentText: "#FFF9F4", text: "#2A1518", bg: "#FFF9F4", radius: 4, animation: "fade", overlay: true }, content: { badge: "First order", title: "Ten percent,\nstraight to your inbox", body: "No spinning wheel, no countdown theatre. Leave an email and the code arrives in a minute.", form: { enabled: true, buttonLabel: "Email me the code", success: "Sent. It is good for seven days.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "One welcome email, then the occasional letter. Leave anytime." } } },

    /* ---------- Journey: convert (new) ---------- */
    { id: "backStock", cat: "email", journey: "convert", name: "Back in Stock", tag: "Restock alert", blurb: "Quiet sage slide-in that collects restock requests before the batch goes live.", mock: { style: "light", accent: "#2F6B4F" },
      cfg: { v: 1, template: "backStock", placement: "slide:br", trigger: { type: "scrollPct", pct: 50 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "Notify me" }, theme: { style: "light", accent: "#2F6B4F", accentText: "#F7FBF6", text: "#16241C", bg: "#F7FBF6", radius: 16, animation: "slideUp", overlay: false }, content: { badge: "Sold out again", title: "Next batch,\nfirst ping", body: "Leave an email and we will write the moment the shelf is stocked. No other mail.", form: { enabled: true, buttonLabel: "Notify me first", success: "You are first in line. We write before the shelf goes live.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "One email per restock. That is the deal." } } },
    { id: "lowStock", cat: "discount", journey: "convert", name: "Low-Stock Batch", tag: "Scarcity", blurb: "Charcoal modal with a six-hour batch timer and a plain-spoken stock line.", mock: { style: "ink", accent: "#FF8A3D" },
      cfg: { v: 1, template: "lowStock", placement: "modal", trigger: { type: "delay", delay: 8 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "14 left" }, theme: { style: "ink", accent: "#FF8A3D", accentText: "#1A0C00", text: "#F7EDE6", bg: "#15110F", radius: 18, animation: "pop", overlay: true }, content: { badge: "Small batch", title: "Fourteen left\nin this run", body: "We make these in batches of sixty. When the timer ends, the next batch is a month out.", countdown: { target: "@6h" }, buttonText: "Take one", buttonUrl: "#", buttonStyle: "light", note: "Timer is the batch, not a marketing trick." } } },
    { id: "bundleBuild", cat: "discount", journey: "convert", name: "Bundle Builder", tag: "AOV", blurb: "Ink modal with lime accent; three bundle tiles replace the usual single CTA.", mock: { style: "ink", accent: "#C7F464" },
      cfg: { v: 1, template: "bundleBuild", placement: "modal", trigger: { type: "scrollPct", pct: 70 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "ink", accent: "#C7F464", accentText: "#0E1408", text: "#F0F6EC", bg: "#0D1117", radius: 20, animation: "pop", overlay: true }, content: { badge: "Build a set", title: "Pick two, save 15.\nPick three, save 25.", body: "Mix anything on the shelf. The discount applies itself at checkout. No code to remember.", links: [{ label: "The starter pair, $48", url: "#" }, { label: "The everyday trio, $66", url: "#" }, { label: "The full shelf, $120", url: "#" }], note: "Prices shown after the bundle discount." } } },
    { id: "priceWatch", cat: "email", journey: "convert", name: "Price Watch", tag: "Price alert", blurb: "Sky-blue slide-in that watches a price and asks for the shopper's target.", mock: { style: "light", accent: "#3BA7FF" },
      cfg: { v: 1, template: "priceWatch", placement: "slide:tr", trigger: { type: "scrollPct", pct: 60 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#3BA7FF", accentText: "#FFFFFF", text: "#101A26", bg: "#F5F8FC", radius: 18, animation: "slideDown", overlay: false }, content: { badge: "Price watch", title: "Watching this price?", body: "Tell us the number that makes it a yes. We write only when it dips.", form: { enabled: true, buttonLabel: "Watch the price", success: "Watching. We will only write when it moves.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }, { name: "target", type: "text", label: "Your target price ($)", required: false }] }, note: "One alert per dip. No drip campaign." } } },

    /* ---------- Journey: retain (new) ---------- */
    { id: "loyaltyCard", cat: "engage", journey: "retain", name: "Loyalty Card", tag: "Points club", blurb: "Black-and-rose membership card with points, early access and birthday credit.", mock: { style: "ink", accent: "#FF5C8A" },
      cfg: { v: 1, template: "loyaltyCard", placement: "modal", trigger: { type: "delay", delay: 12 }, frequency: "once:ever", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "Points" }, theme: { style: "ink", accent: "#FF5C8A", accentText: "#1A0710", text: "#F7EDF2", bg: "#0F0D12", radius: 24, animation: "pop", overlay: true }, content: { badge: "The counter", title: "Three orders in,\nyou are family", body: "Points on every order, first look at drops, and credit on the day itself. No card to carry.", form: { enabled: true, buttonLabel: "Join the counter", success: "You are in. First points post with your next order.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "Free to join. Leave whenever. Points stay for a year." } } },
    { id: "referFriend", cat: "engage", journey: "retain", name: "Refer a Friend", tag: "Referral", blurb: "Plum slide-in with a shareable code and a give-get promise.", mock: { style: "light", accent: "#6B4EFF" },
      cfg: { v: 1, template: "referFriend", placement: "slide:br", trigger: { type: "scrollPct", pct: 75 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#6B4EFF", accentText: "#FFFFFF", text: "#1B1430", bg: "#FBF8FF", radius: 18, animation: "pop", overlay: false }, content: { badge: "Give ten, get ten", title: "Share the code,\nboth sides win", body: "They save $10 on their first order. Your credit lands the day it ships.", coupon: { code: "FRIEND-10" }, buttonText: "Copy and share", buttonUrl: "#", buttonStyle: "light", note: "Works on orders over $30. One per friend." } } },
    { id: "reviewAsk", cat: "engage", journey: "retain", name: "Review Request", tag: "Feedback", blurb: "Three-emoji review prompt for after the order.", mock: { style: "light", accent: "#B45309" },
      cfg: { v: 1, template: "reviewAsk", placement: "modal", trigger: { type: "delay", delay: 20 }, frequency: "once:ever", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#B45309", accentText: "#FFFDF7", text: "#241A0E", bg: "#FFFDF7", radius: 14, animation: "pop", overlay: true }, content: { badge: "Two taps", title: "How did the\nlast order land?", body: "No account, no star widget. Tap one and we will ask the follow-up by email.", choices: [{ emoji: "🤩", label: "Loved it", value: "loved" }, { emoji: "🙂", label: "It is fine", value: "fine" }, { emoji: "🙃", label: "Not for me", value: "not-for-me" }], note: "We read every answer, including the rough ones." } } },
    { id: "birthdayClub", cat: "engage", journey: "retain", name: "Birthday Club", tag: "Lifecycle", blurb: "Ink modal with brass accent and a single-field birthday list signup.", mock: { style: "ink", accent: "#F0B429" },
      cfg: { v: 1, template: "birthdayClub", placement: "modal", trigger: { type: "delay", delay: 15 }, frequency: "once:ever", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "ink", accent: "#F0B429", accentText: "#1C1400", text: "#F8F0E4", bg: "#141014", radius: 20, animation: "fade", overlay: true }, content: { badge: "Birthday list", title: "A gift on\nthe day itself", body: "Join the list and credit lands the morning of. No code hunting, no blackout dates.", form: { enabled: true, buttonLabel: "Save my date", success: "Saved. We will be there.", fields: [{ name: "email", type: "email", label: "you@somewhere.com", required: true }] }, note: "We only write twice: your month, and the day." } } },

    /* ---------- Journey: winback (new) ---------- */
    { id: "cartRescue", cat: "exit", journey: "winback", name: "Cart Rescue", tag: "Exit + cart", blurb: "Exit-intent modal that holds the cart with shipping and ten percent, plainly stated.", mock: { style: "ink", accent: "#FF6B4A" },
      cfg: { v: 1, template: "cartRescue", placement: "modal", trigger: { type: "exitIntent" }, frequency: "close24h", pages: { mode: "all" }, devices: { desktop: true, mobile: false }, sticky: { enabled: true, label: "Cart held" }, theme: { style: "ink", accent: "#FF6B4A", accentText: "#1F0600", text: "#F7F1EC", bg: "#12100F", radius: 20, animation: "pop", overlay: true }, content: { badge: "Cart, still warm", title: "Free shipping and\nten percent, held", body: "The code below applies both. Your basket stays put for a day, so finish when you are ready.", coupon: { code: "CART-10" }, buttonText: "Back to the cart", buttonUrl: "#", buttonStyle: "light", note: "Valid 24 hours. Stock is not reserved." } } },
    { id: "comebackCode", cat: "discount", journey: "winback", name: "Comeback Code", tag: "Lapsed buyer", blurb: "Teal modal for lapsing customers with a welcome-back code.", mock: { style: "light", accent: "#0D9488" },
      cfg: { v: 1, template: "comebackCode", placement: "modal", trigger: { type: "delay", delay: 10 }, frequency: "once:ever", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#0D9488", accentText: "#F4FBFA", text: "#0E2422", bg: "#F4FBFA", radius: 22, animation: "pop", overlay: true }, content: { badge: "It has been a minute", title: "Twenty percent,\nno guilt attached", body: "The whole shelf, no minimum. Consider it a welcome back rather than a win-back.", countdown: { target: "@48h" }, coupon: { code: "COMEBACK-20" }, buttonText: "Use the code", buttonUrl: "#", buttonStyle: "light", note: "One use per customer. Ends when the timer does." } } },
    { id: "cancelSave", cat: "exit", journey: "winback", name: "Cancel Saver", tag: "Retention", blurb: "Click-triggered modal on the cancel button: pause, downgrade, or leave.", mock: { style: "light", accent: "#1E3A8A" },
      cfg: { v: 1, template: "cancelSave", placement: "modal", trigger: { type: "click", selector: "#cancel-plan" }, frequency: "always", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#1E3A8A", accentText: "#FFFFFF", text: "#101A33", bg: "#F7F9FF", radius: 16, animation: "fade", overlay: true }, content: { badge: "Before you cancel", title: "Most people just\nneeded a quiet month", body: "Pause for four weeks, keep your data and your rate. No charge while paused.", choices: [{ emoji: "⏸", label: "Pause a month", value: "pause" }, { emoji: "🔉", label: "Downgrade instead", value: "downgrade" }, { emoji: "👋", label: "Cancel anyway", value: "cancel" }], note: "Pausing keeps your history and your price." } } },

    /* ---------- Journey: announce (new) ---------- */
    { id: "launchDay", cat: "announce", journey: "announce", name: "Launch Day", tag: "Product drop", blurb: "Violet ink modal with a door-opening countdown and a reminder CTA.", mock: { style: "ink", accent: "#A78BFA" },
      cfg: { v: 1, template: "launchDay", placement: "modal", trigger: { type: "delay", delay: 6 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: true, label: "Tonight" }, theme: { style: "ink", accent: "#A78BFA", accentText: "#140A24", text: "#F1ECFA", bg: "#0F0D18", radius: 22, animation: "pop", overlay: true }, content: { badge: "Doors at 8pm", title: "The new collection\nopens tonight", body: "One run, no restock, 120 pieces. The page goes live when the timer hits zero.", countdown: { target: "@24h" }, buttonText: "Set a reminder", buttonUrl: "#", buttonStyle: "light", note: "Reminder goes out one hour before." } } },
    { id: "eventInvite", cat: "announce", journey: "announce", name: "Event Invite", tag: "Store event", blurb: "Rust-corner invitation with two link tiles.", mock: { style: "light", accent: "#C2410C" },
      cfg: { v: 1, template: "eventInvite", placement: "slide:tr", trigger: { type: "delay", delay: 12 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#C2410C", accentText: "#FFF8F2", text: "#2A160D", bg: "#FFF8F2", radius: 18, animation: "slideDown", overlay: false }, content: { badge: "Store night", title: "Thursday, 7pm.\nCoffee is on us.", body: "First look at the new shelf, a short talk at eight, and 20 percent for anyone who walks in.", links: [{ label: "Save the date", url: "#" }, { label: "Get directions", url: "#" }], note: "No ticket needed. Bring a friend." } } },
    { id: "shippingDelay", cat: "announce", journey: "announce", name: "Shipping Delay", tag: "Service notice", blurb: "Amber top bar for the week shipping slips, with a link to the notice.", mock: { style: "ink", accent: "#F59E0B" },
      cfg: { v: 1, template: "shippingDelay", placement: "topbar", trigger: { type: "load" }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "ink", accent: "#F59E0B", accentText: "#1A1200", text: "#F8F1E3", bg: "#16130E", radius: 0, animation: "slideDown", overlay: false }, content: { title: "Orders placed this week ship Monday", body: "Our courier is catching up after the storm. Tracking still updates normally.", buttonText: "Read the notice", buttonUrl: "#", buttonStyle: "light" } } },
    { id: "holidayHours", cat: "announce", journey: "announce", name: "Holiday Hours", tag: "Hours", blurb: "Pine-green bottom rail with closure dates and a link to the full calendar.", mock: { style: "light", accent: "#14532D" },
      cfg: { v: 1, template: "holidayHours", placement: "bottombar", trigger: { type: "load" }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#14532D", accentText: "#F6FBF6", text: "#12231A", bg: "#F6FBF6", radius: 0, animation: "slideUp", overlay: false }, content: { title: "We are closed December 24 to 26", body: "Orders ship the 27th. Gift cards stay open all week.", buttonText: "See all hours", buttonUrl: "#", buttonStyle: "light" } } },

    /* ---------- Journey: trust (new) ---------- */
    { id: "age21", cat: "age", journey: "trust", name: "Twenty-One Check", tag: "21+ age gate", blurb: "Deep-green 21+ gate with brass accent for spirits, vape and nightlife.", mock: { style: "ink", accent: "#D4A24C" },
      cfg: { v: 1, template: "age21", placement: "modal", trigger: { type: "load" }, frequency: "always", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "ink", accent: "#D4A24C", accentText: "#1A1200", text: "#F5F0E4", bg: "#101A16", radius: 6, animation: "fade", overlay: true }, content: { badge: "21+ only", title: "Are you 21\nor older?", body: "This shelf carries spirits. We check at the door, not at checkout.", ageGate: { enabled: true, minAge: 21, allowLabel: "Yes, I am 21 or older", denyLabel: "No, I am under 21", denyUrl: "", denyMessage: "You must be 21 or older to enter this shelf.", allowMessage: "Welcome in. Drink slowly." }, note: "By entering you confirm you meet the legal age here." } } },
    { id: "guaranteeSeal", cat: "social", journey: "trust", name: "Guarantee Seal", tag: "Guarantee", blurb: "Green corner card that states the return promise in one plain sentence.", mock: { style: "light", accent: "#15803D" },
      cfg: { v: 1, template: "guaranteeSeal", placement: "slide:br", trigger: { type: "scrollPct", pct: 85 }, frequency: "once:week", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#15803D", accentText: "#F6FBF7", text: "#12251A", bg: "#F6FBF7", radius: 16, animation: "slideUp", overlay: false }, content: { badge: "Ninety days", title: "Use it, wash it,\ndecide later", body: "If it is not right, we pay the return label. No photos, no forms, no argument.", buttonText: "Read the guarantee", buttonUrl: "#", buttonStyle: "light", note: "Applies to every full-price order." } } },
    { id: "secureCheckout", cat: "social", journey: "trust", name: "Secure Checkout", tag: "Reassurance", blurb: "Blue slide-in at the payment step: encryption, returns and a human contact.", mock: { style: "light", accent: "#2563EB" },
      cfg: { v: 1, template: "secureCheckout", placement: "slide:bl", trigger: { type: "scrollPct", pct: 90 }, frequency: "once:day", pages: { mode: "all" }, devices: { desktop: true, mobile: true }, sticky: { enabled: false, label: "" }, theme: { style: "light", accent: "#2563EB", accentText: "#FFFFFF", text: "#101A2E", bg: "#F6F9FF", radius: 18, animation: "pop", overlay: false }, content: { badge: "Checkout, decoded", title: "No fine-print\npanic here", body: "Encrypted payment, 30-day returns, and a human on email within one working day.", links: [{ label: "Returns policy", url: "#" }, { label: "Privacy", url: "#" }, { label: "Talk to a human", url: "#" }], note: "Prices include tax. Shipping is shown before payment." } } }
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
  function uid() { return "wan_" + (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID().replace(/-/g, "") : Date.now().toString(36) + Math.random().toString(36).slice(2, 14)); }

  /* ------------------------------------------------------------------ */
  /* Install snippets                                                     */
  /* An account-owned widget is installed by id; the runtime then pulls   */
  /* the live config from the API, so studio edits sync without re-paste. */
  /* ------------------------------------------------------------------ */
  function snippetFor(id) {
    if (!/^[A-Za-z0-9_-]{3,64}$/.test(String(id || ""))) return "";
    var base = API || (window.location && window.location.origin) || "";
    return "<!-- PopForge: paste once, before </body> -->\n" +
      '<div data-popforge="' + String(id) + '"></div>\n' +
      '<script src="' + base + '/popforge.js"></script>';
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

    function showErr(msg) {
      if (!errEl) return;
      errEl.textContent = msg || "";
      errEl.style.display = msg ? "block" : "none";
    }
    function setMode(next) {
      mode = next === "register" ? "register" : "login";
      var isLogin = mode === "login";
      var title = document.getElementById("authTitle");
      var sub = document.getElementById("authSub");
      var swText = document.getElementById("authSwitchText");
      var swLink = document.getElementById("authSwitchLink");
      var nameRow = document.getElementById("authNameRow");
      var passEl = document.getElementById("authPass");
      if (title) title.textContent = isLogin ? "Sign in" : "Create your account";
      if (sub) sub.textContent = isLogin
        ? "Welcome back. Your saved popups and install codes are waiting."
        : "Free to start. Your popups live in your account, and every saved popup gets its own install code.";
      if (submitEl) submitEl.textContent = isLogin ? "Sign in" : "Create account";
      if (swText) swText.textContent = isLogin ? "New to PopForge?" : "Already have an account?";
      if (swLink) swLink.textContent = isLogin ? "Create one" : "Sign in";
      if (nameRow) nameRow.style.display = isLogin ? "none" : "block";
      if (passEl) passEl.setAttribute("autocomplete", isLogin ? "current-password" : "new-password");
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
        finish(data, mode === "register");
      } catch (e) {
        showErr(e.message || "Something went wrong");
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
  window.PopForge = window.PopForge || {};
  window.PopForge.API = API;
  window.PopForge.snippet = snippetFor;
})();
