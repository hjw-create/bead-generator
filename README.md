# 拼豆图纸生成器（MARD 221 色）

本地网页工具：普通图片转拼豆图纸、成品色号图纸四点识别 / OCR 还原。

## 功能

- **普通图片 → 拼豆**：主导色采样、BFS 杂色合并、去背景，映射 MARD 221 色
- **图纸四点识别（CIEDE2000）**：四点透视矫正 → 按行列切格 → 色差匹配 → 校对导出
- **成品 OCR 还原**：框选图例 OCR 锁定色板 → 对准网格 → 填格校对
- **导出**：带图例 PNG；四点模式还可导出色号矩阵 / 用量统计 txt
- **可选**：Python 版识别工具（`mard_chart_tool/`，OpenCV GUI）

## 快速开始

```bash
npm install
npm start
```

浏览器打开 http://localhost:3780

可选：复制 `.env.example` 为 `.env`，按需填写豆包/方舟 API（非必需）。

## 目录说明

| 文件 / 目录 | 说明 |
|-------------|------|
| `index.html` | 前端页面 |
| `server.js` | Express 静态服务 + 图例 OCR API |
| `hamaColors.js` | MARD 221 色库 + LUT |
| `pixelation.js` | 图片像素化算法 |
| `mardMatch.js` / `mardChartWeb.js` | CIEDE2000 与四点识别 |
| `chartImport.js` / `legendOcr.js` | OCR 成品图纸流程 |
| `sample-chart.png` | 样例图纸 |
| `mard_chart_tool/` | Python+OpenCV 桌面识别工具 |

## Python 工具（可选）

```bash
cd mard_chart_tool
pip install -r requirements.txt
python app.py 图纸.png 52 50
# 或无界面：python app.py 图纸.png 52 50 --auto
```

## 注意

- 请勿提交 `.env`（含 API Key）
- 色号匹配受屏幕偏色 / JPEG 压缩影响，复杂图纸建议人工校对
