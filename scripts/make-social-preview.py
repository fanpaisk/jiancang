"""生成 GitHub 仓库的 Social preview（1280x640）。

只用于仓库页面的分享卡片，不是网站 og:image。需要 Pillow：
    python scripts/make-social-preview.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1280, 640
S = 2  # 先画 2x 再缩小，边缘更干净
OUT = Path(__file__).resolve().parent.parent / "docs" / "social-preview.png"

BRAND = "#2563eb"
INK = "#0f172a"
MUTED = "#64748b"
LINE = "#e6ebf2"
SOFT = "#eff4ff"
WHITE = "#ffffff"

FONT_REG = r"C:\Windows\Fonts\msyh.ttc"
FONT_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size * S)


def rounded(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    x0, y0, x1, y1 = [v * S for v in box]
    draw.rounded_rectangle(
        [x0, y0, x1, y1],
        radius=radius * S,
        fill=fill,
        outline=outline,
        width=width * S,
    )


def text(draw, xy, content, size, color=INK, bold=False, anchor="la"):
    draw.text(
        (xy[0] * S, xy[1] * S),
        content,
        font=font(size, bold),
        fill=color,
        anchor=anchor,
    )


def mark(draw, x, y, hit):
    """画勾/点，避免用 ✓ 字符（部分中文字体没有该字形，会变豆腐块）。"""
    if hit:
        draw.line(
            [(x + 3) * S, (y + 8) * S, (x + 7) * S, (y + 12) * S],
            fill=BRAND,
            width=2 * S,
        )
        draw.line(
            [(x + 7) * S, (y + 12) * S, (x + 13) * S, (y + 4) * S],
            fill=BRAND,
            width=2 * S,
        )
    else:
        draw.ellipse(
            [(x + 6) * S, (y + 9) * S, (x + 10) * S, (y + 13) * S],
            fill="#cbd5e1",
        )


img = Image.new("RGB", (W * S, H * S), "#f4f7fe")
d = ImageDraw.Draw(img)

# 背景：左上到右下渐变
top = Image.new("RGB", (W * S, H * S), "#eef4ff")
bottom = Image.new("RGB", (W * S, H * S), "#fbfcff")
mask = Image.linear_gradient("L").resize((W * S, H * S))
img = Image.composite(bottom, top, mask)
d = ImageDraw.Draw(img)

# 左侧品牌
rounded(d, (64, 66, 132, 134), 18, BRAND)
text(d, (98, 100), "减", 38, WHITE, True, "mm")
text(d, (150, 72), "减仓计算器", 50, INK, True)
text(d, (152, 134), "纯前端 · 零后端 · 数据不出浏览器", 19, BRAND)

text(d, (64, 210), "按你设的规则，算清楚", 34, INK, True)
text(d, (64, 258), "该减多少 · 付多少赎回费", 23, MUTED)
text(d, (64, 292), "现在减，还是等几天", 23, MUTED)

chips = ["React + TypeScript", "浏览器 OCR", "PWA", "Cloudflare Pages"]
x = 64
for chip in chips:
    tw = d.textlength(chip, font=font(15))
    w = int(tw / S) + 28
    rounded(d, (x, 356, x + w, 392), 18, WHITE, "#dbe6ff", 1)
    text(d, (x + 14, 366), chip, 15, "#334155")
    x += w + 10

text(d, (64, 470), "jiancang-b3b.pages.dev", 22, BRAND, True)
text(d, (64, 508), "github.com/fanpaisk/jiancang", 18, MUTED)
text(d, (64, 566), "不构成投资建议 · MIT License", 14, "#94a3b8")

# 右侧 App 卡片
card = (720, 40, 1180, 614)
# 阴影
shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
sd.rounded_rectangle(
    [x * S + 8 * S for x in card[:2]] + [x * S + 8 * S for x in card[2:]],
    radius=30 * S,
    fill=(15, 23, 42, 40),
)
shadow = shadow.filter(ImageFilter.GaussianBlur(18 * S))
img = Image.alpha_composite(img.convert("RGBA"), shadow).convert("RGB")
d = ImageDraw.Draw(img)

rounded(d, card, 30, WHITE, LINE, 1)
text(d, (756, 78), "减仓计算器", 20, INK, True)
text(d, (1144, 80), "数据只在本机", 13, MUTED, False, "ra")
d.line([756 * S, 112 * S, 1144 * S, 112 * S], fill=LINE, width=1 * S)

text(d, (756, 136), "按规则应减", 15, MUTED)
text(d, (750, 158), "35%", 94, BRAND, True)
text(d, (756, 286), "区间 33% – 36%", 15, MUTED)

rules = [
    ("目标仓位", "减 36%", True),
    ("目标止盈", "减 33%", True),
    ("回撤止盈", "还差 6.15 个百分点", False),
]
y = 336
for label, note, hit in rules:
    mark(d, 758, y, hit)
    text(d, (792, y), label, 17, INK if hit else MUTED, hit)
    text(d, (1144, y), note, 15, INK if hit else MUTED, False, "ra")
    y += 38

# 滑杆
d.line([756 * S, 466 * S, 1144 * S, 466 * S], fill=LINE, width=4 * S)
d.line([756 * S, 466 * S, 1044 * S, 466 * S], fill=BRAND, width=4 * S)
d.ellipse([1044 * S - 7 * S, 466 * S - 7 * S, 1044 * S + 7 * S, 466 * S + 7 * S], fill=BRAND)

text(d, (756, 500), "卖出份额", 14, MUTED)
text(d, (756, 524), "3,452.38", 24, INK, True)
text(d, (950, 500), "净到手", 14, MUTED)
text(d, (950, 524), "¥5,152.68", 24, INK, True)

rounded(d, (756, 566, 1144, 604), 12, SOFT)
text(d, (950, 585), "生成分享卡片", 16, BRAND, True, "mm")

img = img.resize((W, H), Image.LANCZOS)
OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT, "PNG", optimize=True)
print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
