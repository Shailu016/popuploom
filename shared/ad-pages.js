/* shared/ad-pages.js — explicit public-page allowlist for future advertising.
   Ads are not enabled in this build. Private, transactional, editor, account,
   lead, export and customer-embed surfaces are intentionally excluded. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PopupLoomAdPages = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // Manual units only on substantive public guides. The homepage is excluded
  // because it contains the account dashboard and app controls.
  const AD_PAGES = new Set([
    "/guides/install-popups.html",
    "/guides/wordpress-popup.html",
    "/guides/shopify-popup.html",
    "/guides/webflow-popup.html",
    "/guides/collect-and-export-leads.html",
    "/guides/popup-not-showing.html"
  ]);
  function isAdPage(pathname) {
    return AD_PAGES.has(String(pathname || ""));
  }
  return { AD_PAGES: AD_PAGES, isAdPage: isAdPage };
});
