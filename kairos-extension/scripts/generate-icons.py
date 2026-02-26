#!/usr/bin/env python3
"""Generate extension icons for Kairos Wallet"""
import subprocess
import os

ICON_DIR = "/Users/kaizenllc/KairosCoin/kairos-extension/dist/icons"
SIZES = [16, 32, 48, 128]

SVG_TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a1a"/>
      <stop offset="100%" style="stop-color:#141420"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f7c948"/>
      <stop offset="100%" style="stop-color:#D4AF37"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#bg)"/>
  <circle cx="64" cy="64" r="38" fill="none" stroke="url(#gold)" stroke-width="3" opacity="0.3"/>
  <text x="64" y="82" font-family="Inter, Arial, sans-serif" font-size="68" font-weight="800" text-anchor="middle" fill="url(#gold)">K</text>
</svg>"""

os.makedirs(ICON_DIR, exist_ok=True)

for size in SIZES:
    svg = SVG_TEMPLATE.format(size=size)
    svg_path = os.path.join(ICON_DIR, f"icon-{size}.svg")
    png_path = os.path.join(ICON_DIR, f"icon-{size}.png")
    
    with open(svg_path, "w") as f:
        f.write(svg)
    
    # Try to convert with sips (macOS built-in)
    try:
        # First create a temporary large PNG from SVG using python
        subprocess.run(["sips", "-s", "format", "png", svg_path, "--out", png_path, "-z", str(size), str(size)], 
                       capture_output=True, timeout=10)
        if os.path.exists(png_path) and os.path.getsize(png_path) > 0:
            os.remove(svg_path)
            print(f"✓ icon-{size}.png created")
            continue
    except:
        pass
    
    # Fallback: keep SVG and create a minimal valid PNG
    print(f"⚠ icon-{size}.svg created (convert to PNG manually)")

# Also copy icons to public/icons for dev
PUBLIC_ICONS = "/Users/kaizenllc/KairosCoin/kairos-extension/public/icons"
os.makedirs(PUBLIC_ICONS, exist_ok=True)
for f in os.listdir(ICON_DIR):
    src = os.path.join(ICON_DIR, f)
    dst = os.path.join(PUBLIC_ICONS, f)
    with open(src, "rb") as sf:
        with open(dst, "wb") as df:
            df.write(sf.read())

print("Done!")
