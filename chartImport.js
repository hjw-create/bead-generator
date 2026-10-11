/**
 * 拼豆大王式识别核心（人工对齐 + 锁定图例色板）
 *
 * 1. extractLegendFromRect — 用户框选图例区 → 得到色号列表（可再手改）
 * 2. fillGridFromAlign — 用户对准网格原点/格距 → 只在锁定色板里逐格匹配
 */
import {
  nearestColor,
  hexToRgb,
  colorById,
  weightedDistance,
  HAMA_COLORS,
} from "./hamaColors.js";

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
export function clampInt(v, min, max) {
  return clamp(Math.round(Number(v) || 0), min, max);
}

/** @param {HTMLImageElement} img */
export function imageToImageData(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, w, h);
}

/**
 * 从图例矩形区域提取色号（色块水平连段投票 → 映射 221）
 * @param {ImageData|{width:number,height:number,data:Uint8ClampedArray}} imgData
 * @param {{ x: number, y: number, w: number, h: number }} rect 原图像素坐标
 * @returns {{ ids: string[], entries: { id: string, hex: string, votes: number }[] }}
 */
export function extractLegendFromRect(imgData, rect) {
  const crop = cropRect(imgData, rect.x, rect.y, rect.w, rect.h);
  /** @type {Map<string, number>} */
  const votes = new Map();
  const { width, height, data } = crop;

  for (let y = Math.floor(height * 0.05); y < Math.floor(height * 0.95); y += 1) {
    let x = 0;
    while (x < width) {
      const o = (y * width + x) * 4;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      if (isInk(r, g, b) || isPaper(r, g, b) || !isLikelySwatch(r, g, b)) {
        x++;
        continue;
      }
      let j = x;
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let n = 0;
      while (j < width) {
        const oo = (y * width + j) * 4;
        const rr = data[oo];
        const gg = data[oo + 1];
        const bb = data[oo + 2];
        if (Math.hypot(rr - r, gg - g, bb - b) > 32) break;
        sr += rr;
        sg += gg;
        sb += bb;
        n++;
        j++;
      }
      if (n >= 6 && n <= 90) {
        const hit = nearestColor(sr / n, sg / n, sb / n);
        votes.set(hit.id, (votes.get(hit.id) || 0) + n);
      }
      x = Math.max(j, x + 1);
    }
  }

  // 浅色 H1：图例白块常被当纸面，补扫
  if (colorById.H1) {
    let h1 = 0;
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const o = (y * width + x) * 4;
        const r = data[o];
        const g = data[o + 1];
        const b = data[o + 2];
        if (isInk(r, g, b)) continue;
        const bright = (r + g + b) / 3;
        const sat =
          (Math.max(r, g, b) - Math.min(r, g, b)) / (Math.max(r, g, b) || 1);
        if (bright >= 210 && bright <= 252 && sat <= 0.14) {
          if (nearestColor(r, g, b).id === "H1") h1++;
        }
      }
    }
    if (h1 >= 15) votes.set("H1", (votes.get("H1") || 0) + h1);
  }

  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length) {
    return { ids: [], entries: [] };
  }
  const max = ranked[0][1];
  const entries = ranked
    .filter(([, c]) => c >= Math.max(20, max * 0.05))
    .slice(0, 24)
    .map(([id, votesN]) => ({
      id,
      hex: colorById[id]?.hex || "#888888",
      votes: votesN,
    }))
    .filter((e) => colorById[e.id]);

  return { ids: entries.map((e) => e.id), entries };
}

/**
 * 在用户粗对齐基础上，小范围搜索原点使格线落在边缘上（贴线）
 */
export function refineAlignPhase(imgData, opts) {
  const cols = clampInt(opts.cols, 8, 200);
  const rows = clampInt(opts.rows, 8, 200);
  let cellW = Math.max(2, Number(opts.cellW) || 10);
  let cellH = Math.max(2, Number(opts.cellH) || 10);
  let originX = Number(opts.originX) || 0;
  let originY = Number(opts.originY) || 0;
  const { width, height, data } = imgData;

  const xEdge = buildEdgeProj(data, width, height, "x");
  const yEdge = buildEdgeProj(data, width, height, "y");

  const maxShift = Math.max(2, Math.floor(Math.min(cellW, cellH) * 0.4));
  let best = { score: -1, ox: originX, oy: originY };

  for (let dx = -maxShift; dx <= maxShift; dx++) {
    let sx = 0;
    for (let i = 0; i <= cols; i++) {
      const px = clamp(Math.round(originX + dx + i * cellW), 0, width - 1);
      sx += xEdge[px];
    }
    for (let dy = -maxShift; dy <= maxShift; dy++) {
      let sy = 0;
      for (let j = 0; j <= rows; j++) {
        const py = clamp(Math.round(originY + dy + j * cellH), 0, height - 1);
        sy += yEdge[py];
      }
      const score = sx + sy;
      if (score > best.score) best = { score, ox: originX + dx, oy: originY + dy };
    }
  }

  return {
    originX: best.ox,
    originY: best.oy,
    cellW,
    cellH,
    cols,
    rows,
  };
}

function buildEdgeProj(data, width, height, axis) {
  const len = axis === "x" ? width : height;
  const scores = new Float64Array(len);
  if (axis === "x") {
    for (let x = 1; x < width - 1; x++) {
      let s = 0;
      for (let y = 0; y < height; y += 2) {
        const o = (y * width + x) * 4;
        s +=
          Math.abs(data[o] - data[o - 4]) +
          Math.abs(data[o + 1] - data[o - 3]) +
          Math.abs(data[o + 2] - data[o - 2]);
      }
      scores[x] = s;
    }
  } else {
    for (let y = 1; y < height - 1; y++) {
      let s = 0;
      for (let x = 0; x < width; x += 2) {
        const o = (y * width + x) * 4;
        const o0 = o - width * 4;
        s +=
          Math.abs(data[o] - data[o0]) +
          Math.abs(data[o + 1] - data[o0 + 1]) +
          Math.abs(data[o + 2] - data[o0 + 2]);
      }
      scores[y] = s;
    }
  }
  return scores;
}

/**
 * 按用户对齐的网格填格（只匹配锁定色板；色号用官方 hex）
 */
export function fillGridFromAlign(imgData, opts) {
  const cols = clampInt(opts.cols, 8, 200);
  const rows = clampInt(opts.rows, 8, 200);
  let cellW = Math.max(2, Number(opts.cellW) || 10);
  let cellH = Math.max(2, Number(opts.cellH) || 10);
  let originX = Number(opts.originX) || 0;
  let originY = Number(opts.originY) || 0;
  const allowEmpty = opts.allowEmpty === true;

  if (opts.refine !== false) {
    const r = refineAlignPhase(imgData, {
      originX,
      originY,
      cellW,
      cellH,
      cols,
      rows,
    });
    originX = r.originX;
    originY = r.originY;
  }

  const palette = (opts.paletteIds || [])
    .map((id) => colorById[id])
    .filter(Boolean);
  if (!palette.length) {
    throw new Error("请先锁定图例色板（至少 1 个色号）。");
  }

  /** @type {(string|null)[][]} */
  const cells = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      const x0 = Math.round(originX + x * cellW);
      const y0 = Math.round(originY + y * cellH);
      const x1 = Math.round(originX + (x + 1) * cellW);
      const y1 = Math.round(originY + (y + 1) * cellH);
      row.push(
        classifyCellInImage(imgData, x0, y0, x1, y1, palette, allowEmpty)
      );
    }
    cells.push(row);
  }

  majoritySmooth(cells);
  fillIsolatedHoles(cells, palette);
  majoritySmooth(cells);

  if (!allowEmpty) {
    const fillId =
      palette.find((c) => c.id === "H1")?.id ||
      palette.find((c) => c.id === "H2")?.id ||
      palette[0].id;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!cells[y][x]) cells[y][x] = fillId;
      }
    }
  }

  return {
    cells,
    cols,
    rows,
    paletteIds: palette.map((c) => c.id),
    originX,
    originY,
    cellW,
    cellH,
  };
}

/**
 * 兼容旧入口：自动裁切（精度低于手动对齐，保留给非向导调用）
 */
export function recognizeFinishedChart(img, opts = {}) {
  const cols = clampInt(opts.cols ?? 52, 8, 200);
  const rows = clampInt(opts.rows ?? 50, 8, 200);
  const imgData =
    img && img.data && typeof img.width === "number" && !img.naturalWidth
      ? img
      : imageToImageData(img);

  // 默认：底部约 14% 当图例，其余均分网格（仅兜底）
  const legendH = Math.round(imgData.height * 0.14);
  const legend = extractLegendFromRect(imgData, {
    x: Math.round(imgData.width * 0.02),
    y: imgData.height - legendH,
    w: Math.round(imgData.width * 0.96),
    h: legendH,
  });
  const margin = Math.round(Math.min(imgData.width, imgData.height) * 0.06);
  const gridW = imgData.width - margin * 2;
  const gridH = imgData.height - margin * 2 - legendH;
  const ids =
    legend.ids.length >= 2
      ? legend.ids
      : ["H1", "F19", "F25", "A19", "F8", "F1", "F3", "B13"];

  return fillGridFromAlign(imgData, {
    originX: margin,
    originY: margin,
    cellW: gridW / cols,
    cellH: gridH / rows,
    cols,
    rows,
    paletteIds: ids,
  });
}

function cropRect(imgData, x, y, w, h) {
  const { width, data } = imgData;
  x = clamp(Math.round(x), 0, width - 1);
  y = clamp(Math.round(y), 0, imgData.height - 1);
  w = clamp(Math.round(w), 1, width - x);
  h = clamp(Math.round(h), 1, imgData.height - y);
  const out = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++) {
    const src = ((y + row) * width + x) * 4;
    out.set(data.subarray(src, src + w * 4), row * w * 4);
  }
  return { width: w, height: h, data: out };
}

function classifyCellInImage(imgData, x0, y0, x1, y1, palette, allowEmpty) {
  const sample = sampleCellRgb(imgData, x0, y0, x1, y1, palette);
  if (!sample) {
    if (allowEmpty) return null;
    return (
      palette.find((c) => c.id === "H1")?.id ||
      palette.find((c) => c.id === "H2")?.id ||
      palette[0].id
    );
  }

  const bright = (sample.r + sample.g + sample.b) / 3;
  const sat =
    (Math.max(sample.r, sample.g, sample.b) - Math.min(sample.r, sample.g, sample.b)) /
    (Math.max(sample.r, sample.g, sample.b) || 1);

  const hasH1 = palette.some((c) => c.id === "H1");
  const hasH2 = palette.some((c) => c.id === "H2");

  // 只把「近纯白」判作纸面/空格。旧阈值 bright>=242 && sat<=0.1 会连
  // H12 #FFF5ED(bright 245.7/sat 0.07) 这种浅色豆一起抢成 H1。
  // 收窄到 bright>=250 && sat<=0.04（真纸面实测 sat≈0）：H17/H12/H9/G15 等
  // 浅色豆全部落回 nearestInPalette，归它们自己。
  if (bright >= 250 && sat <= 0.04) {
    if (allowEmpty) return null;
    if (hasH1) return "H1";
    if (hasH2) return "H2";
  }

  // 其余一律交给色板最近色：nearestInPalette 用加权 RGB，
  // H1 只在它真的是最接近的色时才胜出，浅肤色自然归它自己。
  return nearestInPalette(sample.r, sample.g, sample.b, palette);
}

function sampleCellRgb(imgData, x0, y0, x1, y1, palette) {
  const { width, height, data } = imgData;
  x0 = clamp(Math.round(x0), 0, width - 1);
  y0 = clamp(Math.round(y0), 0, height - 1);
  x1 = clamp(Math.round(x1), x0 + 1, width);
  y1 = clamp(Math.round(y1), y0 + 1, height);
  const cellW = x1 - x0;
  const cellH = y1 - y0;
  const left = Math.round(x0 + cellW * 0.22);
  const right = Math.round(x0 + cellW * 0.78);
  const top = Math.round(y0 + cellH * 0.22);
  const bottom = Math.round(y0 + cellH * 0.78);
  if (right <= left || bottom <= top) return null;

  const cols = Math.max(3, Math.min(10, Math.round(cellW * 0.4)));
  const rows = Math.max(3, Math.min(10, Math.round(cellH * 0.4)));
  /** @type {Map<number, { w: number, r: number, g: number, b: number }>} */
  const bins = new Map();
  let bestKey = -1;
  let bestW = -1;
  let inkPixels = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const sx = clamp(
        Math.round(left + ((col + 0.5) / cols) * (right - left)),
        0,
        width - 1
      );
      const sy = clamp(
        Math.round(top + ((row + 0.5) / rows) * (bottom - top)),
        0,
        height - 1
      );
      const o = (sy * width + sx) * 4;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      if (inkDistance(r, g, b, palette) > INK_MIN_DIST) {
        inkPixels++;
        continue;
      }
      const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
      const bin = bins.get(key);
      if (bin) {
        bin.w += 1;
        bin.r += r;
        bin.g += g;
        bin.b += b;
        if (bin.w > bestW) {
          bestW = bin.w;
          bestKey = key;
        }
      } else {
        bins.set(key, { w: 1, r, g, b });
        if (1 > bestW) {
          bestW = 1;
          bestKey = key;
        }
      }
    }
  }
  const best = bins.get(bestKey);
  // 整格几乎只有墨线（豆像素不足半数）→ 视为空格/线框，不硬猜颜色
  if (!best || inkPixels > (cols * rows) / 2) return null;
  return {
    r: Math.round(best.r / best.w),
    g: Math.round(best.g / best.w),
    b: Math.round(best.b / best.w),
  };
}

function nearestInPalette(r, g, b, palette) {
  let best = palette[0].id;
  let bestD = Infinity;
  for (const c of palette) {
    const [cr, cg, cb] = hexToRgb(c.hex);
    const dr = r - cr;
    const dg = g - cg;
    const db = b - cb;
    const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < bestD) {
      bestD = d;
      best = c.id;
    }
  }
  return best;
}

function majoritySmooth(cells) {
  const rows = cells.length;
  const cols = cells[0]?.length || 0;
  const copy = cells.map((r) => r.slice());
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (copy[y][x] == null) continue;
      /** @type {Map<string, number>} */
      const counts = new Map();
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const id = copy[y + dy][x + dx];
          if (!id) continue;
          counts.set(id, (counts.get(id) || 0) + 1);
        }
      }
      let best = copy[y][x];
      let bestN = 0;
      for (const [id, n] of counts) {
        if (n > bestN) {
          bestN = n;
          best = id;
        }
      }
      if (bestN >= 5) cells[y][x] = best;
    }
  }
}

/** 图案内部孤立空洞：被同色包围的空格补上众数色 */
function fillIsolatedHoles(cells, palette) {
  const rows = cells.length;
  const cols = cells[0]?.length || 0;
  const fallback =
    palette.find((c) => c.id === "H1")?.id ||
    palette.find((c) => c.id === "H2")?.id ||
    palette[0]?.id;
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (cells[y][x] != null) continue;
      /** @type {Map<string, number>} */
      const counts = new Map();
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const id = cells[y + dy][x + dx];
          if (!id) continue;
          n++;
          counts.set(id, (counts.get(id) || 0) + 1);
        }
      }
      if (n < 5) continue;
      let best = fallback;
      let bestN = 0;
      for (const [id, c] of counts) {
        if (c > bestN) {
          bestN = c;
          best = id;
        }
      }
      cells[y][x] = best;
    }
  }
}

/**
 * 是否墨线/字迹：到色板最近色的加权 RGB 距离超过 `INK_MIN_DIST`。
 *
 * 不能只看亮度与饱和度 —— MARD H7 就是纯黑 #000000，H16/B23/H6 也极暗，
 * 旧阈值 (max<68 && 差<40) 会把这四个真实豆色当墨迹丢弃。
 * 墨线是纯灰阶且不属于任何一色豆，实测其 ΔRGB 均 > 40；豆色（含 H7）Δ≈0。
 */
const INK_MIN_DIST = 40;

/**
 * 到给定色板的最近色距离（加权 RGB）
 * @param {{hex:string}[]} palette
 */
function inkDistance(r, g, b, palette) {
  let best = Infinity;
  for (const c of palette) {
    const d = weightedDistance(r, g, b, ...hexToRgb(c.hex));
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/**
 * 是否墨线/字迹（对照全色板）。
 * 图例提取阶段色板还没锁定，只能用全库。
 */
function isInk(r, g, b) {
  return inkDistance(r, g, b, HAMA_COLORS) > INK_MIN_DIST;
}
function isPaper(r, g, b) {
  const bright = (r + g + b) / 3;
  const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / (Math.max(r, g, b) || 1);
  return bright > 248 && sat < 0.06;
}
function isLikelySwatch(r, g, b) {
  // 旧条件还要求 sat >= 0.18，把低饱和的真实色整色丢掉：
  // M7 #B4A497 sat≈0.16、E21 #BD9DA1 sat≈0.17 都过不了，
  // 结果含这两个色的图例永远读不出色号。判据改为「非纸非墨」。
  return !isPaper(r, g, b) && !isInk(r, g, b) && (r + g + b) / 3 > 30;
}

export { isInk, isPaper, isLikelySwatch, inkDistance, INK_MIN_DIST };

export default {
  extractLegendFromRect,
  fillGridFromAlign,
  recognizeFinishedChart,
  imageToImageData,
};
