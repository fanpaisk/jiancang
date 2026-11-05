"""重新生成 src/lib/qrMatrix.ts（分享卡片右下角的二维码）。

只在站点地址变化时手动跑一次：
    pip install qrcode
    python scripts/make-qr.py

产物是纯字符串矩阵，运行时零依赖；不要在构建时调用（CI 不需要 Python 包）。
"""
from pathlib import Path

import qrcode

URL = "https://jiancang-b3b.pages.dev/"
OUT = Path(__file__).resolve().parent.parent / "src" / "lib" / "qrMatrix.ts"

qr = qrcode.QRCode(
    version=None,
    error_correction=qrcode.constants.ERROR_CORRECT_M,
    box_size=1,
    border=2,
)
qr.add_data(URL)
qr.make(fit=True)
rows = ["".join("1" if v else "0" for v in row) for row in qr.get_matrix()]
assert all(len(row) == len(rows) for row in rows)

lines = [
    "/**",
    f" * 预生成的二维码矩阵：{URL}",
    " * 改站点地址后跑 `python scripts/make-qr.py` 重新生成；运行时零依赖。",
    " * 1 = 黑块，0 = 白块；已含 2 模块静区。",
    " */",
    f"export const QR_URL = '{URL}'",
    f"export const QR_SIZE = {len(rows)}",
    "export const QR_ROWS: readonly string[] = [",
]
lines.extend(f"  '{row}'," for row in rows)
lines.append("]")
lines.append("")

OUT.write_text("\n".join(lines), encoding="utf-8", newline="\n")
print(f"wrote {OUT} ({len(rows)}x{len(rows)})")
