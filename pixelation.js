/**
 * 拼豆像素化算法（独立实现，思路参考 Zippland/perler-beads README）
 * - 格内主导色 / 平均色采样
 * - BFS 相似色连通域合并（去杂色）
 * - 边界洪水填充去背景
 *
 * 上游项目：https://github.com/Zippland/perler-beads （AGPL-3.0）
 * 本文件根据公开算法描述重写，非逐字移植其源码。
 */
import {
  nearestColor,
  hexToRgb,
  weightedDistance,
  colorById,
} from "./hamaColors.js";

/**
 * 从原图生成色号网格
 * @param {HTMLImageElement} img
 * @param {number} gridN
 * @param {number} [gridM]
 * @param {{
 *   mode?: 'dominant'|'average',
 *   mergeThreshold?: number,
 *   removeBackground?: boolean,
 *   bgKeys?: string[],
 * }} [opts]
 * @returns {(string|null)[][]}
 */
export function imageToBeadGrid(img, gridN, gridM = gridN, opts = {}) {
  const mode = opts.mode === "average" ? "average" : "dominant";
  const mergeThreshold =
    opts.mergeThreshold != null ? Number(opts.mergeThreshold) : 28;
  const removeBackground = opts.removeBackground !== false;
  // 常见浅色/白色作背景候选（MARD 221）
  const bgKeys = new Set(
    opts.bgKeys || ["H17", "A1", "A2", "H16", "H18", "H19", "H20", "A8"]
  );

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const sample = document.createElement("canvas");
  sample.width = w;
  sample.height = h;
  const sctx = sample.getContext("2d", { willReadFrequently: true });
  sctx.drawImage(img, 0, 0, w, h);
  const imageData = sctx.getImageData(0, 0, w, h);

  /** @type {{ id: string|null, external?: boolean }[][]} */
  const grid = [];
  const cellW = w / gridN;
  const cellH = h / gridM;

  for (let j = 0; j < gridM; j++) {
    const row = [];
    for (let i = 0; i < gridN; i++) {
      const x0 = Math.floor(i * cellW);
      const y0 = Math.floor(j * cellH);
      const x1 = Math.min(w, Math.ceil((i + 1) * cellW));
      const y1 = Math.min(h, Math.ceil((j + 1) * cellH));
      const rep = cellRepresentative(
        imageData,
        x0,
        y0,
        Math.max(1, x1 - x0),
        Math.max(1, y1 - y0),
        mode
      );
      if (!rep) {
        row.push({ id: null, external: true });
      } else {
        row.push({ id: nearestColor(rep.r, rep.g, rep.b).id });
      }
    }
    grid.push(row);
  }

  if (mergeThreshold > 0) {
    mergeSimilarRegions(grid, mergeThreshold);
  }
  if (removeBackground) {
    floodRemoveBackground(grid, bgKeys);
  }

  return grid.map((row) => row.map((c) => (c.external ? null : c.id)));
}

function cellRepresentative(imageData, startX, startY, width, height, mode) {
  const data = imageData.data;
  const imgW = imageData.width;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  const freq = new Map();
  let bestKey = "";
  let bestN = 0;
  const q = (v) => v >> 4;

  for (let y = startY; y < startY + height; y++) {
    for (let x = startX; x < startX + width; x++) {
      const i = (y * imgW + x) * 4;
      if (data[i + 3] < 128) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      count++;
      if (mode === "average") {
        rSum += r;
        gSum += g;
        bSum += b;
      } else {
        const key = `${q(r)},${q(g)},${q(b)}`;
        const n = (freq.get(key) || 0) + 1;
        freq.set(key, n);
        if (n > bestN) {
          bestN = n;
          bestKey = key;
        }
      }
    }
  }
  if (count === 0) return null;
  if (mode === "average") {
    return {
      r: Math.round(rSum / count),
      g: Math.round(gSum / count),
      b: Math.round(bSum / count),
    };
  }
  if (!bestKey) return null;
  const [qr, qg, qb] = bestKey.split(",").map(Number);
  return { r: (qr << 4) + 8, g: (qg << 4) + 8, b: (qb << 4) + 8 };
}

/** @type {Map<string, [number,number,number]>} */
const rgbCache = new Map();

function colorIdToRgb(id) {
  let rgb = rgbCache.get(id);
  if (rgb) return rgb;
  const c = colorById[id];
  rgb = c ? hexToRgb(c.hex) : [0, 0, 0];
  rgbCache.set(id, rgb);
  return rgb;
}

function mergeSimilarRegions(grid, threshold) {
  const H = grid.length;
  const W = grid[0].length;
  const visited = Array.from({ length: H }, () => Array(W).fill(false));
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (visited[y][x] || !grid[y][x].id) continue;

      const region = [];
      const idCount = new Map();
      const queue = [[x, y]];
      visited[y][x] = true;

      while (queue.length) {
        const [cx, cy] = queue.shift();
        const cell = grid[cy][cx];
        if (!cell.id) continue;
        region.push([cx, cy]);
        idCount.set(cell.id, (idCount.get(cell.id) || 0) + 1);
        const rgbA = colorIdToRgb(cell.id);

        for (const [dx, dy] of dirs) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          if (visited[ny][nx]) continue;
          const nb = grid[ny][nx];
          if (!nb.id) continue;
          const rgbB = colorIdToRgb(nb.id);
          const d = Math.sqrt(
            weightedDistance(
              rgbA[0],
              rgbA[1],
              rgbA[2],
              rgbB[0],
              rgbB[1],
              rgbB[2]
            )
          );
          if (d <= threshold) {
            visited[ny][nx] = true;
            queue.push([nx, ny]);
          }
        }
      }

      let bestId = null;
      let bestC = 0;
      for (const [id, c] of idCount) {
        if (c > bestC) {
          bestC = c;
          bestId = id;
        }
      }
      if (!bestId) continue;
      for (const [px, py] of region) {
        grid[py][px].id = bestId;
      }
    }
  }
}

function floodRemoveBackground(grid, bgKeys) {
  const H = grid.length;
  const W = grid[0].length;
  const queue = [];
  const seen = Array.from({ length: H }, () => Array(W).fill(false));

  const tryPush = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    if (seen[y][x]) return;
    const cell = grid[y][x];
    if (!cell.id || !bgKeys.has(cell.id)) return;
    seen[y][x] = true;
    queue.push([x, y]);
  };

  for (let x = 0; x < W; x++) {
    tryPush(x, 0);
    tryPush(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    tryPush(0, y);
    tryPush(W - 1, y);
  }

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (queue.length) {
    const [x, y] = queue.shift();
    grid[y][x].external = true;
    grid[y][x].id = null;
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (seen[ny][nx]) continue;
      const nb = grid[ny][nx];
      if (!nb.id || !bgKeys.has(nb.id)) continue;
      seen[ny][nx] = true;
      queue.push([nx, ny]);
    }
  }
}

export default { imageToBeadGrid };
