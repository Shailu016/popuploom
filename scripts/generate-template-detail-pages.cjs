// scripts/generate-template-detail-pages.cjs — builds the first wave of
// individual template pages and adds them to the sitemap.
// Run: node scripts/generate-template-detail-pages.cjs
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const ORG = "https://popuploom.com/#organization";

const FOOTER = `<footer class="wrap" style="padding:24px 0;font-size:13px">
  <div><a href="/">PopupLoom — free website popup builder</a> · <a href="/templates.html">Templates</a> · <a href="/guides/">Guides</a> · <a href="/free-popup-builder-no-limits.html">No pageview limits</a> · <a href="/about.html">About</a> · <a href="/contact.html">Contact</a> · <a href="/terms.html">Terms</a> · <a href="/privacy.html">Privacy</a></div>
  <div style="margin-top:8px"><a href="/templates/exit-intent-popup.html">Exit-intent template</a> · <a href="/templates/discount-popup.html">Discount template</a> · <a href="/templates/email-signup-popup.html">Email signup template</a> · <a href="/templates/spin-to-win-popup.html">Spin-to-win template</a></div>
</footer>`;

function render(page) {
  const url = `https://popuploom.com${page.path}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://popuploom.com/" },
          { "@type": "ListItem", position: 2, name: "Popup templates", item: "https://popuploom.com/templates.html" },
          { "@type": "ListItem", position: 3, name: page.categoryName, item: `https://popuploom.com${page.categoryPath}` },
          { "@type": "ListItem", position: 4, name: page.h1, item: url }
        ]
      },
      {
        "@type": "Article",
        "@id": url + "#article",
        headline: page.h1,
        description: page.description,
        datePublished: "2026-11-14",
        dateModified: "2026-11-14",
        author: { "@id": ORG },
        publisher: { "@id": ORG },
        mainEntityOfPage: url
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } }))
      }
    ]
  };
  const faq = page.faq.map(([q, a]) => `<details class="card" style="margin:10px 0;padding:16px"><summary><strong>${q}</strong></summary><p style="margin:10px 0 0">${a}</p></details>`).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${page.title}</title>
<meta name="description" content="${page.description}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:site_name" content="PopupLoom">
<meta property="og:title" content="${page.title}">
<meta property="og:description" content="${page.description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="https://popuploom.com/assets/og-popuploom.png">
<meta property="og:image:alt" content="PopupLoom: free website popup builder with 45 templates">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${page.title}">
<meta name="twitter:description" content="${page.description}">
<meta name="twitter:image" content="https://popuploom.com/assets/og-popuploom.png">
<link rel="stylesheet" href="/ui.css"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
<header class="wrap" style="padding:24px 26px">
  <nav aria-label="Main"><a href="/">PopupLoom</a> · <a href="/templates.html">Templates</a> · <a href="/guides/">Guides</a> · <a href="/free-popup-builder-no-limits.html">No pageview limits</a> · <a href="/about.html">About</a> · <a href="/studio.html?tpl=blank">Open the studio</a></nav>
  <nav class="mut" aria-label="Breadcrumb" style="font-size:13px;margin-top:10px"><a href="/">Home</a> › <a href="/templates.html">Templates</a> › <a href="${page.categoryPath}">${page.categoryName}</a> › <span>${page.shortName}</span></nav>
</header>
<main class="wrap" style="padding:30px 26px 80px;max-width:900px">
  <article>
    <h1>${page.h1}</h1>
    <p class="mut">Free to edit and install. No pageview cap, no trial and no credit card. Template behavior checked on 14 November 2026.</p>
    ${page.intro.map((p) => `<p>${p}</p>`).join("\n    ")}

    <p style="margin:22px 0"><a class="btn primary" href="/studio.html?tpl=${page.featuredId}">Use the ${page.featuredName} template</a> <a class="btn ghost" href="${page.categoryPath}">See all ${page.categoryName.toLowerCase()} templates</a></p>

    <h2>Why this template works</h2>
    <ul>${page.why.map((x) => `<li>${x}</li>`).join("")}</ul>

    <h2>Use it when</h2>
    <ul>${page.useWhen.map((x) => `<li>${x}</li>`).join("")}</ul>

    <h2>Copy you can adapt</h2>
    ${page.copy.map((c, i) => `<div class="card" style="margin:12px 0;padding:16px"><div class="mut" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em">Example ${i + 1}</div><p style="margin:8px 0 4px"><strong>${c.headline}</strong></p><p style="margin:0 0 4px">${c.body}</p><p style="margin:0"><span class="mut">Button:</span> ${c.cta}</p></div>`).join("\n    ")}

    <h2>Set it up</h2>
    <ol>${page.setup.map((x) => `<li>${x}</li>`).join("")}</ol>

    <h2>What to measure</h2>
    <ul>${page.measure.map((x) => `<li>${x}</li>`).join("")}</ul>

    <h2>Common mistakes</h2>
    <ul>${page.mistakes.map((x) => `<li>${x}</li>`).join("")}</ul>

    <h2>Related pages</h2>
    <ul>${page.related.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join("")}</ul>

    <h2>Common questions</h2>
    ${faq}

    <p style="margin-top:26px"><a class="btn primary" href="/studio.html?tpl=${page.featuredId}">Open ${page.featuredName}</a> <a class="btn ghost" href="/templates.html">Browse all 45 templates</a></p>
  </article>
</main>
${FOOTER}
</body>
</html>
`;
}

const PAGES = [
  {
    path: "/templates/exit-intent-popup.html",
    title: "Free Exit-Intent Popup Template: Don't Leave Empty | PopupLoom",
    description: "Use the free Don't Leave Empty exit-intent template: a fullscreen last-chance offer with a code field. Desktop only, with copy examples and setup steps.",
    h1: "Free exit-intent popup template",
    shortName: "Exit intent",
    categoryName: "Exit intent",
    categoryPath: "/templates/exit-intent.html",
    featuredId: "fullscreenExit",
    featuredName: "Don't Leave Empty",
    intro: [
      "<strong>An exit-intent popup appears when a desktop visitor moves the cursor out through the top of the page.</strong> It is the last moment before a visit ends, which makes it a reasonable place for a reminder or a real last-chance offer. It is not a page-load popup, and it does not work on touch screens.",
      "The Don't Leave Empty template uses a fullscreen layout, one clear offer and a copyable code field. It is deliberately simple: at the exit moment, a visitor should understand the offer in one glance."
    ],
    why: [
      "The fullscreen layout removes competing page elements at the decision moment.",
      "A single code field is easier to use than a multi-field form when the visitor is already leaving.",
      "The copy can be changed to a reminder, a first-order code or a content upgrade.",
      "It is desktop-only, so it does not interrupt mobile readers with an event the device cannot detect."
    ],
    useWhen: [
      "A visitor is leaving a product or content page and you have a real last-chance offer.",
      "You want to remind a visitor about a saved cart or a guide they have not downloaded.",
      "You can exclude checkout, payment and legal pages from targeting.",
      "You can honor the code, deadline or shipping terms the popup shows."
    ],
    copy: [
      { headline: "Leaving without your code?", body: "Take 10% off your first order. The code is shown below and expires on Sunday.", cta: "Copy the code" },
      { headline: "Before you go — get the checklist", body: "One email, one practical checklist. No weekly newsletter unless you ask for it.", cta: "Send me the checklist" },
      { headline: "Your cart is still here", body: "Free shipping over $50. Your items are saved for this visit.", cta: "Keep shopping" }
    ],
    setup: [
      "Open the <a href=\"/studio.html?tpl=fullscreenExit\">Don't Leave Empty template</a>.",
      "Set the trigger to <strong>Exit intent</strong> and choose once-per-day or once-ever frequency.",
      "Exclude checkout, payment and legal pages in page targeting unless this is specifically a cart rescue.",
      "Replace the sample code, deadline and terms with a real offer you can honor.",
      "Save the popup, copy the install code from Publish, and add it to your site.",
      "Test in a private desktop window by moving the cursor out through the top edge, not by switching tabs."
    ],
    measure: [
      "Submit rate, not total popup views.",
      "Code redemption in the store, if the offer includes a code.",
      "Close rate, which shows whether the offer or timing is wrong.",
      "Complaint rate on repeat visits."
    ],
    mistakes: [
      "Trying to fire exit intent on mobile; touch devices have no cursor and no dependable exit event.",
      "Showing the same popup on every page to the same visitor.",
      "Blocking the checkout or cancellation flow.",
      "Using a fake deadline or a code that was never tested."
    ],
    related: [
      ["/templates/exit-intent.html", "All exit-intent templates"],
      ["/guides/exit-intent-popup.html", "How exit intent works and how to test it"],
      ["/guides/popup-not-showing.html", "Popup not showing? Diagnostic guide"],
      ["/guides/install-popups.html", "Install a popup on your site"]
    ],
    faq: [
      ["Is this exit-intent template free?", "Yes. The template is free to edit and install. A free PopupLoom account is required to save it and get the install code; there is no pageview cap."],
      ["Does exit intent work on mobile?", "No. Touch devices have no cursor and no dependable leaving event. PopupLoom disables exit intent on mobile by design; use a delay or scroll trigger for phone visitors."],
      ["Why isn't the popup firing?", "Exit intent only fires when the pointer leaves through the top of the viewport. Switching tabs, moving to a second monitor or leaving through the side does not count. Check frequency, page targeting and the console too."],
      ["Can I use this on Shopify or WordPress?", "Yes where the theme or a code block allows custom HTML or JavaScript. See the Shopify and WordPress guides for placement and caching caveats."],
      ["Can I change the design?", "Yes. The studio lets you change the copy, image, colors, trigger, page targeting, devices and frequency before saving."]
    ]
  },
  {
    path: "/templates/discount-popup.html",
    title: "Free Discount Popup Template: 48-Hour Drop | PopupLoom",
    description: "Use the free 48-Hour Drop discount template: a countdown layout, copyable code field and product image. Set a real deadline and test the code.",
    h1: "Free discount popup template",
    shortName: "Discount",
    categoryName: "Discounts",
    categoryPath: "/templates/discount.html",
    featuredId: "drop48",
    featuredName: "48-Hour Drop",
    intro: [
      "<strong>A discount popup works when the offer is real and the deadline is true.</strong> The 48-Hour Drop template combines a product image, a countdown layout and a copyable code field. It is designed for a short promotion, not for permanent urgency.",
      "The template is a starting point. Replace the sample product art, code and deadline with your own. PopupLoom does not generate or validate coupon codes; you create the code in your store and paste it into the popup."
    ],
    why: [
      "The countdown layout makes the end of the offer visible without a wall of text.",
      "A copyable code field removes the step of retyping a code from a screenshot.",
      "The product image gives the offer context, which is useful for a specific drop.",
      "The layout is compact enough for a modal on desktop and a smaller card on mobile."
    ],
    useWhen: [
      "You have a real 48-hour or weekend promotion with a tested code.",
      "You are launching a product drop with a clear start and end time.",
      "You want a first-order code with a stated expiry.",
      "You can exclude checkout and payment pages from targeting."
    ],
    copy: [
      { headline: "48 hours. One code.", body: "Take 20% off the new drop. Code DROP20 ends Sunday at midnight.", cta: "Copy DROP20" },
      { headline: "First order? Start here.", body: "10% off your first order over $40. One use per customer. Code FIRST10.", cta: "Copy FIRST10" },
      { headline: "The bundle is back", body: "Three products, one price. The bundle code is below; the offer ends when the timer does.", cta: "Copy the bundle code" }
    ],
    setup: [
      "Open the <a href=\"/studio.html?tpl=drop48\">48-Hour Drop template</a>.",
      "Set the real start and end date, including the timezone.",
      "Create and test the discount code in your store before pasting it into the popup.",
      "Exclude checkout, payment and legal pages from page targeting.",
      "Choose a frequency that matches the promotion; once per day is usually enough.",
      "Save, copy the install code, add it to your site, and test the code at checkout."
    ],
    measure: [
      "Code redemption, not just popup submissions.",
      "Revenue per visitor during the campaign versus a normal week.",
      "Close rate, which shows whether the offer or timing is wrong.",
      "Refund and cancellation rate after the promotion."
    ],
    mistakes: [
      "Resetting a countdown to fake urgency.",
      "Leaving an expired code in the popup.",
      "Showing a discount over the checkout or payment step.",
      "Publishing a code that was never tested in the store."
    ],
    related: [
      ["/templates/discount.html", "All discount and offer templates"],
      ["/guides/popup-builder-for-ecommerce.html", "Popup builder for ecommerce"],
      ["/guides/shopify-popup.html", "Shopify popup guide"],
      ["/guides/install-popups.html", "Install a popup on your site"]
    ],
    faq: [
      ["Is the countdown real?", "The countdown is a display layout. You set the end date and are responsible for honoring it. PopupLoom does not reset it or validate the deadline."],
      ["Does the template create the discount code?", "No. Create the code in your store platform and paste the real code into the popup. PopupLoom does not generate, validate or sync coupons."],
      ["Can I use it on Shopify?", "Yes where the theme or an app allows custom HTML or JavaScript. The Shopify guide covers theme-code and app-embed options."],
      ["Can I show a low-stock message?", "Only if the stock number is accurate. The template includes a message you must verify and update; it does not read inventory."],
      ["Is the template free?", "Yes, with no pageview cap. A free account is required to save and install."]
    ]
  },
  {
    path: "/templates/email-signup-popup.html",
    title: "Free Email Signup Popup Template: Lead Magnet | PopupLoom",
    description: "Use the free Lead Magnet Shelf email signup template: a corner slide-in, one email field and a clear content-upgrade promise. Setup and copy examples.",
    h1: "Free email signup popup template",
    shortName: "Email signup",
    categoryName: "Email signup",
    categoryPath: "/templates/email-signup.html",
    featuredId: "leadShelf",
    featuredName: "Lead Magnet Shelf",
    intro: [
      "<strong>An email signup popup should ask for one thing and explain why it is worth it.</strong> The Lead Magnet Shelf template uses a corner slide-in, one email field and a short content-upgrade promise. It is less intrusive than a fullscreen modal and works well on content sites, course pages and newsletters.",
      "The template is a layout, not a promise. PopupLoom stores the response in your lead inbox and can export it as CSV. It does not send the file, the email or the follow-up; you deliver those with your own email tool."
    ],
    why: [
      "The corner slide-in keeps the page readable while still being visible.",
      "One email field lowers friction compared with a name, phone and company form.",
      "The content-upgrade framing gives the visitor a specific reason to subscribe.",
      "The layout is easy to test at a delay or scroll depth on mobile and desktop."
    ],
    useWhen: [
      "You have a checklist, guide, template or mini-course to give away.",
      "You want newsletter signups without a fullscreen interruption.",
      "You can deliver the promised file or follow-up promptly.",
      "You will honor the consent language and privacy notice you publish."
    ],
    copy: [
      { headline: "The 10-point popup checklist", body: "One email, one practical checklist for launching a popup without annoying visitors.", cta: "Send the checklist" },
      { headline: "A shorter launch week", body: "Get the template and the pre-launch checklist. No weekly newsletter unless you ask.", cta: "Get the template" },
      { headline: "New guides, once a month", body: "Practical popup and lead-capture notes. Unsubscribe anytime.", cta: "Subscribe" }
    ],
    setup: [
      "Open the <a href=\"/studio.html?tpl=leadShelf\">Lead Magnet Shelf template</a>.",
      "Replace the heading and body with the exact thing the visitor gets and when.",
      "Keep one email field unless you have a specific reason for more.",
      "Use a delay or scroll-depth trigger rather than an immediate page-load popup.",
      "Set once-per-day or once-per-visitor frequency.",
      "Save, install, submit a test response, and confirm it lands in the lead inbox."
    ],
    measure: [
      "Signup rate: submits divided by times the popup was shown.",
      "Validation errors, which usually mean the field or the promise is unclear.",
      "Lead quality: how many new addresses open the first follow-up.",
      "Unsubscribe and complaint rate after the first send."
    ],
    mistakes: [
      "Promising a file, code or reply nobody will deliver.",
      "Adding name, phone and company fields to a first visit.",
      "Hiding the consent or privacy link in tiny fine print.",
      "Showing the prompt on every page view."
    ],
    related: [
      ["/templates/email-signup.html", "All email signup templates"],
      ["/guides/email-signup-popup.html", "Email signup popup guide"],
      ["/guides/collect-and-export-leads.html", "Collect and export leads"],
      ["/guides/install-popups.html", "Install a popup on your site"]
    ],
    faq: [
      ["Is this email signup template free?", "Yes. You can edit and install it without a pageview cap. A free account is required to save the popup and get its install code."],
      ["Where do the emails go?", "They appear in your PopupLoom lead inbox, tied to the saved widget. You can export them as CSV. An optional signed server webhook can forward them to another tool."],
      ["Does PopupLoom send the follow-up email?", "No. It captures the response; email delivery and automation are handled by your email provider."],
      ["Can I collect emails without a plugin?", "Yes, if your site allows custom HTML or JavaScript. Paste the two-line install code before the closing body tag."],
      ["Do I need a consent checkbox?", "PopupLoom forms do not render a separate consent checkbox. The owner is responsible for the consent language and lawful basis required in their jurisdiction."]
    ]
  },
  {
    path: "/templates/spin-to-win-popup.html",
    title: "Free Spin-to-Win Popup Template | PopupLoom",
    description: "Use the free Spin to Win popup template: a segmented wheel, prize layout and email entry. Set real prizes, odds and terms before publishing.",
    h1: "Free spin-to-win popup template",
    shortName: "Spin to win",
    categoryName: "Gamified",
    categoryPath: "/templates/gamified.html",
    featuredId: "wheelWin",
    featuredName: "Spin to Win",
    intro: [
      "<strong>Spin-to-win popups earn attention, but they do not fix a weak offer.</strong> The Spin to Win template combines a segmented wheel, a prize layout and a one-field entry. It is a good fit for a real discount, giveaway or launch moment; it is not a certified draw or a regulated lottery platform.",
      "The wheel uses a random display result. It does not enforce odds, verify eligibility, detect duplicate entries or fulfill prizes. Those are the owner’s responsibility, and they should be written down before the popup goes live."
    ],
    why: [
      "The wheel gives the visitor a reason to interact instead of dismissing immediately.",
      "A single email field keeps the entry short after the spin.",
      "The prize layout makes the result visible and gives the owner a place to explain the terms.",
      "The template is compact and works as a modal on desktop and mobile."
    ],
    useWhen: [
      "You have a real prize, discount or bundle and clear terms.",
      "You can publish eligibility, start/end dates, odds and how winners are chosen.",
      "You have a plan to contact winners and deliver prizes.",
      "You have checked the promotion rules in the jurisdictions you target."
    ],
    copy: [
      { headline: "Spin for a treat", body: "One spin, one prize. Enter your email to claim it. Terms and odds are linked below.", cta: "Spin the wheel" },
      { headline: "Your launch discount is on the wheel", body: "Spin once for 10%, 15% or 20% off. The code is shown after your entry.", cta: "Spin now" },
      { headline: "Try the bundle wheel", body: "Three bundles, one spin. The prize is a real bundle code; terms apply.", cta: "Spin to see your bundle" }
    ],
    setup: [
      "Open the <a href=\"/studio.html?tpl=wheelWin\">Spin to Win template</a>.",
      "Replace every segment label with a real prize and publish the corresponding terms.",
      "State eligibility, start and end dates, odds and how winners are chosen.",
      "Do not require a purchase if your rules say no purchase is necessary.",
      "Set a frequency that prevents repeat spins from the same visitor.",
      "Save, install, and test one entry. Confirm it appears in the lead inbox."
    ],
    measure: [
      "Entry rate versus a plain email popup.",
      "Duplicate and bot submissions.",
      "Prize fulfillment cost and winner response rate.",
      "Complaint rate and promotion-rule questions."
    ],
    mistakes: [
      "Running a giveaway without published rules.",
      "Implying odds or a draw that the product does not enforce.",
      "Requiring a purchase when the rules say no purchase is necessary.",
      "Collecting entries with no plan to contact or fulfill winners."
    ],
    related: [
      ["/templates/gamified.html", "All gamified templates"],
      ["/guides/email-signup-popup.html", "Email signup popup guide"],
      ["/guides/collect-and-export-leads.html", "Collect and export leads"],
      ["/faq.html", "PopupLoom FAQ"]
    ],
    faq: [
      ["Is the spin result random?", "The template uses a random display result. It is not a certified or audited draw, and it does not enforce odds or eligibility."],
      ["Can I run a giveaway with this template?", "You can collect entries. The rules, eligibility, draw, winner verification and prize fulfillment are your responsibility."],
      ["Does PopupLoom verify entries or detect bots?", "No. It stores the submitted response; it does not detect duplicate entries, bots or fraud."],
      ["Is the template free?", "Yes, with no pageview cap. A free account is required to save and install."],
      ["Can I use it on mobile?", "Yes. The wheel and entry form are responsive. Test the tap targets and the result screen on a small screen."]
    ]
  }
];

for (const page of PAGES) {
  const html = render(page);
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
console.log("Wrote " + PAGES.length + " template detail pages and updated the sitemap.");
