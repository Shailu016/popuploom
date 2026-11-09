/* shared/ads.js — fail-closed AdSense configuration, consent gate, CSP and
   public-guide ad injection. Advertising stays off unless every account-
   specific value and the Google Privacy & messaging CMP gate are supplied.

   Supported consent solution: Google Privacy & messaging (Google CMP, TCF ID
   300), configured in the AdSense account. This module does not create a
   custom consent banner, invent TC strings, or treat Consent Mode as a CMP. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./ad-pages"));
  else root.PopupLoomAds = factory(root.PopupLoomAdPages);
})(typeof globalThis !== "undefined" ? globalThis : this, function (adPages) {
  "use strict";

  var PUBLISHER_RE = /^pub-\d{16}$/;
  var CLIENT_RE = /^ca-pub-\d{16}$/;
  var SLOT_RE = /^\d{10,20}$/;
  var CMP_GOOGLE = "google-privacy-messaging";
  var AD_SCRIPT = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
  var AD_FRAME_HOSTS = [
    "https://googleads.g.doubleclick.net",
    "https://cm.g.doubleclick.net",
    "https://securepubads.g.doubleclick.net",
    "https://tpc.googlesyndication.com",
    "https://www.google.com",
    "https://www.googleadservices.com",
    "https://pagead2.googlesyndication.com",
    "https://ep1.adtrafficquality.google",
    "https://ep2.adtrafficquality.google"
  ];
  var AD_CONNECT_HOSTS = [
    "https://pagead2.googlesyndication.com",
    "https://googleads.g.doubleclick.net",
    "https://cm.g.doubleclick.net",
    "https://securepubads.g.doubleclick.net",
    "https://adservice.google.com",
    "https://www.googleadservices.com",
    "https://www.google.com",
    "https://ep1.adtrafficquality.google",
    "https://ep2.adtrafficquality.google"
  ];

  function trim(value) {
    return String(value == null ? "" : value).trim();
  }

  function parseSlots(value) {
    var slots = {};
    var raw = trim(value);
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          Object.keys(parsed).forEach(function (key) {
            var slot = trim(parsed[key]);
            if (SLOT_RE.test(slot)) slots[key] = slot;
          });
        }
      } catch (e) {}
    }
    return slots;
  }

  function slotFor(slots, pathname) {
    if (!slots) return "";
    return slots[pathname] || slots["*"] || slots.default || "";
  }

  // Returns a config object. `enabled` is true only when all gates pass.
  function config(env) {
    env = env || {};
    var publisher = trim(env.ADSENSE_PUBLISHER_ID);
    var client = trim(env.ADSENSE_CLIENT) || (PUBLISHER_RE.test(publisher) ? "ca-" + publisher : "");
    var slots = parseSlots(env.ADSENSE_SLOTS);
    var single = trim(env.ADSENSE_SLOT);
    if (SLOT_RE.test(single)) slots.default = single;
    var requested = trim(env.ADSENSE_ENABLED) === "true";
    var approved = trim(env.ADSENSE_APPROVED) === "true";
    var cmp = trim(env.ADSENSE_CMP);
    var reason = "";
    if (!requested) reason = "disabled";
    else if (!approved) reason = "approval_not_confirmed";
    else if (!PUBLISHER_RE.test(publisher)) reason = "invalid_publisher_id";
    else if (!CLIENT_RE.test(client) || client !== "ca-" + publisher) reason = "invalid_client_id";
    else if (cmp !== CMP_GOOGLE) reason = "cmp_not_google_privacy_messaging";
    else if (!Object.keys(slots).length) reason = "no_valid_ad_slot";
    return {
      enabled: reason === "",
      requested: requested,
      approved: approved,
      reason: reason,
      publisher: publisher,
      client: client,
      cmp: cmp,
      slots: slots
    };
  }

  function nonce() {
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  function markup(cfg, pathname, nonceValue) {
    var slot = slotFor(cfg.slots, pathname);
    if (!cfg.enabled || !slot || !nonceValue) return "";
    var client = cfg.client;
    return '<section class="pl-ad" role="complementary" aria-label="Advertisement" data-pl-ad="1">' +
      '<div class="pl-ad-label">Advertisement</div>' +
      '<ins class="adsbygoogle" style="display:block" data-ad-client="' + client + '" data-ad-slot="' + slot + '" data-ad-format="auto" data-full-width-responsive="true"></ins>' +
      '</section>' +
      '<script nonce="' + nonceValue + '">(adsbygoogle=window.adsbygoogle||[]).push({});</script>';
  }

  // Google's documented placement: the loader belongs in <head>. It is added
  // only to eligible guide responses, so private and app pages stay ad-free.
  function loader(cfg, nonceValue) {
    if (!cfg.enabled || !nonceValue) return "";
    return '<script nonce="' + nonceValue + '" async crossorigin="anonymous" src="' + AD_SCRIPT + '?client=' + cfg.client + '"></script>';
  }

  // Inject at most one unit into an eligible guide. Excluded pages and
  // incomplete configs return the original HTML unchanged.
  function inject(html, pathname, cfg, nonceValue) {
    var text = String(html || "");
    if (!cfg || !cfg.enabled || !adPages || !adPages.isAdPage(pathname)) return text;
    if (!slotFor(cfg.slots, pathname) || !nonceValue) return text;
    if (text.indexOf("data-pl-ad=") !== -1 || text.indexOf("adsbygoogle.js") !== -1) return text;
    var block = markup(cfg, pathname, nonceValue);
    if (!block) return text;
    var headAt = text.indexOf("</head>");
    if (headAt !== -1) text = text.slice(0, headAt) + loader(cfg, nonceValue) + text.slice(headAt);
    var at = text.lastIndexOf("</article>");
    if (at !== -1) return text.slice(0, at) + block + text.slice(at);
    at = text.lastIndexOf("</main>");
    if (at !== -1) return text.slice(0, at) + block + text.slice(at);
    at = text.lastIndexOf("</body>");
    return at !== -1 ? text.slice(0, at) + block + text.slice(at) : text;
  }

  function cspAdditions(nonceValue) {
    if (!nonceValue) return { script: "", frame: "", connect: "" };
    return {
      script: "'nonce-" + nonceValue + "' 'strict-dynamic'",
      frame: AD_FRAME_HOSTS.join(" "),
      connect: AD_CONNECT_HOSTS.join(" ")
    };
  }

  return {
    config: config,
    nonce: nonce,
    inject: inject,
    markup: markup,
    cspAdditions: cspAdditions,
    parseSlots: parseSlots,
    slotFor: slotFor,
    isAdPage: adPages ? adPages.isAdPage : function () { return false; },
    CMP_GOOGLE: CMP_GOOGLE,
    AD_FRAME_HOSTS: AD_FRAME_HOSTS,
    AD_CONNECT_HOSTS: AD_CONNECT_HOSTS
  };
});
