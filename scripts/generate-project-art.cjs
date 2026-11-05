/* Original PopupLoom vector artwork generator.
   All template art and branding below is authored for this project. No stock
   photos, no third-party media, no tracing of the replaced files.
   Run: node scripts/generate-project-art.cjs */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const templateDir = path.join(root, "assets", "source", "templates");
const brandDir = path.join(root, "assets", "source", "brand");
fs.mkdirSync(templateDir, { recursive: true });
fs.mkdirSync(brandDir, { recursive: true });

function scene(title, desc, bg1, bg2, glow, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="733" viewBox="0 0 1100 733" role="img" aria-label="${title}">
<title>${title}</title>
<desc>Original PopupLoom vector artwork authored for this project on 2026-11-05. ${desc}</desc>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${glow}" stop-opacity=".7"/><stop offset=".6" stop-color="${glow}" stop-opacity=".18"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig" cx="50%" cy="44%" r="76%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></radialGradient>
  <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0V44" fill="none" stroke="#fff" stroke-opacity=".035"/></pattern>
</defs>
<rect width="1100" height="733" fill="url(#bg)"/>
<rect width="1100" height="733" fill="url(#grid)"/>
<circle cx="820" cy="160" r="330" fill="url(#glow)"/>
${body}
<rect width="1100" height="733" fill="url(#vig)"/>
</svg>`;
}

const art = {};

art["flash-watch"] = scene("Flash watch illustration", "A stylized wristwatch with an orange strap on a dark stage.", "#080A0F", "#1A0D08", "#FF6A1F", `
  <ellipse cx="550" cy="666" rx="255" ry="28" fill="#000" opacity=".45"/>
  <path d="M120 590 L390 120" stroke="#FF6A1F" stroke-width="4" opacity=".18"/>
  <path d="M165 640 L460 150" stroke="#FF9B63" stroke-width="2" opacity=".18"/>
  <rect x="482" y="48" width="136" height="626" rx="68" fill="#B94616"/>
  <rect x="496" y="62" width="108" height="598" rx="54" fill="#F26A2E"/>
  <path d="M520 92 L602 636" stroke="#FFB07A" stroke-width="16" opacity=".32"/>
  <rect x="700" y="338" width="36" height="48" rx="12" fill="#FF9B63"/>
  <circle cx="550" cy="360" r="168" fill="#05070A" opacity=".6"/>
  <circle cx="550" cy="360" r="154" fill="#090C11" stroke="#FF8A4C" stroke-width="10"/>
  <circle cx="550" cy="360" r="124" fill="#12171E"/>
  <g stroke="#E8EEF5" stroke-opacity=".6" stroke-width="3" stroke-linecap="round">
    <path d="M550 250v18"/><path d="M550 452v18"/><path d="M440 360h18"/><path d="M642 360h18"/>
    <path d="M472 282l12 12"/><path d="M616 426l12 12"/><path d="M628 282l-12 12"/><path d="M472 438l12-12"/>
  </g>
  <path d="M550 360V276" stroke="#F7F9FC" stroke-width="9" stroke-linecap="round"/>
  <path d="M550 360l70 44" stroke="#FF7A35" stroke-width="11" stroke-linecap="round"/>
  <circle cx="550" cy="360" r="11" fill="#FF6A1F"/>
  <circle cx="550" cy="360" r="4" fill="#FFF4EA"/>
  <path d="M760 600 C860 520 930 430 990 300" stroke="#FF6A1F" stroke-width="3" opacity=".26" fill="none"/>
`);

art["sticky-mug"] = scene("Mug and sticky note illustration", "A warm ceramic mug, a croissant and a green sticky note on a cream table.", "#FFF9EF", "#EFE1CE", "#E8A052", `
  <rect x="0" y="540" width="1100" height="193" fill="#E8D7C1" opacity=".7"/>
  <ellipse cx="510" cy="610" rx="235" ry="26" fill="#8E6B48" opacity=".24"/>
  <path d="M655 365 C760 350 792 430 738 486 C706 520 670 508 650 488" fill="none" stroke="#F7F2E8" stroke-width="34" stroke-linecap="round"/>
  <rect x="385" y="330" width="278" height="248" rx="34" fill="#FBF5EA"/>
  <rect x="400" y="345" width="248" height="218" rx="26" fill="#F3E9D9"/>
  <ellipse cx="524" cy="345" rx="139" ry="27" fill="#5A3724"/>
  <ellipse cx="524" cy="342" rx="118" ry="18" fill="#8B5A3C"/>
  <path d="M470 290 C438 246 476 226 462 184" stroke="#FFF" stroke-width="12" stroke-linecap="round" opacity=".7" fill="none"/>
  <path d="M526 286 C492 238 534 214 514 170" stroke="#FFF" stroke-width="10" stroke-linecap="round" opacity=".5" fill="none"/>
  <path d="M335 560 C300 500 292 438 330 390 C374 446 388 520 366 566 Z" fill="#D79A4D" opacity=".85"/>
  <path d="M330 548 C324 500 332 452 344 420" stroke="#F6D3A0" stroke-width="8" fill="none" opacity=".55"/>
  <g transform="rotate(8 790 420)">
    <rect x="676" y="338" width="238" height="190" rx="8" fill="#D9F06A"/>
    <rect x="690" y="352" width="210" height="14" rx="7" fill="#7A8F22" opacity=".45"/>
    <rect x="690" y="388" width="150" height="9" rx="4.5" fill="#7A8F22" opacity=".35"/>
    <rect x="690" y="414" width="182" height="9" rx="4.5" fill="#7A8F22" opacity=".35"/>
    <circle cx="878" cy="490" r="22" fill="#FFF9EF" opacity=".75"/>
    <path d="M868 490l8 8 14-18" stroke="#22C55E" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
`);

art["sneaker-flash"] = scene("Sneaker illustration", "A stylized high-top sneaker with orange accents on a blue stage.", "#07152E", "#123E86", "#3B82F6", `
  <g stroke="#9BC1FF" stroke-width="4" stroke-linecap="round" opacity=".35">
    <path d="M150 300h120"/><path d="M120 345h170"/><path d="M165 390h130"/>
  </g>
  <ellipse cx="560" cy="648" rx="315" ry="30" fill="#020A1C" opacity=".5"/>
  <path d="M285 575 L285 445 C285 405 305 380 340 365 L430 330 L455 300 C462 286 478 280 494 286 L545 307 L605 365 L760 432 C812 456 840 500 840 555 L822 608 L330 608 C304 608 285 596 285 575Z" fill="#F4F8FF"/>
  <path d="M455 300 C470 315 490 322 520 322 L560 322 L605 365 L545 307 L494 286 C478 280 462 286 455 300Z" fill="#C9DBF7"/>
  <path d="M540 315 C600 340 660 370 720 400" stroke="#0A2C5E" stroke-width="5" fill="none" opacity=".45"/>
  <path d="M340 365 C420 400 500 430 600 455 C680 475 750 505 800 540" stroke="#FF6A1F" stroke-width="17" fill="none" stroke-linecap="round"/>
  <g stroke="#0A2C5E" stroke-width="7" stroke-linecap="round">
    <path d="M432 360l30 44"/><path d="M472 380l30 44"/><path d="M512 400l30 44"/><path d="M552 420l28 40"/>
  </g>
  <g fill="#0A2C5E"><circle cx="425" cy="414" r="5"/><circle cx="465" cy="434" r="5"/><circle cx="505" cy="454" r="5"/><circle cx="545" cy="474" r="5"/></g>
  <path d="M300 575 L820 575 L840 555 L840 600 L320 600 C305 600 300 590 300 575Z" fill="#071B3C"/>
  <path d="M305 600 L830 600 L820 620 L335 620 C315 620 305 612 305 600Z" fill="#04122A"/>
  <circle cx="735" cy="545" r="13" fill="#FF6A1F"/>
  <path d="M760 300 C850 340 900 430 910 540" stroke="#7FB1FF" stroke-width="3" fill="none" opacity=".4"/>
`);

art["headphones-night"] = scene("Headphones illustration", "Over-ear headphones with a mint rim light on a dark background.", "#05090D", "#0B2A22", "#35F0B0", `
  <ellipse cx="550" cy="634" rx="260" ry="30" fill="#000" opacity=".5"/>
  <path d="M355 390 C355 190 745 190 745 390" fill="none" stroke="#1A2B2A" stroke-width="44" stroke-linecap="round"/>
  <path d="M355 390 C355 190 745 190 745 390" fill="none" stroke="#35F0B0" stroke-width="8" stroke-linecap="round" opacity=".85"/>
  <rect x="296" y="352" width="118" height="216" rx="58" fill="#111B1E" stroke="#35F0B0" stroke-width="5"/>
  <rect x="686" y="352" width="118" height="216" rx="58" fill="#111B1E" stroke="#35F0B0" stroke-width="5"/>
  <rect x="317" y="374" width="76" height="172" rx="38" fill="#1B2A2C"/>
  <rect x="707" y="374" width="76" height="172" rx="38" fill="#1B2A2C"/>
  <ellipse cx="355" cy="460" rx="22" ry="48" fill="#35F0B0" opacity=".22"/>
  <ellipse cx="745" cy="460" rx="22" ry="48" fill="#35F0B0" opacity=".22"/>
  <path d="M785 545 C840 610 760 660 700 620 C670 600 660 570 680 550" fill="none" stroke="#35F0B0" stroke-width="7" stroke-linecap="round"/>
  <circle cx="680" cy="550" r="10" fill="#35F0B0"/>
  <path d="M190 230 C260 170 330 150 410 160" stroke="#35F0B0" stroke-width="3" fill="none" opacity=".3"/>
`);

art["coffee-warm"] = scene("Coffee and croissant illustration", "A coffee cup, saucer and croissant in warm cream tones.", "#FFF8EC", "#E8D2B5", "#C4772F", `
  <rect x="0" y="545" width="1100" height="188" fill="#D8B992" opacity=".55"/>
  <ellipse cx="520" cy="612" rx="265" ry="28" fill="#7B5532" opacity=".25"/>
  <ellipse cx="520" cy="585" rx="230" ry="38" fill="#F9EDDC"/>
  <path d="M345 350 C345 520 400 560 520 560 C640 560 695 520 695 350 Z" fill="#FFF9F0"/>
  <path d="M360 365 C370 505 415 540 520 540 C625 540 670 505 680 365 Z" fill="#F3E4CF"/>
  <ellipse cx="520" cy="352" rx="175" ry="30" fill="#6A3C21"/>
  <ellipse cx="520" cy="348" rx="151" ry="21" fill="#A9673F"/>
  <path d="M450 300 C420 255 458 232 444 190" stroke="#FFF8EC" stroke-width="13" stroke-linecap="round" fill="none" opacity=".65"/>
  <path d="M530 294 C498 246 538 220 518 176" stroke="#FFF8EC" stroke-width="11" stroke-linecap="round" fill="none" opacity=".45"/>
  <path d="M760 510 C690 440 690 335 770 300 C850 265 930 330 900 405 C875 468 815 500 760 510 Z" fill="#D68B3C"/>
  <path d="M768 490 C715 430 718 350 778 322 C835 296 895 350 872 410 C851 462 808 486 768 490Z" fill="#F0B466"/>
  <g stroke="#9A5A24" stroke-width="3" opacity=".45"><path d="M770 420c40-25 70-58 76-94"/><path d="M790 455c35-18 58-44 66-68"/></g>
  <circle cx="820" cy="570" r="10" fill="#C4772F"/>
  <circle cx="865" cy="545" r="5" fill="#C4772F" opacity=".6"/>
`);

art["prize-bundle"] = scene("Prize bundle illustration", "Gift boxes, ribbons and confetti arranged as a prize bundle.", "#0D0B10", "#2A1308", "#F59E0B", `
  <ellipse cx="550" cy="650" rx="300" ry="30" fill="#000" opacity=".5"/>
  <g transform="rotate(-8 470 460)">
    <rect x="330" y="380" width="270" height="220" rx="18" fill="#F59E0B"/>
    <rect x="330" y="380" width="270" height="58" rx="18" fill="#FFC65C"/>
    <rect x="450" y="380" width="30" height="220" fill="#7C3D08"/>
    <path d="M465 380 C410 330 370 300 345 330 C320 360 375 395 465 380Z" fill="#FF6A1F"/>
    <path d="M465 380 C520 330 560 300 585 330 C610 360 555 395 465 380Z" fill="#FF6A1F"/>
  </g>
  <g transform="rotate(7 730 500)">
    <rect x="610" y="430" width="210" height="170" rx="16" fill="#FFF3E2"/>
    <rect x="610" y="430" width="210" height="46" rx="16" fill="#FFC65C"/>
    <rect x="700" y="430" width="26" height="170" fill="#FF6A1F"/>
  </g>
  <g fill="#FFC65C"><circle cx="260" cy="250" r="8"/><circle cx="840" cy="220" r="12"/><circle cx="900" cy="350" r="7"/><circle cx="200" cy="420" r="5"/></g>
  <g fill="#FF6A1F"><circle cx="760" cy="160" r="6"/><circle cx="310" cy="200" r="5"/><circle cx="180" cy="330" r="9"/></g>
  <path d="M240 520l18-38 18 38-38-24h44z" fill="#FFF3E2" opacity=".85"/>
`);

art["giftbox-bf"] = scene("Black Friday gift stack illustration", "Stacked dark gift boxes with red ribbons and a hard shadow.", "#060508", "#22080B", "#FF4D3D", `
  <ellipse cx="550" cy="648" rx="310" ry="30" fill="#000" opacity=".55"/>
  <g transform="rotate(-5 500 500)">
    <rect x="280" y="410" width="300" height="220" rx="16" fill="#17181E"/>
    <rect x="280" y="410" width="300" height="54" rx="16" fill="#24252C"/>
    <rect x="416" y="410" width="34" height="220" fill="#FF4D3D"/>
    <path d="M433 410 C380 350 340 320 305 350 C275 378 335 420 433 410Z" fill="#FF4D3D"/>
    <path d="M433 410 C486 350 526 320 561 350 C591 378 531 420 433 410Z" fill="#FF4D3D"/>
  </g>
  <g transform="rotate(6 720 450)">
    <rect x="600" y="360" width="220" height="160" rx="14" fill="#202128"/>
    <rect x="600" y="360" width="220" height="42" rx="14" fill="#2D2F36"/>
    <rect x="700" y="360" width="26" height="160" fill="#FF6A4A"/>
  </g>
  <g fill="#FF4D3D"><circle cx="240" cy="230" r="7"/><circle cx="850" cy="240" r="10"/><circle cx="900" cy="560" r="6"/><circle cx="180" cy="500" r="5"/></g>
  <path d="M190 600l14-30 14 30-30-19h34z" fill="#FF6A4A" opacity=".7"/>
`);

art["winter-gift"] = scene("Winter gift illustration", "A frosted gift box with a green ribbon and soft snow.", "#F9FCFA", "#DDECE3", "#2E8B57", `
  <ellipse cx="550" cy="644" rx="300" ry="28" fill="#9BB8A8" opacity=".35"/>
  <g transform="rotate(-4 550 470)">
    <rect x="330" y="365" width="440" height="235" rx="18" fill="#EAF5EE"/>
    <rect x="330" y="365" width="440" height="58" rx="18" fill="#D6EADD"/>
    <rect x="535" y="365" width="34" height="235" fill="#2E8B57"/>
    <path d="M552 365 C490 315 450 292 422 322 C396 350 465 385 552 365Z" fill="#3FAF70"/>
    <path d="M552 365 C614 315 654 292 682 322 C708 350 639 385 552 365Z" fill="#3FAF70"/>
    <rect x="700" y="420" width="70" height="42" rx="10" fill="#FF9B63"/>
  </g>
  <g fill="#FFF"><circle cx="240" cy="180" r="5"/><circle cx="830" cy="220" r="7"/><circle cx="900" cy="390" r="4"/><circle cx="180" cy="430" r="6"/><circle cx="300" cy="560" r="4"/></g>
  <g fill="#CFE6D9"><circle cx="270" cy="270" r="3"/><circle cx="870" cy="500" r="3"/><circle cx="760" cy="140" r="4"/></g>
`);

art["cyber-keys"] = scene("Cyber Monday keyboard illustration", "An angled keyboard with pink key glow on navy.", "#070B1C", "#170F34", "#FF3E8A", `
  <ellipse cx="550" cy="650" rx="330" ry="28" fill="#000" opacity=".5"/>
  <g transform="rotate(-10 550 390)">
    <rect x="185" y="220" width="730" height="310" rx="26" fill="#11162B"/>
    <rect x="205" y="240" width="690" height="270" rx="16" fill="#0A0E20"/>
    ${[0,1,2,3,4].map(r => [0,1,2,3,4,5,6,7,8,9].map(c => {
      const hot = (r === 2 && c === 4) || (r === 3 && c === 2) || (r === 1 && c === 7);
      return `<rect x="${222 + c * 66}" y="${258 + r * 47}" width="52" height="36" rx="8" fill="${hot ? "#FF3E8A" : "#1B2240"}" stroke="${hot ? "#FF9BC6" : "#2C3760"}" stroke-width="2" opacity="${hot ? ".95" : ".9"}"/>`;
    }).join("")).join("")}
    <rect x="222" y="493" width="360" height="30" rx="8" fill="#1B2240" stroke="#2C3760" stroke-width="2"/>
    <rect x="596" y="493" width="278" height="30" rx="8" fill="#FF6A1F" opacity=".8"/>
  </g>
  <path d="M170 160 C290 110 390 120 470 170" stroke="#FF3E8A" stroke-width="3" fill="none" opacity=".35"/>
  <path d="M800 590 C880 550 940 480 960 400" stroke="#FF6A1F" stroke-width="3" fill="none" opacity=".3"/>
`);

art["earbuds-violet"] = scene("Violet earbuds illustration", "A wireless earbud case and two buds on a violet stage.", "#140B24", "#32154D", "#C9A0FF", `
  <ellipse cx="550" cy="642" rx="260" ry="28" fill="#000" opacity=".45"/>
  <g transform="rotate(-6 520 440)">
    <rect x="350" y="330" width="330" height="225" rx="70" fill="#2A1742"/>
    <rect x="370" y="350" width="290" height="185" rx="54" fill="#3C2160"/>
    <path d="M380 392 C470 360 560 360 650 392" stroke="#C9A0FF" stroke-width="5" fill="none" opacity=".6"/>
    <circle cx="515" cy="500" r="18" fill="#C9A0FF" opacity=".55"/>
  </g>
  <g transform="rotate(12 760 380)">
    <rect x="720" y="290" width="64" height="150" rx="30" fill="#F4ECFF"/>
    <rect x="736" y="410" width="26" height="86" rx="13" fill="#D9C3FF"/>
    <circle cx="752" cy="320" r="26" fill="#2A1742"/>
    <circle cx="752" cy="320" r="10" fill="#C9A0FF"/>
  </g>
  <g transform="rotate(-18 290 390)">
    <rect x="250" y="300" width="58" height="140" rx="28" fill="#F4ECFF"/>
    <rect x="264" y="410" width="24" height="80" rx="12" fill="#D9C3FF"/>
    <circle cx="279" cy="328" r="23" fill="#2A1742"/>
    <circle cx="279" cy="328" r="9" fill="#C9A0FF"/>
  </g>
  <path d="M210 590 C300 560 360 570 420 610" stroke="#C9A0FF" stroke-width="3" fill="none" opacity=".3"/>
`);

art["skincare-ritual"] = scene("Skincare ritual illustration", "Amber glass bottles and a jar with a botanical sprig on warm paper.", "#FFF9F0", "#E9D8C3", "#B07A4E", `
  <rect x="0" y="552" width="1100" height="181" fill="#D8BE9F" opacity=".45"/>
  <ellipse cx="550" cy="610" rx="300" ry="26" fill="#7A5638" opacity=".2"/>
  <rect x="330" y="330" width="150" height="230" rx="26" fill="#B9773F"/>
  <rect x="350" y="350" width="110" height="190" rx="18" fill="#D79A5C"/>
  <rect x="380" y="265" width="50" height="75" rx="16" fill="#7A4A24"/>
  <rect x="368" y="250" width="74" height="30" rx="12" fill="#4A2D17"/>
  <rect x="510" y="380" width="180" height="180" rx="30" fill="#7C4B2A"/>
  <rect x="530" y="400" width="140" height="140" rx="22" fill="#B47742"/>
  <ellipse cx="600" cy="382" rx="80" ry="18" fill="#E9C9A4"/>
  <rect x="720" y="300" width="125" height="260" rx="24" fill="#F3E4D2"/>
  <rect x="738" y="325" width="89" height="210" rx="16" fill="#FFF9F0"/>
  <rect x="760" y="245" width="46" height="65" rx="14" fill="#B07A4E"/>
  <path d="M850 540 C830 470 850 400 900 350 C930 420 910 500 875 550Z" fill="#8FAE7D" opacity=".8"/>
  <path d="M860 520 C856 460 866 410 884 380" stroke="#D9E8CA" stroke-width="6" fill="none" opacity=".7"/>
  <g fill="#B07A4E" opacity=".55"><circle cx="250" cy="260" r="6"/><circle cx="900" cy="230" r="8"/><circle cx="220" cy="500" r="4"/></g>
`);

art["linen-shirt"] = scene("Linen shirt illustration", "A natural linen shirt on a hanger in a warm neutral studio.", "#F6F0E6", "#DED0BF", "#C77A4A", `
  <rect x="0" y="560" width="1100" height="173" fill="#CDBA9F" opacity=".35"/>
  <path d="M550 180 L320 330 L420 390 L420 610 L680 610 L680 390 L780 330 Z" fill="#F8F3EA"/>
  <path d="M550 180 L470 250 L550 330 L630 250 Z" fill="#E7DAC8"/>
  <path d="M420 390 C390 450 380 520 390 610" stroke="#D8C7B2" stroke-width="6" fill="none" opacity=".8"/>
  <path d="M680 390 C710 450 720 520 710 610" stroke="#D8C7B2" stroke-width="6" fill="none" opacity=".8"/>
  <path d="M550 330 L550 610" stroke="#D8C7B2" stroke-width="4" opacity=".7"/>
  <g fill="#B9A58C"><circle cx="550" cy="390" r="5"/><circle cx="550" cy="455" r="5"/><circle cx="550" cy="520" r="5"/></g>
  <path d="M430 250 C470 200 530 180 550 180 C570 180 630 200 670 250" stroke="#8B7358" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M550 154 L550 180" stroke="#8B7358" stroke-width="8" stroke-linecap="round"/>
  <rect x="640" y="420" width="70" height="42" rx="8" fill="#E58A4E"/>
  <path d="M655 432h40M655 444h28" stroke="#FFF6EC" stroke-width="4" stroke-linecap="round"/>
  <g stroke="#CDBA9F" stroke-width="3" opacity=".35"><path d="M240 200h90"/><path d="M210 260h70"/><path d="M830 480h90"/></g>
`);

const brandFavicon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" role="img" aria-label="PopupLoom">
<title>PopupLoom mark</title><desc>Original PopupLoom vector mark authored for this project on 2026-11-05.</desc>
<rect width="32" height="32" rx="8" fill="#0A0B10"/>
<g fill="none" stroke-linecap="round" stroke-width="2.8"><circle cx="12.2" cy="16" r="5.4" stroke="#FF9B63"/><circle cx="19.8" cy="16" r="5.4" stroke="#FF6A1F"/></g>
</svg>`;

const brandMark = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="PopupLoom">
<title>PopupLoom mark</title><desc>Original PopupLoom vector mark authored for this project on 2026-11-05.</desc>
<rect width="64" height="64" rx="16" fill="#0A0B10"/>
<g fill="none" stroke-linecap="round" stroke-width="5.6"><circle cx="24.4" cy="32" r="10.8" stroke="#FF9B63"/><circle cx="39.6" cy="32" r="10.8" stroke="#FF6A1F"/></g>
</svg>`;

const brandOg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="PopupLoom — free website popup builder">
<title>PopupLoom — free website popup builder</title><desc>Original PopupLoom social card authored for this project on 2026-11-05.</desc>
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#080A0F"/><stop offset=".65" stop-color="#11151D"/><stop offset="1" stop-color="#2A1408"/></linearGradient>
<radialGradient id="glow" cx="70%" cy="35%" r="55%"><stop offset="0" stop-color="#FF6A1F" stop-opacity=".48"/><stop offset="1" stop-color="#FF6A1F" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="630" fill="url(#bg)"/><circle cx="870" cy="170" r="360" fill="url(#glow)"/>
<g transform="translate(92 92) scale(2.1)"><rect width="64" height="64" rx="16" fill="#0A0B10" stroke="#2A2E38"/><g fill="none" stroke-linecap="round" stroke-width="5.6"><circle cx="24.4" cy="32" r="10.8" stroke="#FF9B63"/><circle cx="39.6" cy="32" r="10.8" stroke="#FF6A1F"/></g></g>
<text x="300" y="205" fill="#F7F9FC" font-family="Arial, Helvetica, sans-serif" font-size="78" font-weight="800" letter-spacing="-3">Popup<tspan fill="#FF6A1F">Loom</tspan></text>
<text x="304" y="275" fill="#B9C0CB" font-family="Arial, Helvetica, sans-serif" font-size="30">Free website popup builder</text>
<g transform="translate(92 350)"><rect width="1016" height="1" fill="#FFFFFF" opacity=".12"/><text x="0" y="70" fill="#FF9B63" font-family="Arial, Helvetica, sans-serif" font-size="26" letter-spacing="4">ORIGINAL TEMPLATES · ONE SCRIPT TAG</text><text x="0" y="125" fill="#7F8794" font-family="Arial, Helvetica, sans-serif" font-size="22">Design, preview, and install a popup where custom code is supported.</text></g>
<circle cx="1010" cy="500" r="120" fill="none" stroke="#FF6A1F" stroke-opacity=".18" stroke-width="2"/><circle cx="1010" cy="500" r="76" fill="none" stroke="#FF9B63" stroke-opacity=".22" stroke-width="2"/>
</svg>`;

const brand = {
  "favicon": { svg: brandFavicon, legacy: "favicon.svg" },
  "popuploom-mark": { svg: brandMark, legacy: "popuploom-mark.svg" },
  "og-popuploom": { svg: brandOg, legacy: null }
};

async function writeTemplate(name, svg) {
  const source = path.join(templateDir, name + ".svg");
  fs.writeFileSync(source, svg);
  await sharp(Buffer.from(svg)).jpeg({ quality: 90, mozjpeg: true }).toFile(path.join(root, "assets", name + ".jpg"));
}

async function writeBrand(name, svg) {
  const source = path.join(brandDir, name + ".svg");
  fs.writeFileSync(source, svg);
  if (name === "favicon") {
    await sharp(Buffer.from(svg)).resize(16, 16).png().toFile(path.join(root, "assets", "favicon-16.png"));
    await sharp(Buffer.from(svg)).resize(32, 32).png().toFile(path.join(root, "assets", "favicon-32.png"));
    await sharp(Buffer.from(svg)).resize(180, 180).png().toFile(path.join(root, "assets", "apple-touch-icon.png"));
  }
  if (name === "og-popuploom") {
    await sharp(Buffer.from(svg)).png().toFile(path.join(root, "assets", "og-popuploom.png"));
  }
}

(async () => {
  for (const [name, svg] of Object.entries(art)) await writeTemplate(name, svg);
  for (const [name, item] of Object.entries(brand)) {
    if (item.legacy) fs.writeFileSync(path.join(root, "assets", item.legacy), item.svg);
    await writeBrand(name, item.svg);
  }
  // Legacy favicon.svg and popuploom-mark.svg are the exact source SVGs.
  fs.writeFileSync(path.join(root, "assets", "favicon.svg"), brandFavicon);
  fs.writeFileSync(path.join(root, "assets", "popuploom-mark.svg"), brandMark);
  console.log("generated", Object.keys(art).length, "template JPEGs and brand assets");
})().catch((e) => { console.error(e); process.exitCode = 1; });
