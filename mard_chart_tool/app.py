# -*- coding: utf-8 -*-
"""
拼豆图纸识别工具（Python + OpenCV + NumPy）

功能：
1. 四点拖拽透视矫正
2. 按行列数切分网格
3. 格内平均 RGB + CIEDE2000 匹配 MARD 色号
4. GUI 预览标注，点击格子可手动改色
5. 导出：标注图 / 色号矩阵 txt / 用量统计

依赖：opencv-python、numpy
运行：
  cd mard_chart_tool
  python app.py
  或：python app.py path/to/chart.png 52 50
  无界面批处理：python app.py path/to/chart.png 52 50 --auto
"""
from __future__ import annotations

import os
import sys
from collections import Counter
from pathlib import Path

import cv2
import numpy as np

from color_match import (
    SORTED_CODES,
    code_to_bgr,
    find_mard_color,
)
from mard221_dict import mard221_dict

# ---------------------------------------------------------------------------
# 全局交互状态
# ---------------------------------------------------------------------------
WIN_SRC = "1-选四点(拖拽)  Enter确认  R重置"
WIN_EDIT = "2-预览改色  左键选格  A/D换色号  S导出  Q退出"


class AppState:
    def __init__(self):
        self.src = None  # 原图 BGR
        self.display = None
        self.points = []  # 四个角点 [[x,y],...] 顺序：左上→右上→右下→左下
        self.drag_idx = -1
        self.cols = 52
        self.rows = 50
        self.warped = None
        self.codes = None  # list[list[str]]
        self.sel = None  # (r, c) 当前选中格
        self.out_dir = Path("output_mard")


STATE = AppState()


# ---------------------------------------------------------------------------
# 透视与网格
# ---------------------------------------------------------------------------
def order_points(pts):
    """将任意四点排成 左上、右上、右下、左下。"""
    pts = np.array(pts, dtype=np.float32)
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1).ravel()
    tl = pts[np.argmin(s)]
    br = pts[np.argmax(s)]
    tr = pts[np.argmin(diff)]
    bl = pts[np.argmax(diff)]
    return np.array([tl, tr, br, bl], dtype=np.float32)


def warp_perspective(img, pts, cols, rows, cell_px=18):
    """按四点透视矫正，输出宽=cols*cell_px、高=rows*cell_px。"""
    src = order_points(pts)
    w = max(8, int(cols * cell_px))
    h = max(8, int(rows * cell_px))
    dst = np.array([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]], dtype=np.float32)
    M = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(img, M, (w, h), flags=cv2.INTER_LINEAR)
    return warped, cell_px


def sample_cell_rgb(warped, r, c, rows, cols, margin_ratio=0.22):
    """
    取第 (r,c) 格内部区域平均 RGB（避开格线）。
    返回 (R,G,B) uint8。
    """
    h, w = warped.shape[:2]
    cell_w = w / cols
    cell_h = h / rows
    x0 = c * cell_w
    y0 = r * cell_h
    mx = cell_w * margin_ratio
    my = cell_h * margin_ratio
    x1, x2 = int(x0 + mx), int(x0 + cell_w - mx)
    y1, y2 = int(y0 + my), int(y0 + cell_h - my)
    x1, x2 = max(0, x1), min(w, max(x1 + 1, x2))
    y1, y2 = max(0, y1), min(h, max(y1 + 1, y2))
    patch = warped[y1:y2, x1:x2]
    if patch.size == 0:
        return (255, 255, 255)
    # OpenCV BGR → RGB
    mean_bgr = patch.reshape(-1, 3).mean(axis=0)
    b, g, r_ = mean_bgr
    return (int(round(r_)), int(round(g)), int(round(b)))


def recognize_grid(warped, rows, cols):
    """整板识别，返回二维色号列表。"""
    codes = []
    for r in range(rows):
        row = []
        for c in range(cols):
            rgb = sample_cell_rgb(warped, r, c, rows, cols)
            code, _ = find_mard_color(rgb)
            row.append(code or "?")
        codes.append(row)
        if (r + 1) % 10 == 0 or r + 1 == rows:
            print(f"  识别进度 {r + 1}/{rows}")
    return codes


# ---------------------------------------------------------------------------
# 绘制
# ---------------------------------------------------------------------------
def draw_source_with_points(img, points, drag_idx=-1):
    vis = img.copy()
    n = len(points)
    for i, (x, y) in enumerate(points):
        color = (0, 0, 255) if i == drag_idx else (0, 255, 0)
        cv2.circle(vis, (int(x), int(y)), 10, color, -1)
        cv2.putText(
            vis,
            str(i + 1),
            (int(x) + 12, int(y) - 8),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            color,
            2,
        )
    if n >= 2:
        for i in range(n):
            if i + 1 < n:
                p1 = tuple(map(int, points[i]))
                p2 = tuple(map(int, points[i + 1]))
                cv2.line(vis, p1, p2, (255, 128, 0), 2)
        if n == 4:
            cv2.line(
                vis,
                tuple(map(int, points[3])),
                tuple(map(int, points[0])),
                (255, 128, 0),
                2,
            )
    tip = "点击添加角点(需4个) | 拖拽调整 | Enter确认 | R重置"
    cv2.putText(vis, tip, (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
    return vis


def render_annotated(warped, codes, rows, cols, sel=None, show_text=True):
    """生成带色号标注的预览图。"""
    h, w = warped.shape[:2]
    cell_w = w / cols
    cell_h = h / rows
    # 底图：半透明原图 + 色号纯色块
    canvas = warped.copy()
    overlay = warped.copy()
    for r in range(rows):
        for c in range(cols):
            code = codes[r][c]
            bgr = code_to_bgr(code)
            x1, y1 = int(c * cell_w), int(r * cell_h)
            x2, y2 = int((c + 1) * cell_w), int((r + 1) * cell_h)
            cv2.rectangle(overlay, (x1, y1), (x2, y2), bgr, -1)
    canvas = cv2.addWeighted(overlay, 0.55, canvas, 0.45, 0)

    font_scale = max(0.25, min(0.55, cell_w / 40.0))
    thickness = 1 if cell_w < 22 else 2
    for r in range(rows):
        for c in range(cols):
            x1, y1 = int(c * cell_w), int(r * cell_h)
            x2, y2 = int((c + 1) * cell_w), int((r + 1) * cell_h)
            cv2.rectangle(canvas, (x1, y1), (x2, y2), (40, 40, 40), 1)
            if show_text and cell_w >= 12 and cell_h >= 12:
                code = codes[r][c]
                # 深色底用白字
                vals = mard221_dict.get(code)
                bright = 200
                if vals:
                    bright = (vals[0] + vals[1] + vals[2]) / 3
                color = (20, 20, 20) if bright > 140 else (255, 255, 255)
                tx = x1 + 2
                ty = y1 + int(cell_h * 0.65)
                cv2.putText(
                    canvas,
                    code,
                    (tx, ty),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    font_scale,
                    color,
                    thickness,
                    cv2.LINE_AA,
                )
    if sel is not None:
        r, c = sel
        x1, y1 = int(c * cell_w), int(r * cell_h)
        x2, y2 = int((c + 1) * cell_w), int((r + 1) * cell_h)
        cv2.rectangle(canvas, (x1, y1), (x2, y2), (0, 255, 255), 3)
    return canvas


# ---------------------------------------------------------------------------
# 导出
# ---------------------------------------------------------------------------
def export_all(warped, codes, rows, cols, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    annotated = render_annotated(warped, codes, rows, cols, show_text=True)
    img_path = out_dir / "chart_annotated.png"
    cv2.imwrite(str(img_path), annotated)

    txt_path = out_dir / "codes_matrix.txt"
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(f"# MARD codes  rows={rows} cols={cols}\n")
        for row in codes:
            f.write("\t".join(row) + "\n")

    flat = [c for row in codes for c in row]
    cnt = Counter(flat)
    stat_path = out_dir / "bead_counts.txt"
    with open(stat_path, "w", encoding="utf-8") as f:
        f.write("# 色号\t数量\tHEX\n")
        total = 0
        for code, n in sorted(cnt.items(), key=lambda x: (-x[1], x[0])):
            hx = mard221_dict.get(code, ["", "", "", "?"])[3]
            f.write(f"{code}\t{n}\t{hx}\n")
            total += n
        f.write(f"# TOTAL\t{total}\n")
        f.write(f"# 色种数\t{len(cnt)}\n")

    print("已导出：")
    print(" ", img_path.resolve())
    print(" ", txt_path.resolve())
    print(" ", stat_path.resolve())
    return img_path, txt_path, stat_path


# ---------------------------------------------------------------------------
# 鼠标回调：选点
# ---------------------------------------------------------------------------
def on_mouse_src(event, x, y, flags, _):
    st = STATE
    if event == cv2.EVENT_LBUTTONDOWN:
        # 优先拖拽已有点
        for i, (px, py) in enumerate(st.points):
            if (px - x) ** 2 + (py - y) ** 2 <= 18 ** 2:
                st.drag_idx = i
                return
        if len(st.points) < 4:
            st.points.append([float(x), float(y)])
            st.drag_idx = len(st.points) - 1
    elif event == cv2.EVENT_MOUSEMOVE and st.drag_idx >= 0:
        st.points[st.drag_idx] = [float(x), float(y)]
    elif event == cv2.EVENT_LBUTTONUP:
        st.drag_idx = -1


def on_mouse_edit(event, x, y, flags, _):
    st = STATE
    if st.warped is None or st.codes is None:
        return
    h, w = st.warped.shape[:2]
    cell_w = w / st.cols
    cell_h = h / st.rows
    c = int(x / cell_w)
    r = int(y / cell_h)
    if not (0 <= r < st.rows and 0 <= c < st.cols):
        return
    if event == cv2.EVENT_LBUTTONDOWN:
        st.sel = (r, c)
        print(f"选中 ({r+1},{c+1}) = {st.codes[r][c]}  用 A/D 切换色号，或键盘输入后回车")


def cycle_code(code, delta):
    if code not in SORTED_CODES:
        return SORTED_CODES[0]
    i = SORTED_CODES.index(code)
    return SORTED_CODES[(i + delta) % len(SORTED_CODES)]


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
def ask_path_and_size(argv):
    """解析参数。支持：python app.py [图] [cols] [rows] [--auto]"""
    args = [a for a in argv[1:] if a != "--auto"]
    auto = "--auto" in argv

    if len(args) >= 1:
        path = args[0]
    else:
        path = input("请输入图纸图片路径: ").strip().strip('"')
    if not path or not os.path.isfile(path):
        print("文件不存在:", path)
        sys.exit(1)

    if len(args) >= 3:
        cols, rows = int(args[1]), int(args[2])
    elif auto:
        cols, rows = 52, 50
    else:
        cols = int(input("列数 cols（如 52）: ").strip() or "52")
        rows = int(input("行数 rows（如 50）: ").strip() or "50")
    return path, cols, rows, auto


def auto_corners(img, top=0.10, bottom=0.82, left=0.04, right=0.96):
    """无 GUI：按比例取四点（默认裁掉标题与底部图例）。"""
    h, w = img.shape[:2]
    x0, x1 = left * w, right * w
    y0, y1 = top * h, bottom * h
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]


def stage_select_corners():
    st = STATE
    cv2.namedWindow(WIN_SRC, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(WIN_SRC, min(1200, st.src.shape[1]), min(900, st.src.shape[0]))
    cv2.setMouseCallback(WIN_SRC, on_mouse_src)
    print("请按 左上→右上→右下→左下 点击四个角，可拖拽微调，Enter 确认。")

    while True:
        vis = draw_source_with_points(st.src, st.points, st.drag_idx)
        cv2.imshow(WIN_SRC, vis)
        key = cv2.waitKey(16) & 0xFF
        if key in (13, 10):  # Enter
            if len(st.points) == 4:
                break
            print("需要恰好 4 个角点，当前:", len(st.points))
        elif key in (ord("r"), ord("R")):
            st.points = []
            st.drag_idx = -1
        elif key in (ord("q"), 27):
            cv2.destroyAllWindows()
            sys.exit(0)
    cv2.destroyWindow(WIN_SRC)


def stage_recognize_and_edit():
    st = STATE
    print("透视矫正中…")
    st.warped, _ = warp_perspective(st.src, st.points, st.cols, st.rows)
    print(f"开始识别 {st.cols}×{st.rows} …（色库 {len(mard221_dict)} 色）")
    st.codes = recognize_grid(st.warped, st.rows, st.cols)
    print("识别完成。打开预览窗口：A/D 改色，S 导出，Q 退出。")

    cv2.namedWindow(WIN_EDIT, cv2.WINDOW_NORMAL)
    max_w = min(1400, st.warped.shape[1] * 2)
    max_h = min(1000, st.warped.shape[0] * 2)
    cv2.resizeWindow(WIN_EDIT, max_w, max_h)
    cv2.setMouseCallback(WIN_EDIT, on_mouse_edit)

    while True:
        vis = render_annotated(st.warped, st.codes, st.rows, st.cols, st.sel)
        # 状态条
        bar = np.zeros((36, vis.shape[1], 3), dtype=np.uint8)
        msg = "A/D:切换色号  S:导出  Q:退出"
        if st.sel:
            r, c = st.sel
            msg = f"选中({r+1},{c+1})={st.codes[r][c]}  |  " + msg
        cv2.putText(bar, msg, (8, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 255), 2)
        show = np.vstack([vis, bar])
        cv2.imshow(WIN_EDIT, show)
        key = cv2.waitKey(20) & 0xFF
        if key in (ord("q"), 27):
            break
        if key in (ord("s"), ord("S")):
            export_all(st.warped, st.codes, st.rows, st.cols, st.out_dir)
        if st.sel is not None:
            r, c = st.sel
            if key in (ord("a"), ord("A")):
                st.codes[r][c] = cycle_code(st.codes[r][c], -1)
                print(f"→ {st.codes[r][c]}")
            elif key in (ord("d"), ord("D")):
                st.codes[r][c] = cycle_code(st.codes[r][c], 1)
                print(f"→ {st.codes[r][c]}")
    cv2.destroyAllWindows()


def stage_auto_recognize():
    """无界面：四点自动取边 → 识别 → 导出。"""
    st = STATE
    st.points = auto_corners(st.src)
    print("透视矫正中（--auto）…")
    st.warped, _ = warp_perspective(st.src, st.points, st.cols, st.rows)
    print(f"开始识别 {st.cols}×{st.rows} …（色库 {len(mard221_dict)} 色）")
    st.codes = recognize_grid(st.warped, st.rows, st.cols)
    export_all(st.warped, st.codes, st.rows, st.cols, st.out_dir)
    flat = [c for row in st.codes for c in row]
    cnt = Counter(flat)
    print(f"识别完成：色种 {len(cnt)}，总格 {len(flat)}")
    top = sorted(cnt.items(), key=lambda x: -x[1])[:12]
    print("用量 Top:", ", ".join(f"{k}:{v}" for k, v in top))


def main(argv=None):
    argv = argv if argv is not None else sys.argv
    path, cols, rows, auto = ask_path_and_size(argv)
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        print("无法读取图片:", path)
        sys.exit(1)

    STATE.src = img
    STATE.cols = cols
    STATE.rows = rows
    STATE.out_dir = Path(path).resolve().parent / "output_mard"
    print(f"图片 {img.shape[1]}x{img.shape[0]}，网格 {cols}×{rows}")
    print(f"色库色数: {len(mard221_dict)}")

    if auto:
        stage_auto_recognize()
    else:
        stage_select_corners()
        stage_recognize_and_edit()
    print("结束。")


if __name__ == "__main__":
    main()
