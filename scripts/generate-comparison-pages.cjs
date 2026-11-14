// scripts/generate-comparison-pages.cjs — builds the no-limits money page and
// the three alternative pages, then adds them to the sitemap.
// Run: node scripts/generate-comparison-pages.cjs
//
// Competitor limits were checked against each vendor's own pricing page on
// 2026-11-14. Re-check them before changing the copy, and keep the source links.
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

const CHECKED = "14 November 2026";
const ORG = "https://popuploom.com/#organization";

const FOOTER = `<footer class="wrap" style="padding:24px 0;font-size:13px">
  <div><a href="/">PopupLoom</a> · <a href="/templates.html">Templates</a> · <a href="/guides/index.html">Guides</a> · <a href="/free-popup-builder-no-limits.html">No pageview limits</a> · <a href="/about.html">About</a> · <a href="/contact.html">Contact</a> · <a href="/terms.html">Terms</a> · <a href="/privacy.html">Privacy</a></div>
  <div style="margin-top:8px"><a href="/guides/wordpress-popup.html">WordPress</a> · <a href="/guides/shopify-popup.html">Shopify</a> · <a href="/guides/webflow-popup.html">Webflow</a> · <a href="/guides/squarespace-wix-popup.html">Squarespace and Wix</a> · <a href="/templates/email-signup.html">Email templates</a> · <a href="/templates/discount.html">Discount templates</a> · <a href="/templates/exit-intent.html">Exit-intent templates</a></div>
</footer>`;

function head({ path: pagePath, title, description, type = "article", schema }) {
  const url = `https://popuploom.com${pagePath}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="PopupLoom">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="https://popuploom.com/assets/og-popuploom.png">
<meta property="og:image:alt" content="PopupLoom: free website popup builder with 45 templates">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="https://popuploom.com/assets/og-popuploom.png">
<link rel="stylesheet" href="/ui.css"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
<header class="wrap" style="padding:24px 26px">
  <nav aria-label="Main"><a href="/">PopupLoom</a> · <a href="/templates.html">Templates</a> · <a href="/guides/index.html">Guides</a> · <a href="/free-popup-builder-no-limits.html">No pageview limits</a> · <a href="/about.html">About</a> · <a href="/studio.html?tpl=blank">Open the studio</a></nav>
  <nav class="mut" aria-label="Breadcrumb" style="font-size:13px;margin-top:10px">${schema.breadcrumb}</nav>
</header>
<main class="wrap" style="padding:30px 26px 80px;max-width:920px">
  <article>`;
}

function tail() {
  return `  </article>
</main>
${FOOTER}
</body>
</html>
`;
}

function schema({ pagePath, title, description, crumbs, faq }) {
  const url = `https://popuploom.com${pagePath}`;
  const graph = [
    {
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `https://popuploom.com${c.path}` }))
    },
    {
      "@type": "Article",
      "@id": url + "#article",
      headline: title,
      description,
      datePublished: "2026-11-14",
      dateModified: "2026-11-14",
      author: { "@id": ORG },
      publisher: { "@id": ORG },
      mainEntityOfPage: url
    }
  ];
  if (faq && faq.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } }))
    });
  }
  return { "@context": "https://schema.org", "@graph": graph, breadcrumb: crumbs.map((c, i) => `${i ? " › " : ""}<a href="${c.path}">${c.name}</a>`).join("") };
}

function faqHTML(faq) {
  return faq.map(([q, a]) => `<details class="card" style="margin:10px 0;padding:16px"><summary><strong>${q}</strong></summary><p style="margin:10px 0 0">${a}</p></details>`).join("\n");
}

function table(headers, rows) {
  return `<div style="overflow-x:auto"><table class="card" style="width:100%;border-collapse:collapse;font-size:14px">
  <thead><tr>${headers.map((h) => `<th style="text-align:left;padding:10px;border-bottom:1px solid rgba(255,255,255,.12)">${h}</th>`).join("")}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08);vertical-align:top">${c}</td>`).join("")}</tr>`).join("")}</tbody>
</table></div>`;
}

const PAGES = [
  {
    path: "/free-popup-builder-no-limits.html",
    title: "Free Popup Builder, No Pageview Limits: Honest Comparison",
    description: "PopupLoom is free with no pageview or visitor cap, no trial and no credit card. Compare verified free-tier limits from OptinMonster, Poptin and Popupsmart.",
    crumbs: [{ name: "Home", path: "/" }, { name: "No pageview limits", path: "/free-popup-builder-no-limits.html" }],
    faq: [
      ["Is PopupLoom really free with no pageview limits?", "Yes. PopupLoom does not meter pageviews, unique visitors or popup impressions. There is no trial countdown and no paid upgrade inside the product. A free account is required to save a popup and get its install code. Hosting and API rate limits protect the service from abuse."],
      ["Do I need a credit card?", "No. You can design and preview as a guest, and create a free account without a card to save and install a popup."],
      ["What is the catch?", "PopupLoom is deliberately narrow. It does not send email or SMS, run A/B tests, read cart data, generate coupons or provide a native app SDK. If you need those, a paid platform may fit better. The comparison below says who each tool is for."],
      ["Can I use it on WordPress, Shopify, Webflow, Squarespace or Wix?", "Yes where the platform allows custom HTML or JavaScript. PopupLoom is a two-line script, not a plugin. Platform-specific steps are in the WordPress, Shopify, Webflow and Squarespace/Wix guides."],
      ["Where are captured leads stored?", "In your PopupLoom lead inbox, tied to the saved widget. You can export them as CSV. An optional signed server webhook can forward them to another tool."],
      ["Can I import leads from my old popup tool?", "There is no automatic importer. Export the old leads as CSV and keep them with your records, then install PopupLoom for new responses."],
      ["Are the competitor limits on this page current?", `They were checked on ${CHECKED}. Pricing and limits change, so open the linked pricing page before you buy or migrate.`]
    ],
    body: `
    <h1>Free popup builder with no pageview limits</h1>
    <p class="mut">Competitor limits checked on ${CHECKED}. Pricing changes; verify on the linked page before you buy.</p>
    <p><strong>Most “free” popup builders are metered.</strong> The free plan works until a pageview, visitor or impression cap is reached, and then the popup stops, the plan auto-upgrades, or you are charged for overage. PopupLoom does not meter pageviews or visitors for your popup. The product is free, a free account is required to save and install, and there is no credit-card step.</p>
    <p>This page explains what the common limits actually measure, compares the free tiers we could verify from each vendor’s own pricing page, and says plainly when PopupLoom is the wrong choice.</p>

    <h2>What “no pageview limits” actually means</h2>
    <p>“Pageview”, “unique visitor” and “campaign impression” are different meters. A plan can look generous on one and expensive on another.</p>
    <ul>
      <li><strong>Pageview:</strong> every page load on your site. A 10-page visit counts as 10.</li>
      <li><strong>Unique visitor:</strong> one person or browser per month, however many pages they read.</li>
      <li><strong>Campaign impression:</strong> every time the popup is shown. A sitewide popup can use one impression per visit even if the visitor reads several pages.</li>
      <li><strong>Overage:</strong> what happens at the cap. Some tools stop the popup, some auto-upgrade the plan, and some charge per extra block of traffic.</li>
    </ul>
    <p>PopupLoom has no pageview, visitor or impression meter for the popup itself. Hosting and API rate limits exist to stop abuse, not to bill you for traffic. The trade-off is scope: PopupLoom is a focused popup and lead-capture tool, not a full campaign suite.</p>

    <h2>Free-tier comparison</h2>
    ${table(
      ["Tool", "Free offer", "What the meter counts", "At the cap", "Install"],
      [
        ["<strong>PopupLoom</strong>", "Free; no trial timer", "No pageview, visitor or impression cap for the popup", "Nothing to upgrade; hosting/API rate limits only", "Two-line script on any site that allows custom HTML or JavaScript"],
        ["<strong>OptinMonster</strong>", "Free trial with <strong>500 campaign impressions</strong>", "Campaign impressions, not site pageviews", "Auto-upgrades to the paid Plus plan", "WordPress plugin or script"],
        ["<strong>Poptin</strong>", "Free forever: <strong>1,000 unique visitors/month</strong>, 1 domain", "Unique visitors per month", "Move to a paid plan with a higher visitor allowance", "Script or platform integration"],
        ["<strong>Popupsmart</strong>", "Free: <strong>5K pageviews/month</strong>, 1 website, 1 live popup, 100 email quota", "Site pageviews per month", "Move to a paid plan or add overage", "Script, Shopify app or platform integration"]
      ]
    )}
    <p class="mut">Sources, checked ${CHECKED}: <a href="https://optinmonster.com/pricing/" target="_blank" rel="noopener">OptinMonster pricing</a> · <a href="https://www.poptin.com/pricing/" target="_blank" rel="noopener">Poptin pricing</a> · <a href="https://popupsmart.com/pricing/" target="_blank" rel="noopener">Popupsmart pricing</a>. OptinMonster, Poptin and Popupsmart are trademarks of their respective owners. PopupLoom is not affiliated with or endorsed by them.</p>

    <h2>The unit matters more than the number</h2>
    <p>A 5,000-pageview allowance and a 1,000-visitor allowance are not comparable. If a visitor reads five pages, the pageview plan counts five and the visitor plan counts one. A campaign-impression plan counts only when the popup is shown, which can be cheaper on a large site with narrow page targeting and more expensive on a sitewide popup.</p>
    <p>Before choosing a free plan, write down four things: the unit, the monthly number, what happens at the cap, and whether the free tier is permanent or a trial. The table above uses each vendor’s own wording as closely as possible.</p>

    <h2>What you get with PopupLoom</h2>
    <ul>
      <li><strong>45 templates</strong> across email signup, discounts, exit intent, announcements, engagement, trust, age gates, gamified, seasonal and video.</li>
      <li><strong>Six triggers:</strong> page load, delay, scroll depth, scroll to a selector, click and desktop exit intent.</li>
      <li><strong>Targeting:</strong> include/exclude path patterns, desktop/phone switches and frequency rules from every load to once ever.</li>
      <li><strong>Hosted configuration:</strong> change the popup in the studio and the installed widget updates without re-pasting the snippet.</li>
      <li><strong>Lead inbox and CSV export,</strong> plus an optional signed server webhook with HMAC-SHA256 and a delivery log.</li>
      <li><strong>No payment card, no trial countdown and no pageview cap.</strong> A free account is required to save and install.</li>
    </ul>

    <h2>When PopupLoom is the wrong choice</h2>
    <p>Be honest about scope. PopupLoom does not do everything a paid campaign suite does:</p>
    <ul>
      <li>No built-in email or SMS sending, marketing automation or CRM.</li>
      <li>No A/B testing, multi-step campaign builder, geotargeting or audience segmentation beyond page, device and frequency rules.</li>
      <li>No cart contents, cart value, customer accounts or order history.</li>
      <li>No coupon generation, validation or syncing with a store.</li>
      <li>No native iOS/Android SDK or marketplace listing embed.</li>
      <li>No managed migration or enterprise support contract.</li>
    </ul>
    <p>If those are requirements, choose a tool that has them. If you mainly need a well-designed popup, lead capture and no traffic meter, PopupLoom is a strong fit at zero cost.</p>

    <h2>Switch without losing leads</h2>
    <ol>
      <li>Export the leads you already have from your current tool and store them with your records.</li>
      <li>Build the replacement popup in the <a href="/studio.html?tpl=blank">PopupLoom studio</a>. Test it as a guest first.</li>
      <li>Save it, open <strong>Publish</strong>, and copy the two-line install code.</li>
      <li>Add the code to your site and pause the old popup. Do not run both on the same page.</li>
      <li>Test desktop and mobile, submit one fake response, and confirm it appears in the lead inbox.</li>
      <li>Remove the old tool’s code. Export PopupLoom leads as CSV whenever you need them.</li>
    </ol>
    <p>There is no automatic lead import. Keep the old CSV; PopupLoom starts collecting new responses after installation.</p>

    <h2>How to check any builder’s limit yourself</h2>
    <ol>
      <li>Open the vendor’s pricing page, not a review site.</li>
      <li>Find the free tier and write down the unit: pageviews, visitors, impressions, contacts or live popups.</li>
      <li>Find the “at the cap” behavior: stop, auto-upgrade or overage charge.</li>
      <li>Check whether the free tier is permanent or a trial.</li>
      <li>Check the install method: plugin, app or script.</li>
      <li>Record the date. Limits change, and a stale comparison is worse than none.</li>
    </ol>

    <h2>Compare the specific alternatives</h2>
    <ul>
      <li><a href="/alternatives/optinmonster.html">OptinMonster alternative</a> — strong campaign suite, 500-impression free trial.</li>
      <li><a href="/alternatives/poptin.html">Poptin alternative</a> — 1,000-visitor free plan, built-in forms.</li>
      <li><a href="/alternatives/popupsmart.html">Popupsmart alternative</a> — 5K-pageview free plan, Shopify app and AI builder.</li>
      <li><a href="/guides/free-popup-builders-without-pageview-limits.html">Free popup builder comparison guide</a> — the longer buying guide.</li>
    </ul>

    <h2>Common questions</h2>
    __FAQ__
    `
  },
  {
    path: "/alternatives/optinmonster.html",
    title: "OptinMonster Alternative: Free, No Pageview Limits | PopupLoom",
    description: "Compare OptinMonster's 500-impression free trial with PopupLoom's free, no-pageview-limit popup builder. Checked 14 November 2026.",
    crumbs: [{ name: "Home", path: "/" }, { name: "Alternatives", path: "/free-popup-builder-no-limits.html" }, { name: "OptinMonster", path: "/alternatives/optinmonster.html" }],
    faq: [
      ["Is PopupLoom a free OptinMonster alternative?", "Yes. PopupLoom is free and does not meter pageviews, visitors or popup impressions. It does not include OptinMonster's advanced campaign suite, A/B testing, geotargeting or managed support."],
      ["What is OptinMonster's free plan?", `OptinMonster's pricing page on ${CHECKED} describes a free trial with 500 campaign impression credits, which auto-upgrades to the paid Plus plan when exceeded. Verify the current terms on OptinMonster's pricing page.`],
      ["Can I use both tools?", "You can, but do not show two popups on the same page. Use one as the primary popup and remove the other, or target them to different pages and audiences."],
      ["Does PopupLoom send email?", "No. It captures the response and can export it or forward it to a signed webhook. Email delivery and automation are handled by your email tool."],
      ["Can I migrate my OptinMonster leads?", "Export them from OptinMonster and keep the CSV. PopupLoom has no automatic importer; it collects new responses after installation."],
      ["Is PopupLoom affiliated with OptinMonster?", "No. OptinMonster is a trademark of Retyp, LLC. PopupLoom is not affiliated with or endorsed by OptinMonster."]
    ],
    body: `
    <h1>A free OptinMonster alternative with no pageview limits</h1>
    <p class="mut">OptinMonster terms checked on ${CHECKED}. Verify current pricing on its site before buying.</p>
    <p>OptinMonster is a mature campaign suite with a large template library, advanced targeting, A/B testing and integrations. It is a good product for teams that need those features and can pay for them. This page is for the narrower case: you want a well-designed popup, lead capture and no traffic meter, and you do not need the full suite.</p>
    <p><strong>PopupLoom is free and does not meter pageviews, visitors or popup impressions.</strong> A free account is required to save and install. It is a two-line script, not a WordPress plugin, and it works on any site that allows custom HTML or JavaScript.</p>

    <h2>OptinMonster at a glance</h2>
    ${table(
      ["", "OptinMonster", "PopupLoom"],
      [
        ["Free offer", "Free trial with <strong>500 campaign impressions</strong>", "Free, no trial timer"],
        ["Meter", "Campaign impressions", "No pageview, visitor or impression cap"],
        ["At the cap", "Auto-upgrades to the paid Plus plan", "No upgrade; hosting/API rate limits only"],
        ["Paid entry", "Basic plan with 2,500 impressions/month", "No paid plan inside the product"],
        ["Scope", "Campaign suite: A/B testing, geotargeting, integrations, analytics, support", "Focused popup builder: 45 templates, 6 triggers, page/device/frequency targeting, lead inbox, CSV, signed webhook"],
        ["Install", "WordPress plugin or script", "Two-line script on any site with custom HTML/JavaScript"]
      ]
    )}
    <p class="mut">Source: <a href="https://optinmonster.com/pricing/" target="_blank" rel="noopener">OptinMonster pricing</a>, checked ${CHECKED}.</p>

    <h2>Where OptinMonster is stronger</h2>
    <ul>
      <li><strong>Campaign depth.</strong> A/B testing, multi-view campaigns, content locking and campaign scheduling are part of the paid tiers.</li>
      <li><strong>Targeting.</strong> Geolocation, new versus returning visitors, referrer, cookie and query targeting go beyond page and device rules.</li>
      <li><strong>Integrations and analytics.</strong> A broad integration library, revenue attribution and fuller reporting.</li>
      <li><strong>Templates and support.</strong> A very large template library and a mature support organization.</li>
      <li><strong>WordPress plugin.</strong> A native plugin path if you want to manage campaigns inside WordPress.</li>
    </ul>

    <h2>Where PopupLoom fits</h2>
    <ul>
      <li><strong>No traffic meter.</strong> Your popup does not stop because a pageview or impression allowance ran out.</li>
      <li><strong>Free with no card.</strong> No trial countdown and no paid upgrade inside the product.</li>
      <li><strong>Simple install.</strong> Two lines before the closing body tag, with no plugin required.</li>
      <li><strong>Leads you can take with you.</strong> Lead inbox, CSV export and an optional signed server webhook.</li>
      <li><strong>45 original templates</strong> across email, discounts, exit intent, announcements, engagement, trust, age gates, gamified, seasonal and video.</li>
    </ul>

    <h2>Who should switch</h2>
    <ul>
      <li>You run a small site or store and only need a few popups.</li>
      <li>Your OptinMonster impression allowance is the bottleneck, not the feature set.</li>
      <li>You want a script you can install without a plugin.</li>
      <li>You are comfortable exporting leads and handling follow-up in your own email tool.</li>
    </ul>

    <h2>Who should stay</h2>
    <ul>
      <li>You rely on A/B testing, geotargeting, multi-step campaigns or revenue attribution.</li>
      <li>You need a native WordPress plugin and managed support.</li>
      <li>You need the broader integration library or enterprise arrangements.</li>
    </ul>

    <h2>Switch in about ten minutes</h2>
    <ol>
      <li>Export your OptinMonster leads and keep the CSV.</li>
      <li>Build the popup in the <a href="/studio.html?tpl=blank">PopupLoom studio</a> and test it as a guest.</li>
      <li>Save it, open <strong>Publish</strong>, and copy the two-line install code.</li>
      <li>Add the code, pause the OptinMonster campaign, and test one fake submission.</li>
      <li>Confirm the response in the lead inbox, then remove the old campaign code.</li>
    </ol>
    <p>See the <a href="/guides/install-popups.html">installation guide</a> for the exact snippet, or the <a href="/guides/wordpress-popup.html">WordPress</a>, <a href="/guides/shopify-popup.html">Shopify</a> and <a href="/guides/webflow-popup.html">Webflow</a> guides for platform steps.</p>

    <h2>Common questions</h2>
    __FAQ__
    `
  },
  {
    path: "/alternatives/poptin.html",
    title: "Free Poptin Alternative Without Visitor Limits | PopupLoom",
    description: "Compare Poptin's 1,000-visitor free plan with PopupLoom's free, no-visitor-limit popup builder. Checked 14 November 2026.",
    crumbs: [{ name: "Home", path: "/" }, { name: "Alternatives", path: "/free-popup-builder-no-limits.html" }, { name: "Poptin", path: "/alternatives/poptin.html" }],
    faq: [
      ["Is PopupLoom a free Poptin alternative?", "Yes. PopupLoom is free and does not meter unique visitors or pageviews. Poptin's free plan was listed at 1,000 unique visitors per month, one domain, when checked on 14 November 2026."],
      ["What is Poptin's free plan?", `Poptin's pricing page on ${CHECKED} listed a free forever plan with 1,000 visitors per month and one domain. Verify the current terms on Poptin's pricing page.`],
      ["Does PopupLoom include email sending?", "No. PopupLoom captures the response and can export it or forward it to a signed webhook. Poptin's paid plans include email features; PopupLoom leaves email to your existing provider."],
      ["Can I use PopupLoom on Shopify?", "Yes where the theme or an app allows custom HTML or JavaScript. See the Shopify guide for theme-code and app-embed options."],
      ["Can I migrate my Poptin leads?", "Export them from Poptin and keep the CSV. PopupLoom has no automatic importer; it collects new responses after installation."],
      ["Is PopupLoom affiliated with Poptin?", "No. Poptin is a trademark of its owner. PopupLoom is not affiliated with or endorsed by Poptin."]
    ],
    body: `
    <h1>A free Poptin alternative with no visitor limits</h1>
    <p class="mut">Poptin terms checked on ${CHECKED}. Verify current pricing on its site before buying.</p>
    <p>Poptin combines popups, forms and email tooling in one dashboard. Its free plan is one of the more generous entry points, but it is still metered: 1,000 unique visitors per month on one domain when we checked. If your traffic grows, the cap becomes the decision point.</p>
    <p><strong>PopupLoom is free and does not meter unique visitors or pageviews.</strong> It is a focused popup builder: 45 templates, six triggers, page/device/frequency targeting, a lead inbox, CSV export and an optional signed webhook. It does not send email or SMS.</p>

    <h2>Poptin at a glance</h2>
    ${table(
      ["", "Poptin", "PopupLoom"],
      [
        ["Free offer", "Free forever: <strong>1,000 unique visitors/month</strong>, 1 domain", "Free, no trial timer"],
        ["Meter", "Unique visitors per month", "No pageview, visitor or impression cap"],
        ["Paid entry", "Basic tier: 10,000 visitors/month", "No paid plan inside the product"],
        ["Scope", "Popups, forms, email contacts, templates, integrations", "Popup builder, lead inbox, CSV, signed webhook"],
        ["Email sending", "Included in its email plans", "Not included; use your own email tool"],
        ["Install", "Script or platform integration", "Two-line script on any site with custom HTML/JavaScript"]
      ]
    )}
    <p class="mut">Source: <a href="https://www.poptin.com/pricing/" target="_blank" rel="noopener">Poptin pricing</a>, checked ${CHECKED}.</p>

    <h2>Where Poptin is stronger</h2>
    <ul>
      <li><strong>One dashboard for popups and email.</strong> Contacts, email campaigns and automations are part of the product.</li>
      <li><strong>Forms and popup types.</strong> A broad set of popup and form formats, templates and integrations.</li>
      <li><strong>Triggers and targeting.</strong> Exit intent, inactivity, cart triggers and advanced targeting on paid plans.</li>
      <li><strong>Support and integrations.</strong> A mature support operation and a wide integration list.</li>
    </ul>

    <h2>Where PopupLoom fits</h2>
    <ul>
      <li><strong>No visitor cap.</strong> Your popup does not stop at 1,000 visitors or ask you to upgrade mid-month.</li>
      <li><strong>Free with no card.</strong> No trial timer and no paid upgrade inside the product.</li>
      <li><strong>Lightweight script.</strong> Two lines, no plugin, no app dependency.</li>
      <li><strong>Portable leads.</strong> Lead inbox, CSV export and a signed server webhook.</li>
      <li><strong>45 templates</strong> with honest setup notes for each category.</li>
    </ul>

    <h2>Who should switch</h2>
    <ul>
      <li>You already use a separate email provider and do not need Poptin's email features.</li>
      <li>Your traffic is near or above the 1,000-visitor free allowance.</li>
      <li>You want a simple script and a focused popup tool.</li>
      <li>You are comfortable exporting leads and handling follow-up elsewhere.</li>
    </ul>

    <h2>Who should stay</h2>
    <ul>
      <li>You want popups and email in one dashboard.</li>
      <li>You rely on Poptin's advanced triggers, forms or integrations.</li>
      <li>You need its support and managed onboarding.</li>
    </ul>

    <h2>Switch in about ten minutes</h2>
    <ol>
      <li>Export your Poptin leads and keep the CSV.</li>
      <li>Build the popup in the <a href="/studio.html?tpl=blank">PopupLoom studio</a> and test it as a guest.</li>
      <li>Save it, open <strong>Publish</strong>, and copy the two-line install code.</li>
      <li>Add the code, pause the Poptin popup, and test one fake submission.</li>
      <li>Confirm the response in the lead inbox, then remove the old popup.</li>
    </ol>
    <p>Platform steps: <a href="/guides/wordpress-popup.html">WordPress</a>, <a href="/guides/shopify-popup.html">Shopify</a>, <a href="/guides/webflow-popup.html">Webflow</a> and <a href="/guides/squarespace-wix-popup.html">Squarespace and Wix</a>.</p>

    <h2>Common questions</h2>
    __FAQ__
    `
  },
  {
    path: "/alternatives/popupsmart.html",
    title: "Free Popupsmart Alternative Without Pageview Limits | PopupLoom",
    description: "Compare Popupsmart's 5K-pageview free plan with PopupLoom's free, no-pageview-limit popup builder. Checked 14 November 2026.",
    crumbs: [{ name: "Home", path: "/" }, { name: "Alternatives", path: "/free-popup-builder-no-limits.html" }, { name: "Popupsmart", path: "/alternatives/popupsmart.html" }],
    faq: [
      ["Is PopupLoom a free Popupsmart alternative?", "Yes. PopupLoom is free and does not meter pageviews. Popupsmart's free plan was listed at 5K pageviews per month, one website and one live popup when checked on 14 November 2026."],
      ["What is Popupsmart's free plan?", `Popupsmart's pricing page on ${CHECKED} listed a free plan with 5K pageviews per month, one website, one live popup and a 100-email monthly quota. Verify the current terms on Popupsmart's pricing page.`],
      ["Does PopupLoom have a Shopify app?", "No. PopupLoom installs as a two-line script. On Shopify, add it to theme code where custom JavaScript is allowed; the Shopify guide explains the limits."],
      ["Does PopupLoom have A/B testing or geotargeting?", "No. It has page/device/frequency targeting and six triggers, but not A/B testing, geotargeting or audience segmentation."],
      ["Can I migrate my Popupsmart leads?", "Export them from Popupsmart and keep the CSV. PopupLoom has no automatic importer; it collects new responses after installation."],
      ["Is PopupLoom affiliated with Popupsmart?", "No. Popupsmart is a trademark of its owner. PopupLoom is not affiliated with or endorsed by Popupsmart."]
    ],
    body: `
    <h1>A free Popupsmart alternative with no pageview limits</h1>
    <p class="mut">Popupsmart terms checked on ${CHECKED}. Verify current pricing on its site before buying.</p>
    <p>Popupsmart is built for marketers who want an AI-assisted builder, a large template library, Shopify integration and campaign targeting. Its free plan is useful for a single site, but it is metered by pageviews and limited to one live popup when we checked.</p>
    <p><strong>PopupLoom is free and does not meter pageviews.</strong> It is a smaller, focused tool: 45 templates, six triggers, page/device/frequency targeting, lead inbox, CSV and optional signed webhook. It does not include AI campaign generation, A/B testing or geotargeting.</p>

    <h2>Popupsmart at a glance</h2>
    ${table(
      ["", "Popupsmart", "PopupLoom"],
      [
        ["Free offer", "Free: <strong>5K pageviews/month</strong>, 1 website, 1 live popup, 100 email quota", "Free, no trial timer"],
        ["Meter", "Site pageviews per month", "No pageview, visitor or impression cap"],
        ["Paid entry", "Basic tier: 50K pageviews/month, 3 websites", "No paid plan inside the product"],
        ["Scope", "AI builder, 500+ templates, Shopify app, segmentation, A/B testing on paid plans", "45 templates, 6 triggers, page/device/frequency targeting, lead inbox, CSV, signed webhook"],
        ["Install", "Script, Shopify app or platform integration", "Two-line script on any site with custom HTML/JavaScript"]
      ]
    )}
    <p class="mut">Source: <a href="https://popupsmart.com/pricing/" target="_blank" rel="noopener">Popupsmart pricing</a>, checked ${CHECKED}.</p>

    <h2>Where Popupsmart is stronger</h2>
    <ul>
      <li><strong>AI-assisted campaign creation</strong> and a library of 500+ templates.</li>
      <li><strong>Shopify app</strong> with cart and product data, audience targeting and revenue tracking.</li>
      <li><strong>Advanced targeting</strong> including geolocation, traffic source, cookies and new versus returning visitors.</li>
      <li><strong>A/B testing</strong> and fuller analytics on paid plans.</li>
      <li><strong>Email quota and integrations</strong> with the major email and CRM tools.</li>
    </ul>

    <h2>Where PopupLoom fits</h2>
    <ul>
      <li><strong>No pageview cap.</strong> Your popup does not stop at 5K pageviews or require an upgrade.</li>
      <li><strong>Free with no card.</strong> No trial timer and no paid upgrade inside the product.</li>
      <li><strong>No app dependency.</strong> Two lines on any site that allows custom HTML/JavaScript.</li>
      <li><strong>Portable leads.</strong> Lead inbox, CSV export and a signed server webhook.</li>
      <li><strong>45 templates</strong> with clear setup notes and category guidance.</li>
    </ul>

    <h2>Who should switch</h2>
    <ul>
      <li>Your site is not on Shopify, or you do not need cart-based targeting.</li>
      <li>You need more than one live popup on the free tier.</li>
      <li>Your pageviews are near or above 5K per month.</li>
      <li>You want a focused script and will handle email/CRM elsewhere.</li>
    </ul>

    <h2>Who should stay</h2>
    <ul>
      <li>You need the Shopify app and cart/product data.</li>
      <li>You rely on AI campaign generation, geotargeting or A/B testing.</li>
      <li>You need the larger template library and managed support.</li>
    </ul>

    <h2>Switch in about ten minutes</h2>
    <ol>
      <li>Export your Popupsmart leads and keep the CSV.</li>
      <li>Build the popup in the <a href="/studio.html?tpl=blank">PopupLoom studio</a> and test it as a guest.</li>
      <li>Save it, open <strong>Publish</strong>, and copy the two-line install code.</li>
      <li>Add the code, pause the Popupsmart campaign, and test one fake submission.</li>
      <li>Confirm the response in the lead inbox, then remove the old campaign.</li>
    </ol>
    <p>Platform steps: <a href="/guides/wordpress-popup.html">WordPress</a>, <a href="/guides/shopify-popup.html">Shopify</a>, <a href="/guides/webflow-popup.html">Webflow</a> and <a href="/guides/squarespace-wix-popup.html">Squarespace and Wix</a>.</p>

    <h2>Common questions</h2>
    __FAQ__
    `
  }
];

// Render pages. The __FAQ__ placeholder is filled from each page's own FAQ
// array so the copy stays next to the page data.
for (const page of PAGES) {
  const pageSchema = schema({ pagePath: page.path, title: page.title, description: page.description, crumbs: page.crumbs, faq: page.faq });
  const pageBody = page.body.replace(/__FAQ__/g, faqHTML(page.faq));
  const html = head({ path: page.path, title: page.title, description: page.description, type: page.path === "/free-popup-builder-no-limits.html" ? "article" : "article", schema: pageSchema }) + pageBody + tail();
  const target = path.join(root, page.path.replace(/^\//, ""));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
}

function updateSitemap() {
  const file = path.join(root, "sitemap.xml");
  let xml = fs.readFileSync(file, "utf8");
  for (const page of PAGES) {
    const url = `https://popuploom.com${page.path}`;
    if (xml.includes(`<loc>${url}</loc>`)) continue;
    xml = xml.replace("</urlset>", `<url><loc>${url}</loc><lastmod>2026-11-14</lastmod></url></urlset>`);
  }
  fs.writeFileSync(file, xml);
}
updateSitemap();
console.log("Wrote " + PAGES.length + " comparison pages and updated the sitemap.");
