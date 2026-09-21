// SVG-Builder fuer Avatar-Figur und Rang-Ring.
// Erzeugt SVG-Strings aus einer (sanitierten) AvatarConfig; die Komponenten
// rendern sie via dangerouslySetInnerHTML. Werte stammen ausschliesslich aus
// unseren eigenen Katalogen (sanitizeAvatar) – kein Fremd-HTML.

import {
  type AvatarConfig,
  SKIN_TONES,
  HAIR_COLORS,
  JERSEY_COLORS,
  EYE_COLORS,
  colorHex,
} from "./avatar";

const OL = "#232733";

function shade(c: string, f: number): string {
  const n = parseInt(c.slice(1), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  r = Math.round(r * (1 - f));
  g = Math.round(g * (1 - f));
  b = Math.round(b * (1 - f));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function tint(c: string, f: number): string {
  const n = parseInt(c.slice(1), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  r = Math.round(r + (255 - r) * f);
  g = Math.round(g + (255 - g) * f);
  b = Math.round(b + (255 - b) * f);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function star(cx: number, cy: number, r: number, ri: number): string {
  let p = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? ri : r;
    p +=
      (i ? "L" : "M") +
      (cx + rr * Math.cos(a)).toFixed(1) +
      " " +
      (cy + rr * Math.sin(a)).toFixed(1);
  }
  return p + "Z";
}
function rays(cx: number, cy: number, r0: number, r1: number, n: number, color: string): string {
  let s = "";
  const p = (ang: number, r: number) =>
    (cx + r * Math.cos(ang)).toFixed(1) + " " + (cy + r * Math.sin(ang)).toFixed(1);
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    const w = 0.045;
    s += `<path d="M${p(a - w, r0)} L${p(a, r1)} L${p(a + w, r0)} Z" fill="${color}"/>`;
  }
  return s;
}
function laurel(
  cx: number,
  cy: number,
  R: number,
  color: string,
  count: number,
  rx: number,
): string {
  const branch = (deg0: number, dir: number) => {
    let g = "";
    for (let i = 0; i < count; i++) {
      const deg = deg0 - dir * i * 15;
      const a = (deg * Math.PI) / 180;
      const x = cx + R * Math.cos(a),
        y = cy + R * Math.sin(a);
      const rot = deg + (dir > 0 ? -58 : 58);
      g += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx}" ry="3.6" fill="${color}" stroke="${shade(color, 0.32)}" stroke-width="0.7" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    return g;
  };
  return branch(212, 1) + branch(328, -1);
}

const HEADS: Record<string, string> = {
  oval: "M100 26 C127 26 146 45 148 74 C149 92 145 110 134 124 C126 135 114 146 100 146 C86 146 74 135 66 124 C55 110 51 92 52 74 C54 45 73 26 100 26 Z",
  round:
    "M100 26 C133 26 151 49 151 82 C151 116 128 146 100 146 C72 146 49 116 49 82 C49 49 67 26 100 26 Z",
  square:
    "M100 26 C130 26 148 43 148 72 L148 106 C148 129 130 146 100 146 C70 146 52 129 52 106 L52 72 C52 43 70 26 100 26 Z",
  heart:
    "M100 28 C132 26 152 47 150 80 C148 108 122 132 100 148 C78 132 52 108 50 80 C48 47 68 30 100 28 Z",
  long: "M100 24 C125 24 141 43 143 76 C144 100 141 122 131 138 C123 149 113 152 100 152 C87 152 77 149 69 138 C59 122 56 100 57 76 C59 43 75 24 100 24 Z",
};
const FACE_SH =
  "M100 28 C122 32 134 52 136 76 C138 104 126 130 100 148 C116 128 124 104 122 80 C120 58 112 40 100 28 Z";
const TORSO = "M2 210 C2 168 44 152 100 152 C156 152 198 168 198 210 Z";
const TORSO_SH = "M100 152 C152 152 194 168 198 210 L150 210 C150 182 128 162 100 158 Z";
const CROWN = "M50 76 C50 20 150 20 150 76 C138 48 62 48 50 76 Z";
const CROWN_BUZZ = "M56 78 C56 40 144 40 144 78 C136 60 64 60 56 78 Z";
const FRINGE_SHORT =
  "M44 16 H156 V74 C138 60 120 58 108 64 C104 55 96 55 92 64 C80 58 62 60 44 74 Z";
const FRINGE_BUZZ = "M48 16 H152 V64 C136 54 64 54 48 64 Z";
const FRINGE_FRAME =
  "M42 14 H158 V122 C152 116 150 96 144 86 C136 60 118 54 100 54 C82 54 64 60 56 86 C50 96 48 116 42 122 Z";
const BACK_LONG =
  "M50 64 C50 34 150 34 150 64 L150 186 L132 186 L132 92 C132 70 68 70 68 92 L68 186 L50 186 Z";
const BEARD_FULL =
  "M56 92 C56 118 72 140 100 148 C128 140 144 118 144 92 C144 108 128 118 100 118 C72 118 56 108 56 92 Z";
const GOATEE = "M84 120 C84 138 94 148 100 148 C106 148 116 138 116 120 C110 128 90 128 84 120 Z";

/** Innere Figur-Elemente (ohne <svg>-Wrapper), im Koordinatensystem 0..200. */
export function avatarInner(cfg: AvatarConfig): string {
  const skin = colorHex(SKIN_TONES, cfg.skin),
    skinS = shade(skin, 0.15);
  const hair = colorHex(HAIR_COLORS, cfg.hairColor),
    hairS = shade(hair, 0.26),
    hairH = tint(hair, 0.28);
  const jersey = colorHex(JERSEY_COLORS, cfg.jerseyColor),
    jerseyS = shade(jersey, 0.2);
  const eyeC = colorHex(EYE_COLORS, cfg.eyeColor);
  const glasses = cfg.glasses,
    beard = cfg.beard,
    freckles = cfg.freckles === "on";
  const HEAD = HEADS[cfg.face] || HEADS.oval;
  const lightJ = cfg.jerseyColor === "white" || cfg.jerseyColor === "yellow";
  const pat = lightJ ? "#2a2f3a" : "#ffffff";
  const id = "c" + Math.random().toString(36).slice(2, 9);
  const S = `stroke="${OL}" stroke-width="2.4"`,
    St = `stroke="${OL}" stroke-width="1.6"`;

  let pattern = "";
  if (cfg.jersey === "stripes")
    pattern = [66, 92, 118]
      .map((x) => `<rect x="${x}" y="152" width="11" height="60" fill="${pat}" opacity="0.85"/>`)
      .join("");
  else if (cfg.jersey === "hoops")
    pattern = [176, 192]
      .map((y) => `<rect x="2" y="${y}" width="196" height="9" fill="${pat}" opacity="0.85"/>`)
      .join("");
  else if (cfg.jersey === "sash")
    pattern = `<rect x="-6" y="176" width="212" height="16" fill="${pat}" opacity="0.85" transform="rotate(18 100 186)"/>`;
  const patGroup = cfg.jersey !== "solid" ? `<g clip-path="url(#t${id})">${pattern}</g>` : "";

  const crown = cfg.hair === "buzz" ? CROWN_BUZZ : CROWN;
  let backHair = "",
    frontHair = "";
  if (cfg.hair !== "none") {
    if (cfg.hair === "long") backHair = `<path d="${BACK_LONG}" fill="${hair}" ${S}/>`;
    const fr =
      cfg.hair === "buzz" ? FRINGE_BUZZ : cfg.hair === "short" ? FRINGE_SHORT : FRINGE_FRAME;
    const op = cfg.hair === "buzz" ? ' opacity="0.9"' : "";
    frontHair =
      `<path d="${crown}" fill="${hair}" ${S}${op}/>` +
      `<g clip-path="url(#h${id})"><path d="${fr}" fill="${hair}"${op}/><path d="M60 40 C74 30 96 30 112 36 C98 34 78 38 66 50 Z" fill="${hairH}" opacity="0.5"/></g>`;
  }

  const eye = (x: number) =>
    `<ellipse cx="${x}" cy="94" rx="13" ry="10" fill="#ffffff" ${St}/>` +
    `<circle cx="${x + 1}" cy="95" r="7.4" fill="${eyeC}"/><circle cx="${x + 1}" cy="95" r="3.4" fill="#1a120a"/><circle cx="${x - 2}" cy="92" r="2.2" fill="#ffffff"/>` +
    `<path d="M${x - 13} 88 Q${x} 81 ${x + 13} 88" fill="none" stroke="${OL}" stroke-width="2.6" stroke-linecap="round"/>`;
  const eyes = eye(78) + eye(122);
  const brows = `<path d="M62 74 Q79 65 96 71 L95 76 Q79 71 63 79 Z" fill="${hairS}" ${St}/><path d="M138 74 Q121 65 104 71 L105 76 Q121 71 137 79 Z" fill="${hairS}" ${St}/>`;
  const nose = `<path d="M100 98 C96 108 94 115 100 118 C104 117 107 115 108 112" fill="none" stroke="${skinS}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  const mouth = `<path d="M82 126 Q100 137 118 126" fill="none" stroke="${OL}" stroke-width="2.6" stroke-linecap="round"/><path d="M88 130 Q100 135 112 130" fill="none" stroke="${skinS}" stroke-width="2.2" stroke-linecap="round"/>`;
  const ears = `<ellipse cx="52" cy="92" rx="9" ry="13" fill="${skin}" ${St}/><path d="M50 86 Q56 92 50 98" fill="none" stroke="${skinS}" stroke-width="2"/><ellipse cx="148" cy="92" rx="9" ry="13" fill="${skin}" ${St}/><path d="M150 86 Q144 92 150 98" fill="none" stroke="${skinS}" stroke-width="2"/>`;
  const neck = `<path d="M86 132 L114 132 L116 158 C116 162 84 162 84 158 Z" fill="${skin}" ${S}/><path d="M84 138 Q100 152 116 138 L116 146 Q100 158 84 146 Z" fill="${skinS}" opacity="0.55"/>`;

  let beardEl = "";
  if (beard === "stubble") beardEl = `<path d="${BEARD_FULL}" fill="${hairS}" opacity="0.32"/>`;
  else if (beard === "full")
    beardEl = `<path d="${BEARD_FULL}" fill="${hair}" ${St}/><path d="M80 116 Q100 126 120 116 Q100 121 80 116 Z" fill="${hair}"/>`;
  else if (beard === "goatee")
    beardEl = `<path d="${GOATEE}" fill="${hair}" ${St}/><path d="M84 116 Q100 124 116 116 Q100 120 84 116 Z" fill="${hair}"/>`;

  let freck = "";
  if (freckles)
    freck = [
      [74, 110],
      [80, 114],
      [70, 116],
      [126, 110],
      [120, 114],
      [130, 116],
      [100, 112],
    ]
      .map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="1.5" fill="${skinS}" opacity="0.6"/>`)
      .join("");

  let gl = "";
  if (glasses === "round")
    gl = `<circle cx="78" cy="94" r="17" fill="none" stroke="${OL}" stroke-width="3"/><circle cx="122" cy="94" r="17" fill="none" stroke="${OL}" stroke-width="3"/><path d="M95 92 Q100 88 105 92" fill="none" stroke="${OL}" stroke-width="3"/><path d="M61 92 L52 89" stroke="${OL}" stroke-width="3" stroke-linecap="round"/><path d="M139 92 L148 89" stroke="${OL}" stroke-width="3" stroke-linecap="round"/>`;
  else if (glasses === "square")
    gl = `<rect x="60" y="83" width="36" height="24" rx="6" fill="none" stroke="${OL}" stroke-width="3"/><rect x="104" y="83" width="36" height="24" rx="6" fill="none" stroke="${OL}" stroke-width="3"/><path d="M96 90 H104" stroke="${OL}" stroke-width="3"/><path d="M60 90 L52 88" stroke="${OL}" stroke-width="3" stroke-linecap="round"/><path d="M140 90 L148 88" stroke="${OL}" stroke-width="3" stroke-linecap="round"/>`;

  let acc = "";
  if (cfg.accessory === "headband")
    acc = `<path d="M46 66 Q100 50 154 66 L154 80 Q100 64 46 80 Z" fill="${jersey}" ${S}/>`;
  else if (cfg.accessory === "armband")
    acc = `<rect x="22" y="166" width="30" height="18" rx="4" fill="#f4c027" ${St}/><rect x="22" y="173" width="30" height="4" fill="#c99818"/>`;

  return (
    `<defs><clipPath id="t${id}"><path d="${TORSO}"/></clipPath><clipPath id="h${id}"><path d="${HEAD}"/></clipPath></defs>` +
    `<path d="${TORSO}" fill="${jersey}" ${S}/>${patGroup}<path d="${TORSO_SH}" fill="${jerseyS}" opacity="0.5"/>` +
    `<path d="M84 152 Q100 168 116 152" fill="none" ${S}/>` +
    neck +
    backHair +
    ears +
    `<path d="${HEAD}" fill="${skin}" ${S}/><g clip-path="url(#h${id})"><path d="${FACE_SH}" fill="${skinS}" opacity="0.42"/></g>` +
    beardEl +
    brows +
    eyes +
    nose +
    mouth +
    freck +
    gl +
    frontHair +
    acc
  );
}

/** Figur allein (fuer Builder-Vorschau), inkl. Kopffreiheit. */
export function avatarFigureSvg(cfg: AvatarConfig, size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="-12 -34 224 224" role="img" aria-label="Avatar">${avatarInner(cfg)}</svg>`;
}

/** Kleine Medaille (Division = 1..5 Sterne). */
export function medalSvg(idx: number, color: string, accent: string): string {
  const n = idx + 1;
  const id = "m" + Math.random().toString(36).slice(2, 7);
  const cx = 26,
    cy = 26,
    gap = 8.6;
  const sx = cx - ((n - 1) * gap) / 2;
  let st = "";
  for (let i = 0; i < n; i++)
    st += `<path d="${star(sx + i * gap, cy, 5.2, 2.3)}" fill="#ffffff" opacity="0.96"/>`;
  return `<svg width="46" height="46" viewBox="0 0 52 52"><defs><radialGradient id="g${id}" cx="42%" cy="34%" r="72%"><stop offset="0%" stop-color="${tint(accent, 0.55)}"/><stop offset="100%" stop-color="${shade(color, 0.3)}"/></radialGradient></defs><circle cx="26" cy="26" r="23" fill="url(#g${id})" stroke="${shade(color, 0.38)}" stroke-width="2"/><circle cx="26" cy="26" r="23" fill="none" stroke="${tint(accent, 0.7)}" stroke-width="1" opacity="0.7"/>${st}</svg>`;
}

/** Tier-Stern (fuer die Stufen-Reihe I..V). */
export function tierStarSvg(filled: boolean, color: string): string {
  return `<svg width="15" height="15" viewBox="0 0 24 24"><path d="${star(12, 12, 10, 4.3)}" fill="${filled ? color : "var(--dot, #c9d0da)"}" stroke="${filled ? shade(color, 0.25) : "none"}" stroke-width="${filled ? 1 : 0}"/></svg>`;
}

export interface RingOpts {
  color: string;
  accent: string;
  divisionIndex: number;
  ranked: boolean;
}

/** Rang-Ring um beliebige innere Avatar-Markup (custom/dicebear/illustrated). */
export function ringShell(
  innerMarkup: (x: number, y: number, side: number) => string,
  o: RingOpts,
  size: number,
): string {
  const cx = 120,
    cy = 120,
    R = 88;
  const id = "r" + Math.random().toString(36).slice(2, 8);
  const idx = o.divisionIndex;
  const isGen = o.ranked && idx === 4;
  let rayInner = "";
  if (o.ranked && idx >= 2) {
    if (isGen)
      rayInner = `<g opacity="0.5">${rays(cx, cy, R + 12, R + 66, 72, o.accent)}</g><g opacity="0.62">${rays(cx, cy, R + 16, R + 40, 36, "#ffd576")}</g>`;
    else
      rayInner = `<g opacity="0.4">${rays(cx, cy, R + 13, R + 34, idx >= 3 ? 40 : 34, o.accent)}</g>`;
  }
  const rayEls = rayInner ? (isGen ? `<g class="gspin">${rayInner}</g>` : rayInner) : "";
  const laurelEls =
    o.ranked && idx >= 3
      ? laurel(cx, cy, R + 16, isGen ? "#f2d488" : "#cfd6df", isGen ? 7 : 5, isGen ? 9.5 : 8.5)
      : "";
  const blur = isGen ? 12 : idx >= 2 ? 6 : 4;
  const RW =
    "M150 118 C182 96 210 72 234 44 C228 68 216 90 198 106 C214 102 226 94 236 82 C230 102 214 118 194 126 C208 124 220 116 230 106 C222 126 206 138 186 142 C170 145 156 140 150 118 Z";
  const wings = isGen
    ? `<g class="gwings"><g fill="url(#wg${id})" stroke="#c69326" stroke-width="1.4" stroke-linejoin="round"><path d="${RW}"/><path d="${RW}" transform="translate(240,0) scale(-1,1)"/></g></g>`
    : "";
  const halo = isGen
    ? `<circle class="ghalo" cx="${cx}" cy="${cy}" r="${R + 18}" fill="none" stroke="url(#gold${id})" stroke-width="5" opacity="0.7" filter="url(#glow${id})"/>`
    : "";
  const genRing = isGen
    ? `<circle cx="${cx}" cy="${cy}" r="${R + 13}" fill="none" stroke="url(#gold${id})" stroke-width="3.5"/>`
    : "";
  const crownEl = isGen
    ? `<g filter="url(#glow${id})"><path d="M95 35 L101 14 L112 27 L120 7 L128 27 L139 14 L145 35 Z" fill="url(#gold${id})" stroke="#a9791f" stroke-width="2" stroke-linejoin="round"/><rect x="93" y="32" width="54" height="10" rx="3" fill="url(#gold${id})" stroke="#a9791f" stroke-width="2"/><circle class="gtw" cx="120" cy="9" r="3.2" fill="#fff4cf"/><circle class="gtw" cx="101" cy="15" r="2.4" fill="#fff4cf"/><circle class="gtw" cx="139" cy="15" r="2.4" fill="#fff4cf"/></g>`
    : "";
  const ringFill = o.ranked
    ? `<g filter="url(#glow${id})"><circle cx="${cx}" cy="${cy}" r="${R + 9}" fill="url(#metal${id})" stroke="${shade(o.color, 0.35)}" stroke-width="2"/></g>`
    : `<circle cx="${cx}" cy="${cy}" r="${R + 9}" fill="url(#metal${id})" stroke="${shade(o.color, 0.35)}" stroke-width="2"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 240 240" role="img" aria-label="Rang-Avatar">
    <defs>
      <clipPath id="clip${id}"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
      <radialGradient id="bg${id}" cx="50%" cy="40%" r="72%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0"/><stop offset="100%" stop-color="${o.accent}" stop-opacity="0.28"/></radialGradient>
      <linearGradient id="metal${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${tint(o.accent, 0.55)}"/><stop offset="42%" stop-color="${o.color}"/><stop offset="100%" stop-color="${shade(o.color, 0.4)}"/></linearGradient>
      <linearGradient id="gold${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe9a8"/><stop offset="45%" stop-color="#f4c95a"/><stop offset="100%" stop-color="#c8952b"/></linearGradient>
      <linearGradient id="wg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fffdf5"/><stop offset="60%" stop-color="#ffe9a8"/><stop offset="100%" stop-color="#e6b74e"/></linearGradient>
      <filter id="glow${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${blur}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    ${wings}${rayEls}${halo}${ringFill}${genRing}
    <path d="M ${cx - R - 6} ${cy} A ${R + 6} ${R + 6} 0 0 1 ${cx + R + 6} ${cy}" fill="none" stroke="${tint(o.accent, 0.7)}" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
    <circle cx="${cx}" cy="${cy}" r="${R + 2}" fill="none" stroke="${tint(o.accent, 0.5)}" stroke-width="1.5" opacity="0.7"/>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#bg${id})"/>
    <g clip-path="url(#clip${id})"><rect class="gav-bg" x="${cx - R}" y="${cy - R}" width="${2 * R}" height="${2 * R}"/>${innerMarkup(cx - R, cy - R, 2 * R)}</g>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${shade(o.color, 0.25)}" stroke-width="1.5" opacity="0.45"/>
    ${laurelEls}${crownEl}
  </svg>`;
}

/** Builder: Custom-Figur als innere Markup. */
export function customInnerBuilder(cfg: AvatarConfig) {
  return (x: number, y: number, side: number) =>
    `<svg x="${x}" y="${y}" width="${side}" height="${side}" viewBox="-12 -34 224 224">${avatarInner(cfg)}</svg>`;
}

/** Builder: fertiges Bild (DiceBear-DataURI oder illustriertes Preset) als innere Markup. */
export function imageInnerBuilder(href: string) {
  return (x: number, y: number, side: number) =>
    `<image x="${x}" y="${y}" width="${side}" height="${side}" href="${href}" preserveAspectRatio="xMidYMid slice"/>`;
}
