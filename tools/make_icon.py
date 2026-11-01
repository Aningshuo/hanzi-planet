"""生成应用图标：暖橙渐变圆角方块 + 「汉」字 + 小星星"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os

S = 1024
OUT = os.path.join(os.path.dirname(__file__), '..', 'build')
os.makedirs(OUT, exist_ok=True)

# 背景：渐变
base = Image.new('RGB', (S, S), '#ff8a4d')
px = base.load()
c1 = (255, 196, 110)
c2 = (244, 86, 42)
for y in range(S):
    for x in range(0, S, 2):
        t = (x / S * 0.45 + y / S * 0.55)
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        px[x, y] = (r, g, b)
        if x + 1 < S:
            px[x + 1, y] = (r, g, b)

# 顶部高光
glow = Image.new('L', (S, S), 0)
gd = ImageDraw.Draw(glow)
gd.ellipse((-S * 0.35, -S * 0.55, S * 0.95, S * 0.55), fill=110)
glow = glow.filter(ImageFilter.GaussianBlur(120))
base = Image.composite(Image.new('RGB', (S, S), (255, 245, 220)), base, glow)

# 圆角遮罩（macOS 风格）
mask = Image.new('L', (S, S), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle([0, 0, S, S], radius=int(S * 0.225), fill=255)

img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
img.paste(base, (0, 0), mask)

d = ImageDraw.Draw(img)

# 内描边
d.rounded_rectangle([14, 14, S - 14, S - 14], radius=int(S * 0.215), outline=(255, 255, 255, 70), width=6)

# 汉字
font_path = '/System/Library/Fonts/Supplemental/Songti.ttc'
font = ImageFont.truetype(font_path, int(S * 0.60), index=1)
ch = '汉'
bbox = d.textbbox((0, 0), ch, font=font)
w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
pos = ((S - w) / 2 - bbox[0], (S - h) / 2 - bbox[1] - S * 0.03)

# 字的投影
shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
sd.text((pos[0], pos[1] + 12), ch, font=font, fill=(150, 45, 10, 120))
shadow = shadow.filter(ImageFilter.GaussianBlur(16))
img.alpha_composite(shadow)

d = ImageDraw.Draw(img)
d.text(pos, ch, font=font, fill=(255, 252, 246, 255))

# 右上角小星星
def star(cx, cy, r, fill):
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.42
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    d.polygon(pts, fill=fill)

star(S * 0.795, S * 0.205, S * 0.088, (255, 236, 170, 255))
star(S * 0.885, S * 0.315, S * 0.042, (255, 245, 205, 220))

img.save(os.path.join(OUT, 'icon.png'))
print('icon saved', os.path.join(OUT, 'icon.png'), img.size)
