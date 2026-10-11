/**
 * 无依赖自检：node mard-selftest.mjs
 *
 * 每条断言都打到生产代码的真实导出（不复制阈值），改动后必须全绿。
 * 断言清单对应 issue 中列出的缺陷。
 */
import assert from "node:assert/strict";
import { HAMA_COLORS, hexToRgb, nearestColor } from "./hamaColors.js";
import {
  isInk,
  extractLegendFromRect,
  fillGridFromAlign,
} from "./chartImport.js";
import { fixOcrText } from "./legendOcr.js";
import { parseLegendCodesWithCounts } from "./legendCodes.js";

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}\n       ${String(e.message).split("\n")[0]}`);
  }
}

/** 造一张 W×H 纯色 ImageData */
function solid(hex, W = 24, H = 24) {
  const data = new Uint8ClampedArray(W * H * 4);
  const [r, g, b] = hexToRgb(hex);
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { width: W, height: H, data };
}

// 1. 色库自洽：每个色号用自己的 hex 查询必须回到自己
check("色库 221 色自洽（hex 查回自身）", () => {
  const bad = HAMA_COLORS.filter(
    (c) => nearestColor(...hexToRgb(c.hex)).id !== c.id
  );
  assert.deepEqual(
    bad.map((c) => c.id),
    [],
    "错配: " + bad.map((c) => c.id).join(",")
  );
});

// 2. 墨迹判定不得吞掉色库里的真实深色（含纯黑 H7）
check("isInk 不吞真实 MARD 深色（H7 纯黑 / H6 / H16 / B23）", () => {
  const eaten = HAMA_COLORS.filter((c) => isInk(...hexToRgb(c.hex)));
  assert.deepEqual(
    eaten.map((c) => `${c.id}${c.hex}`),
    [],
    "被当墨迹跳过: " + eaten.map((c) => c.id).join(",")
  );
});

// 3. 锁定色板填格：浅肤色 H9 不得被抢成 H1
check("锁定色板含浅肤色时，H9 不会被改写为 H1", () => {
  const palette = ["H1", "H9", "G1", "B4"];
  const W = 30, H = 30, cell = 10, cols = 3, rows = 3;
  // 3×3 网格，左上格是 H9 的浅灰，其余是 G1 绿
  const data = new Uint8ClampedArray(W * H * 4);
  const put = (x0, y0, hex) => {
    const [r, g, b] = hexToRgb(hex);
    for (let y = y0; y < y0 + cell; y++)
      for (let x = x0; x < x0 + cell; x++) {
        const o = (y * W + x) * 4;
        data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
      }
  };
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      put(c * cell, r * cell, r === 0 && c === 0 ? "#EDEDED" : "#31A17A");

  const out = fillGridFromAlign(
    { width: W, height: H, data },
    { cols, rows, cellW: cell, cellH: cell, originX: 0, originY: 0, paletteIds: palette, refine: false }
  );
  assert.equal(out.cells[0][0], "H9", `左上格应判为 H9，实为 ${out.cells[0][0]}`);
});

// 4. 近白阈值不误伤浅色豆（同一套分类器，直接问它浅色会判成谁）
check("浅肤色豆 H9/H12 在色板内不会被判成 H1", () => {
  for (const [id, hex] of [["H9", "#EDEDED"], ["H12", "#FFF5ED"]]) {
    const imgData = solid(hex, 30, 30);
    const out = fillGridFromAlign(
      imgData,
      { cols: 1, rows: 1, cellW: 30, cellH: 30, originX: 0, originY: 0,
        paletteIds: ["H1", id, "G1"], refine: false }
    );
    assert.equal(out.cells[0][0], id, `${id} 应判回自身，实为 ${out.cells[0][0]}`);
  }
});

// 5. OCR 黑名单不得无条件删掉色库里真实存在的色号
check("含 E21/A12/B26/M7/F2/F23/F17 的图例不被整色丢弃", () => {
  // 每个真实色号：单独造图例块，看图例提取能否把它捞回来
  const missing = [];
  for (const id of ["E21", "A12", "B26", "M7", "F2", "F23", "F17"]) {
    const c = HAMA_COLORS.find((x) => x.id === id);
    if (!c) continue;
    const W = 40, H = 40;
    const imgData = solid(c.hex, W, H);
    const got = extractLegendFromRect(imgData, { x: 0, y: 0, w: W, h: H });
    if (!got.ids.includes(id)) missing.push(id);
  }
  assert.deepEqual(missing, [], "图例提取丢失: " + missing.join(","));
});

// 6. OCR 解析层不再硬删真实色号 B8 / M2
check("parseLegendCodesWithCounts 保留真实色号 B8 / M2", () => {
  const ids = parseLegendCodesWithCounts("B8 (12) M2 (7)");
  assert.ok(ids.includes("B8"), "B8 被丢弃: " + ids.join(","));
  assert.ok(ids.includes("M2"), "M2 被丢弃: " + ids.join(","));
});

// 7. 纠错函数不得把坐标数字串改成色号
check("fixOcrText 不把纯数字串改写成色号", () => {
  const out = fixOcrText("A19 (216) 12 3 45 6 7");
  assert.ok(
    /(?<![A-Z])1B2(?![0-9])/.test(out) === false,
    "数字串被误改: " + out
  );
});

// 8. 纯黑格（H7）在有格线的图上仍能被认出，不被当空格
check("纯黑 H7 在锁定色板下判回 H7", () => {
  const imgData = solid("#000000", 30, 30);
  const out = fillGridFromAlign(
    imgData,
    { cols: 1, rows: 1, cellW: 30, cellH: 30, originX: 0, originY: 0,
      paletteIds: ["H1", "H7", "G1"], refine: false }
  );
  assert.equal(out.cells[0][0], "H7", `应判为 H7，实为 ${out.cells[0][0]}`);
});

console.log(failed ? `\n${failed} 项未通过` : "\n全部通过");
process.exit(failed ? 1 : 0);
