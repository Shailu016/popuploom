/* shared/ad-pages.js — explicit allowlist for advertising.
   Ads run on every public content page. Login, account, editor, lead-inbox,
   password-reset, recovery, error and customer-embed surfaces stay excluded
   because Google's placement policy treats them as non-content or private. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PopupLoomAdPages = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // Paths are the files the runtime serves: the homepage is /index.html and
  // the guides hub is /guides/index.html.
  const AD_PAGES = new Set([
    "/",
    "/index.html",
    "/templates.html",
    "/faq.html",
    "/press.html",
    "/security.html",
    "/about.html",
    "/guides/index.html",
    "/guides/install-popups.html",
    "/guides/wordpress-popup.html",
    "/guides/shopify-popup.html",
    "/guides/webflow-popup.html",
    "/guides/squarespace-wix-popup.html",
    "/guides/exit-intent-popup.html",
    "/guides/email-signup-popup.html",
    "/guides/free-popup-builders-without-pageview-limits.html",
    "/guides/collect-and-export-leads.html",
    "/guides/popup-not-showing.html",
    "/guides/popup-builder-for-ecommerce.html",
    "/guides/popup-builder-for-quick-commerce.html",
    "/guides/popup-builder-for-lead-generation.html",
    "/guides/wordpress-popup-without-plugin.html",
    "/guides/nextjs-popup.html",
    "/guides/react-popup.html",
    "/guides/astro-popup.html",
    "/guides/google-tag-manager-popup.html",
    "/guides/static-html-popup.html",
    "/guides/bigcommerce-popup.html",
    "/guides/framer-popup.html",
    "/guides/carrd-popup.html",
    "/best-free-popup-builder.html",
    "/free-popup-builder-no-limits.html"
  ]);
  function isAdPage(pathname) {
    return AD_PAGES.has(String(pathname || ""));
  }
  return { AD_PAGES: AD_PAGES, isAdPage: isAdPage };
});
