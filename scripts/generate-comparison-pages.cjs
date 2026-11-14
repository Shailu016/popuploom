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
  <div class="mut" style="margin-top:8px;font-size:12px">Third-party names are trademarks of their owners. PopupLoom is not affiliated with or endorsed by them. Comparison data is dated and source-linked.</div>
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
      <li><a href="/alternatives/optimonk.html">OptiMonk alternative</a> — 10K-pageview free plan, AI agent and all features.</li>
      <li><a href="/alternatives/popup-maker.html">Popup Maker alternative</a> — free WordPress plugin, any-site comparison.</li>
      <li><a href="/best-free-popup-builder.html">Best free popup builder</a> — the full shortlist and how to choose.</li>
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
  },
  {
    path: "/alternatives/optimonk.html",
    title: "OptiMonk Alternative: Free, No Pageview Limits | PopupLoom",
    description: "Compare OptiMonk's 10,000-pageview free plan with PopupLoom's free, no-pageview-limit popup builder. Checked 14 November 2026.",
    crumbs: [{ name: "Home", path: "/" }, { name: "Alternatives", path: "/free-popup-builder-no-limits.html" }, { name: "OptiMonk", path: "/alternatives/optimonk.html" }],
    faq: [
      ["Is PopupLoom a free OptiMonk alternative?", "Yes. PopupLoom is free and does not meter pageviews. OptiMonk's free plan was listed at 10,000 pageviews per month and one domain when checked on 14 November 2026."],
      ["What is OptiMonk's free plan?", `OptiMonk's pricing page on ${CHECKED} listed a free-forever plan with 10,000 pageviews per month, one domain, 1,000 AI credits and no credit card. At the pageview limit, campaigns pause until the counter resets or the account upgrades.`],
      ["Does PopupLoom have an AI popup agent?", "No. PopupLoom is a visual editor with 45 templates. It does not generate campaigns with an AI agent."],
      ["Does PopupLoom have A/B testing or geotargeting?", "No. It has page, device and frequency targeting plus six triggers, but not A/B testing, geotargeting or audience segmentation."],
      ["Can I migrate my OptiMonk leads?", "Export them from OptiMonk and keep the CSV. PopupLoom has no automatic importer; it collects new responses after installation."],
      ["Is PopupLoom affiliated with OptiMonk?", "No. OptiMonk is a trademark of its owner. PopupLoom is not affiliated with or endorsed by OptiMonk."]
    ],
    body: `
    <h1>A free OptiMonk alternative with no pageview limits</h1>
    <p class="mut">OptiMonk terms checked on ${CHECKED}. Verify current pricing on its site before buying.</p>
    <p>OptiMonk is an ecommerce-focused popup platform with an AI agent, all features available on every plan and a genuinely useful free tier. It is a strong choice for a store that wants popups, A/B testing and analytics in one place. The free plan is still metered: 10,000 pageviews per month when we checked.</p>
    <p><strong>PopupLoom is free and does not meter pageviews.</strong> It is deliberately narrower: 45 templates, six triggers, page/device/frequency targeting, a lead inbox, CSV export and an optional signed webhook. It does not use an AI agent or include A/B testing.</p>

    <h2>OptiMonk at a glance</h2>
    ${table(
      ["", "OptiMonk", "PopupLoom"],
      [
        ["Free offer", "Free forever: <strong>10,000 pageviews/month</strong>, 1 domain, 1,000 AI credits", "Free, no trial timer"],
        ["Meter", "Site pageviews per month", "No pageview, visitor or impression cap"],
        ["At the cap", "Campaigns pause until the counter resets or you upgrade", "No upgrade; hosting/API rate limits only"],
        ["Paid entry", "Essential: 20,000 pageviews/month (from $19/month billed yearly)", "No paid plan inside the product"],
        ["Scope", "AI agent, all features on every plan, ecommerce integrations, A/B testing, analytics", "Focused popup builder: 45 templates, 6 triggers, page/device/frequency targeting, lead inbox, CSV, signed webhook"],
        ["Install", "Script or platform integration", "Two-line script on any site with custom HTML/JavaScript"]
      ]
    )}
    <p class="mut">Source: <a href="https://www.optimonk.com/pricing/" target="_blank" rel="noopener">OptiMonk pricing</a>, checked ${CHECKED}.</p>

    <h2>Where OptiMonk is stronger</h2>
    <ul>
      <li><strong>AI agent and all features on the free plan.</strong> Campaign creation, A/B testing and analytics are not gated by plan.</li>
      <li><strong>Ecommerce focus.</strong> Integrations and targeting built for stores.</li>
      <li><strong>Analytics and testing.</strong> A stronger experimentation workflow than PopupLoom.</li>
      <li><strong>More room before the cap.</strong> 10,000 pageviews per month is a generous free allowance for a small store.</li>
      <li><strong>No branding on any plan</strong> and a mature support operation.</li>
    </ul>

    <h2>Where PopupLoom fits</h2>
    <ul>
      <li><strong>No pageview meter.</strong> Your popup does not pause because a monthly allowance ran out.</li>
      <li><strong>Any site with custom HTML.</strong> WordPress, Shopify, Webflow, Squarespace, Wix or a static site.</li>
      <li><strong>Free with no card.</strong> No trial timer and no paid upgrade inside the product.</li>
      <li><strong>Portable leads.</strong> Lead inbox, CSV export and a signed server webhook.</li>
      <li><strong>45 templates</strong> with honest setup notes for each category.</li>
    </ul>

    <h2>Who should switch</h2>
    <ul>
      <li>Your pageviews are near or above 10,000 per month.</li>
      <li>You do not need an AI agent, A/B testing or ecommerce targeting.</li>
      <li>You want a simple script and a focused popup tool.</li>
      <li>You already use a separate email/CRM tool.</li>
    </ul>

    <h2>Who should stay</h2>
    <ul>
      <li>You want the AI agent and all features on the free plan.</li>
      <li>You rely on A/B testing, analytics or store integrations.</li>
      <li>You need a mature support organization.</li>
    </ul>

    <h2>Switch in about ten minutes</h2>
    <ol>
      <li>Export your OptiMonk leads and keep the CSV.</li>
      <li>Build the popup in the <a href="/studio.html?tpl=blank">PopupLoom studio</a> and test it as a guest.</li>
      <li>Save it, open <strong>Publish</strong>, and copy the two-line install code.</li>
      <li>Add the code, pause the OptiMonk campaign, and test one fake submission.</li>
      <li>Confirm the response in the lead inbox, then remove the old campaign.</li>
    </ol>
    <p>Platform steps: <a href="/guides/wordpress-popup.html">WordPress</a>, <a href="/guides/shopify-popup.html">Shopify</a>, <a href="/guides/webflow-popup.html">Webflow</a> and <a href="/guides/squarespace-wix-popup.html">Squarespace and Wix</a>.</p>

    <h2>Common questions</h2>
    __FAQ__
    `
  },
  {
    path: "/alternatives/popup-maker.html",
    title: "Popup Maker Alternative for Any Website | PopupLoom",
    description: "Popup Maker is a free WordPress plugin with unlimited impressions. Compare it with PopupLoom's free, any-site popup builder. Checked 14 November 2026.",
    crumbs: [{ name: "Home", path: "/" }, { name: "Alternatives", path: "/free-popup-builder-no-limits.html" }, { name: "Popup Maker", path: "/alternatives/popup-maker.html" }],
    faq: [
      ["Is PopupLoom a Popup Maker alternative?", "Yes, if you need a popup on a site that is not WordPress or you prefer a hosted script. If you are on WordPress and only need a native plugin, Popup Maker is a strong free option and may be the better fit."],
      ["Is Popup Maker free?", `Popup Maker's pricing page on ${CHECKED} lists a free WordPress.org plugin with unlimited popups and unlimited pageviews/impressions. Advanced targeting, exit-intent triggers, analytics, WooCommerce features and support are part of the paid Pro plans.`],
      ["Does PopupLoom work on WordPress?", "Yes, through theme code or a code-snippet plugin. It is not a WordPress plugin, so it does not appear in the WordPress admin. See the WordPress guide for the exact placement."],
      ["Does PopupLoom have unlimited pageviews?", "Yes. It does not meter pageviews, visitors or popup impressions. A free account is required to save and install."],
      ["Can I migrate my Popup Maker leads?", "Export them from your WordPress database or the plugin's export if available, and keep the CSV. PopupLoom has no automatic importer."],
      ["Is PopupLoom affiliated with Popup Maker?", "No. Popup Maker is a trademark of Code Atlantic LLC. PopupLoom is not affiliated with or endorsed by Popup Maker."]
    ],
    body: `
    <h1>A Popup Maker alternative for any website</h1>
    <p class="mut">Popup Maker terms checked on ${CHECKED}. Verify current pricing on its site before buying.</p>
    <p>Popup Maker is a strong free WordPress plugin: unlimited popups and unlimited impressions, with no hosted account required. If your site is WordPress and you are comfortable in the plugin ecosystem, it may be the better free option. This page is for the cases where it is not: a Shopify, Webflow, Squarespace, Wix or custom site, or a WordPress site where you want a hosted script instead of another plugin.</p>
    <p><strong>PopupLoom is free and does not meter pageviews.</strong> It installs as a two-line script on any site that allows custom HTML or JavaScript. The trade-off is that it is not a WordPress plugin: there is no WP admin screen, and the popup is managed in the PopupLoom studio.</p>

    <h2>Popup Maker at a glance</h2>
    ${table(
      ["", "Popup Maker", "PopupLoom"],
      [
        ["Free offer", "Free WordPress plugin with unlimited popups and unlimited pageviews/impressions", "Free, no trial timer"],
        ["Platform", "WordPress only", "Any site that allows custom HTML or JavaScript"],
        ["Meter", "No pageview/impression cap in the core plugin", "No pageview, visitor or impression cap"],
        ["Advanced features", "Targeting, exit intent, analytics, WooCommerce and support are paid Pro features", "Focused feature set; no paid tier"],
        ["Install", "WordPress plugin", "Two-line script, no plugin"],
        ["Hosted config", "Configuration lives in WordPress", "Configuration lives in PopupLoom; edits go live without re-pasting"]
      ]
    )}
    <p class="mut">Source: <a href="https://wppopupmaker.com/pricing/" target="_blank" rel="noopener">Popup Maker pricing</a>, checked ${CHECKED}.</p>

    <h2>Where Popup Maker is stronger</h2>
    <ul>
      <li><strong>Native WordPress integration.</strong> Popups live in the WordPress admin and can use WordPress conditions and hooks.</li>
      <li><strong>Unlimited popups and impressions on the free plugin.</strong> A genuinely free core, not a trial.</li>
      <li><strong>WooCommerce path.</strong> Paid Pro/Pro+ plans add cart and revenue features for stores.</li>
      <li><strong>No external account.</strong> The plugin runs inside your WordPress site.</li>
      <li><strong>Mature plugin ecosystem</strong> with documentation and support plans.</li>
    </ul>

    <h2>Where PopupLoom fits</h2>
    <ul>
      <li><strong>Not WordPress.</strong> Shopify, Webflow, Squarespace, Wix, static sites and custom apps.</li>
      <li><strong>No plugin.</strong> Two lines before the closing body tag; nothing to update in a plugin dashboard.</li>
      <li><strong>Hosted configuration.</strong> Change the popup in the studio and the installed widget updates.</li>
      <li><strong>Portable leads.</strong> Lead inbox, CSV export and a signed server webhook.</li>
      <li><strong>45 templates</strong> across email, discounts, exit intent, announcements, engagement, trust, age gates, gamified, seasonal and video.</li>
    </ul>

    <h2>Who should switch</h2>
    <ul>
      <li>Your site is not WordPress.</li>
      <li>You want to avoid another WordPress plugin and its update surface.</li>
      <li>You want a hosted config you can change without touching the site.</li>
      <li>You need the lead inbox, CSV and signed webhook in one free tool.</li>
    </ul>

    <h2>Who should stay</h2>
    <ul>
      <li>Your site is WordPress and you want popups managed inside WP.</li>
      <li>You need Popup Maker's WordPress conditions or WooCommerce Pro features.</li>
      <li>You want a plugin with a large WordPress.org install base and support plans.</li>
    </ul>

    <h2>Switch in about ten minutes</h2>
    <ol>
      <li>Export or back up your Popup Maker leads and settings.</li>
      <li>Build the popup in the <a href="/studio.html?tpl=blank">PopupLoom studio</a> and test it as a guest.</li>
      <li>Save it, open <strong>Publish</strong>, and copy the two-line install code.</li>
      <li>Add the code to the site, pause the Popup Maker popup, and test one fake submission.</li>
      <li>Confirm the response in the lead inbox, then remove the old popup.</li>
    </ol>
    <p>WordPress placement without a popup plugin: see <a href="/guides/wordpress-popup-without-plugin.html">how to add a popup to WordPress without a plugin</a>. Other platforms: <a href="/guides/shopify-popup.html">Shopify</a>, <a href="/guides/webflow-popup.html">Webflow</a>, <a href="/guides/squarespace-wix-popup.html">Squarespace and Wix</a>.</p>

    <h2>Common questions</h2>
    __FAQ__
    `
  },
  {
    path: "/best-free-popup-builder.html",
    title: "Best Free Popup Builders in 2026: Honest Comparison",
    description: "An honest comparison of free popup builders: PopupLoom, Popup Maker, OptiMonk, Poptin, Popupsmart and OptinMonster, with dated limits and fit.",
    crumbs: [{ name: "Home", path: "/" }, { name: "Best free popup builder", path: "/best-free-popup-builder.html" }],
    faq: [
      ["What is the best free popup builder?", "There is no single answer. Popup Maker is the strongest free WordPress-only option, OptiMonk has the most generous feature-complete free tier for small stores, and PopupLoom is the fit when you want no pageview cap and a script on any site. Choose by platform, meter and features, not by a generic ranking."],
      ["Which free popup builder has no pageview limit?", "PopupLoom does not meter pageviews, visitors or impressions. Popup Maker's free WordPress plugin also advertises unlimited pageviews and impressions. OptiMonk, Poptin and Popupsmart publish monthly free-tier meters; OptinMonster's free offer is a 500-impression trial."],
      ["Is PopupLoom really free?", "Yes. There is no credit card, trial timer or paid upgrade inside the product. A free account is required to save a popup and get its install code."],
      ["Do these free plans include email sending?", "PopupLoom does not send email. Poptin and Popupsmart include email features with their own quotas. OptiMonk and OptinMonster focus on popups; email delivery is a separate tool."],
      ["Are the limits on this page current?", `They were checked on ${CHECKED}. Free tiers change, so open each vendor's pricing page before you commit.`]
    ],
    body: `
    <h1>Best free popup builders in 2026: an honest comparison</h1>
    <p class="mut">Vendor limits checked on ${CHECKED}. Prices and limits change; verify on each linked pricing page.</p>
    <p>“Best” depends on your platform, your traffic and the features you actually use. A WordPress-only plugin with unlimited impressions is not the same product as a script that works on Shopify, Webflow and a custom site. This page compares the free tiers we could verify and says which one fits which job.</p>

    <h2>The short answer</h2>
    <ul>
      <li><strong>WordPress only, free, unlimited impressions:</strong> <a href="/alternatives/popup-maker.html">Popup Maker</a>.</li>
      <li><strong>Any site, no pageview cap, simple script:</strong> <a href="/free-popup-builder-no-limits.html">PopupLoom</a>.</li>
      <li><strong>Small store, AI agent and all features on free:</strong> <a href="/alternatives/optimonk.html">OptiMonk</a> (10K pageviews/month).</li>
      <li><strong>Popups plus email in one dashboard:</strong> <a href="/alternatives/poptin.html">Poptin</a> (1,000 visitors/month).</li>
      <li><strong>Shopify app and AI builder:</strong> <a href="/alternatives/popupsmart.html">Popupsmart</a> (5K pageviews/month).</li>
      <li><strong>Advanced paid campaign suite:</strong> <a href="/alternatives/optinmonster.html">OptinMonster</a> (500-impression free trial).</li>
    </ul>

    <h2>Free-tier comparison</h2>
    ${table(
      ["Tool", "Free offer", "Platform", "Best for"],
      [
        ["<strong>PopupLoom</strong>", "Free; no pageview, visitor or impression cap", "Any site with custom HTML/JavaScript", "A simple popup, lead capture and no traffic meter"],
        ["<strong>Popup Maker</strong>", "Free WordPress plugin; unlimited popups and pageviews/impressions", "WordPress only", "WordPress sites that want a native plugin"],
        ["<strong>OptiMonk</strong>", "Free forever: 10,000 pageviews/month, 1 domain, 1,000 AI credits", "Script or platform integration", "Small ecommerce stores that want AI and all features"],
        ["<strong>Poptin</strong>", "Free forever: 1,000 unique visitors/month, 1 domain", "Script or platform integration", "Popups and email in one dashboard"],
        ["<strong>Popupsmart</strong>", "Free: 5K pageviews/month, 1 website, 1 live popup, 100 email quota", "Script, Shopify app or platform integration", "Shopify stores that want an app and AI builder"],
        ["<strong>OptinMonster</strong>", "Free trial: 500 campaign impressions, auto-upgrades to paid Plus", "WordPress plugin or script", "Teams that need advanced campaigns and will pay"]
      ]
    )}
    <p class="mut">Sources: <a href="https://wppopupmaker.com/pricing/" target="_blank" rel="noopener">Popup Maker</a> · <a href="https://www.optimonk.com/pricing/" target="_blank" rel="noopener">OptiMonk</a> · <a href="https://www.poptin.com/pricing/" target="_blank" rel="noopener">Poptin</a> · <a href="https://popupsmart.com/pricing/" target="_blank" rel="noopener">Popupsmart</a> · <a href="https://optinmonster.com/pricing/" target="_blank" rel="noopener">OptinMonster</a>. All checked ${CHECKED}. Trademarks belong to their respective owners; PopupLoom is not affiliated with or endorsed by them.</p>

    <h2>How to choose in five questions</h2>
    <ol>
      <li><strong>What platform are you on?</strong> WordPress-only tools are not a fit for Shopify, Webflow, Squarespace, Wix or a custom app.</li>
      <li><strong>What does the free tier meter?</strong> Pageviews, unique visitors, campaign impressions, live popups or contacts are different units.</li>
      <li><strong>What happens at the cap?</strong> Stop, pause, auto-upgrade or overage charge.</li>
      <li><strong>Which features are non-negotiable?</strong> A/B testing, geotargeting, cart data, email sending, SMS or a native app SDK.</li>
      <li><strong>Who owns the lead?</strong> Check the export and webhook story before you collect a single address.</li>
    </ol>

    <h2>Why we did not rank them 1–6</h2>
    <p>A single ranking hides the trade-offs. Popup Maker is the best free option for many WordPress sites, but it cannot run on Shopify. OptiMonk has the most complete free feature set for a small store, but it still pauses at 10,000 pageviews. PopupLoom has no pageview cap, but it does not send email or run A/B tests. The right choice is the one that fits your platform and your must-have list.</p>

    <h2>What to verify before you commit</h2>
    <ul>
      <li>The free tier is permanent, not a trial.</li>
      <li>The meter matches your traffic pattern.</li>
      <li>Your platform can install the code.</li>
      <li>You can export leads and cancel without losing data.</li>
      <li>The pricing page is current and the limit is stated in the vendor's own words.</li>
    </ul>

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
