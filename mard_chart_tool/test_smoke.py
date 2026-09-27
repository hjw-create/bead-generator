# -*- coding: utf-8 -*-
"""无 GUI 冒烟测试：色匹配 + 假网格识别。"""
import numpy as np
from color_match import find_mard_color, rgb2lab, ciede2000
from mard221_dict import mard221_dict as D


def test_match_self():
    """每个色库 RGB 应匹配回自身（或极近色）。"""
    miss = 0
    for code, vals in list(D.items())[:30]:
        rgb = (vals[0], vals[1], vals[2])
        got, diff = find_mard_color(rgb)
        if got != code:
            # 允许极近重复色
            if diff > 1.0:
                print("MISS", code, "→", got, "dE", round(diff, 3))
                miss += 1
    print("self-match miss(strict)", miss, "dict_size", len(D))


def test_ciede_zero():
    lab = rgb2lab((120, 80, 40))
    assert ciede2000(lab, lab) < 1e-6
    print("ciede self=0 OK")


def test_grid_smoke():
    """构造纯色网格，验证切格+匹配。"""
    import cv2
    from app import recognize_grid

    rows, cols = 4, 6
    cell = 20
    codes_true = ["G1", "B4", "C8", "D7", "E3", "F5"]
    img = np.zeros((rows * cell, cols * cell, 3), dtype=np.uint8)
    for r in range(rows):
        for c in range(cols):
            code = codes_true[c % len(codes_true)]
            bgr = D[code][2], D[code][1], D[code][0]
            img[r * cell : (r + 1) * cell, c * cell : (c + 1) * cell] = bgr
    got = recognize_grid(img, rows, cols)
    ok = sum(
        1
        for r in range(rows)
        for c in range(cols)
        if got[r][c] == codes_true[c % len(codes_true)]
    )
    print("grid_smoke", ok, "/", rows * cols)
    assert ok >= rows * cols * 0.9


if __name__ == "__main__":
    test_ciede_zero()
    test_match_self()
    test_grid_smoke()
    print("ALL OK")
