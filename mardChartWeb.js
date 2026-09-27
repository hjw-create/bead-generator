/**
 * 网页版拼豆图纸识别：四点透视矫正 → 切格 → CIEDE2000 匹配
 * （对应 Python mard_chart_tool/app.py 核心逻辑，无 OpenCV）
 */
import { findMardColor } from "./mardMatch.js";
import { colorById, hexToRgb } from "./hamaColors.js";

/** 解 8×8 线性方程组（高斯消元），求透视矩阵 */
function solve8(A, b) {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    [M[col], M[piv]] = [M[piv], M[col]];
    const div = M[col][col] || 1e-12;
    for (let c = col; c <= n; c++) M[col][c] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row) => row[n]);
}

/**
 * 源四点 → 目标矩形 的 3×3 透视矩阵（行主序 9 元，h22=1）
 * pts: [[x,y],...] 顺序 左上、右上、右下、左下
 */
export function getPerspectiveTransform(src, dst) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    b.push(v);
  }
  const h = solve8(A, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function invert3x3(H) {
  const [a, b, c, d, e, f, g, h, i] = H;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const Hh = -(a * f - c * d);
  const I = a * e - b * d;
  const det = a * A + b * B + c * C || 1e-12;
  return [
    A / det,
    D / det,
    G / det,
    B / det,
    E / det,
    Hh / det,
    C / det,
    F / det,
    I / det,
  ];
}

function applyH(H, x, y) {
  const w = H[6] * x + H[7] * y + H[8];
  return [
    (H[0] * x + H[1] * y + H[2]) / w,
    (H[3] * x + H[4] * y + H[5]) / w,
  ];
}

function sampleBilinear(data, w, h, x, y) {
  if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) {
    const xi = Math.max(0, Math.min(w - 1, Math.round(x)));
    const yi = Math.max(0, Math.min(h - 1, Math.round(y)));
    const o = (yi * w + xi) * 4;
    return [data[o], data[o + 1], data[o + 2]];
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const o00 = (y0 * w + x0) * 4;
  const o10 = o00 + 4;
  const o01 = o00 + w * 4;
  const o11 = o01 + 4;
  const out = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const v =
      data[o00 + k] * (1 - fx) * (1 - fy) +
      data[o10 + k] * fx * (1 - fy) +
      data[o01 + k] * (1 - fx) * fy +
      data[o11 + k] * fx * fy;
    out[k] = Math.round(v);
  }
  return out;
}

/**
 * @param {ImageData|{width:number,height:number,data:Uint8ClampedArray}} imgData
 * @param {number[][]} pts
 * @param {number} cols
 * @param {number} rows
 * @param {number} [cellPx=18]
 */
export function warpPerspective(imgData, pts, cols, rows, cellPx = 18) {
  const outW = Math.max(8, Math.round(cols * cellPx));
  const outH = Math.max(8, Math.round(rows * cellPx));
  const dst = [
    [0, 0],
    [outW - 1, 0],
    [outW - 1, outH - 1],
    [0, outH - 1],
  ];
  const H = getPerspectiveTransform(pts, dst);
  const Hinv = invert3x3(H);
  const outData = new Uint8ClampedArray(outW * outH * 4);
  const { data, width: w, height: h } = imgData;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const [sx, sy] = applyH(Hinv, x, y);
      const [r, g, b] = sampleBilinear(data, w, h, sx, sy);
      const o = (y * outW + x) * 4;
      outData[o] = r;
      outData[o + 1] = g;
      outData[o + 2] = b;
      outData[o + 3] = 255;
    }
  }
  if (typeof ImageData !== "undefined") {
    return new ImageData(outData, outW, outH);
  }
  return { width: outW, height: outH, data: outData };
}

function sampleCellRgb(warped, r, c, rows, cols, marginRatio = 0.22) {
  const { width: w, height: h, data } = warped;
  const cellW = w / cols;
  const cellH = h / rows;
  const mx = cellW * marginRatio;
  const my = cellH * marginRatio;
  let x1 = Math.floor(c * cellW + mx);
  let x2 = Math.ceil((c + 1) * cellW - mx);
  let y1 = Math.floor(r * cellH + my);
  let y2 = Math.ceil((r + 1) * cellH - my);
  x1 = Math.max(0, x1);
  y1 = Math.max(0, y1);
  x2 = Math.min(w, Math.max(x1 + 1, x2));
  y2 = Math.min(h, Math.max(y1 + 1, y2));
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const o = (y * w + x) * 4;
      sr += data[o];
      sg += data[o + 1];
      sb += data[o + 2];
      n++;
    }
  }
  if (!n) return [255, 255, 255];
  return [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)];
}

/**
 * @param {ImageData|{width:number,height:number,data:Uint8ClampedArray}} imgData
 * @param {{ points: number[][], cols: number, rows: number, paletteIds?: string[]|null, cellPx?: number, onProgress?: (r:number,rows:number)=>void }} opts
 */
export function recognizeMardChart(imgData, opts) {
  const cols = Math.max(1, Math.min(200, opts.cols | 0));
  const rows = Math.max(1, Math.min(200, opts.rows | 0));
  const pts = opts.points;
  if (!pts || pts.length !== 4) throw new Error("需要恰好 4 个角点");
  const warped = warpPerspective(imgData, pts, cols, rows, opts.cellPx || 18);
  /** @type {string[][]} */
  const cells = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const rgb = sampleCellRgb(warped, r, c, rows, cols);
      const [code] = findMardColor(rgb, opts.paletteIds || null);
      row.push(code);
    }
    cells.push(row);
    opts.onProgress?.(r + 1, rows);
  }
  return { cols, rows, cells, warped };
}

/** 色号矩阵 txt */
export function codesMatrixText(cells, cols, rows) {
  const lines = [`# MARD codes  rows=${rows} cols=${cols}`];
  for (const row of cells) lines.push(row.join("\t"));
  return lines.join("\n") + "\n";
}

/** 用量统计 txt */
export function beadCountsText(cells) {
  /** @type {Map<string, number>} */
  const cnt = new Map();
  for (const row of cells) {
    for (const id of row) {
      if (!id) continue;
      cnt.set(id, (cnt.get(id) || 0) + 1);
    }
  }
  const ranked = [...cnt.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
  const lines = ["# 色号\t数量\tHEX"];
  let total = 0;
  for (const [id, n] of ranked) {
    const hex = colorById[id]?.hex || "?";
    lines.push(`${id}\t${n}\t${hex}`);
    total += n;
  }
  lines.push(`# TOTAL\t${total}`);
  lines.push(`# 色种数\t${ranked.length}`);
  return lines.join("\n") + "\n";
}

/** 带色号标注的预览图（返回 Canvas） */
export function renderAnnotatedCanvas(warped, cells, cols, rows) {
  const cnv = document.createElement("canvas");
  cnv.width = warped.width;
  cnv.height = warped.height;
  const ctx = cnv.getContext("2d");
  if (typeof ImageData !== "undefined" && warped instanceof ImageData) {
    ctx.putImageData(warped, 0, 0);
  } else if (typeof ImageData !== "undefined") {
    ctx.putImageData(
      new ImageData(warped.data, warped.width, warped.height),
      0,
      0
    );
  }
  const cellW = warped.width / cols;
  const cellH = warped.height / rows;
  const overlay = document.createElement("canvas");
  overlay.width = cnv.width;
  overlay.height = cnv.height;
  const octx = overlay.getContext("2d");
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = cells[r][c];
      const hex = colorById[id]?.hex || "#888888";
      const [rr, gg, bb] = hexToRgb(hex);
      octx.fillStyle = `rgb(${rr},${gg},${bb})`;
      octx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
    }
  }
  ctx.globalAlpha = 0.55;
  ctx.drawImage(overlay, 0, 0);
  ctx.globalAlpha = 1;
  const fontScale = Math.max(0.25, Math.min(0.55, cellW / 40));
  ctx.font = `${Math.round(fontScale * 28)}px sans-serif`;
  ctx.textBaseline = "middle";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = cells[r][c];
      const hex = colorById[id]?.hex || "#888";
      const [rr, gg, bb] = hexToRgb(hex);
      const bright = (rr + gg + bb) / 3;
      ctx.fillStyle = bright > 140 ? "#141414" : "#ffffff";
      const x = c * cellW + 2;
      const y = r * cellH + cellH * 0.55;
      if (cellW >= 12 && cellH >= 12) ctx.fillText(id, x, y);
      ctx.strokeStyle = "rgba(40,40,40,0.5)";
      ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
    }
  }
  return cnv;
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function downloadCanvasPng(canvas, filename) {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}
