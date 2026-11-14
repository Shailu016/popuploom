// scripts/generate-template-pages.cjs — builds the public template category
// pages, repoints the gallery cards at them, and adds them to the sitemap.
// Run: node scripts/generate-template-pages.cjs
//
// The studio path is preserved: every category page has a "Use this template"
// link to /studio.html?tpl=<id>. The gallery no longer links straight into a
// noindex URL.
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

const CATEGORY_OF = {
  drop48: "discount", chalkhat: "discount", sneakerDrop: "discount",
  nightTune: "discount", lowStock: "discount", bundleBuild: "discount",
  comebackCode: "discount",
  exitOnly: "email", waitlist: "email", glowRitual: "email", cafeClub: "email",
  leadShelf: "email", smsPass: "email", webinarSeat: "email", firstCode: "email",
  backStock: "email", priceWatch: "email",
  wheelWin: "gamified", giveaway: "gamified",
  bfdrop: "seasonal", xmasglow: "seasonal", cyberdrop: "seasonal",
  age18: "age", age21: "age",
  proofPulse: "social", guaranteeSeal: "social", secureCheckout: "social",
  barnews: "announce", freeship: "announce", launchDay: "announce",
  eventInvite: "announce", shippingDelay: "announce", holidayHours: "announce",
  tapMeter: "engage", microYes: "engage", cornerPeek: "engage", transit: "engage",
  loyaltyCard: "engage", referFriend: "engage", reviewAsk: "engage",
  birthdayClub: "engage",
  player: "video",
  fullscreenExit: "exit", cartRescue: "exit", cancelSave: "exit"
};

const CATEGORIES = {
  email: {
    slug: "email-signup",
    label: "Email signup",
    title: "Free Email Signup Popup Templates | PopupLoom",
    h1: "Free email signup popup templates",
    description: "10 free email signup and waitlist popup templates. Collect emails, offer a lead magnet or open a waitlist, then install with two lines of code.",
    intro: [
      "Email is the one audience a site owner keeps even when an algorithm changes. These ten templates cover the common reasons a visitor gives an address: a welcome offer, a launch waitlist, a lead magnet, a restock alert or a webinar seat. Each is an editable starting design, not a promise of a particular conversion rate.",
      "Every template installs on any site that allows custom HTML or JavaScript. The form, success message and follow-up are yours; PopupLoom stores the response in your lead inbox and can export it as CSV."
    ],
    who: [
      "Newsletter and content sites that want a single, low-friction field.",
      "Course creators and local services offering a checklist, guide or booking.",
      "Product launches that need a waitlist before the store opens.",
      "Small stores that want first-order or restock interest without a monthly popup subscription."
    ],
    how: [
      "Ask for one thing. A single email field usually beats a name, phone and company field stacked together.",
      "State the value in the heading, not the fine print: what the visitor gets and when.",
      "Only promise a file, code or reply you can actually deliver.",
      "Use exit intent on desktop and a short delay or scroll trigger on mobile.",
      "Keep consent language honest and link to your privacy notice."
    ],
    faq: [
      ["Are these email popup templates free?", "Yes. All ten designs are free to edit and use. A free account is required to save a popup and get its install code; there is no pageview cap."],
      ["Can I collect emails without a plugin?", "Yes, if your site allows custom HTML or JavaScript. Paste the two-line install code before the closing body tag. WordPress, Shopify, Webflow, Squarespace and Wix each have a guide."],
      ["Where do the emails go?", "They appear in your PopupLoom lead inbox, where you can export them as CSV. An optional signed server webhook can forward them to another tool."],
      ["Do I need a consent checkbox?", "PopupLoom forms do not render a separate consent checkbox. The owner is responsible for the consent language and lawful basis required in their jurisdiction."]
    ],
    guides: [
      ["/guides/email-signup-popup.html", "Email signup popup guide"],
      ["/guides/collect-and-export-leads.html", "Collect and export leads"],
      ["/guides/install-popups.html", "Install a popup on your site"]
    ]
  },
  discount: {
    slug: "discount",
    label: "Discounts",
    title: "Free Discount and Offer Popup Templates | PopupLoom",
    h1: "Free discount and offer popup templates",
    description: "7 free discount, countdown and bundle popup templates for product drops and first-order offers. Customize the copy and install on any site.",
    intro: [
      "A discount popup is only as good as the offer behind it. These seven templates cover first-order codes, time-boxed drops, bundle builders and low-stock notices. They are layouts: the code, deadline, stock level and terms must be real and honored by the site owner.",
      "Several templates include countdown layouts. A countdown is a display element, not an automatic deadline. Set a real end date and do not reset it to manufacture urgency."
    ],
    who: [
      "Independent stores running a first-order or seasonal promotion.",
      "Product drops that need a code and a clear end date.",
      "Bundle offers that need a simple three-choice layout.",
      "Restock or low-stock notices where the owner has real inventory data."
    ],
    how: [
      "Put the actual value in the heading: “10% off your first order” beats “Special offer”.",
      "Show the code in a copyable field and repeat it in the success message.",
      "Use a real deadline and timezone; never reset a countdown to fake urgency.",
      "Exclude checkout and payment steps from page targeting.",
      "Test the code in the store before publishing the popup."
    ],
    faq: [
      ["Are the countdown timers real?", "They are display layouts. The owner sets the end date and is responsible for honoring it. PopupLoom does not generate or validate coupon codes."],
      ["Can I use these on Shopify?", "Yes, if your theme or an app allows custom HTML or JavaScript. The Shopify guide covers theme code and app-embed options."],
      ["Do these templates create discount codes?", "No. You create the code in your store and paste the real code into the popup."],
      ["Can I show a low-stock message?", "Only if the stock number is accurate. The template includes a message you must verify and update; it does not read inventory."]
    ],
    guides: [
      ["/guides/popup-builder-for-ecommerce.html", "Popup builder for ecommerce"],
      ["/guides/popup-builder-for-quick-commerce.html", "Popup builder for quick commerce"],
      ["/guides/shopify-popup.html", "Shopify popup guide"]
    ]
  },
  exit: {
    slug: "exit-intent",
    label: "Exit intent",
    title: "Free Exit-Intent Popup Templates | PopupLoom",
    h1: "Free exit-intent popup templates",
    description: "3 free exit-intent popup templates for cart rescue, last-chance offers and cancellation saves. Desktop only, with honest setup notes.",
    intro: [
      "Exit intent is a last-chance conversation, not a popup on every page. These three templates cover a cart reminder, a last-chance offer and a cancellation save. They are desktop-only because touch devices do not have a dependable exit event.",
      "Use them sparingly. A visitor who is leaving a checkout or a cancellation flow has a specific task in mind; a vague “wait!” message usually makes the experience worse. State the reason to stay, or let them go."
    ],
    who: [
      "Stores with a real cart or browse-abandonment moment.",
      "Subscription or membership sites with a genuine pause or downgrade option.",
      "Sites offering a last-chance code with a real deadline.",
      "Teams that can test on desktop and respect frequency limits."
    ],
    how: [
      "Trigger only on desktop and only when the pointer leaves through the top edge.",
      "Exclude checkout, payment and legal pages unless the offer is specifically a cart rescue.",
      "Set once-per-day or once-ever frequency; do not ask the same visitor on every page.",
      "Use the cart template only if you can honor the shipping or offer terms.",
      "Test with a private window and a mouse, not by switching tabs."
    ],
    faq: [
      ["Why doesn't exit intent work on mobile?", "Touch devices have no cursor and no reliable “leaving” event. PopupLoom disables exit intent on mobile by design; use a delay or scroll trigger instead."],
      ["Why isn't my exit popup firing?", "Exit intent only fires when the pointer leaves through the top of the viewport. Switching tabs, moving to a second monitor or leaving through the side does not count."],
      ["Can I use a countdown in an exit popup?", "Yes, but the deadline must be real. Do not reset it for each visitor."],
      ["Is this free?", "Yes. There is no pageview cap; a free account is required to save a popup and get its install code."]
    ],
    guides: [
      ["/guides/exit-intent-popup.html", "Exit-intent popup guide"],
      ["/guides/popup-not-showing.html", "Popup not showing?"],
      ["/guides/install-popups.html", "Install a popup on your site"]
    ]
  },
  announce: {
    slug: "announcements",
    label: "Announcements",
    title: "Free Announcement Bar and Popup Templates | PopupLoom",
    h1: "Free announcement bar and popup templates",
    description: "6 free announcement bar, shipping notice, launch and event popup templates. Share news without a plugin.",
    intro: [
      "Announcement bars and popups are for information a visitor needs now: a shipping threshold, a delay, holiday hours, a launch or an event. They work best when they are short, specific and easy to dismiss.",
      "These six templates cover top and bottom bars, a launch countdown, an event invitation and operational notices. Keep the message factual; a shipping promise or closure date is an operational commitment, not marketing copy."
    ],
    who: [
      "Stores with a real shipping threshold, delay or holiday schedule.",
      "Teams launching a product or opening registrations.",
      "Event organizers sharing a date and location.",
      "Sites that need a dismissible notice without a plugin."
    ],
    how: [
      "Put the specific fact first: threshold, date or change.",
      "Link to the page that explains the details.",
      "Keep the bar to one line on mobile.",
      "Use a frequency that matches the notice; a permanent shipping threshold can show every load, a launch countdown should not.",
      "Remove the notice when the fact changes."
    ],
    faq: [
      ["Will an announcement bar cover my navigation?", "Top and bottom bars are fixed-position layouts. Test on mobile and add spacing if your theme's header is also fixed."],
      ["Can I schedule a launch countdown?", "The countdown is a display layout. Set the target date and time in the studio; the owner is responsible for the launch time."],
      ["Can I use these on any website?", "Yes, if the site allows custom HTML or JavaScript. Inside an iframe, the popup cannot extend beyond the frame."],
      ["Are the templates free?", "Yes. No pageview cap; a free account is required to save and install."]
    ],
    guides: [
      ["/guides/install-popups.html", "Install a popup on your site"],
      ["/guides/wordpress-popup.html", "WordPress popup guide"],
      ["/faq.html", "PopupLoom FAQ"]
    ]
  },
  engage: {
    slug: "engagement",
    label: "Engagement",
    title: "Free Feedback and Loyalty Popup Templates | PopupLoom",
    h1: "Free feedback and loyalty popup templates",
    description: "8 free feedback, referral, review and loyalty popup templates. Ask one small question and give visitors a reason to return.",
    intro: [
      "Most popups ask for something. These eight templates ask for something small: a mood check, a one-question micro-commitment, a referral, a review or a birthday signup. The goal is a real signal you can act on, not a vanity metric.",
      "Keep the ask proportional to the relationship. A first-time visitor is not ready for a five-field survey; a returning customer may be. The same template can be used at different moments with different triggers."
    ],
    who: [
      "SaaS and content sites that want lightweight feedback.",
      "Local businesses collecting reviews or birthday-list signups.",
      "Stores running a referral or loyalty program with real terms.",
      "Teams that will follow up on the response."
    ],
    how: [
      "Ask one question per popup.",
      "Make the options mutually exclusive and easy to tap.",
      "Tell the visitor what happens next.",
      "Do not promise points, rewards or a reply you cannot deliver.",
      "Use once-per-visitor frequency for feedback prompts."
    ],
    faq: [
      ["Do these templates send email or SMS?", "No. PopupLoom captures the response; it does not send marketing email, SMS or push notifications."],
      ["Can I run a loyalty or referral program?", "The templates provide the signup layout. The program terms, rewards and fulfillment are the owner's responsibility."],
      ["Can I collect reviews?", "You can ask and store the response. Publishing the review and verifying the customer are your responsibility."],
      ["Are the templates free?", "Yes, with no pageview cap. A free account is required to save and install."]
    ],
    guides: [
      ["/guides/collect-and-export-leads.html", "Collect and export leads"],
      ["/guides/email-signup-popup.html", "Email signup popup guide"],
      ["/guides/install-popups.html", "Install a popup on your site"]
    ]
  },
  social: {
    slug: "social-proof",
    label: "Trust",
    title: "Free Trust and Social-Proof Popup Templates | PopupLoom",
    h1: "Free trust and social-proof popup templates",
    description: "3 free trust, guarantee and secure-checkout popup templates. Only publish claims you can prove and honor.",
    intro: [
      "Trust notices only work when they are true. These three templates give you a layout for a guarantee, a secure-checkout explanation and an activity toast. The copy, evidence and claims must come from the owner.",
      "Demo names, times and badges are sample data. Do not publish a fake review, a fake purchase notification or a security claim you cannot substantiate."
    ],
    who: [
      "Stores with a real return, guarantee or support policy.",
      "Checkout flows that need a plain-language security note.",
      "Sites with verified customer activity they can show truthfully.",
      "Teams that can keep the claim current."
    ],
    how: [
      "Write the exact policy, not a vague “100% safe” badge.",
      "Link to the page with the full terms.",
      "Remove sample names and times before publishing.",
      "Do not imply a certification, audit or payment security standard you do not hold.",
      "Update the notice when the policy changes."
    ],
    faq: [
      ["Can I use the proof toast with sample data?", "No. The sample names and times are demonstration data. Replace them with real, owner-verified activity or remove the template."],
      ["Does the secure-checkout template make my site PCI compliant?", "No. It is a layout for facts you supply. Compliance depends on your payment provider and your own setup."],
      ["Can I claim a guarantee?", "Only if you can honor it. State the conditions and link to the full policy."],
      ["Are the templates free?", "Yes, with no pageview cap."]
    ],
    guides: [
      ["/security.html", "Security and responsible disclosure"],
      ["/guides/popup-builder-for-ecommerce.html", "Popup builder for ecommerce"],
      ["/guides/install-popups.html", "Install a popup on your site"]
    ]
  },
  age: {
    slug: "age-gates",
    label: "Age gates",
    title: "Free Age Gate Popup Templates | PopupLoom",
    h1: "Free age gate popup templates",
    description: "2 free age declaration and confirmation popup templates. Self-declaration only; not legal age verification.",
    intro: [
      "An age popup is a self-declaration, not identity verification. These two templates ask a visitor to confirm they meet an age requirement and either continue or leave. They do not check ID, verify age or satisfy a legal age-verification regime on their own.",
      "Use neutral wording, explain what happens on denial and link to your terms. If your product requires strict age assurance, use a dedicated verification provider instead of a popup."
    ],
    who: [
      "Sites that need a simple self-declaration before showing age-restricted content.",
      "Alcohol, tobacco, gambling or similar products where the owner has separate legal advice.",
      "Teams that want a clear allow/deny path without a plugin.",
      "Sites that will document their own compliance approach."
    ],
    how: [
      "State the requirement and the jurisdiction or policy it comes from.",
      "Offer a clear “leave” path; do not trap the visitor.",
      "Do not collect ID documents in a popup.",
      "Log only what you need; a self-declaration is not proof of age.",
      "Get legal advice for regulated products."
    ],
    faq: [
      ["Is this legal age verification?", "No. It is a self-declaration. It does not verify identity or age. Regulated products may require a dedicated verification service and legal review."],
      ["Can a visitor bypass it by reloading?", "Yes. The declaration is stored in the browser and is not a security control. Treat it as a UX and policy prompt, not an enforcement mechanism."],
      ["Can I customize the minimum age?", "The studio includes an age setting and copy. The copy and the policy must match; the template does not enforce a legal threshold."],
      ["Are the templates free?", "Yes, with no pageview cap."]
    ],
    guides: [
      ["/faq.html", "PopupLoom FAQ"],
      ["/guides/install-popups.html", "Install a popup on your site"],
      ["/terms.html", "Terms of use"]
    ]
  },
  gamified: {
    slug: "gamified",
    label: "Gamified",
    title: "Free Spin-to-Win and Giveaway Popup Templates | PopupLoom",
    h1: "Free gamified popup templates",
    description: "2 free gamified popup templates for spin-to-win wheels and giveaways. Set real prizes, terms and eligibility.",
    intro: [
      "Spin-to-win and giveaway popups are good at earning attention and bad at fixing a weak offer. These two templates provide the layout; the prize, eligibility, odds, deadline and fulfillment are the owner's responsibility.",
      "The spin animation uses a random result for display. It is not a certified draw, a fraud-detection system or a regulated lottery platform."
    ],
    who: [
      "Stores with a real prize or discount and clear terms.",
      "Launch campaigns that need a playful entry point.",
      "Event booths or newsletters running a giveaway.",
      "Teams that can publish rules and fulfill prizes."
    ],
    how: [
      "Publish the prize, odds, eligibility, start and end date, and how winners are chosen.",
      "Do not require a purchase to enter if your rules say no purchase is necessary.",
      "Collect only the data you need.",
      "Have a plan to contact winners and deliver prizes.",
      "Check the promotion rules in the jurisdictions you target."
    ],
    faq: [
      ["Is the spin result random?", "The template uses a random display result. It is not a certified or audited draw, and it does not enforce odds or eligibility."],
      ["Can I run a giveaway?", "You can collect entries with the template. The rules, eligibility, draw, winner verification and prize fulfillment are your responsibility."],
      ["Does PopupLoom verify entries?", "No. It stores the submitted response; it does not detect duplicate entries, bots or fraud."],
      ["Are the templates free?", "Yes, with no pageview cap."]
    ],
    guides: [
      ["/guides/email-signup-popup.html", "Email signup popup guide"],
      ["/guides/collect-and-export-leads.html", "Collect and export leads"],
      ["/faq.html", "PopupLoom FAQ"]
    ]
  },
  seasonal: {
    slug: "seasonal",
    label: "Seasonal",
    title: "Seasonal Popup Templates: Black Friday and Holidays | PopupLoom",
    h1: "Free seasonal popup templates",
    description: "3 free Black Friday, Cyber Monday and winter holiday popup templates. Customize the dates and offers for your campaign.",
    intro: [
      "Seasonal campaigns have a short window and a clear reason to act. These three templates cover Black Friday, Cyber Monday and a winter holiday offer. Change the dates, code and terms before publishing.",
      "A seasonal template is not a license to fake urgency. If the sale ends on Sunday, say Sunday and honor it. If the code is limited, state the limit."
    ],
    who: [
      "Stores running a real Black Friday, Cyber Monday or holiday promotion.",
      "Teams that need a campaign page and popup that match.",
      "Shops that can update the offer when the window closes.",
      "Marketers who will measure the campaign, not just launch it."
    ],
    how: [
      "Set the real start and end date, including timezone.",
      "Use a code you have tested in the store.",
      "Make the mobile layout legible; seasonal art can crowd small screens.",
      "Remove the popup when the promotion ends.",
      "Do not reuse last year's deadline or stock claim."
    ],
    faq: [
      ["Can I reuse the template next year?", "Yes, but update the dates, code, terms and art. Do not leave an expired deadline live."],
      ["Do the countdowns enforce the deadline?", "No. They display the date you set. The owner must honor it."],
      ["Can I use these on Shopify or WordPress?", "Yes, where custom HTML or JavaScript is allowed. See the platform guides."],
      ["Are the templates free?", "Yes, with no pageview cap."]
    ],
    guides: [
      ["/guides/popup-builder-for-ecommerce.html", "Popup builder for ecommerce"],
      ["/guides/shopify-popup.html", "Shopify popup guide"],
      ["/guides/wordpress-popup.html", "WordPress popup guide"]
    ]
  },
  video: {
    slug: "video",
    label: "Video",
    title: "Free Video Popup Template | PopupLoom",
    h1: "Free video popup template",
    description: "A free video popup template for product demos, launches and tutorials. Embed YouTube or Vimeo and open it from a CTA.",
    intro: [
      "A video popup is a lightweight way to show a demo, a launch film or a tutorial without sending the visitor to another page. This template embeds YouTube or Vimeo inside a modal and opens it from a call to action.",
      "Video is expensive attention. Keep the clip short, caption it and do not autoplay with sound. The popup is a container; the video provider's privacy and consent rules still apply."
    ],
    who: [
      "Product teams with a 30–90 second demo.",
      "Course creators previewing a lesson.",
      "Launch pages with a founder or product film.",
      "Sites that already host video on YouTube or Vimeo."
    ],
    how: [
      "Use a short clip and put the value in the first five seconds.",
      "Add captions; many visitors watch without sound.",
      "Do not autoplay with sound.",
      "Check the video provider's privacy settings and consent requirements.",
      "Provide a text alternative for visitors who cannot or will not watch."
    ],
    faq: [
      ["Which video providers are supported?", "The template is designed for YouTube and Vimeo embeds. The site's CSP allows the standard YouTube, YouTube-nocookie and Vimeo players."],
      ["Can I autoplay the video?", "You can configure the embed, but autoplay with sound is blocked by most browsers and is a poor experience. Prefer a click-to-play video."],
      ["Does the video popup slow my site?", "The player loads when the popup opens, not on page load, which keeps the initial page lighter. Test on mobile."],
      ["Are the templates free?", "Yes, with no pageview cap."]
    ],
    guides: [
      ["/guides/install-popups.html", "Install a popup on your site"],
      ["/guides/webflow-popup.html", "Webflow popup guide"],
      ["/faq.html", "PopupLoom FAQ"]
    ]
  }
};

const ORDER = ["email", "discount", "exit", "announce", "engage", "social", "age", "gamified", "seasonal", "video"];

// Extra depth per category: what to measure and the mistakes that make the
// template backfire. Kept separate so the category copy above stays readable.
const EXTRA = {
  email: {
    measure: ["Signup rate: submits divided by times the popup was shown.", "Validation errors, which usually mean the field or the promise is unclear.", "Lead quality: how many new addresses open the first follow-up.", "Unsubscribe and complaint rate after the first send."],
    mistakes: ["Buying a list and importing it as if those people opted in.", "Hiding the consent or privacy link in tiny fine print.", "Promising a file, code or reply nobody will deliver.", "Stacking name, phone and company fields on a first visit."]
  },
  discount: {
    measure: ["Code redemption, not just popup submissions.", "Revenue per visitor during the campaign versus a normal week.", "Close rate, which shows whether the offer or timing is wrong.", "Refund and cancellation rate after the promotion."],
    mistakes: ["Resetting a countdown to fake urgency.", "Leaving an expired code in the popup.", "Showing a discount over the checkout or payment step.", "Publishing a code that was never tested in the store."]
  },
  exit: {
    measure: ["Exit-popup submit rate, not total popup views.", "Cart or checkout recovery attributable to the popup.", "Cancellation saves with a real pause or downgrade.", "Complaint and close rate, especially on repeat visits."],
    mistakes: ["Trying to fire exit intent on mobile.", "Showing on every page to the same visitor.", "Blocking the checkout or cancellation flow.", "Ignoring frequency and asking again immediately."]
  },
  announce: {
    measure: ["Click-through to the details page.", "Dismiss rate, which shows whether the notice is useful.", "Support tickets about the same shipping or hours question.", "Mobile overlap with a fixed site header."],
    mistakes: ["Covering navigation or the first line of content.", "Leaving a stale notice after the fact changes.", "Writing a vague notice with no date or link.", "Using a launch countdown with no real launch time."]
  },
  engage: {
    measure: ["Response rate and completion rate, separately.", "Follow-up conversion: what happened after the response.", "Review or referral volume that was actually published.", "Repeat-prompt annoyance and close rate."],
    mistakes: ["Turning a one-question prompt into a survey.", "Asking for feedback and never following up.", "Promising points or rewards the owner cannot fulfill.", "Showing the prompt on every page view."]
  },
  social: {
    measure: ["Click-through to the full policy or terms.", "Support questions that the notice was meant to prevent.", "Conversion delta before and after the notice.", "Whether every claim is still true this month."],
    mistakes: ["Publishing sample reviews or names as if they were real.", "Using a vague badge like “100% safe” with no evidence.", "Implying a certification, audit or payment standard you do not hold.", "Leaving an expired guarantee live."]
  },
  age: {
    measure: ["Allow and deny counts, if you need them for policy review.", "Bounce rate on the deny path.", "Whether the copy matches the actual product policy.", "Legal review for regulated categories."],
    mistakes: ["Calling a self-declaration “legal age verification”.", "Trapping the visitor with no way to leave.", "Collecting ID documents in a popup.", "Running a regulated product without separate legal advice."]
  },
  gamified: {
    measure: ["Entry rate versus a plain email popup.", "Duplicate and bot submissions.", "Prize fulfillment cost and winner response rate.", "Complaint rate and promotion-rule questions."],
    mistakes: ["Running a giveaway without published rules.", "Implying odds or a draw that the product does not enforce.", "Requiring a purchase when the rules say no purchase is necessary.", "Collecting entries with no plan to contact or fulfill winners."]
  },
  seasonal: {
    measure: ["Code redemption during the real campaign window.", "Revenue and conversion on mobile versus desktop.", "Click-through to the campaign page.", "Whether the popup was removed when the sale ended."],
    mistakes: ["Reusing last year's deadline or stock claim.", "Publishing a code that was not tested.", "Letting seasonal art crowd a small screen.", "Leaving the popup live after the promotion."]
  },
  video: {
    measure: ["Play rate after the popup opens.", "Completion rate at 25%, 50% and 75%.", "CTA clicks after the video.", "Mobile data and load impact."],
    mistakes: ["Autoplaying with sound.", "Using a long clip with the value buried at the end.", "Skipping captions.", "Ignoring the video provider's privacy and consent settings."]
  }
};
for (const key of Object.keys(EXTRA)) Object.assign(CATEGORIES[key], EXTRA[key]);
const NAV = ORDER.map((key) => ({ key, ...CATEGORIES[key] }));

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseTemplates() {
  const html = fs.readFileSync(path.join(root, "templates.html"), "utf8");
  const entries = [];
  const re = /<li style="margin:14px 0"><a href="(?:\/studio\.html\?tpl=|\/templates\/[a-z-]+\.html#)([A-Za-z0-9_-]+)"><strong>([\s\S]*?)<\/strong><\/a>\s*[—-]\s*([\s\S]*?)<\/li>/g;
  let match;
  while ((match = re.exec(html))) {
    const id = match[1];
    const category = CATEGORY_OF[id];
    if (!category) throw new Error("Unknown template category for " + id);
    entries.push({ id, name: match[2].trim(), description: match[3].trim(), category });
  }
  if (entries.length !== 45) throw new Error("Expected 45 templates, found " + entries.length);
  return entries;
}

function navHTML() {
  return `<nav class="mut" aria-label="Template categories" style="font-size:13px;line-height:2;margin:18px 0">${NAV.map((c) => `<a href="/templates/${c.slug}.html">${esc(c.label)}</a>`).join(" · ")}</nav>`;
}

function renderPage(categoryKey, templates) {
  const c = CATEGORIES[categoryKey];
  const url = `https://popuploom.com/templates/${c.slug}.html`;
  const items = templates.filter((t) => t.category === categoryKey);
  const list = items.map((t, index) => `<article class="card" id="${t.id}" style="margin:18px 0;padding:20px">
  <h2 style="margin:0 0 6px">${t.name}</h2>
  <p style="margin:0 0 12px">${t.description}</p>
  <p style="margin:0"><a class="btn primary small" href="/studio.html?tpl=${t.id}">Use this template</a> <a class="btn ghost small" href="/templates.html">Compare all 45</a></p>
</article>`).join("\n");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://popuploom.com/" },
          { "@type": "ListItem", position: 2, name: "Popup templates", item: "https://popuploom.com/templates.html" },
          { "@type": "ListItem", position: 3, name: c.label, item: url }
        ]
      },
      {
        "@type": "CollectionPage",
        "@id": url + "#collection",
        url,
        name: c.h1,
        description: c.description,
        isPartOf: { "@id": "https://popuploom.com/#website" },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: items.length,
          itemListElement: items.map((t, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: t.name,
            url: url + "#" + t.id
          }))
        }
      }
    ]
  };
  const faq = c.faq.map(([q, a]) => `<details class="card" style="margin:10px 0;padding:16px"><summary><strong>${esc(q)}</strong></summary><p style="margin:10px 0 0">${esc(a)}</p></details>`).join("\n");
  const guides = c.guides.map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`).join("\n");
  const who = c.who.map((x) => `<li>${esc(x)}</li>`).join("\n");
  const how = c.how.map((x) => `<li>${esc(x)}</li>`).join("\n");
  const measure = c.measure.map((x) => `<li>${esc(x)}</li>`).join("\n");
  const mistakes = c.mistakes.map((x) => `<li>${esc(x)}</li>`).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.title)}</title>
<meta name="description" content="${esc(c.description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:site_name" content="PopupLoom">
<meta property="og:title" content="${esc(c.title)}">
<meta property="og:description" content="${esc(c.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="https://popuploom.com/assets/og-popuploom.png">
<meta property="og:image:alt" content="PopupLoom: free website popup builder with 45 templates">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(c.title)}">
<meta name="twitter:description" content="${esc(c.description)}">
<meta name="twitter:image" content="https://popuploom.com/assets/og-popuploom.png">
<link rel="stylesheet" href="/ui.css"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
<header class="wrap" style="padding:24px 26px">
  <nav aria-label="Main"><a href="/">PopupLoom</a> · <a href="/templates.html">Templates</a> · <a href="/guides/index.html">Guides</a> · <a href="/about.html">About</a> · <a href="/studio.html?tpl=blank">Open the studio</a></nav>
  <nav class="mut" aria-label="Breadcrumb" style="font-size:13px;margin-top:10px"><a href="/">Home</a> › <a href="/templates.html">Templates</a> › <span>${esc(c.label)}</span></nav>
</header>
<main class="wrap" style="padding:30px 26px 80px;max-width:900px">
  <h1>${esc(c.h1)}</h1>
  <p class="mut">Free to edit and install. No pageview cap, no trial and no credit card.</p>
  ${c.intro.map((p) => `<p>${esc(p)}</p>`).join("\n  ")}
  ${navHTML()}

  <h2>Who these templates are for</h2>
  <ul>
${who}
  </ul>

  <h2>How to choose and use one</h2>
  <ul>
${how}
  </ul>

  <h2>What to measure</h2>
  <ul>
${measure}
  </ul>

  <h2>Common mistakes</h2>
  <ul>
${mistakes}
  </ul>

  <h2>${items.length} ${esc(c.label.toLowerCase())} template${items.length === 1 ? "" : "s"}</h2>
  <p class="mut">Each card opens the template in the studio. Replace the sample copy, set a real offer or message, then save and copy the install code.</p>
${list}

  <h2>Related guides</h2>
  <ul>
${guides}
  </ul>

  <h2>Common questions</h2>
${faq}

  <p style="margin-top:26px"><a class="btn primary" href="/studio.html?tpl=blank">Start from a blank popup</a> <a class="btn ghost" href="/templates.html">Browse all 45 templates</a></p>
</main>
<footer class="wrap" style="padding:24px 0"><a href="/">PopupLoom — free website popup builder</a> · <a href="/templates.html">Templates</a> · <a href="/guides/index.html">Guides</a> · <a href="/about.html">About</a> · <a href="/contact.html">Contact</a> · <a href="/terms.html">Terms</a> · <a href="/privacy.html">Privacy</a></footer>
</body>
</html>
`;
}

function rewriteGallery(entries) {
  const file = path.join(root, "templates.html");
  let html = fs.readFileSync(file, "utf8");
  for (const entry of entries) {
    const category = CATEGORIES[entry.category];
    const target = `/templates/${category.slug}.html#${entry.id}`;
    const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const linked = new RegExp(`<a href="(?:/studio\\.html\\?tpl=${entry.id}|${escapeRe(target)})">`, "g");
    html = html.replace(linked, `<a href="${target}">`);
  }
  if (!html.includes("<!-- category-nav -->")) {
    const block = `<!-- category-nav --><section aria-labelledby="browse"><h2 id="browse">Browse popup templates by category</h2><p>Start with the job you need the popup to do. Each category page explains when to use it, how to set it up and which template fits.</p><ul style="line-height:2">${NAV.map((c) => `<li><a href="/templates/${c.slug}.html"><strong>${esc(c.label)}</strong></a> — ${esc(c.description.split(". ")[0])}.</li>`).join("")}</ul></section>`;
    html = html.replace('<section aria-labelledby="capture">', block + '<section aria-labelledby="capture">');
  }
  fs.writeFileSync(file, html);
}

function updateSitemap() {
  const file = path.join(root, "sitemap.xml");
  let xml = fs.readFileSync(file, "utf8");
  const today = "2026-11-14";
  for (const key of ORDER) {
    const url = `https://popuploom.com/templates/${CATEGORIES[key].slug}.html`;
    if (xml.includes(`<loc>${url}</loc>`)) continue;
    xml = xml.replace("</urlset>", `<url><loc>${url}</loc><lastmod>${today}</lastmod></url></urlset>`);
  }
  fs.writeFileSync(file, xml);
}

const entries = parseTemplates();
fs.mkdirSync(path.join(root, "templates"), { recursive: true });
for (const key of ORDER) {
  const html = renderPage(key, entries);
  fs.writeFileSync(path.join(root, "templates", CATEGORIES[key].slug + ".html"), html);
}
rewriteGallery(entries);
updateSitemap();
console.log("Wrote " + ORDER.length + " template category pages, repointed 45 gallery cards, updated sitemap.");
