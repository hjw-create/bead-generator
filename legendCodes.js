/**
 * 图例色号解析 / 合并（浏览器与 Node 共用，无原生依赖）
 */
import { colorById } from "./hamaColors.js";

const CODE_RE = /\b([A-HM]\d{1,2})\b/gi;
/** 色号后必须带数量，如 F19 (188) — 避免坐标轴误读成 B4/M2 */
const CODE_COUNT_RE = /\b([A-HM]\d{1,2})\s*\(\s*\d{1,4}\s*\)/gi;

/** @param {string} text */
export function parseCodesFromText(text) {
  /** @type {string[]} */
  const found = [];
  const seen = new Set();
  const upper = String(text || "").toUpperCase();
  let m;
  CODE_RE.lastIndex = 0;
  while ((m = CODE_RE.exec(upper))) {
    const id = m[1];
    if (!colorById[id] || seen.has(id)) continue;
    seen.add(id);
    found.push(id);
  }
  return found;
}

/**
 * 只收「色号 (数量)」形式，图例 OCR 专用
 * @param {string} text
 */
export function parseLegendCodesWithCounts(text) {
  /** @type {string[]} */
  const found = [];
  const seen = new Set();
  const upper = String(text || "").toUpperCase();
  let m;
  CODE_COUNT_RE.lastIndex = 0;
  while ((m = CODE_COUNT_RE.exec(upper))) {
    const id = m[1];
    // 旧代码在此硬删 B8/M2 —— 这两个是色库里真实存在的 MARD 色，
    // 删掉会让含它们的图纸丢色。坐标轴误读由上游 OCR 纠错处理。
    if (!colorById[id] || seen.has(id)) continue;
    seen.add(id);
    found.push(id);
  }
  return found;
}

/**
 * OCR 色号优先；色块投票只补漏
 * @param {string[]} ocrIds
 * @param {string[]} colorIds
 */
export function mergeLegendIds(ocrIds, colorIds) {
  const out = [];
  const seen = new Set();
  for (const id of ocrIds || []) {
    if (!colorById[id] || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  for (const id of colorIds || []) {
    if (!colorById[id] || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
