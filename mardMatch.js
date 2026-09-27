/**
 * CIEDE2000 色匹配（与 mard_chart_tool/color_match.py 同公式）
 * 色库使用页面已有的 HAMA_COLORS（MARD 221）。
 */
import { HAMA_COLORS, hexToRgb } from "./hamaColors.js";

export function rgb2lab(rgb) {
  let r = rgb[0] / 255;
  let g = rgb[1] / 255;
  let b = rgb[2] / 255;
  const gamma = (x) =>
    x > 0.04045 ? Math.pow((x + 0.055) / 1.055, 2.4) : x / 12.92;
  r = gamma(r);
  g = gamma(g);
  b = gamma(b);
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2127 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9503;
  const f = (t) => (t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

export function ciede2000(lab1, lab2) {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;
  const G =
    0.5 *
    (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  let h1p = (Math.atan2(b1, a1p) * 180) / Math.PI;
  let h2p = (Math.atan2(b2, a2p) * 180) / Math.PI;
  if (h1p < 0) h1p += 360;
  if (h2p < 0) h2p += 360;
  const dL = L2 - L1;
  const dC = C2p - C1p;
  let dhp = h2p - h1p;
  if (C1p * C2p === 0) dhp = 0;
  else if (dhp > 180) dhp -= 360;
  else if (dhp < -180) dhp += 360;
  const dh =
    2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI) / 180 / 2);
  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hbarp += 360;
    hbarp /= 2;
  }
  const T =
    1 -
    0.17 * Math.cos(((hbarp - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * hbarp * Math.PI) / 180) +
    0.32 * Math.cos(((3 * hbarp + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * hbarp - 63) * Math.PI) / 180);
  const dtheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const RC =
    2 *
    Math.sqrt(Math.pow(Cbarp, 7) / (Math.pow(Cbarp, 7) + Math.pow(25, 7)));
  const SL =
    1 +
    (0.015 * Math.pow(Lbarp - 50, 2)) /
      Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;
  const RT = -Math.sin((2 * dtheta * Math.PI) / 180) * RC;
  return Math.sqrt(
    Math.pow(dL / SL, 2) +
      Math.pow(dC / SC, 2) +
      Math.pow(dh / SH, 2) +
      RT * (dC / SC) * (dh / SH)
  );
}

/** @type {{ id: string, lab: number[] }[]} */
const LAB_CACHE = HAMA_COLORS.map((c) => {
  const [r, g, b] = hexToRgb(c.hex);
  return { id: c.id, lab: rgb2lab([r, g, b]) };
});

const SORTED_IDS = [...HAMA_COLORS.map((c) => c.id)].sort((a, b) => {
  const la = a.match(/^[A-Z]+/)?.[0] || "";
  const lb = b.match(/^[A-Z]+/)?.[0] || "";
  if (la !== lb) return la.localeCompare(lb);
  return (
    (parseInt(a.slice(la.length), 10) || 0) -
    (parseInt(b.slice(lb.length), 10) || 0)
  );
});

/**
 * @param {[number,number,number]|number[]} rgb
 * @param {string[]|null} [paletteIds] 限定色板；空则全库
 * @returns {[string, number]}
 */
export function findMardColor(rgb, paletteIds = null) {
  const inputLab = rgb2lab(rgb);
  const allow = paletteIds?.length ? new Set(paletteIds) : null;
  let best = null;
  let minDiff = 9999;
  for (const item of LAB_CACHE) {
    if (allow && !allow.has(item.id)) continue;
    const d = ciede2000(inputLab, item.lab);
    if (d < minDiff) {
      minDiff = d;
      best = item.id;
    }
  }
  return [best || "H1", minDiff];
}

export function cycleMardCode(code, delta) {
  const i = SORTED_IDS.indexOf(code);
  if (i < 0) return SORTED_IDS[0];
  const n = SORTED_IDS.length;
  return SORTED_IDS[(i + delta + n) % n];
}

export { SORTED_IDS };
