拼豆图纸识别工具（Python + OpenCV + NumPy）
========================================

依赖安装：
  pip install -r requirements.txt

运行：
  python app.py
  python app.py 图纸.png 52 50
  python app.py 图纸.png 52 50 --auto   # 无 GUI，自动取边并导出

操作：
  1) 窗口中按 左上→右上→右下→左下 点四个角，可拖拽微调，Enter 确认
  2) 自动透视矫正并按行列切格，CIEDE2000 匹配 MARD 色号
  3) 预览窗口：左键选格，A/D 切换色号，S 导出，Q 退出

导出目录（默认在图片同级 output_mard/）：
  chart_annotated.png  带色号标注图
  codes_matrix.txt     色号二维表
  bead_counts.txt      用量统计

色库：
  来自「内置色库字典.txt」，去重后约 119 色（源文件含重复键）。
  匹配时用色库 RGB + rgb2lab + CIEDE2000，不依赖 OCR。
