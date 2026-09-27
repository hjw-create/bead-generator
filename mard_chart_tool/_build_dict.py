# -*- coding: utf-8 -*-
"""从桌面色库 txt 提取并清洗 mard221_dict。"""
import re
import ast
from pathlib import Path

SRC = Path(r"E:\新建文件夹\Documents\Desktop\内置色库字典.txt")
OUT = Path(__file__).resolve().parent / "mard221_dict.py"

text = SRC.read_text(encoding="utf-8")
m = re.search(r"mard221_dict\s*=\s*\{", text)
start = m.end() - 1
depth = 0
end = start
for j, ch in enumerate(text[start:], start):
    if ch == "{":
        depth += 1
    elif ch == "}":
        depth -= 1
        if depth == 0:
            end = j + 1
            break
body = text[start:end]
# 修复被空格打断的 HEX
body = re.sub(r'"/(#[0-9A-Fa-f]+)\s+([0-9A-Fa-f]+)"', r'"\1\2"', body)
body = re.sub(r'"(#[0-9A-Fa-f]+)\s+([0-9A-Fa-f]+)"', r'"\1\2"', body)
d = ast.literal_eval(body)
print("keys", len(d))

lines = [
    "# -*- coding: utf-8 -*-",
    '"""MARD 221 拼豆官方色库（内置）。',
    "色号: [R, G, B, HEX, L, a, b]",
    '"""',
    "",
    "mard221_dict = {",
]
for code, vals in d.items():
    r, g, b, hx, L, a, bb = vals
    lines.append(
        f'    "{code}": [{int(r)}, {int(g)}, {int(b)}, "{hx}", {L}, {a}, {bb}],'
    )
lines.append("}")
lines.append("")
OUT.write_text("\n".join(lines), encoding="utf-8")
print("written", OUT)
