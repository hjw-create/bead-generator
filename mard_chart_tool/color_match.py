# -*- coding: utf-8 -*-
"""
颜色匹配：RGB → Lab（D65）→ CIEDE2000 → 最近 MARD 色号。
"""
from __future__ import annotations

import numpy as np

from mard221_dict import mard221_dict


def rgb2lab(rgb):
    """
    RGB 转 LAB，D65 白点（与色库预计算 Lab 同一套公式）。
    :param rgb: (R, G, B)，范围 0~255
    :return: [L, a, b]
    """
    r, g, b = rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0

    def gamma(x):
        return ((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92

    r, g, b = gamma(r), gamma(g), gamma(b)
    x = r * 0.4124 + g * 0.3576 + b * 0.1805
    y = r * 0.2127 + g * 0.7152 + b * 0.0722
    z = r * 0.0193 + g * 0.1192 + b * 0.9503

    def f(t):
        return t ** (1 / 3) if t > 0.008856 else (7.787 * t) + (16 / 116)

    l = 116 * f(y) - 16
    a = 500 * (f(x) - f(y))
    b_ = 200 * (f(y) - f(z))
    return [l, a, b_]


def ciede2000(lab1, lab2):
    """
    计算 CIEDE2000 色差。
    :param lab1: (L, a, b)
    :param lab2: (L, a, b)
    :return: 色差数值，越小颜色越接近
    """
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2

    C1 = np.sqrt(a1 ** 2 + b1 ** 2)
    C2 = np.sqrt(a2 ** 2 + b2 ** 2)
    Cbar = (C1 + C2) / 2.0
    G = 0.5 * (1 - np.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)))

    a1p = a1 * (1 + G)
    a2p = a2 * (1 + G)

    C1p = np.sqrt(a1p ** 2 + b1 ** 2)
    C2p = np.sqrt(a2p ** 2 + b2 ** 2)

    h1p = np.degrees(np.arctan2(b1, a1p))
    h2p = np.degrees(np.arctan2(b2, a2p))
    if h1p < 0:
        h1p += 360
    if h2p < 0:
        h2p += 360

    dL = L2 - L1
    dC = C2p - C1p

    dhp = h2p - h1p
    if C1p * C2p == 0:
        dhp = 0.0
    else:
        if dhp > 180:
            dhp -= 360
        elif dhp < -180:
            dhp += 360
    dh = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dhp / 2.0))

    Lbarp = (L1 + L2) / 2.0
    Cbarp = (C1p + C2p) / 2.0

    hbarp = h1p + h2p
    if C1p * C2p != 0:
        if abs(h1p - h2p) > 180:
            hbarp += 360
        hbarp /= 2

    T = (
        1
        - 0.17 * np.cos(np.radians(hbarp - 30))
        + 0.24 * np.cos(np.radians(2 * hbarp))
        + 0.32 * np.cos(np.radians(3 * hbarp + 6))
        - 0.20 * np.cos(np.radians(4 * hbarp - 63))
    )

    dtheta = 30 * np.exp(-(((hbarp - 275) / 25) ** 2))
    RC = 2 * np.sqrt(Cbarp ** 7 / (Cbarp ** 7 + 25 ** 7))
    SL = 1 + ((0.015 * (Lbarp - 50) ** 2) / np.sqrt(20 + (Lbarp - 50) ** 2))
    SC = 1 + 0.045 * Cbarp
    SH = 1 + 0.015 * Cbarp * T
    RT = -np.sin(np.radians(2 * dtheta)) * RC

    dE = np.sqrt(
        (dL / SL) ** 2
        + (dC / SC) ** 2
        + (dh / SH) ** 2
        + RT * (dC / SC) * (dh / SH)
    )
    return float(dE)


# 稳定排序的色号列表，供手动改色时循环
SORTED_CODES = sorted(
    mard221_dict.keys(),
    key=lambda c: (c[0], int("".join(ch for ch in c[1:] if ch.isdigit()) or 0)),
)

# 预计算 Lab 缓存（由色库 RGB + rgb2lab），加速整板匹配
_LAB_CACHE = {
    code: rgb2lab((vals[0], vals[1], vals[2]))
    for code, vals in mard221_dict.items()
}


def find_mard_color(rgb):
    """
    输入 RGB，返回最接近的 MARD 色号。
    :param rgb: (R, G, B) 0~255
    :return: (色号字符串, 色差)
    """
    input_lab = rgb2lab(rgb)
    min_diff = 9999.0
    best_code = None
    for code, lab_ref in _LAB_CACHE.items():
        diff = ciede2000(input_lab, lab_ref)
        if diff < min_diff:
            min_diff = diff
            best_code = code
    return best_code, min_diff


def code_to_bgr(code: str):
    """色号 → OpenCV BGR 用于预览填色。"""
    vals = mard221_dict.get(code)
    if not vals:
        return (128, 128, 128)
    r, g, b = int(vals[0]), int(vals[1]), int(vals[2])
    return (b, g, r)
