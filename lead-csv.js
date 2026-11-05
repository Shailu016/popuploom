/* Shared lead CSV formatting for the lead inbox and the workspace export.
   Browser global: window.LeadCsv. Node (tests): require("./lead-csv"). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LeadCsv = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function value(v) {
    return v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  }

  // Spreadsheet programs treat these prefixes as formulas. Prefix with an
  // apostrophe so exported lead text can never execute in Excel or Sheets.
  function cell(v) {
    var s = value(v);
    if (/^[\s]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function fields(rows) {
    return Array.from(new Set(rows.flatMap(function (r) { return Object.keys(r.data || {}); })));
  }

  function rowText(values) {
    return values.map(cell).join(",");
  }

  function baseHeader(keys) {
    return ["Lead ID", "Submitted at (UTC)"].concat(keys.map(function (k) { return "Field: " + k; }));
  }

  // Single-popup inbox export: Lead ID, submitted time, then one column per
  // captured field. Field names are the union across every exported row.
  function csv(rows) {
    var keys = fields(rows);
    return "\uFEFF" + [rowText(baseHeader(keys))]
      .concat(rows.map(function (r) {
        return rowText([r.id, r.createdAt].concat(keys.map(function (k) { return (r.data || {})[k]; })));
      }))
      .join("\r\n") + "\r\n";
  }

  // Workspace export across popups: adds the popup name and id so a combined
  // file still says where each lead came from.
  function csvWithPopup(rows) {
    var keys = fields(rows);
    var header = ["Popup", "Popup ID"].concat(baseHeader(keys));
    return "\uFEFF" + [rowText(header)]
      .concat(rows.map(function (r) {
        return rowText([r.widgetName, r.widgetId, r.id, r.createdAt]
          .concat(keys.map(function (k) { return (r.data || {})[k]; })));
      }))
      .join("\r\n") + "\r\n";
  }

  return { value: value, cell: cell, fields: fields, csv: csv, csvWithPopup: csvWithPopup };
});
