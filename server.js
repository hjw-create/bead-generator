/**
 * 静态资源 + 可选「视觉 AI 读色号」接口
 * 环境变量：
 *   ARK_API_KEY 或 DOUBAO_API_KEY  — 火山方舟 Key
 *   ARK_MODEL — 默认 doubao-seed-1-6-flash-250828（需带视觉）
 *   PORT — 默认 3780
 */
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HAMA_COLORS, colorById } from "./hamaColors.js";
import { ocrLegendCodes } from "./legendOcr.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3780;
const ARK_KEY = process.env.ARK_API_KEY || process.env.DOUBAO_API_KEY || "";
const ARK_MODEL =
  process.env.ARK_MODEL || "doubao-seed-1-6-flash-250828";
const ARK_URL =
  process.env.ARK_URL ||
  "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

const app = express();
app.use(express.json({ limit: "12mb" }));
app.use(express.static(__dirname));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    colors: HAMA_COLORS.length,
    visionAi: Boolean(ARK_KEY),
    legendOcr: true,
    model: ARK_KEY ? ARK_MODEL : null,
  });
});

/**
 * 图例 OCR：用户框选区域的裁剪图 → 读出色号文字
 * body: { imageBase64, mime? }
 */
app.post("/api/ocr-legend", async (req, res) => {
  const raw = String(req.body?.imageBase64 || "");
  if (!raw) {
    return res.status(400).json({ success: false, message: "缺少图例图片" });
  }
  const b64 = raw.replace(/^data:[^;]+;base64,/, "");
  try {
    const buf = Buffer.from(b64, "base64");
    const { ids, rawText, source } = await ocrLegendCodes(buf);
    return res.json({
      success: true,
      message: ids.length ? `OCR 读到 ${ids.length} 个色号` : "OCR 未读到色号",
      ids,
      rawText: String(rawText || "").slice(0, 500),
      source,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "图例 OCR 失败",
    });
  }
});

/**
 * 视觉模型读施工图色号 → 52×50 网格
 * body: { imageBase64, cols, rows, mime? }
 */
app.post("/api/recognize-chart-ai", async (req, res) => {
  if (!ARK_KEY) {
    return res.status(503).json({
      success: false,
      message:
        "未配置视觉 API Key。请在环境变量设置 ARK_API_KEY（或 DOUBAO_API_KEY）后重启。这是达到拼豆大王级「读格内色号」所必需的。",
    });
  }

  const cols = Math.round(Number(req.body?.cols) || 52);
  const rows = Math.round(Number(req.body?.rows) || 50);
  const raw = String(req.body?.imageBase64 || "");
  const mime = String(req.body?.mime || "image/jpeg");
  if (!raw || cols < 8 || rows > 200 || cols > 200 || rows < 8) {
    return res.status(400).json({ success: false, message: "参数无效" });
  }
  const b64 = raw.replace(/^data:[^;]+;base64,/, "");

  const prompt = `你是拼豆(MARD)施工图识别器。图是带网格与格内色号（如 F19、H1）和底部图例的图纸。
请输出严格 JSON（不要 markdown）：
{"cols":${cols},"rows":${rows},"cells":[["色号或null",...],...]}
规则：
1. cells 必须是 ${rows} 行、每行 ${cols} 列
2. 有豆子的格子填色号字符串（与图中一致，如 "F19"）；空白无豆格子填 null
3. 整板 ${cols}×${rows}，不要漏行漏列
4. 只输出 JSON`;

  try {
    const r = await fetch(ARK_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ARK_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ARK_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:${mime};base64,${b64}` },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
      signal: AbortSignal.timeout(120000),
    });
    const json = await r.json();
    if (!r.ok) {
      return res.status(502).json({
        success: false,
        message: json?.error?.message || `上游 ${r.status}`,
      });
    }
    const text =
      json?.choices?.[0]?.message?.content ||
      json?.choices?.[0]?.message?.contents ||
      "";
    const parsed = parseCellsJson(String(text), cols, rows);
    if (!parsed) {
      return res.status(502).json({
        success: false,
        message: "模型未返回合法网格 JSON，请换更强视觉模型或提高清晰度。",
        raw: String(text).slice(0, 400),
      });
    }
    // 校验色号
    let beads = 0;
    for (const row of parsed) {
      for (let i = 0; i < row.length; i++) {
        const id = row[i];
        if (id == null) continue;
        if (!colorById[id]) row[i] = null;
        else beads++;
      }
    }
    return res.json({
      success: true,
      message: "ok",
      cols,
      rows,
      cells: parsed,
      beads,
      gridSource: "vision-ai",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "识别失败",
    });
  }
});

function parseCellsJson(text, cols, rows) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]);
    const cells = obj.cells;
    if (!Array.isArray(cells) || cells.length !== rows) return null;
    return cells.map((row) => {
      const r = Array.isArray(row) ? row : [];
      const out = [];
      for (let x = 0; x < cols; x++) {
        const v = r[x];
        if (v == null || v === "" || v === "null") out.push(null);
        else out.push(String(v).trim().toUpperCase());
      }
      return out;
    });
  } catch {
    return null;
  }
}

app.listen(PORT, () => {
  console.log(`拼豆图纸生成器 → http://localhost:${PORT}`);
  console.log(
    ARK_KEY
      ? `视觉 AI：已启用（${ARK_MODEL}）`
      : "视觉 AI：未配置 ARK_API_KEY（本地色匹配可用）"
  );
});
