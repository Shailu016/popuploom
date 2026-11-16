/* tools/popup-copy-generator.js — deterministic copy matrix.
   No network calls, no storage, no conversion claims. */
(function () {
  "use strict";

  var form = document.getElementById("cg-form");
  if (!form) return;

  var INDUSTRIES = {
    ecommerce: { noun: "order", topic: "product page" },
    saas: { noun: "workspace", topic: "onboarding" },
    local: { noun: "first visit", topic: "first visit" },
    creator: { noun: "newsletter", topic: "newsletter" },
    quick: { noun: "next order", topic: "delivery" }
  };

  var COPY = {
    discount: {
      direct: {
        badge: "FIRST ORDER",
        headline: "Take [X]% off your first {noun}",
        sub: "Enter your email and we will send the code.",
        cta: "Send my code",
        disc: "One use per customer. Code expires [DATE]."
      },
      urgent: {
        badge: "ENDS [DATE]",
        headline: "[X]% off ends at midnight",
        sub: "The code stops working when the date changes, not when you get around to it.",
        cta: "Get the code now",
        disc: "One use per customer. Expires [DATE]. No extensions."
      },
      friendly: {
        badge: "A SMALL THANK YOU",
        headline: "Here is [X]% off, if you would like it",
        sub: "No pressure. We will email the code and you can use it whenever.",
        cta: "Email me the code",
        disc: "One use per customer. Unsubscribe any time."
      }
    },
    cart: {
      direct: {
        badge: "YOUR CART",
        headline: "Your {noun} is still waiting",
        sub: "Pick up where you left off, or take [X]% off if that helps.",
        cta: "Return to cart",
        disc: "Discount applies to this cart only."
      },
      urgent: {
        badge: "CART NOT HELD",
        headline: "Your cart will not be held forever",
        sub: "We can keep it a little longer, but stock is not reserved until checkout.",
        cta: "Keep my cart",
        disc: "Stock is only reserved after payment."
      },
      friendly: {
        badge: "NO RUSH",
        headline: "Still thinking it over?",
        sub: "Your cart is saved. Here is [X]% off if you want a nudge.",
        cta: "Back to my cart",
        disc: "One use per customer."
      }
    },
    lead: {
      direct: {
        badge: "FREE RESOURCE",
        headline: "Get the {topic} checklist",
        sub: "One email, one file, no sequence unless you ask.",
        cta: "Send the guide",
        disc: "We will email the file once. Unsubscribe any time."
      },
      urgent: {
        badge: "BEFORE YOU GO",
        headline: "Take the {topic} checklist with you",
        sub: "One email and the file is yours. No follow-up sequence.",
        cta: "Download now",
        disc: "One email. No resale."
      },
      friendly: {
        badge: "A HELPFUL EXTRA",
        headline: "Want the short version of {topic}?",
        sub: "We put the steps on one page you can keep.",
        cta: "Yes, send it",
        disc: "One email. Unsubscribe any time."
      }
    },
    waitlist: {
      direct: {
        badge: "EARLY ACCESS",
        headline: "Join the {topic} waitlist",
        sub: "We will email you when it opens. No date promised.",
        cta: "Join the list",
        disc: "No launch date guaranteed."
      },
      urgent: {
        badge: "FIRST GROUP",
        headline: "First access closes [DATE]",
        sub: "The first group stays small, so the list is capped.",
        cta: "Save my place",
        disc: "Capacity is limited, not timed."
      },
      friendly: {
        badge: "STAY IN TOUCH",
        headline: "Want a note when it is ready?",
        sub: "One email when there is something real to share.",
        cta: "Keep me posted",
        disc: "No daily updates."
      }
    }
  };

  var TONES = {
    direct: "Direct",
    urgent: "Urgent",
    friendly: "Friendly"
  };
  var GOALS = {
    discount: "First-order discount",
    cart: "Cart recovery",
    lead: "Lead magnet",
    waitlist: "Waitlist"
  };

  function fill(text, industry) {
    return String(text)
      .replace(/\{noun\}/g, industry.noun)
      .replace(/\{topic\}/g, industry.topic);
  }

  function card(goal, tone, industryKey) {
    var industry = INDUSTRIES[industryKey] || INDUSTRIES.ecommerce;
    var src = COPY[goal][tone];
    var data = {
      badge: src.badge,
      headline: fill(src.headline, industry),
      sub: fill(src.sub, industry),
      cta: src.cta,
      disc: fill(src.disc, industry),
      meta: GOALS[goal] + " · " + TONES[tone] + " · " + industryKey
    };

    var article = document.createElement("article");
    article.className = "cg-card";

    var badge = document.createElement("span");
    badge.className = "cg-badge";
    badge.textContent = data.badge;

    var h = document.createElement("h3");
    h.textContent = data.headline;

    var sub = document.createElement("p");
    sub.className = "cg-sub";
    sub.textContent = data.sub;

    var cta = document.createElement("span");
    cta.className = "cg-cta";
    cta.textContent = data.cta;

    var disc = document.createElement("p");
    disc.className = "cg-disc";
    disc.textContent = data.disc;

    var foot = document.createElement("div");
    foot.className = "cg-foot";

    var copy = document.createElement("button");
    copy.type = "button";
    copy.className = "cg-btn";
    copy.textContent = "Copy text";
    copy.addEventListener("click", function () {
      var text = [
        "Badge: " + data.badge,
        "Headline: " + data.headline,
        "Subheadline: " + data.sub,
        "Button: " + data.cta,
        "Disclaimer: " + data.disc
      ].join("\n");
      copyText(text, copy);
    });

    var studio = document.createElement("a");
    studio.className = "cg-btn";
    studio.href = "/studio.html?tpl=blank";
    studio.textContent = "Open in studio";

    foot.appendChild(copy);
    foot.appendChild(studio);

    article.appendChild(badge);
    article.appendChild(h);
    article.appendChild(sub);
    article.appendChild(cta);
    article.appendChild(disc);
    article.appendChild(foot);
    return article;
  }

  function copyText(text, button) {
    var status = document.getElementById("cg-status");
    function done() {
      status.textContent = "Copied. Replace [X], [DATE] and [CODE] before publishing.";
      var old = button.textContent;
      button.textContent = "Copied";
      setTimeout(function () { button.textContent = old; }, 1500);
      setTimeout(function () { status.textContent = ""; }, 4200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "readonly");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); }
      catch (e) { status.textContent = "Copy failed. Select the card text and copy it manually."; }
      document.body.removeChild(ta);
    }
  }

  function render() {
    var industry = document.getElementById("cg-industry").value;
    var goal = document.getElementById("cg-goal").value;
    var tone = document.getElementById("cg-tone").value;
    var results = document.getElementById("cg-results");
    results.textContent = "";

    // Twelve sets: the selected goal in every tone, plus the other three goals
    // in the selected tone, so the grid always mixes across both axes.
    var tones = ["direct", "urgent", "friendly"];
    var goals = Object.keys(GOALS);

    for (var i = 0; i < tones.length; i += 1) {
      results.appendChild(card(goal, tones[i], industry));
    }
    for (var j = 0; j < goals.length; j += 1) {
      if (goals[j] === goal) continue;
      for (var k = 0; k < 3; k += 1) {
        results.appendChild(card(goals[j], tone, industry));
      }
    }

    document.getElementById("cg-status").textContent =
      "12 sets for " + GOALS[goal].toLowerCase() + " in a " + TONES[tone].toLowerCase() + " tone. Placeholders are not filled in.";
  }

  document.getElementById("cg-build").addEventListener("click", render);
  document.getElementById("cg-reset").addEventListener("click", function () {
    document.getElementById("cg-industry").value = "ecommerce";
    document.getElementById("cg-goal").value = "discount";
    document.getElementById("cg-tone").value = "direct";
    render();
  });

  render();
})();
