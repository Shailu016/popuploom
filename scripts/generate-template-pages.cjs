// scripts/generate-template-pages.cjs — builds the public template category
// pages, repoints the gallery cards at them, and adds them to the sitemap.
// Run: node scripts/generate-template-pages.cjs
//
// The studio path is preserved: every category page has a "Use this template"
// link to /studio.html?tpl=<id>. The gallery no longer links straight into a
// noindex URL.
//
// Source of truth: the catalog in app.js (loaded by scripts/lib/catalog.cjs).
// templates.html is rebuilt from it on every run, so names, blurbs and the
// template count cannot drift between the app and the public pages.
// Preview images come from scripts/capture-template-previews.cjs.
const fs = require("fs");
const path = require("path");
const { loadCatalog } = require("./lib/catalog.cjs");
const media = require("./lib/template-media.cjs");
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
  valentine: "seasonal", halloween: "seasonal", thanksgiving: "seasonal", summerSale: "seasonal", backToSchool: "seasonal",
  welcomeHero: "email", guideSplit: "email", eventSplit: "email",
  player: "video",
  fullscreenExit: "exit", cartRescue: "exit", cancelSave: "exit"
};

const CATEGORIES = {
  email: {
    slug: "email-signup",
    label: "Email signup",
    title: "Free Email Signup Popup Templates | PopupLoom",
    h1: "Free email signup popup templates",
    description: "13 free email signup, lead magnet and waitlist popup templates. Collect emails, offer a lead magnet or open a waitlist, then install with two lines of code.",
    intro: [
      "Email is the one audience a site owner keeps even when an algorithm changes. These thirteen templates cover the common reasons a visitor gives an address: a welcome offer, a launch waitlist, a lead magnet, a restock alert or a webinar seat. Each is an editable starting design, not a promise of a particular conversion rate.",
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
      ["Are these email popup templates free?", "Yes. All thirteen designs are free to edit and use. A free account is required to save a popup and get its install code; there is no pageview cap."],
      ["Can I collect emails without a plugin?", "Yes, if your site allows custom HTML or JavaScript. Paste the two-line install code before the closing body tag. WordPress, Shopify, Webflow, Squarespace and Wix each have a guide."],
      ["Where do the emails go?", "They appear in your PopupLoom lead inbox, where you can export them as CSV. An optional signed server webhook can forward them to another tool."],
      ["Do I need a consent checkbox?", "PopupLoom forms do not render a separate consent checkbox. The owner is responsible for the consent language and lawful basis required in their jurisdiction."]
    ],
    guides: [
      ["/templates/back-in-stock-popup.html", "Back-in-stock popup template"],
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
      ["/templates/cart-rescue-popup.html", "Cart rescue popup template"],
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
      ["/templates/announcement-bar.html", "Announcement bar template"],
      ["/templates/free-shipping-bar.html", "Free shipping bar template"],
      ["/templates/shipping-notice-popup.html", "Shipping notice popup template"],
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
      ["/templates/feedback-popup.html", "Feedback popup template"],
      ["/templates/referral-popup.html", "Referral popup template"],
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
      ["/templates/trust-badge-popup.html", "Trust badge popup template"],
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
      ["/templates/age-verification-popup.html", "Age confirmation popup template"],
      ["/faq.html", "PopupLoom FAQ"],
      ["/guides/install-popups.html", "Install a popup on your site"],
      ["/terms.html", "Terms of use"]
    ]
  },
  gamified: {
    slug: "gamified",
    label: "Gamified",
    title: "Free Spin-to-Win and Giveaway Popup Templates | PopupLoom",
    h1: "Free spin-to-win and giveaway popup templates",
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
      ["/templates/giveaway-popup.html", "Giveaway popup template"],
      ["/guides/email-signup-popup.html", "Email signup popup guide"],
      ["/guides/collect-and-export-leads.html", "Collect and export leads"],
      ["/faq.html", "PopupLoom FAQ"]
    ]
  },
  seasonal: {
    slug: "seasonal",
    label: "Seasonal",
    title: "Free Black Friday and Holiday Popup Templates | PopupLoom",
    h1: "Free Black Friday and seasonal popup templates",
    description: "8 free Black Friday, Cyber Monday, holiday and seasonal popup templates. Customize the dates and offers for your campaign.",
    intro: [
      "Seasonal campaigns have a short window and a clear reason to act. These eight templates cover Black Friday, Cyber Monday, a winter holiday offer, Valentine's Day, Halloween, Thanksgiving, summer and back to school. Change the dates, code and terms before publishing.",
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
      ["/templates/black-friday-popup.html", "Black Friday popup template"],
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
      ["/templates/video-popup.html", "Video popup template"],
      ["/guides/install-popups.html", "Install a popup on your site"],
      ["/guides/webflow-popup.html", "Webflow popup guide"],
      ["/faq.html", "PopupLoom FAQ"]
    ]
  }
};

const ORDER = ["email", "discount", "exit", "announce", "engage", "social", "age", "gamified", "seasonal", "video"];
// Page copy states the template count in several places; parseTemplates() fails the
// build if the catalog size changes without this being updated.
const TEMPLATE_COUNT = 53;
const LAST_UPDATED = "18 November 2026";
const ICONS = `<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png"><link rel="icon" href="/assets/favicon-16.png" sizes="16x16" type="image/png"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">`;

// Individual template pages published in the first wave. The category cards
// link to these guides in addition to opening the studio.
const TEMPLATE_GUIDES = {
  fullscreenExit: "/templates/exit-intent-popup.html",
  drop48: "/templates/discount-popup.html",
  leadShelf: "/templates/email-signup-popup.html",
  wheelWin: "/templates/spin-to-win-popup.html",
  cartRescue: "/templates/cart-rescue-popup.html",
  barnews: "/templates/announcement-bar.html",
  backStock: "/templates/back-in-stock-popup.html",
  bfdrop: "/templates/black-friday-popup.html",
  age21: "/templates/age-verification-popup.html",
  freeship: "/templates/free-shipping-bar.html",
  player: "/templates/video-popup.html",
  tapMeter: "/templates/feedback-popup.html",
  referFriend: "/templates/referral-popup.html",
  secureCheckout: "/templates/trust-badge-popup.html",
  giveaway: "/templates/giveaway-popup.html",
  shippingDelay: "/templates/shipping-notice-popup.html"
};

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

// Long-form sections that were added to the published category pages after the
// first generation. Kept here so re-running the script cannot delete them.
const SECTIONS = {
  age: {
    h2: "What an age gate can and cannot do",
    paras: [
      "An age gate records a self-declaration. It is not identity verification: anyone can click the button, and clearing cookies or opening a private window resets the choice. Say \u201cage confirmation\u201d, not \u201cage verified\u201d, unless you actually checked a document.",
      "Rules for alcohol, vaping, gambling and adult content differ by country and sometimes by state, and a popup is not a compliance certificate. Record what you collect and why, keep the wording plain, and make the exit path obvious rather than trapping the visitor in a loop. For a regulated category, have a professional review the flow before launch."
    ]
  },
  gamified: {
    h2: "Fairness, rules and prize obligations",
    paras: [
      "The template randomises what the wheel displays. It does not enforce odds, eligibility or a real draw, and it cannot verify that a winner exists. If you promise a prize, publish the rules: who may enter, start and end dates, how the result is determined, what the prize is worth and how it will be delivered.",
      "Collect marketing consent separately from the entry, so a giveaway is not used to opt people into email they did not ask for. Prize fulfilment, tax and any registration requirement are the site owner's responsibility, and the rules differ by country. Treat the template as a layout for the mechanic, not as legal cover, and have a professional check the promotion before it goes live."
    ]
  },
  seasonal: {
    h2: "Timing a seasonal campaign",
    paras: [
      "Publish one to two weeks before the event and retire the popup within a few days of it ending. A Black Friday countdown left up in December reads as neglect, and an expired code is worse than no popup. Date-stamp the creative so a cached copy cannot promise something that has already passed.",
      "Run one seasonal offer per visitor rather than stacking a Black Friday, a holiday and a shipping banner on the same page. Set the frequency to once per campaign instead of once per day, and exclude checkout. After the event, replace the popup with a non-seasonal offer rather than switching it off and leaving the page bare."
    ]
  },
  social: {
    h2: "What you can and cannot claim",
    paras: [
      "Use only reviews, counts, ratings and logos you can evidence. Keep a dated screenshot of the source, because a number quoted from a dashboard changes and a badge can expire. Get permission before using a customer's name, photo or company logo; otherwise anonymise the quote.",
      "A testimonial is one person's experience, not a typical result, so do not present it as an average or a guarantee. Do not imply a rating you have not received, a certification you do not hold or a customer you do not serve. When a claim stops being true, remove it the same day rather than leaving it until the next redesign."
    ]
  },
  video: {
    h2: "Video setup that avoids the usual problems",
    paras: [
      "Browsers block autoplay with sound, so a popup that starts unmuted will either stay paused or be muted by the browser. Start muted, or require a click before playback. Load the player only when the popup opens, so the page is not paying for an embed nobody watches.",
      "Use the provider's privacy-enhanced embed and check what cookies it sets; a video player is a third-party script with its own consent implications. Add captions and a short text fallback, because the embed can be blocked by consent tools or corporate networks. Keep the clip to 60\u201390 seconds for a launch or demo; if the story needs longer, link to a page instead of forcing it into a modal."
    ]
  }
};
const NAV = ORDER.map((key) => ({ key, ...CATEGORIES[key] }));

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CATALOG = loadCatalog();

/* Display format of a template, from its placement. Drives the card label and the gallery filter. */
const FORMATS = [
  ["modal", "Popup"], ["slide", "Corner slide-in"], ["topbar", "Top bar"], ["bottombar", "Bottom bar"], ["fullscreen", "Fullscreen"]
];
function formatOf(placement) {
  const p = String(placement || "modal");
  if (p.indexOf("slide:") === 0) return "slide";
  return FORMATS.some(([k]) => k === p) ? p : "modal";
}
const formatLabel = (key) => (FORMATS.find(([k]) => k === key) || FORMATS[0])[1];

function parseTemplates() {
  const entries = CATALOG.templates.map((t) => {
    const category = CATEGORY_OF[t.id];
    if (!category) throw new Error("Template " + t.id + " has no category in CATEGORY_OF; add it before publishing");
    if (!media.hasPreview(t.id)) throw new Error("Missing preview image for " + t.id + "; run node scripts/capture-template-previews.cjs");
    return { id: t.id, name: t.name, description: t.blurb, tag: t.tag, blurb: t.blurb, journey: t.journey, best: !!t.best, category, format: formatOf(t.cfg.placement) };
  });
  for (const id of Object.keys(CATEGORY_OF)) {
    if (!entries.some((e) => e.id === id)) throw new Error("CATEGORY_OF lists " + id + " but app.js has no such template");
  }
  if (entries.length !== TEMPLATE_COUNT) throw new Error("Expected " + TEMPLATE_COUNT + " templates, found " + entries.length + "; update TEMPLATE_COUNT and the page copy");
  return entries;
}

/* One gallery card: preview image, name, type, blurb and the two next steps. */
function cardHTML(t, opts) {
  const o = opts || {};
  const guide = TEMPLATE_GUIDES[t.id];
  const heading = o.heading || "h3";
  const sizes = "(max-width: 700px) 100vw, (max-width: 1060px) 50vw, 340px";
  const img = media.pictureHTML(t, { lazy: o.lazy !== false, sizes });
  // The gallery passes publicHref so it never links to the noindex studio URL;
  // category pages are the public home of each card and do open the studio.
  if (o.publicHref) {
    return `<div class="tg-card" id="${t.id}" data-format="${t.format}" data-goal="${t.journey}">
  <a class="tg-shot" href="${o.publicHref}" aria-label="${esc(t.name)}: see the template">${img}</a>
  <div class="tg-meta"><${heading} class="tg-name"><a href="${o.publicHref}">${esc(t.name)}</a></${heading}><span class="tg-tag">${esc(formatLabel(t.format))}</span></div>
  <p class="tg-kind">${esc(t.tag)}</p>
  <p class="tg-blurb">${esc(t.blurb)}</p>
  <p class="tg-actions"><a class="btn primary small" href="${o.publicHref}">View template</a>${guide ? ` <a class="btn ghost small" href="${guide}">Read the full guide</a>` : ""}</p>
</div>`;
  }
  return `<div class="tg-card" id="${t.id}" data-format="${t.format}" data-goal="${t.journey}">
  <a class="tg-shot" href="/studio.html?tpl=${t.id}" aria-label="Open ${esc(t.name)} in the studio">${img}</a>
  <div class="tg-meta"><${heading} class="tg-name">${esc(t.name)}</${heading}><span class="tg-tag">${esc(formatLabel(t.format))}</span></div>
  <p class="tg-kind">${esc(t.tag)}</p>
  <p class="tg-blurb">${esc(t.blurb)}</p>
  <p class="tg-actions"><a class="btn primary small" href="/studio.html?tpl=${t.id}">Use this template</a>${guide ? ` <a class="btn ghost small" href="${guide}">Read the full guide</a>` : ""}</p>
</div>`;
}

function navHTML() {
  return `<nav class="mut" aria-label="Template categories" style="font-size:13px;line-height:2;margin:18px 0">${NAV.map((c) => `<a href="/templates/${c.slug}.html">${esc(c.label)}</a>`).join(" · ")}</nav>`;
}

function renderPage(categoryKey, templates) {
  const c = CATEGORIES[categoryKey];
  const url = `https://popuploom.com/templates/${c.slug}.html`;
  const items = templates.filter((t) => t.category === categoryKey);
  const list = `<div class="tg-grid">\n${items.map((t, index) => cardHTML(t, { heading: "h3", lazy: index > 1 })).join("\n")}\n</div>`;
  const lead = items[0];
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
            url: url + "#" + t.id,
            image: media.imageObject(t)
          }))
        },
        author: { "@type": "Person", name: "Shailu", url: "https://popuploom.com/about.html" }
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
<meta property="og:image" content="https://popuploom.com/assets/templates/${lead.id}.jpg">
<meta property="og:image:alt" content="${esc(media.altFor(lead))}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="750">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(c.title)}">
<meta name="twitter:description" content="${esc(c.description)}">
<meta name="twitter:image" content="https://popuploom.com/assets/templates/${lead.id}.jpg">
<link rel="preload" as="image" href="/assets/templates/${lead.id}-600.webp" imagesrcset="/assets/templates/${lead.id}-600.webp 600w, /assets/templates/${lead.id}.webp 1200w" imagesizes="(max-width: 700px) 100vw, (max-width: 1060px) 50vw, 340px">
<link rel="stylesheet" href="/ui.css">${ICONS}
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
<header class="wrap" style="padding:24px 26px">
  <nav aria-label="Main"><a href="/">PopupLoom</a> · <a href="/templates.html">Templates</a> · <a href="/guides/">Guides</a> · <a href="/about.html">About</a> · <a href="/studio.html?tpl=blank">Open the studio</a></nav>
  <nav class="mut" aria-label="Breadcrumb" style="font-size:13px;margin-top:10px"><a href="/">Home</a> › <a href="/templates.html">Templates</a> › <span>${esc(c.label)}</span></nav>
</header>
<main class="wrap" style="padding:30px 26px 80px;max-width:900px">
  <h1>${esc(c.h1)}</h1>
  <p class="mut" style="font-size:13px;margin:6px 0 18px">By <a href="/about.html">Shailu</a>, founder of PopupLoom · Last updated ${LAST_UPDATED}</p>
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

${SECTIONS[categoryKey] ? `<h2>${esc(SECTIONS[categoryKey].h2)}</h2>\n${SECTIONS[categoryKey].paras.map((p) => `<p>${esc(p)}</p>`).join("\n")}\n` : ""}
  <h2>Related guides</h2>
  <ul>
${guides}
  </ul>

  <h2>Common questions</h2>
${faq}

  <p style="margin-top:26px"><a class="btn primary" href="/studio.html?tpl=blank">Start from a blank popup</a> <a class="btn ghost" href="/templates.html">Browse all ${TEMPLATE_COUNT} templates</a></p>
</main>
<footer class="wrap" style="padding:24px 0;font-size:13px">
  <div><a href="/">PopupLoom — free website popup builder</a> · <a href="/templates.html">Templates</a> · <a href="/guides/">Guides</a> · <a href="/free-popup-builder-no-limits.html">No pageview limits</a> · <a href="/about.html">About</a> · <a href="/contact.html">Contact</a> · <a href="/terms.html">Terms</a> · <a href="/privacy.html">Privacy</a></div>
  <div style="margin-top:8px"><a href="/guides/wordpress-popup.html">WordPress</a> · <a href="/guides/shopify-popup.html">Shopify</a> · <a href="/guides/webflow-popup.html">Webflow</a> · <a href="/guides/squarespace-wix-popup.html">Squarespace and Wix</a> · <a href="/free-popup-builder-no-limits.html">No pageview limits</a></div>
</footer>
</body>
</html>
`;
}

/* Gallery sections follow the six journeys the studio and homepage use. */
const JOURNEY_SECTIONS = {
  capture: ["Email signup popup templates", "Collect email signups and waitlist interest with forms and offers."],
  convert: ["Discount and offer popup templates", "Present discounts, product offers and promotions at an appropriate moment."],
  retain: ["Feedback and loyalty popup templates", "Gather visitor feedback and share reasons to return."],
  winback: ["Exit-intent popup templates", "Reach visitors before they leave with desktop exit-intent offers."],
  announce: ["Announcement popup templates", "Share shipping information, product news and other announcements."],
  trust: ["Age gates and trust notices", "Create age gates and configured social-proof notices. Use only truthful activity information."]
};

const DEEP_DIVES = [
  ["/templates/exit-intent-popup.html", "Exit-intent popup template", "a last-chance save for desktop visitors, with the desktop-only rule spelled out."],
  ["/templates/cart-rescue-popup.html", "Cart rescue popup template", "cart-page targeting, checkout exclusions and a mobile companion."],
  ["/templates/discount-popup.html", "Discount popup template", "a 48-hour code layout with a countdown and the claims you must not invent."],
  ["/templates/email-signup-popup.html", "Email signup popup template", "a lead-magnet layout with field and consent notes."],
  ["/templates/back-in-stock-popup.html", "Back-in-stock popup template", "a click-triggered notify-me form and an honest follow-up path."],
  ["/templates/spin-to-win-popup.html", "Spin-to-win popup template", "a gamified entry layout with the rules you have to supply."],
  ["/templates/announcement-bar.html", "Announcement bar template", "one message, one link and a dismiss control that fits a phone."],
  ["/templates/free-shipping-bar.html", "Free shipping bar template", "a static delivery threshold with the cart-reading limit stated."],
  ["/templates/black-friday-popup.html", "Black Friday popup template", "a countdown tied to a real end date, not a resetting timer."],
  ["/templates/age-verification-popup.html", "Age confirmation popup template", "a self-declaration gate with the compliance limits made clear."],
  ["/templates/video-popup.html", "Video popup template", "a click-opened player with autoplay, consent and caption notes."],
  ["/templates/feedback-popup.html", "Feedback popup template", "a one-tap rating that asks one question and stops."],
  ["/templates/referral-popup.html", "Referral popup template", "a shareable code with the reward terms the owner must set."],
  ["/templates/trust-badge-popup.html", "Trust badge popup template", "owner-supplied payment, returns and support facts, nothing invented."],
  ["/templates/giveaway-popup.html", "Giveaway popup template", "an entry form plus the official rules a promotion needs."],
  ["/templates/shipping-notice-popup.html", "Shipping notice template", "a top bar for delays and cut-off dates that comes down on time."]
];

const GALLERY_FAQ = [
  ["Are these popup templates free?", "Yes. Every template is free to preview, edit and install, with no pageview cap and no trial. A free account is only needed to save a popup and get its install code."],
  ["Do I need to code to use a template?", "No. Pick a template, change the words, colours, image and trigger in the studio, then paste a two-line snippet before the closing body tag of your site. WordPress, Shopify, Webflow, Squarespace and Wix each have a short guide."],
  ["Can I change a template completely?", "Yes. A template is only a starting point. You can change every word, the colours, the image, the placement, the trigger, the frequency and which pages and devices it appears on, or start from a blank popup instead."],
  ["Where do the leads from a template go?", "Responses land in your PopupLoom lead inbox, where you can export them as CSV. An optional signed webhook can forward them to another tool. Sending any follow-up email is up to you."],
  ["Are the offers, codes and countdowns in the previews real?", "No. Every preview uses sample copy. Discounts, stock levels, prizes, deadlines and guarantees must be true and honored by the site owner, so replace the sample text with your own before you publish."],
  ["Which template should I start with?", "Start from the job the popup has to do. Use an email signup popup to grow a list, an offer popup to move a visitor to checkout, an exit-intent popup to catch someone leaving on desktop, and an announcement bar for one line of news."]
];

const HOW_TO = [
  ["Pick a template", "Choose the job first (capture an email, make a sale, announce news), then a layout that fits your page."],
  ["Make it yours", "Open it in the studio and replace the sample text, colours and image. Set when it appears and how often."],
  ["Preview on desktop and mobile", "Check both sizes, and test the trigger on a real page before you rely on it."],
  ["Install and measure", "Save the popup, paste the two-line install code before the closing body tag, then read views and leads in your inbox."]
];

function writeGallery(entries) {
  const url = "https://popuploom.com/templates.html";
  const title = "Free Website Popup Templates | PopupLoom";
  const socialTitle = `${TEMPLATE_COUNT} Free Website Popup Templates | PopupLoom`;
  const description = `Browse ${TEMPLATE_COUNT} popup templates for email signup, discounts, announcements, feedback and age verification. Customize a template in the free PopupLoom studio.`;
  const lead = entries.find((t) => t.id === "drop48") || entries[0];
  const byJourney = CATALOG.journeys.map((j) => ({ j, items: entries.filter((t) => t.journey === j.id) })).filter((g) => g.items.length);
  let position = 0;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://popuploom.com/" },
      { "@type": "ListItem", position: 2, name: "Popup templates", item: url }
    ]
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": url + "#collection",
        url,
        name: "PopupLoom popup templates",
        description,
        isPartOf: { "@id": "https://popuploom.com/#website" },
        primaryImageOfPage: media.imageObject(lead),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: entries.length,
          itemListElement: byJourney.flatMap((g) => g.items).map((t) => ({
            "@type": "ListItem",
            position: ++position,
            name: t.name,
            url: `https://popuploom.com/templates/${CATEGORIES[t.category].slug}.html#${t.id}`,
            image: media.imageObject(t)
          }))
        },
        author: { "@type": "Person", name: "Shailu", url: "https://popuploom.com/about.html" }
      },
      {
        "@type": "FAQPage",
        mainEntity: GALLERY_FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } }))
      }
    ]
  };
  let eager = 3;
  const sections = byJourney.map(({ j, items }) => {
    const [h2, intro] = JOURNEY_SECTIONS[j.id] || [j.label + " popup templates", j.blurb];
    return `<section class="tg-section" aria-labelledby="${j.id}">
<div class="tg-head"><h2 id="${j.id}">${esc(h2)}</h2><span class="tg-count">${items.length} template${items.length === 1 ? "" : "s"}</span></div>
<p class="mut">${esc(intro)}</p>
<div class="tg-grid">
${items.map((t) => cardHTML(t, { heading: "h3", lazy: eager-- <= 0, publicHref: `/templates/${CATEGORIES[t.category].slug}.html#${t.id}` })).join("\n")}
</div>
</section>`;
  }).join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:site_name" content="PopupLoom">
<meta property="og:title" content="${esc(socialTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="https://popuploom.com/assets/templates/${lead.id}.jpg">
<meta property="og:image:alt" content="${esc(media.altFor(lead))}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="750">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(socialTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="https://popuploom.com/assets/templates/${lead.id}.jpg">
<link rel="stylesheet" href="/ui.css">${ICONS}
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
</head>
<body>
<header class="wrap" style="padding:24px 26px">
  <nav aria-label="Main"><a href="/">PopupLoom</a> · <a href="/templates.html" aria-current="page">Templates</a> · <a href="/guides/">Guides</a> · <a href="/about.html">About</a> · <a href="/studio.html?tpl=blank">Open the studio</a></nav>
  <nav class="mut" aria-label="Breadcrumb" style="font-size:13px;margin-top:10px"><a href="/">Home</a> › <span>Popup templates</span></nav>
</header>
<main class="wrap tg-page" style="padding:30px 26px 80px">
  <div class="tg-intro">
  <h1>${TEMPLATE_COUNT} free website popup templates</h1>
  <p class="mut" style="font-size:13px;margin:6px 0 18px">By <a href="/about.html">Shailu</a>, founder of PopupLoom · Last updated ${LAST_UPDATED}</p>
  <p>Choose a starting design and customize its content, appearance and trigger. Preview as a guest; sign in to save and get your installation code. Template names describe designs, not guaranteed results.</p>
  <p>Not sure where to start? Read the free playbooks for <a href="/guides/popup-builder-for-ecommerce.html">ecommerce stores</a>, <a href="/guides/popup-builder-for-quick-commerce.html">quick-commerce and grocery delivery</a>, or <a href="/guides/popup-builder-for-lead-generation.html">lead generation</a>.</p>
  <div class="card" style="margin:18px 0;padding:16px 18px;border-color:rgba(255,106,31,.3)"><b>These are editable design examples, not live offers.</b> Any discount, stock level, prize, points balance, email/SMS/PDF delivery, guarantee or security claim must be true, and is supplied and honored by the website owner — not by PopupLoom. Demo social-proof names and times are labeled sample data.</div>
  </div>
  <nav class="tg-jump" aria-label="Template journeys">${byJourney.map(({ j, items }) => `<a href="#${j.id}">${esc(j.label)} <span>${items.length}</span></a>`).join("")}</nav>
  <div class="tg-filter" id="tgFilter" role="group" aria-label="Filter templates by format" hidden>
    <span class="tg-filter-label">Format</span>
    <button type="button" class="tg-chip" data-format="all" aria-pressed="true">All <span>${entries.length}</span></button>
    ${FORMATS.filter(([k]) => entries.some((t) => t.format === k)).map(([k, label]) => `<button type="button" class="tg-chip" data-format="${k}" aria-pressed="false">${esc(label)} <span>${entries.filter((t) => t.format === k).length}</span></button>`).join(" ")}
    <span class="tg-filter-status" id="tgStatus" role="status" aria-live="polite"></span>
  </div>
${sections}
  <section class="tg-scratch" aria-labelledby="scratch">
    <h2 id="scratch">Nothing quite right? Start from a blank popup</h2>
    <p>Every template here is a starting point. If none matches your page, open the studio with an empty popup and build your own layout, copy and trigger.</p>
    <p><a class="btn primary" href="/studio.html?tpl=blank">Start from a blank popup</a></p>
  </section>
  <section aria-labelledby="how" style="margin:52px 0 0">
    <h2 id="how">How to add a popup template to your website</h2>
    <ol class="tg-steps">${HOW_TO.map(([h, p]) => `<li><strong>${esc(h)}.</strong> ${esc(p)}</li>`).join("")}</ol>
  </section>
  <section aria-labelledby="faq" style="margin:44px 0 0">
    <h2 id="faq">Popup template questions</h2>
    ${GALLERY_FAQ.map(([q, a]) => `<details class="card" style="margin:10px 0;padding:16px"><summary><strong>${esc(q)}</strong></summary><p style="margin:10px 0 0">${esc(a)}</p></details>`).join("")}
  </section>
  <section aria-labelledby="browse" style="margin:56px 0 0">
    <h2 id="browse">Browse popup templates by category</h2>
    <p>Start with the job you need the popup to do. Each category page explains when to use it, how to set it up and which template fits.</p>
    <ul style="line-height:2">${NAV.map((c) => `<li><a href="/templates/${c.slug}.html"><strong>${esc(c.label)}</strong></a> — ${esc(c.description.split(". ")[0])}.</li>`).join("")}</ul>
  </section>
  <section aria-labelledby="deep-dives" style="margin:44px 0 0">
    <h2 id="deep-dives">Full guides for ${DEEP_DIVES.length} popular templates</h2>
    <p class="mut" style="font-size:14px">A gallery card shows the design. These guides cover the offer, the copy to adapt, the trigger and frequency to use, and what to measure once it is live.</p>
    <ul>${DEEP_DIVES.map(([href, label, text]) => `<li style="margin:14px 0"><a href="${href}"><strong>${esc(label)}</strong></a> — ${esc(text)}</li>`).join("")}</ul>
  </section>
</main>
<footer class="wrap" style="padding:24px 26px"><a href="/">PopupLoom — free website popup builder</a> · <a href="/guides/">Guides</a> · <a href="/about.html">About</a> · <a href="/contact.html">Contact</a> · <a href="/terms.html">Terms</a> · <a href="/privacy.html">Privacy</a></footer>
<script>
(function () {
  var bar = document.getElementById("tgFilter");
  if (!bar) return;
  bar.hidden = false;
  var chips = bar.querySelectorAll(".tg-chip"), status = document.getElementById("tgStatus");
  function apply(fmt) {
    var shown = 0;
    document.querySelectorAll(".tg-card").forEach(function (c) {
      var on = fmt === "all" || c.getAttribute("data-format") === fmt;
      c.hidden = !on;
      if (on) shown++;
    });
    document.querySelectorAll(".tg-section").forEach(function (sec) {
      sec.hidden = !sec.querySelector(".tg-card:not([hidden])");
    });
    chips.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-format") === fmt ? "true" : "false"); });
    status.textContent = fmt === "all" ? "" : "Showing " + shown + " template" + (shown === 1 ? "" : "s");
  }
  chips.forEach(function (b) { b.addEventListener("click", function () { apply(b.getAttribute("data-format")); }); });
})();
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(root, "templates.html"), html);
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
writeGallery(entries);
updateSitemap();
// Detail pages are hand-maintained HTML; give each its template preview,
// social image and Article image without touching the copy.
for (const file of media.detailPages()) media.applyToDetailPage(file, CATALOG);
console.log("Wrote " + ORDER.length + " template category pages, the " + entries.length + "-card gallery and " + media.detailPages().length + " detail page previews; updated sitemap.");
