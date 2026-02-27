#!/usr/bin/env python3
"""
Generate app icons and splash screens for Kairos Trade & Wallet native apps.
Uses existing logo assets as source, resizes for all iOS + Android targets.
"""

from PIL import Image, ImageDraw, ImageFilter
import os
import shutil
import json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ─── Source images ───────────────────────────────────────────────
TRADE_SRC = os.path.join(ROOT, "kairos-trade", "public", "icons", "icon-512.png")
WALLET_SRC = os.path.join(ROOT, "kairos-wallet", "public", "icons", "kairos-token.png")  # 1024x1024

# ─── Android mipmap sizes ───────────────────────────────────────
ANDROID_SIZES = {
    "mipmap-mdpi":    48,
    "mipmap-hdpi":    72,
    "mipmap-xhdpi":   96,
    "mipmap-xxhdpi":  144,
    "mipmap-xxxhdpi": 192,
}

# Android adaptive icon foreground (needs padding — 108dp with 72dp safe zone)
ANDROID_FG_SIZES = {
    "mipmap-mdpi":    108,
    "mipmap-hdpi":    162,
    "mipmap-xhdpi":   216,
    "mipmap-xxhdpi":  324,
    "mipmap-xxxhdpi": 432,
}


def make_round(img):
    """Create a circular version of an image."""
    size = img.size[0]
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(img, mask=mask)
    return result


def make_foreground(img, target_size):
    """
    Create adaptive icon foreground: logo centered in a larger canvas.
    The foreground is 108dp but only 72dp (66.67%) is the safe zone.
    So we place the icon at ~66% of the canvas, centered.
    """
    canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    # Icon should occupy ~66% of the canvas
    icon_size = int(target_size * 0.66)
    icon = img.resize((icon_size, icon_size), Image.LANCZOS)
    offset = (target_size - icon_size) // 2
    canvas.paste(icon, (offset, offset), icon if icon.mode == "RGBA" else None)
    return canvas


def generate_ios_icons(src_path, app_dir):
    """Generate iOS app icon (single 1024x1024 universal icon)."""
    iconset_dir = os.path.join(app_dir, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset")
    os.makedirs(iconset_dir, exist_ok=True)

    img = Image.open(src_path).convert("RGBA")

    # iOS needs a 1024x1024 icon (no transparency for App Store)
    icon_1024 = img.resize((1024, 1024), Image.LANCZOS)
    # Flatten alpha onto white/dark background for App Store
    bg = Image.new("RGB", (1024, 1024), (13, 13, 13))  # Dark background
    if icon_1024.mode == "RGBA":
        bg.paste(icon_1024, mask=icon_1024.split()[3])
    else:
        bg.paste(icon_1024)
    bg.save(os.path.join(iconset_dir, "AppIcon-512@2x.png"), "PNG")

    # Write Contents.json
    contents = {
        "images": [
            {
                "filename": "AppIcon-512@2x.png",
                "idiom": "universal",
                "platform": "ios",
                "size": "1024x1024"
            }
        ],
        "info": {
            "author": "xcode",
            "version": 1
        }
    }
    with open(os.path.join(iconset_dir, "Contents.json"), "w") as f:
        json.dump(contents, f, indent=2)

    print(f"  ✅ iOS icon generated: {iconset_dir}")


def generate_android_icons(src_path, app_dir, bg_color):
    """Generate all Android mipmap icons."""
    res_dir = os.path.join(app_dir, "android", "app", "src", "main", "res")
    img = Image.open(src_path).convert("RGBA")

    for density, size in ANDROID_SIZES.items():
        mipmap_dir = os.path.join(res_dir, density)
        os.makedirs(mipmap_dir, exist_ok=True)

        # Regular icon (with background)
        icon = img.resize((size, size), Image.LANCZOS)
        flat = Image.new("RGB", (size, size), bg_color)
        if icon.mode == "RGBA":
            flat.paste(icon, mask=icon.split()[3])
        else:
            flat.paste(icon)
        flat.save(os.path.join(mipmap_dir, "ic_launcher.png"), "PNG")

        # Round icon
        round_icon = make_round(flat.convert("RGBA"))
        # Save as PNG with alpha
        round_icon.save(os.path.join(mipmap_dir, "ic_launcher_round.png"), "PNG")

        print(f"  ✅ Android {density}: {size}x{size}")

    # Adaptive foreground icons
    for density, size in ANDROID_FG_SIZES.items():
        mipmap_dir = os.path.join(res_dir, density)
        fg = make_foreground(img, size)
        fg.save(os.path.join(mipmap_dir, "ic_launcher_foreground.png"), "PNG")

    print(f"  ✅ Android adaptive foregrounds generated")


def generate_splash(app_dir, bg_color, src_path):
    """Generate splash screen images for Android drawable directories."""
    res_dir = os.path.join(app_dir, "android", "app", "src", "main", "res")
    img = Image.open(src_path).convert("RGBA")

    # Splash screen sizes (landscape and portrait)
    splash_configs = {
        "drawable-port-hdpi":    (480, 800),
        "drawable-port-xhdpi":   (720, 1280),
        "drawable-port-xxhdpi":  (960, 1600),
        "drawable-port-xxxhdpi": (1280, 1920),
        "drawable-land-hdpi":    (800, 480),
        "drawable-land-xhdpi":   (1280, 720),
        "drawable-land-xxhdpi":  (1600, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
        "drawable-port-mdpi":    (320, 480),
        "drawable-land-mdpi":    (480, 320),
    }

    for drawable, (w, h) in splash_configs.items():
        d = os.path.join(res_dir, drawable)
        os.makedirs(d, exist_ok=True)

        # Dark background with centered logo
        canvas = Image.new("RGB", (w, h), bg_color)
        logo_size = min(w, h) // 3  # Logo takes 1/3 of shortest dimension
        logo = img.resize((logo_size, logo_size), Image.LANCZOS)
        x = (w - logo_size) // 2
        y = (h - logo_size) // 2
        if logo.mode == "RGBA":
            canvas.paste(logo, (x, y), logo.split()[3])
        else:
            canvas.paste(logo, (x, y))
        canvas.save(os.path.join(d, "splash.png"), "PNG")

    # Also generate default drawable splash
    d = os.path.join(res_dir, "drawable")
    os.makedirs(d, exist_ok=True)
    canvas = Image.new("RGB", (480, 800), bg_color)
    logo_size = 160
    logo = img.resize((logo_size, logo_size), Image.LANCZOS)
    x = (480 - logo_size) // 2
    y = (800 - logo_size) // 2
    if logo.mode == "RGBA":
        canvas.paste(logo, (x, y), logo.split()[3])
    else:
        canvas.paste(logo, (x, y))
    canvas.save(os.path.join(d, "splash.png"), "PNG")

    print(f"  ✅ Splash screens generated")


def main():
    # ─── Kairos Trade ────────────────────────────────────────────
    print("\n🔷 Kairos Trade Icons")
    trade_dir = os.path.join(ROOT, "kairos-trade")
    trade_bg = (8, 9, 12)  # #08090C

    generate_ios_icons(TRADE_SRC, trade_dir)
    generate_android_icons(TRADE_SRC, trade_dir, trade_bg)
    generate_splash(trade_dir, trade_bg, TRADE_SRC)

    # ─── Kairos Wallet ───────────────────────────────────────────
    print("\n🟣 Kairos Wallet Icons")
    wallet_dir = os.path.join(ROOT, "kairos-wallet")
    wallet_bg = (10, 11, 15)  # #0A0B0F

    generate_ios_icons(WALLET_SRC, wallet_dir)
    generate_android_icons(WALLET_SRC, wallet_dir, wallet_bg)
    generate_splash(wallet_dir, wallet_bg, WALLET_SRC)

    print("\n✅ All icons and splash screens generated!\n")


if __name__ == "__main__":
    main()
