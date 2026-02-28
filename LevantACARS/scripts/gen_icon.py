"""
Generate favicon.ico for LevantACARS — runs during CI build.
Draws the Levant VA branded logo programmatically (no external image deps).
Output: BMP layers for 48/32/16px + PNG for 256px = maximum Windows compatibility.
"""
from PIL import Image, ImageDraw, ImageFont
import struct
import io
import math
import os
import sys

def main():
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'LevantACARS', 'Assets')
    os.makedirs(out_dir, exist_ok=True)
    ico_path = os.path.join(out_dir, 'favicon.ico')

    S = 1024
    cx, cy = S // 2, S // 2
    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    NAVY = (10, 22, 40, 255)
    GOLD = (212, 175, 55, 255)

    # Outer gold ring
    ring_r = 496
    draw.ellipse([cx-ring_r, cy-ring_r, cx+ring_r, cy+ring_r], outline=GOLD, width=12)
    draw.ellipse([cx-476, cy-476, cx+476, cy+476], outline=(212,175,55,100), width=4)
    # Navy fill
    draw.ellipse([cx-460, cy-460, cx+460, cy+460], fill=NAVY)
    # Inner ring
    draw.ellipse([cx-440, cy-440, cx+440, cy+440], outline=(212,175,55,38), width=2)

    # Aircraft polygons (rotated -35 degrees)
    def rp(px, py, a=-35):
        rad = math.radians(a)
        dx, dy = px*2 - cx, py*2 - cy
        return (cx + dx*math.cos(rad) - dy*math.sin(rad),
                cy + dx*math.sin(rad) + dy*math.cos(rad))

    def rpoly(pts, a=-35):
        return [rp(x, y, a) for x, y in pts]

    # Fuselage
    draw.polygon(rpoly([(110,270),(140,258),(200,252),(380,240),(445,230),
                         (455,222),(410,220),(200,238),(130,252),(110,270)]), fill=GOLD)
    # Wings
    draw.polygon(rpoly([(210,255),(160,330),(165,338),(280,260)]), fill=GOLD)
    draw.polygon(rpoly([(280,240),(340,170),(336,162),(230,232)]), fill=GOLD)
    # Tail
    draw.polygon(rpoly([(120,268),(95,230),(98,218),(140,258)]), fill=GOLD)
    # Stabilizers
    draw.polygon(rpoly([(125,262),(88,240),(85,245),(125,268)]), fill=(212,175,55,216))
    draw.polygon(rpoly([(125,272),(90,290),(90,294),(135,276)]), fill=(212,175,55,216))
    # Engines
    for ecx, ecy in [(202,282),(317,232)]:
        draw.polygon(rpoly([(ecx-12,ecy-10),(ecx+12,ecy-10),(ecx+12,ecy+10),(ecx-12,ecy+10)]), fill=GOLD)

    # Swoosh
    for t in range(200):
        f = t / 200.0
        x, y = 60+f*420, 400-120*f+20*math.sin(f*math.pi)
        r = max(1, int(3*(1-f)))
        draw.ellipse([x*2-r, y*2-r, x*2+r, y*2+r], fill=(212,175,55, int(50*(1-f))))

    # Text
    try:
        font = ImageFont.truetype("arial.ttf", 56)
        font_sm = ImageFont.truetype("arial.ttf", 28)
    except:
        font = ImageFont.load_default()
        font_sm = font

    bb = draw.textbbox((0,0), "LEVANT", font=font)
    draw.text((cx-(bb[2]-bb[0])//2, S-220), "LEVANT", fill=GOLD, font=font)
    bb2 = draw.textbbox((0,0), "VIRTUAL AIRLINES", font=font_sm)
    draw.text((cx-(bb2[2]-bb2[0])//2, S-155), "VIRTUAL AIRLINES", fill=(212,175,55,128), font=font_sm)

    # Star
    star_pts = []
    for i in range(10):
        a = math.radians(-90 + i*36)
        r = 24 if i%2==0 else 10
        star_pts.append((cx+r*math.cos(a), 96+r*math.sin(a)))
    draw.polygon(star_pts, fill=(212,175,55,153))

    # Circular mask
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).ellipse([cx-ring_r, cy-ring_r, cx+ring_r, cy+ring_r], fill=255)
    canvas.putalpha(mask)

    # === Write ICO with BMP layers (max compat) + PNG for 256 ===
    def to_bmp(img):
        w, h = img.size
        hdr = struct.pack('<IiiHHIIiiII', 40, w, h*2, 1, 32, 0, 0, 0, 0, 0, 0)
        px = bytearray()
        for y in range(h-1, -1, -1):
            for x in range(w):
                r, g, b, a = img.getpixel((x, y))
                px.extend([b, g, r, a])
        am = bytearray()
        rb = (w+31)//32*4
        for y in range(h-1, -1, -1):
            row = bytearray(rb)
            for x in range(w):
                if img.getpixel((x, y))[3] < 128:
                    row[x//8] |= (0x80 >> (x%8))
            am.extend(row)
        return hdr + bytes(px) + bytes(am)

    def to_png(img):
        buf = io.BytesIO()
        img.save(buf, format='PNG', optimize=True)
        return buf.getvalue()

    sizes = [256, 48, 32, 16]
    entries = []
    for s in sizes:
        resized = canvas.resize((s, s), Image.LANCZOS)
        data = to_png(resized) if s >= 256 else to_bmp(resized)
        entries.append((s, data))
        print(f"  {s}x{s}: {'PNG' if s>=256 else 'BMP'} ({len(data):,} bytes)")

    num = len(entries)
    hdr = struct.pack('<HHH', 0, 1, num)
    dir_data = bytearray()
    img_data = bytearray()
    base = 6 + 16*num

    for s, data in entries:
        wb = 0 if s >= 256 else s
        dir_data.extend(struct.pack('<BBBBHHII', wb, wb, 0, 0, 1, 32, len(data), base+len(img_data)))
        img_data.extend(data)

    with open(ico_path, 'wb') as f:
        f.write(hdr + bytes(dir_data) + bytes(img_data))

    sz = os.path.getsize(ico_path)
    print(f"\n  Output: {ico_path}")
    print(f"  Size: {sz:,} bytes ({sz/1024:.1f} KB)")
    print(f"  Layers: {', '.join(f'{s}x{s}' for s,_ in entries)}")

if __name__ == '__main__':
    main()
