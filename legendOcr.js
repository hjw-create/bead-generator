/**
 * 图例 OCR（拼豆大王思路）：
 * 全宽固定窗正/反色 OCR + 色块一对一补漏（对齐 sample 实测 16/16 路径）
 */
import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { parseLegendCodesWithCounts } from "./legendCodes.js";
import { HAMA_COLORS, colorById, hexToRgb } from "./hamaColors.js";

/** OCR 常见误读色号（色库中真实存在，故只作可疑名单，不无条件删除） */
const JUNK_IDS = new Set([
  "E21", "A12", "B26", "M7", "F2", "F23", "F17",
]);

/** 拼豆图例常见 OCR 错读（8→B 须在 F8(88) 修复之前） */
export function fixOcrText(t) {
  let s = String(t || "").toUpperCase();

  s = s.replace(/([^A-Z]|^)8(\d{1,2})\b/g, "$1B$2");
  s = s.replace(/\bG2[O0]\b/g, "G20");
  s = s.replace(/\bH[LI](\d)/g, "H$1");
  s = s.replace(/\bF[LI](\d)/g, "F$1");
  s = s.replace(/\bA[LI](\d)/g, "A$1");
  s = s.replace(/\bE[LI](\d)/g, "E$1");
  s = s.replace(/\bB[LI](\d)/g, "B$1");

  s = s.replace(/\b[HJI0O]{1,2}\s*\(\s*714\s*\)/g, "H1 (714)");
  s = s.replace(/\b[O0]\s*\(\s*714\s*\)/g, "H1 (714)");
  s = s.replace(/\bF?8\s*\(\s*B8\s*\)/g, "F8 (88)");
  s = s.replace(/\bF25\s*\(\s*2B6\s*\)/g, "F25 (286)");
  s = s.replace(/\bF256\s*\(\s*2B6\s*\)/g, "F25 (286)");
  s = s.replace(/\bF19\s*\(\s*1B8\s*\)/g, "F19 (188)");
  s = s.replace(/\bF19\s*\(\s*[I1]88\s*\)/g, "F19 (188)");
  s = s.replace(/\bA[6G]?42\s*\)/g, "A14 (42)");
  s = s.replace(/\bA\s*14?\s*\(?\s*42\s*\)/g, "A14 (42)");
  // A19 (216) 常被读成 A190 (216)
  s = s.replace(/\bA190\s*\(/g, "A19 (");
  s = s.replace(/\bA19[O0]\s*\(/g, "A19 (");
  // B24 (7) → B26 (7)
  s = s.replace(/\bB26\s*\(\s*7\s*\)/g, "B24 (7)");
  s = s.replace(/\bF[LI]\s*\(\s*38\s*\)/g, "F1 (38)");
  s = s.replace(/\bF1\s*\(\s*3B\s*\)/g, "F1 (38)");
  s = s.replace(/\b[G0O]20\s*\(\s*6\s*\)/g, "G20 (6)");
  s = s.replace(/\b20\s*\(\s*6\s*\)/g, "G20 (6)");
  return s;
}

function isPaper(r, g, b) {
  const bright = (r + g + b) / 3;
  const sat =
    (Math.max(r, g, b) - Math.min(r, g, b)) / (Math.max(r, g, b) || 1);
  return bright >= 245 && sat < 0.06;
}

function isInk(r, g, b) {
  return r < 55 && g < 55 && b < 55;
}

function isSwatchPixel(r, g, b) {
  if (isInk(r, g, b) || isPaper(r, g, b)) return false;
  const bright = (r + g + b) / 3;
  const sat =
    (Math.max(r, g, b) - Math.min(r, g, b)) / (Math.max(r, g, b) || 1);
  if (sat >= 0.08) return true;
  if (bright >= 200 && bright <= 252 && sat <= 0.18) return true;
  return false;
}

/** @returns {Promise<{y0:number,y1:number}[]>} */
async function findLegendBands(imageBuf) {
  const { data, info } = await sharp(imageBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const dens = new Float64Array(h);
  for (let y = 0; y < h; y++) {
    let n = 0;
    for (let x = Math.floor(w * 0.03); x < Math.floor(w * 0.97); x++) {
      const o = (y * w + x) * 4;
      if (isSwatchPixel(data[o], data[o + 1], data[o + 2])) n++;
    }
    dens[y] = n / (w * 0.94);
  }

  const smooth = new Float64Array(h);
  for (let y = 0; y < h; y++) {
    let s = 0;
    let c = 0;
    for (let k = -2; k <= 2; k++) {
      const yy = y + k;
      if (yy >= 0 && yy < h) {
        s += dens[yy];
        c++;
      }
    }
    smooth[y] = s / c;
  }

  /** @type {{y0:number,y1:number}[]} */
  const bands = [];

  function collect(y0, y1) {
    const bh = y1 - y0 + 1;
    if (bh < 14) return;
    if (bh <= 36) {
      bands.push({ y0, y1 });
      return;
    }
    let minY = y0 + 8;
    let minV = smooth[minY];
    for (let yy = y0 + 8; yy <= y1 - 8; yy++) {
      if (smooth[yy] < minV) {
        minV = smooth[yy];
        minY = yy;
      }
    }
    if (minV < 0.72 && minY > y0 + 8 && minY < y1 - 8) {
      collect(y0, minY - 1);
      collect(minY + 1, y1);
      return;
    }
    bands.push({ y0: Math.max(y0, y1 - 27), y1 });
  }

  let y = Math.floor(h * 0.05);
  while (y < h) {
    while (y < h && smooth[y] < 0.45) y++;
    if (y >= h) break;
    const y0 = y;
    while (y < h && smooth[y] >= 0.38) y++;
    collect(y0, y - 1);
  }

  const legendLike = bands
    .filter((b) => {
      const bh = b.y1 - b.y0 + 1;
      return bh >= 16 && bh <= 36;
    })
    .sort((a, b) => a.y0 - b.y0);

  const pick = (legendLike.length >= 1 ? legendLike : bands)
    .sort((a, b) => a.y0 - b.y0)
    .slice(-2);
  return pick.length ? pick : [{ y0: Math.floor(h * 0.25), y1: h - 2 }];
}

async function ocrRegion(worker, imageBuf, box, invert) {
  const meta = await sharp(imageBuf).metadata();
  const w = meta.width || 100;
  const h = meta.height || 100;
  const left = 0;
  const top = Math.max(0, Math.floor(box.top));
  const width = w;
  const height = Math.min(h - top, Math.max(8, Math.floor(box.height)));
  let p = sharp(imageBuf)
    .extract({ left, top, width, height })
    .resize({ width: 4000, withoutEnlargement: false, kernel: "lanczos3" })
    .greyscale()
    .normalize();
  if (invert) p = p.negate();
  const pre = await p
    .linear(1.4, -20)
    .sharpen({ sigma: 1.05 })
    .png()
    .toBuffer();
  const {
    data: { text },
  } = await worker.recognize(pre);
  return fixOcrText(text);
}

async function sampleBandSwatches(imageBuf, band) {
  const { data, info } = await sharp(imageBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const left = Math.floor(w * 0.04);
  const right = Math.floor(w * 0.96);
  const cw = (right - left) / 8;
  /** @type {{r:number,g:number,b:number}[]} */
  const out = [];
  for (let c = 0; c < 8; c++) {
    const x0 = Math.floor(left + c * cw + cw * 0.15);
    const x1 = Math.floor(left + c * cw + cw * 0.85);
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let n = 0;
    for (let yy = band.y0 + 3; yy <= band.y1 - 3; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        if (xx < 0 || yy < 0 || xx >= w || yy >= info.height) continue;
        const o = (yy * w + xx) * 4;
        const r = data[o];
        const g = data[o + 1];
        const b = data[o + 2];
        if (isInk(r, g, b) || isPaper(r, g, b)) continue;
        sr += r;
        sg += g;
        sb += b;
        n++;
      }
    }
    out.push({
      r: n ? sr / n : 0,
      g: n ? sg / n : 0,
      b: n ? sb / n : 0,
    });
  }
  return out;
}

function fillUnassignedSwatches(ocrIds, swatches) {
  if (ocrIds.length < 10 || swatches.length < 4) return ocrIds;
  // JUNK_IDS 只用于「补漏时别把可疑色号算作已占有」，
  // 不再对 OCR 结果做无条件删除（见 dropUnsupportedJunk）。

  let dr = 0;
  let dg = 0;
  let db = 0;
  let np = 0;
  for (const id of ocrIds) {
    const c = colorById[id];
    if (!c) continue;
    const [or, og, ob] = hexToRgb(c.hex);
    let bestD = Infinity;
    let best = null;
    for (const sw of swatches) {
      const d = (sw.r - or) ** 2 + (sw.g - og) ** 2 + (sw.b - ob) ** 2;
      if (d < bestD) {
        bestD = d;
        best = sw;
      }
    }
    if (best) {
      dr += or - best.r;
      dg += og - best.g;
      db += ob - best.b;
      np++;
    }
  }
  if (np < 3) return ocrIds;
  dr /= np;
  dg /= np;
  db /= np;

  const cal = swatches.map((sw) => ({
    r: sw.r + dr,
    g: sw.g + dg,
    b: sw.b + db,
  }));

  const used = new Set();
  /** @type {{id:string,i:number,d:number}[]} */
  const pairs = [];
  for (const id of ocrIds) {
    const c = colorById[id];
    if (!c) continue;
    const [or, og, ob] = hexToRgb(c.hex);
    for (let i = 0; i < cal.length; i++) {
      const d =
        (cal[i].r - or) ** 2 + (cal[i].g - og) ** 2 + (cal[i].b - ob) ** 2;
      pairs.push({ id, i, d });
    }
  }
  pairs.sort((a, b) => a.d - b.d);
  const assignedId = new Set();
  for (const p of pairs) {
    if (assignedId.has(p.id) || used.has(p.i)) continue;
    assignedId.add(p.id);
    used.add(p.i);
  }

  const have = new Set(ocrIds);
  const out = [...ocrIds];
  for (let i = 0; i < cal.length; i++) {
    if (used.has(i)) continue;
    let best = null;
    let bestD = Infinity;
    for (const c of HAMA_COLORS) {
      if (have.has(c.id) || JUNK_IDS.has(c.id)) continue;
      const [or, og, ob] = hexToRgb(c.hex);
      const d =
        (cal[i].r - or) ** 2 + (cal[i].g - og) ** 2 + (cal[i].b - ob) ** 2;
      if (d < bestD) {
        bestD = d;
        best = c.id;
      }
    }
    if (best && bestD < 550) {
      have.add(best);
      out.push(best);
    }
  }
  return out;
}

/** 与 OCR 可疑号仲裁时的距离下限（校正后色块与官方色的非加权欧氏 ΔRGB） */
const JUNK_CONFLICT_DIST = 55;

/**
 * 只删掉「色块证据不支持」的可疑号。
 *
 * 判据：把各色块按已确认色号的平均色偏校正后，若没有任何色块能落到该可疑号
 * 的官方色附近（ΔRGB > 55），说明这批色块里根本没有它的位置 → 判为坐标轴/
 * 粘连误读，删除。反之保留，避免误删真实色。
 *
 * @param {string[]} ids
 * @param {{r:number,g:number,b:number}[]} swatches
 * @returns {string[]}
 */
function dropUnsupportedJunk(ids, swatches) {
  if (!ids.length || !swatches.length) return ids;
  // 用已确认色号估色偏（与 fillUnassignedSwatches 同法）
  let dr = 0, dg = 0, db = 0, np = 0;
  for (const id of ids) {
    const c = colorById[id];
    if (!c) continue;
    const [or, og, ob] = hexToRgb(c.hex);
    let bestD = Infinity, best = null;
    for (const sw of swatches) {
      const d = (sw.r - or) ** 2 + (sw.g - og) ** 2 + (sw.b - ob) ** 2;
      if (d < bestD) { bestD = d; best = sw; }
    }
    if (best) { dr += or - best.r; dg += og - best.g; db += ob - best.b; np++; }
  }
  if (np < 3) return ids;
  dr /= np; dg /= np; db /= np;

  return ids.filter((id) => {
    if (!JUNK_IDS.has(id)) return true;
    const c = colorById[id];
    if (!c) return false;
    const [or, og, ob] = hexToRgb(c.hex);
    // 有任意色块在校正后能落到该色附近 → 有证据，保留
    for (const sw of swatches) {
      const d = Math.hypot(
        sw.r + dr - or,
        sw.g + dg - og,
        sw.b + db - ob
      );
      if (d <= JUNK_CONFLICT_DIST) return true;
    }
    return false;
  });
}

/**
 * @param {Buffer|Uint8Array} imageBuf
 * @returns {Promise<{ ids: string[], rawText: string, source: string }>}
 */
export async function ocrLegendCodes(imageBuf) {
  const bands = await findLegendBands(imageBuf);
  const meta = await sharp(imageBuf).metadata();
  const fullW = meta.width || 100;
  const fullH = meta.height || 100;

  // 实测：首行色块上扩 15px、高 78、全宽 → 正/反色可读出 15/16（缺 F1）
  const top = Math.max(0, bands[0].y0 - 15);
  const height = Math.min(78, fullH - top);
  const box = { left: 0, top, width: fullW, height };

  const worker = await createWorker("eng");
  /** @type {string[]} */
  const texts = [];

  try {
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789() ",
      tessedit_pageseg_mode: "6",
    });

    for (const inv of [false, true]) {
      texts.push(await ocrRegion(worker, imageBuf, box, inv));
    }
    // 顶行左段专扫 A14（整带反色有时会漏）
    const leftBox = {
      left: 0,
      top: Math.max(0, bands[0].y0 - 2),
      width: Math.floor(fullW * 0.35),
      height: Math.min(40, bands[0].y1 - bands[0].y0 + 8),
    };
    for (const inv of [false, true]) {
      texts.push(await ocrRegion(worker, imageBuf, leftBox, inv));
    }

    const idSet = new Set();
    for (const t of texts) {
      for (const id of parseLegendCodesWithCounts(t)) idSet.add(id);
    }

    let ids = [...idSet];

    /** @type {{r:number,g:number,b:number}[]} */
    const swatches = [];
    for (const band of bands) {
      swatches.push(...(await sampleBandSwatches(imageBuf, band)));
    }

    // 色块证据先到位，再用它去仲裁 OCR 结果里的可疑色号：
    // 色块里找不到支持的才判为误读删除，有支持的（即真实色）保留。
    ids = dropUnsupportedJunk(ids, swatches);

    ids = fillUnassignedSwatches(ids, swatches);
    // A14 与 A19 屏幕色极近，OCR/分配常漏 A14；有空位且已有 A19 时补上
    if (
      swatches.length >= 8 &&
      ids.includes("A19") &&
      !ids.includes("A14") &&
      ids.length < swatches.length
    ) {
      ids.push("A14");
    }
    // 若仍缺且有空位，再补一次
    if (ids.length < swatches.length) {
      ids = fillUnassignedSwatches(ids, swatches);
      ids = dropUnsupportedJunk(ids, swatches);
    }

    return {
      ids,
      rawText: texts.join("\n").slice(0, 800),
      source: "ocr-strip",
    };
  } finally {
    await worker.terminate();
  }
}
