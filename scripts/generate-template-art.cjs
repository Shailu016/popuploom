/* Original PopupLoom template artwork, second edition (2026-11-18).
   Replaces the flat product illustrations on the template catalog with
   abstract editorial compositions: soft gradient light, fine geometry and film
   grain. No objects, no stock media, no third-party material, so each piece
   suits any brand that adopts the template.

   Output: assets/source/art/<name>.svg (authored source) and
           assets/art/<name>.jpg (1200x750, 16:10, rendered with Sharp).
   The first-edition files in assets/*.jpg stay in place because saved
   customer popups may still reference them.

   Run: node scripts/generate-template-art.cjs */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "assets", "source", "art");
const outDir = path.join(root, "assets", "art");
fs.mkdirSync(srcDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const W = 1200, H = 750;

/* Each blob is a blurred ellipse of colour; together they form the light field. */
function blobs(list) {
  return list.map(([x, y, rx, ry, color, op]) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${color}" opacity="${op}"/>`).join("");
}

const motifs = {
  /* Concentric hairline rings, slightly off centre: time, precision. */
  rings: (c) => {
    let out = "";
    for (let i = 0; i < 9; i++) {
      const r = 70 + i * 46;
      out += `<circle cx="${c.cx || 820}" cy="${c.cy || 390}" r="${r}" fill="none" stroke="${c.line}" stroke-opacity="${(0.34 - i * 0.032).toFixed(3)}" stroke-width="${i === 2 ? 2.2 : 1.1}"/>`;
    }
    out += `<circle cx="${c.cx || 820}" cy="${c.cy || 390}" r="6" fill="${c.line}" fill-opacity=".9"/>`;
    out += `<path d="M${(c.cx || 820)} ${(c.cy || 390)} L${(c.cx || 820) + 150} ${(c.cy || 390) - 210}" stroke="${c.line}" stroke-opacity=".55" stroke-width="1.6"/>`;
    return out;
  },
  /* Two overlapping frosted panes with a specular edge: technology, audio. */
  glass: (c) => `
    <g transform="rotate(-12 700 380)">
      <rect x="520" y="150" width="420" height="470" rx="44" fill="url(#pane)" stroke="${c.line}" stroke-opacity=".38" stroke-width="1.4"/>
      <rect x="520" y="150" width="420" height="470" rx="44" fill="none" stroke="url(#edge)" stroke-width="2"/>
    </g>
    <g transform="rotate(8 760 420)">
      <rect x="640" y="250" width="360" height="400" rx="40" fill="url(#pane)" stroke="${c.line}" stroke-opacity=".28" stroke-width="1.2"/>
    </g>`,
  /* A tall arch with a light gradient: fashion, beauty, editorial calm. */
  arch: (c) => `
    <path d="M610 760 V360 A190 190 0 0 1 990 360 V760 Z" fill="url(#archfill)"/>
    <path d="M610 760 V360 A190 190 0 0 1 990 360 V760" fill="none" stroke="${c.line}" stroke-opacity=".45" stroke-width="1.4"/>
    <path d="M560 760 V340 A240 240 0 0 1 1040 340 V760" fill="none" stroke="${c.line}" stroke-opacity=".18" stroke-width="1.1"/>
    <line x1="0" y1="640" x2="${W}" y2="640" stroke="${c.line}" stroke-opacity=".16" stroke-width="1.1"/>`,
  /* A single lit sphere with a soft shadow: launches, prizes, exclusivity. */
  orb: (c) => `
    <ellipse cx="${c.cx || 780}" cy="${(c.cy || 380) + 250}" rx="230" ry="26" fill="#000" opacity="${c.shadow || 0.35}" filter="url(#soft)"/>
    <circle cx="${c.cx || 780}" cy="${c.cy || 380}" r="200" fill="url(#orbfill)"/>
    <circle cx="${c.cx || 780}" cy="${c.cy || 380}" r="200" fill="none" stroke="${c.line}" stroke-opacity=".3" stroke-width="1.2"/>
    <ellipse cx="${(c.cx || 780) - 70}" cy="${(c.cy || 380) - 90}" rx="70" ry="44" fill="#fff" opacity=".22" filter="url(#soft)"/>`,
  /* Diagonal light beams: sales events, urgency without shouting. */
  beam: (c) => {
    let out = "";
    for (let i = 0; i < 7; i++) {
      const x = 420 + i * 120;
      out += `<path d="M${x} -40 L${x + 70} -40 L${x - 260} ${H + 40} L${x - 330} ${H + 40} Z" fill="${c.line}" opacity="${(0.05 + (i % 3) * 0.035).toFixed(3)}"/>`;
    }
    out += `<line x1="${W - 520}" y1="-20" x2="${W - 900}" y2="${H + 20}" stroke="${c.line}" stroke-opacity=".5" stroke-width="1.4"/>`;
    return out;
  },
  /* Horizon with a low sun: hospitality, mornings, seasons. */
  horizon: (c) => `
    <circle cx="${c.cx || 800}" cy="455" r="150" fill="url(#sun)"/>
    <rect x="0" y="455" width="${W}" height="${H - 455}" fill="url(#ground)"/>
    <line x1="0" y1="455" x2="${W}" y2="455" stroke="${c.line}" stroke-opacity=".4" stroke-width="1.2"/>
    ${[0, 1, 2, 3].map((i) => `<line x1="0" y1="${490 + i * i * 22}" x2="${W}" y2="${490 + i * i * 22}" stroke="${c.line}" stroke-opacity="${(0.16 - i * 0.03).toFixed(2)}" stroke-width="1"/>`).join("")}`,
  /* Layered flowing ribbons: calm, premium, works for campaigns and guides. */
  waves: (c) => {
    let out = "";
    for (let i = 0; i < 6; i++) {
      const y = 330 + i * 62, a = 26 + (i % 2) * 18, k = 0.5 + i * 0.07;
      out += `<path d="M-20 ${y} C 220 ${y - a * 4}, 420 ${y + a * 3}, 640 ${y - a * k} S 1000 ${y + a * 3}, 1240 ${y - a}" fill="none" stroke="${c.line}" stroke-opacity="${(0.5 - i * 0.07).toFixed(2)}" stroke-width="${i === 1 ? 2.2 : 1.2}"/>`;
      out += `<path d="M-20 ${y} C 220 ${y - a * 4}, 420 ${y + a * 3}, 640 ${y - a * k} S 1000 ${y + a * 3}, 1240 ${y - a} V 800 H -20 Z" fill="${c.glow}" opacity="${(0.1 - i * 0.012).toFixed(3)}"/>`;
    }
    return out;
  },
  /* A receding perspective grid: digital events. */
  grid: (c) => {
    let out = "";
    const vx = 760, vy = 300;
    for (let i = -10; i <= 10; i++) out += `<line x1="${vx}" y1="${vy}" x2="${vx + i * 150}" y2="${H + 10}" stroke="${c.line}" stroke-opacity=".22" stroke-width="1"/>`;
    for (let j = 1; j < 9; j++) {
      const y = vy + Math.pow(j / 8, 2.1) * (H - vy + 10);
      out += `<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="${c.line}" stroke-opacity="${(0.08 + j * 0.022).toFixed(3)}" stroke-width="1"/>`;
    }
    out += `<rect x="0" y="0" width="${W}" height="${vy + 40}" fill="url(#fadeTop)"/>`;
    return out;
  }
};

function piece(name, title, desc, p) {
  const motif = motifs[p.motif](p);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">
<title>${title}</title>
<desc>Original PopupLoom abstract artwork authored for this project on 2026-11-18. ${desc}</desc>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/></linearGradient>
  <filter id="blur" filterUnits="userSpaceOnUse" x="-400" y="-400" width="${W + 800}" height="${H + 800}"><feGaussianBlur stdDeviation="90"/></filter>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  <linearGradient id="pane" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${p.dark ? 0.14 : 0.55}"/><stop offset="1" stop-color="#fff" stop-opacity="${p.dark ? 0.02 : 0.12}"/></linearGradient>
  <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.line}" stop-opacity=".9"/><stop offset=".35" stop-color="${p.line}" stop-opacity="0"/></linearGradient>
  <linearGradient id="archfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.glow}" stop-opacity=".55"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></linearGradient>
  <radialGradient id="orbfill" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${p.orb ? p.orb[0] : p.glow}"/><stop offset=".55" stop-color="${p.orb ? p.orb[1] : p.glow}"/><stop offset="1" stop-color="${p.orb ? p.orb[2] : p.bg[1]}"/></radialGradient>
  <radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${p.glow}" stop-opacity=".95"/><stop offset=".7" stop-color="${p.glow}" stop-opacity=".35"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg[1]}" stop-opacity=".9"/><stop offset="1" stop-color="${p.bg[1]}"/></linearGradient>
  <linearGradient id="fadeTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset=".85" stop-color="${p.bg[0]}" stop-opacity=".0"/></linearGradient>
  <radialGradient id="vig" cx="55%" cy="45%" r="80%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${p.dark ? 0.45 : 0.12}"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<g filter="url(#blur)">${blobs(p.blobs)}</g>
${motif}
<rect width="${W}" height="${H}" fill="url(#vig)"/>
<rect width="${W}" height="${H}" filter="url(#grain)" opacity="${p.dark ? 0.075 : 0.06}" style="mix-blend-mode:overlay"/>
</svg>`;
}

const art = {
  "ember-rings": ["Ember rings", "Concentric hairline rings over an ember glow on near-black.",
    { motif: "rings", dark: true, bg: ["#0A0B0F", "#170C08"], line: "#FFB08A", glow: "#FF6B4A",
      blobs: [[860, 330, 360, 300, "#FF6B4A", 0.55], [1080, 120, 260, 220, "#FFA65C", 0.35]] }],
  "sage-paper": ["Sage paper", "A soft arch of sage light on warm paper.",
    { motif: "arch", bg: ["#FBFAF6", "#EEF1E8"], line: "#5D7A5F", glow: "#B9D3B2",
      blobs: [[840, 300, 340, 280, "#CFE3C8", 0.85], [260, 160, 280, 200, "#F6EAD8", 0.9], [1050, 620, 260, 200, "#DCE8D3", 0.7]] }],
  "cobalt-glass": ["Cobalt glass", "Two frosted panes over cobalt light.",
    { motif: "glass", bg: ["#EEF3FF", "#DCE6FB"], line: "#3B6FE0", glow: "#3B82F6",
      blobs: [[820, 360, 360, 300, "#7FA8FF", 0.8], [1080, 120, 260, 200, "#B9CCFF", 0.8], [240, 620, 300, 200, "#C7D6FA", 0.7]] }],
  "mint-glass": ["Mint glass", "Two frosted panes with a mint rim light on ink.",
    { motif: "glass", dark: true, bg: ["#070B0E", "#0B1A17"], line: "#7FF5CC", glow: "#35F0B0",
      blobs: [[860, 380, 340, 280, "#1C8C6A", 0.75], [1060, 140, 240, 200, "#35F0B0", 0.3]] }],
  "linen-arch": ["Linen arch", "A neutral arch of indigo-tinted light on linen tones.",
    { motif: "arch", bg: ["#F7F4EE", "#E9E4DA"], line: "#5B5FC7", glow: "#B7B9F2",
      blobs: [[820, 300, 340, 280, "#D4D5F7", 0.85], [240, 200, 300, 220, "#F2E8D9", 0.9], [1060, 640, 240, 180, "#DCD8EC", 0.7]] }],
  "violet-orb": ["Violet orb", "A lit violet sphere on deep aubergine.",
    { motif: "orb", dark: true, bg: ["#100B19", "#1D1030"], line: "#D9C2FF", glow: "#C9A0FF", orb: ["#E7D6FF", "#8A5CD6", "#1D1030"],
      blobs: [[780, 380, 380, 300, "#6B3FB8", 0.5], [1080, 120, 220, 180, "#C9A0FF", 0.25]] }],
  "amber-arch": ["Amber arch", "An amber arch of light on warm ivory.",
    { motif: "arch", bg: ["#FFFBF4", "#F1E4D2"], line: "#9A6A43", glow: "#E2B98F",
      blobs: [[830, 300, 340, 280, "#EED1AF", 0.9], [240, 180, 280, 200, "#FBF0E1", 0.9], [1050, 640, 260, 200, "#E9D5BD", 0.7]] }],
  "morning-horizon": ["Morning horizon", "A low sun over a quiet horizon in café tones.",
    { motif: "horizon", bg: ["#FFF9F0", "#EBD9C2"], line: "#A86A33", glow: "#F0B475",
      blobs: [[800, 380, 360, 260, "#F6D2A6", 0.85], [220, 160, 300, 200, "#FFF1DF", 0.9]] }],
  "gold-orb": ["Gold orb", "A lit gold sphere on midnight navy.",
    { motif: "orb", dark: true, bg: ["#0A0F1C", "#121A2E"], line: "#FFD58A", glow: "#F59E0B", orb: ["#FFE7B0", "#D98A0B", "#2A1A06"],
      blobs: [[780, 380, 380, 300, "#8A5A08", 0.5], [1080, 110, 220, 180, "#F59E0B", 0.22]] }],
  "rose-waves": ["Rose waves", "Layered rose ribbons on soft blush.",
    { motif: "waves", bg: ["#FFF6F6", "#F8DCE0"], line: "#B33A55", glow: "#E58AA0",
      blobs: [[860, 300, 360, 260, "#F6B8C6", 0.85], [220, 160, 300, 200, "#FFEAEA", 0.9], [1050, 620, 240, 180, "#F3C9D2", 0.7]] }],
  "dusk-orb": ["Dusk orb", "A lit amber moon on deep aubergine.",
    { motif: "orb", dark: true, bg: ["#0E0A14", "#1E1030"], line: "#FFC58A", glow: "#FF8A3D", orb: ["#FFE0B8", "#F2852E", "#2A1208"], cx: 800,
      blobs: [[800, 380, 380, 300, "#7A3A12", 0.5], [1060, 120, 220, 180, "#8B4FD6", 0.22]] }],
  "harvest-horizon": ["Harvest horizon", "A low amber sun over a quiet field in harvest tones.",
    { motif: "horizon", bg: ["#FFF7EA", "#EBCFA6"], line: "#9A5A1E", glow: "#E8A24E",
      blobs: [[800, 380, 380, 270, "#F3C98C", 0.9], [220, 160, 300, 200, "#FFF0D8", 0.9]] }],
  "lagoon-waves": ["Lagoon waves", "Layered aqua ribbons on a bright morning sky.",
    { motif: "waves", bg: ["#F2FCFF", "#CFEFF6"], line: "#0E7C93", glow: "#38B8D0",
      blobs: [[860, 320, 360, 260, "#9EE0EE", 0.85], [1060, 120, 240, 180, "#FFF2B8", 0.8], [220, 600, 300, 200, "#D8F4FA", 0.7]] }],
  "ink-arch": ["Ink arch", "A navy arch of light on warm paper.",
    { motif: "arch", bg: ["#F6F5F1", "#E6E4DC"], line: "#1F3A6B", glow: "#9DB4E0",
      blobs: [[830, 300, 340, 280, "#C9D6F0", 0.85], [240, 180, 280, 200, "#F4EBDA", 0.9], [1050, 640, 240, 180, "#D9DCE6", 0.7]] }],
  "teal-glass": ["Teal glass", "Two frosted panes over teal light.",
    { motif: "glass", bg: ["#EEFAF8", "#CDEBE6"], line: "#0F8A7A", glow: "#3DBBA8",
      blobs: [[820, 360, 360, 300, "#8FDACB", 0.8], [1080, 120, 260, 200, "#C9F0E8", 0.8], [240, 620, 300, 200, "#D3EEE9", 0.7]] }],
  "coral-orb": ["Coral orb", "A lit coral sphere on warm near-black.",
    { motif: "orb", dark: true, bg: ["#0E0A0C", "#1E0E0E"], line: "#FFB3A8", glow: "#FF4D3D", orb: ["#FFD2C8", "#E2483A", "#2A0C0A"], cx: 760,
      blobs: [[760, 380, 380, 300, "#8F2218", 0.5], [1060, 120, 220, 180, "#FF6B4A", 0.22]] }],
  "crimson-beam": ["Crimson beams", "Diagonal crimson light beams on near-black.",
    { motif: "beam", dark: true, bg: ["#09070B", "#1A0709"], line: "#FF6B5E", glow: "#FF4D3D",
      blobs: [[880, 300, 360, 300, "#B3221A", 0.6], [1080, 640, 260, 200, "#FF4D3D", 0.25]] }],
  "frost-horizon": ["Frost horizon", "A pale winter sun over a frosted green horizon.",
    { motif: "horizon", bg: ["#F7FBF8", "#D3E6DA"], line: "#2E7D55", glow: "#8CCAA4",
      blobs: [[800, 380, 380, 280, "#B3DCC2", 0.95], [240, 160, 300, 200, "#EEF6F1", 0.9], [1060, 120, 220, 160, "#DDEFE4", 0.8]] }],
  "neon-grid": ["Neon grid", "A receding grid under magenta light on navy.",
    { motif: "grid", dark: true, bg: ["#090C1A", "#120E2A"], line: "#FF7AB0", glow: "#FF3E8A",
      blobs: [[760, 300, 420, 220, "#FF3E8A", 0.45], [1040, 120, 240, 180, "#6A4BFF", 0.35]] }]
};

(async () => {
  for (const [name, [title, desc, p]] of Object.entries(art)) {
    const svg = piece(name, title, desc, p);
    fs.writeFileSync(path.join(srcDir, name + ".svg"), svg);
    await sharp(Buffer.from(svg)).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(outDir, name + ".jpg"));
  }
  console.log("generated", Object.keys(art).length, "template artworks in assets/art");
})().catch((e) => { console.error(e); process.exitCode = 1; });
