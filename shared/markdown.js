// shared/markdown.js — conservative HTML-to-Markdown conversion for content pages.
// Used only when a client sends `Accept: text/markdown`. It intentionally handles
// the markup this site actually emits (headings, paragraphs, lists, links, code,
// tables, images) and strips everything else. It is not a general-purpose
// browser-grade converter.
"use strict";

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "\u2014", ndash: "\u2013", hellip: "\u2026",
  lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201c", rdquo: "\u201d",
  copy: "\u00a9", reg: "\u00ae", trade: "\u2122", times: "\u00d7"
};

function decodeEntities(value) {
  return String(value).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const code = entity[1] && entity[1].toLowerCase() === "x"
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, entity.toLowerCase())
      ? ENTITIES[entity.toLowerCase()]
      : match;
  });
}

function absolute(href, base) {
  try { return new URL(decodeEntities(href), base).href; } catch (e) { return decodeEntities(href); }
}

function stripTags(value) {
  return decodeEntities(String(value).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function inline(value, base) {
  let text = String(value);
  text = text.replace(/<a\b[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, href, label) => {
    const clean = stripTags(label);
    const url = absolute(href, base);
    return clean ? "[" + clean + "](" + url + ")" : url;
  });
  text = text.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (m, tag, body) => "**" + stripTags(body) + "**");
  text = text.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (m, tag, body) => "*" + stripTags(body) + "*");
  text = text.replace(/<img\b[^>]*alt\s*=\s*["']([^"']*)["'][^>]*src\s*=\s*["']([^"']*)["'][^>]*>/gi, (m, alt, src) => "![" + decodeEntities(alt) + "](" + absolute(src, base) + ")");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<[^>]*>/g, " ");
  text = decodeEntities(text).replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
  return text;
}

function tableToMarkdown(table, base) {
  const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row =>
    [...row[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(cell => inline(cell[1], base) || " ")
  ).filter(row => row.length);
  if (!rows.length) return "";
  const width = Math.max(...rows.map(row => row.length));
  const padded = rows.map(row => row.concat(Array(width - row.length).fill(" ")));
  return [padded[0], Array(width).fill("---"), ...padded.slice(1)].map(row => "| " + row.join(" | ") + " |").join("\n");
}

function fromHtml(html, options) {
  const base = (options && options.url) || "https://popuploom.com/";
  const source = String(html || "");
  const titleMatch = source.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descriptionMatch = source.match(/<meta\b[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i)
    || source.match(/<meta\b[^>]*content\s*=\s*["']([^"']*)["'][^>]*name\s*=\s*["']description["'][^>]*>/i);
  const imageMatch = source.match(/<meta\b[^>]*property\s*=\s*["']og:image["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i);

  let body = source
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<head\b[\s\S]*?<\/head>/gi, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const main = body.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (main) body = main[1];
  body = body
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, "")
    .replace(/<header\b[\s\S]*?<\/header>/gi, "")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, "")
    .replace(/<form\b[\s\S]*?<\/form>/gi, "");

  const blocks = [];
  const protect = (markdown) => {
    const token = "\u0000BLOCK" + blocks.length + "\u0000";
    blocks.push(markdown);
    return token;
  };
  const codes = [];
  body = body.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (m, inner) => {
    const token = "\u0002CODE" + codes.length + "\u0002";
    codes.push(stripTags(inner));
    return token;
  });

  body = body.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (m, inner) => {
    const code = decodeEntities(inner.replace(/<[^>]*>/g, "")).replace(/\n+$/, "");
    return protect("```\n" + code + "\n```");
  });
  body = body.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (m, inner) => protect(tableToMarkdown(inner, base)));

  body = body
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (m, level, content) => "\n\n" + "#".repeat(Number(level)) + " " + inline(content, base) + "\n\n")
    .replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (m, content) => "\n\n> " + inline(content, base).replace(/\n/g, "\n> ") + "\n\n")
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (m, content) => "\n- " + inline(content, base))
    .replace(/<\/(ul|ol)>/gi, "\n\n")
    .replace(/<hr\b[^>]*>/gi, "\n\n---\n\n")
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (m, content) => "\n\n" + inline(content, base) + "\n\n")
    .replace(/<div\b[^>]*>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");

  body = inline(body, base);
  body = body.replace(/\u0000BLOCK(\d+)\u0000/g, (m, index) => "\n\n" + blocks[Number(index)] + "\n\n");
  body = body.replace(/\u0002CODE(\d+)\u0002/g, (m, index) => "`" + codes[Number(index)] + "`");
  body = body.replace(/\n\n- /g, "\n- ");
  body = body.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  const front = [];
  if (titleMatch) front.push("title: " + stripTags(titleMatch[1]));
  if (descriptionMatch) front.push("description: " + decodeEntities(descriptionMatch[1]).trim());
  if (imageMatch) front.push("image: " + absolute(imageMatch[1], base));
  return (front.length ? "---\n" + front.join("\n") + "\n---\n\n" : "") + body + "\n";
}

module.exports = { fromHtml, decodeEntities };
