/* tools/roi-calculator.js — client-side popup ROI arithmetic.
   No network calls, no storage. Every output is derived from the visible
   inputs so the page stays honest about what it does and does not model. */
(function () {
  "use strict";

  var form = document.getElementById("roi-form");
  if (!form) return;

  var PRESETS = {
    "optinmonster-basic": { amount: 2500, unit: "impressions" },
    "optinmonster-trial": { amount: 500, unit: "impressions" },
    "poptin-free": { amount: 1000, unit: "visitors" },
    "popupsmart-free": { amount: 5000, unit: "pageviews" },
    "optimonk-free": { amount: 10000, unit: "pageviews" }
  };

  function el(id) {
    return document.getElementById(id);
  }

  function value(id) {
    var parsed = parseFloat(el(id).value);
    return isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  function count(number) {
    if (!isFinite(number)) return "\u2014";
    if (number > 0 && number < 10) {
      return number.toLocaleString("en-US", { maximumFractionDigits: 1 });
    }
    return Math.round(number).toLocaleString("en-US");
  }

  function decimal(number) {
    if (!isFinite(number)) return "\u2014";
    return number.toLocaleString("en-US", { maximumFractionDigits: 1 });
  }

  function money(number, digits) {
    if (!isFinite(number)) return "\u2014";
    return "$" + number.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function percent(number) {
    if (!isFinite(number)) return "\u2014";
    return number.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + "%";
  }

  function set(id, text) {
    el(id).textContent = text;
  }

  function updateCapFields() {
    var preset = el("cap-preset").value;
    var amount = el("cap-amount");
    var unit = el("cap-unit");
    if (preset === "custom") {
      amount.disabled = false;
      unit.disabled = false;
      return;
    }
    amount.disabled = true;
    unit.disabled = true;
    if (preset === "none") {
      amount.value = "0";
      unit.value = "impressions";
      return;
    }
    if (PRESETS[preset]) {
      amount.value = String(PRESETS[preset].amount);
      unit.value = PRESETS[preset].unit;
    }
  }

  function recalculate() {
    var visitors = value("monthly-visitors");
    var displaysPerVisitor = value("displays-per-visitor");
    var pageviewsPerVisitor = value("pageviews-per-visitor");
    var rate = Math.min(100, value("conversion-rate"));
    var valuePerLead = value("value-per-lead");
    var toolCost = value("tool-cost");

    var displays = visitors * displaysPerVisitor;
    var signups = displays * rate / 100;
    var valueMonth = signups * valuePerLead;
    var valueYear = valueMonth * 12;
    var netYear = valueYear - (toolCost * 12);
    var breakEvenRate = displays > 0 && valuePerLead > 0
      ? (toolCost / (displays * valuePerLead)) * 100
      : (toolCost === 0 ? 0 : null);
    var breakEvenValue = signups > 0
      ? toolCost / signups
      : (toolCost === 0 ? 0 : null);
    var multiple = toolCost > 0 ? valueMonth / toolCost : null;

    set("r-displays", count(displays));
    set("r-signups-month", count(signups));
    set("r-signups-year", count(signups * 12));
    set("r-value-month", money(valueMonth, 0));
    set("r-value-year", money(valueYear, 0));
    set("r-net-year", money(netYear, 0));
    set("r-breakeven-rate", breakEvenRate === null ? "\u2014" : percent(breakEvenRate));
    set("r-breakeven-value", breakEvenValue === null ? "\u2014" : money(breakEvenValue, 2));
    set("r-roi", multiple === null ? "\u2014" : multiple.toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }) + "\u00d7");

    var preset = el("cap-preset").value;
    var cap = value("cap-amount");
    var unit = el("cap-unit").value;
    var usage;
    var unitLabel;
    if (unit === "visitors") {
      usage = visitors;
      unitLabel = "visitors";
    } else if (unit === "pageviews") {
      usage = visitors * pageviewsPerVisitor;
      unitLabel = "pageviews";
    } else {
      usage = displays;
      unitLabel = "impressions";
    }

    var status = el("r-cap-status");
    var detail = el("r-cap-detail");
    status.className = "roi-cap-status";

    if (preset === "none" || cap <= 0) {
      status.classList.add("is-ok");
      status.textContent = "No cap selected. This run only compares estimated value with tool cost.";
      detail.textContent = "Choose a preset or a custom cap to see how quickly the allowance would be consumed.";
    } else {
      var used = (usage / cap) * 100;
      var days = usage > 0 ? (cap / usage) * 30 : null;
      var note;
      if (usage > cap) {
        status.classList.add("is-over");
        note = "Over the cap at this pace.";
      } else if (used >= 80) {
        status.classList.add("is-warn");
        note = "Close to the cap at this pace.";
      } else {
        status.classList.add("is-ok");
        note = "Within the cap at this pace.";
      }
      status.textContent = note;
      detail.textContent = "Estimated usage: " + count(usage) + " " + unitLabel +
        " against a " + count(cap) + " " + unitLabel + " allowance (" + percent(used) + ")." +
        (days === null ? "" : " At a steady pace, the allowance is reached in about " +
          (days < 1 ? "less than 1" : Math.round(days)) + " days.") +
        (preset === "optinmonster-trial"
          ? " This preset is a one-time trial credit, not a monthly allowance."
          : "");
    }

    set("r-assumption", "Assumptions: " + count(visitors) + " visitors, " +
      decimal(displaysPerVisitor) + " display(s) per visitor, " + percent(rate) +
      " submit rate, " + money(valuePerLead, 2) + " per signup, " +
      money(toolCost, 2) + "/month tool cost and " + decimal(pageviewsPerVisitor) +
      " pageviews per visitor. Change any field to recalculate.");
  }

  form.addEventListener("input", recalculate);
  form.addEventListener("change", function (event) {
    if (event.target && event.target.id === "cap-preset") updateCapFields();
    recalculate();
  });

  var reset = document.getElementById("roi-reset");
  if (reset) {
    reset.addEventListener("click", function () {
      var defaults = form.querySelectorAll("[data-default]");
      for (var i = 0; i < defaults.length; i += 1) {
        defaults[i].value = defaults[i].getAttribute("data-default");
      }
      el("cap-preset").value = "optinmonster-basic";
      updateCapFields();
      recalculate();
      el("monthly-visitors").focus();
    });
  }

  updateCapFields();
  recalculate();
})();
