#!/usr/bin/env python3
"""
Kairos 777 — Professional Promotional Banner Generator
Generates high-quality images for X (Twitter) and Telegram posts.
"""

from PIL import Image, ImageDraw, ImageFont
import math, os, random

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT  = os.path.join(BASE, "assets", "promo")
os.makedirs(OUT, exist_ok=True)

LOGO_PATH = os.path.join(BASE, "assets", "branding", "logo-256.png")

# ── Colors ──
DARK      = (5, 5, 7)
DARK2     = (10, 10, 18)
BLUE      = (59, 130, 246)
BLUE_L    = (96, 165, 250)
BLUE_D    = (37, 99, 235)
GOLD      = (212, 175, 55)
GOLD_D    = (184, 134, 11)
GREEN     = (16, 185, 129)
WHITE     = (255, 255, 255)
GRAY      = (156, 163, 175)
RED       = (239, 68, 68)

def get_font(size, bold=False):
    """Try system fonts, fallback to default."""
    names = [
        "/System/Library/Fonts/SFPro-Bold.otf" if bold else "/System/Library/Fonts/SFPro-Regular.otf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    for n in names:
        if os.path.exists(n):
            try:
                return ImageFont.truetype(n, size)
            except:
                continue
    return ImageFont.load_default()

def draw_gradient_rect(draw, xy, color1, color2, direction='h'):
    """Draw a gradient-filled rectangle."""
    x0, y0, x1, y1 = xy
    if direction == 'h':
        for x in range(x0, x1):
            t = (x - x0) / max(1, (x1 - x0))
            r = int(color1[0] + (color2[0] - color1[0]) * t)
            g = int(color1[1] + (color2[1] - color1[1]) * t)
            b = int(color1[2] + (color2[2] - color1[2]) * t)
            draw.line([(x, y0), (x, y1)], fill=(r, g, b))
    else:
        for y in range(y0, y1):
            t = (y - y0) / max(1, (y1 - y0))
            r = int(color1[0] + (color2[0] - color1[0]) * t)
            g = int(color1[1] + (color2[1] - color1[1]) * t)
            b = int(color1[2] + (color2[2] - color1[2]) * t)
            draw.line([(x0, y), (x1, y)], fill=(r, g, b))

def draw_grid(draw, w, h, spacing=60, color=(59, 130, 246)):
    """Draw subtle grid pattern."""
    for x in range(0, w, spacing):
        draw.line([(x, 0), (x, h)], fill=(*color, 8), width=1)
    for y in range(0, h, spacing):
        draw.line([(0, y), (w, y)], fill=(*color, 8), width=1)

def draw_glow(img, cx, cy, radius, color, intensity=0.15):
    """Draw a radial glow effect."""
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for r in range(radius, 0, -2):
        alpha = int(255 * intensity * (1 - r / radius) ** 2)
        od.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            fill=(*color, alpha)
        )
    img.paste(Image.alpha_composite(img, overlay))
    return img

def draw_chart_line(draw, x0, y0, w, h, color=BLUE, points=20):
    """Draw a realistic uptrend chart line with area fill."""
    pts = []
    step = w / (points - 1)
    for i in range(points):
        x = x0 + i * step
        # Uptrend with realistic noise
        progress = i / (points - 1)
        base = y0 + h * (1 - progress * 0.7)
        noise = random.uniform(-h * 0.08, h * 0.08)
        y = base + noise
        pts.append((x, y))

    # Area fill
    fill_pts = pts + [(x0 + w, y0 + h), (x0, y0 + h)]
    for yi in range(int(min(p[1] for p in pts)), y0 + h):
        intersections = []
        for j in range(len(pts) - 1):
            x1_, y1_ = pts[j]
            x2_, y2_ = pts[j + 1]
            if (y1_ <= yi <= y2_) or (y2_ <= yi <= y1_):
                if y2_ - y1_ != 0:
                    xi = x1_ + (yi - y1_) * (x2_ - x1_) / (y2_ - y1_)
                    intersections.append(xi)
        if intersections:
            xi_min = min(intersections)
            xi_max = max(intersections)
            t = (yi - min(p[1] for p in pts)) / max(1, (y0 + h - min(p[1] for p in pts)))
            alpha = int(40 * (1 - t))
            draw.line([(xi_min, yi), (x0 + w, yi)], fill=(*color, alpha))

    # Chart line
    for i in range(len(pts) - 1):
        draw.line([pts[i], pts[i + 1]], fill=(*color, 200), width=3)

    # End dot
    lx, ly = pts[-1]
    draw.ellipse([lx - 5, ly - 5, lx + 5, ly + 5], fill=GREEN)
    draw.ellipse([lx - 9, ly - 9, lx + 9, ly + 9], outline=(*GREEN, 100), width=2)
    return pts

def draw_candles(draw, x0, y0, w, h, count=24):
    """Draw realistic candlestick chart."""
    cw = w / count * 0.6
    gap = w / count
    price = 96000
    for i in range(count):
        x = x0 + i * gap + gap * 0.2
        change = random.uniform(-800, 900)
        open_p = price
        close_p = price + change
        high = max(open_p, close_p) + random.uniform(100, 500)
        low = min(open_p, close_p) - random.uniform(100, 500)

        # Normalize to chart area
        price_range = 6000
        base_price = 93000
        def p2y(p):
            return y0 + h - ((p - base_price) / price_range * h)

        is_green = close_p >= open_p
        color = GREEN if is_green else RED

        # Wick
        draw.line([(x + cw / 2, p2y(high)), (x + cw / 2, p2y(low))], fill=(*color, 180), width=1)
        # Body
        body_top = p2y(max(open_p, close_p))
        body_bot = p2y(min(open_p, close_p))
        if body_bot - body_top < 2:
            body_bot = body_top + 2
        draw.rectangle([x, body_top, x + cw, body_bot], fill=(*color, 220))

        price = close_p

def draw_node_network(draw, cx, cy, radius, nodes=8, color=BLUE):
    """Draw a decentralized network pattern."""
    points = []
    for i in range(nodes):
        angle = (2 * math.pi / nodes) * i - math.pi / 2
        x = cx + radius * math.cos(angle)
        y = cy + radius * math.sin(angle)
        points.append((x, y))

    # Connections
    for i in range(nodes):
        for j in range(i + 1, nodes):
            if random.random() > 0.3:
                draw.line([points[i], points[j]], fill=(*color, 30), width=1)

    # Nodes
    for px, py in points:
        draw.ellipse([px - 4, py - 4, px + 4, py + 4], fill=(*color, 120))
        draw.ellipse([px - 2, py - 2, px + 2, py + 2], fill=WHITE)


# ═══════════════════════════════════════════════════════════════
# IMAGE 1: Main Ecosystem Banner (Twitter 1200x675)
# ═══════════════════════════════════════════════════════════════
def create_main_banner():
    W, H = 1200, 675
    img = Image.new('RGBA', (W, H), DARK)
    draw = ImageDraw.Draw(img)

    # Background gradient
    draw_gradient_rect(draw, (0, 0, W, H), DARK, DARK2, 'v')

    # Grid
    draw_grid(draw, W, H, 80, BLUE)

    # Glows
    img = draw_glow(img, 350, 300, 400, BLUE, 0.08)
    img = draw_glow(img, 900, 200, 300, BLUE_L, 0.05)
    draw = ImageDraw.Draw(img)

    # Network nodes background decoration
    draw_node_network(draw, 100, 120, 60, 6, BLUE)
    draw_node_network(draw, 1100, 550, 50, 5, BLUE_L)
    draw_node_network(draw, 1050, 150, 40, 4, GOLD)

    # ── Left side: Text ──

    # Badge
    badge_y = 120
    draw.rounded_rectangle([60, badge_y, 320, badge_y + 32], radius=16, fill=(*BLUE, 20), outline=(*BLUE, 60))
    f_badge = get_font(13, bold=True)
    draw.ellipse([74, badge_y + 11, 82, badge_y + 19], fill=GREEN)
    draw.text((90, badge_y + 6), "ECOSYSTEM LIVE", fill=BLUE_L, font=f_badge)

    # Title
    f_title = get_font(52, bold=True)
    f_title_s = get_font(50, bold=True)
    draw.text((62, 172), "The Future of", fill=WHITE, font=f_title)
    draw.text((62, 232), "Decentralized", fill=BLUE_L, font=f_title)
    draw.text((62, 292), "Trading", fill=BLUE, font=f_title)

    # Subtitle
    f_sub = get_font(17)
    draw.text((62, 360), "Algorithmic bots  ·  150× Leverage  ·  33+ Pairs", fill=GRAY, font=f_sub)
    draw.text((62, 385), "USD Stablecoin  ·  Multi-Chain Wallet", fill=GRAY, font=f_sub)

    # URL
    f_url = get_font(15, bold=True)
    draw.text((62, 420), "kairos-777.com", fill=BLUE_L, font=f_url)

    # ── Bottom stats bar ──
    bar_y = 490
    draw.rectangle([0, bar_y, W, bar_y + 1], fill=(*BLUE, 30))
    draw.rectangle([0, bar_y + 1, W, H], fill=(*DARK2, 200))

    stats = [
        ("33+", "TRADING PAIRS", BLUE_L),
        ("150×", "MAX LEVERAGE", WHITE),
        ("$1.00", "KAIROS PEG", GOLD),
        ("4", "BLOCKCHAINS", GREEN),
        ("10", "BROKERS", BLUE_L),
    ]
    stat_w = W / len(stats)
    f_sv = get_font(36, bold=True)
    f_sl = get_font(11, bold=True)
    for i, (val, label, color) in enumerate(stats):
        sx = i * stat_w + stat_w / 2
        draw.text((sx, bar_y + 30), val, fill=color, font=f_sv, anchor="mt")
        draw.text((sx, bar_y + 75), label, fill=GRAY, font=f_sl, anchor="mt")

    # ── Right side: Chart mockup ──
    cx0, cy0, cw, ch = 620, 120, 520, 340
    # Card background
    draw.rounded_rectangle([cx0, cy0, cx0 + cw, cy0 + ch], radius=20, fill=(10, 10, 20, 220), outline=(*BLUE, 40))

    # Chart header
    f_pair = get_font(18, bold=True)
    f_price = get_font(22, bold=True)
    f_change = get_font(13, bold=True)
    draw.text((cx0 + 24, cy0 + 16), "BTC / USDT", fill=WHITE, font=f_pair)
    draw.text((cx0 + cw - 24, cy0 + 14), "$96,482", fill=GREEN, font=f_price, anchor="rt")
    draw.text((cx0 + cw - 24, cy0 + 40), "+3.24%", fill=GREEN, font=f_change, anchor="rt")

    # Candles
    random.seed(42)
    draw_candles(draw, cx0 + 20, cy0 + 65, cw - 40, 150, 28)

    # Bot status bar
    bot_y = cy0 + 240
    draw.rounded_rectangle([cx0 + 16, bot_y, cx0 + cw - 16, bot_y + 80], radius=12, fill=(*BLUE, 15), outline=(*BLUE, 40))
    f_bot = get_font(14, bold=True)
    f_bot_s = get_font(12)
    draw.ellipse([cx0 + 28, bot_y + 12, cx0 + 36, bot_y + 20], fill=GREEN)
    draw.text((cx0 + 44, bot_y + 8), "EMA Cross Bot", fill=WHITE, font=f_bot)
    draw.rounded_rectangle([cx0 + cw - 100, bot_y + 8, cx0 + cw - 28, bot_y + 28], radius=6, fill=(*GREEN, 30))
    draw.text((cx0 + cw - 64, bot_y + 10), "Running", fill=GREEN, font=f_bot_s, anchor="mt")

    bot_stats = [("Trades", "147", WHITE), ("Win Rate", "68.4%", GREEN), ("P&L", "+$12,840", GREEN)]
    for i, (lbl, val, c) in enumerate(bot_stats):
        bx = cx0 + 28 + i * 160
        draw.text((bx, bot_y + 40), lbl, fill=GRAY, font=get_font(10))
        draw.text((bx, bot_y + 54), val, fill=c, font=get_font(16, bold=True))

    # ── Logo ──
    try:
        logo = Image.open(LOGO_PATH).convert('RGBA').resize((64, 64), Image.LANCZOS)
        # Create circular mask
        mask = Image.new('L', (64, 64), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, 64, 64], fill=255)
        logo.putalpha(mask)
        img.paste(logo, (62, 580), logo)
    except:
        pass

    # Brand name next to logo
    f_brand = get_font(20, bold=True)
    draw.text((134, 598), "KAIROS 777", fill=WHITE, font=f_brand)

    # Motto
    f_motto = get_font(12)
    draw.text((134, 622), '"In God We Trust"', fill=(*GOLD, 150), font=f_motto)

    # Three product pills  
    pills = [("TRADE", BLUE), ("COIN", GOLD), ("WALLET", GREEN)]
    px_start = 360
    f_pill = get_font(12, bold=True)
    for i, (txt, c) in enumerate(pills):
        px = px_start + i * 110
        draw.rounded_rectangle([px, 600, px + 95, 625], radius=8, fill=(*c, 25), outline=(*c, 80))
        draw.text((px + 47, 610), txt, fill=c, font=f_pill, anchor="mt")

    # Border
    draw.rounded_rectangle([2, 2, W - 3, H - 3], radius=0, outline=(*BLUE, 25), width=2)

    out_path = os.path.join(OUT, "kairos-ecosystem-banner-twitter.png")
    img.convert('RGB').save(out_path, quality=95)
    print(f"✅ Twitter banner: {out_path}")
    return out_path


# ═══════════════════════════════════════════════════════════════
# IMAGE 2: Telegram Post (1280x720)
# ═══════════════════════════════════════════════════════════════
def create_telegram_banner():
    W, H = 1280, 720
    img = Image.new('RGBA', (W, H), DARK)
    draw = ImageDraw.Draw(img)

    draw_gradient_rect(draw, (0, 0, W, H), DARK, (8, 8, 20), 'v')
    draw_grid(draw, W, H, 80, BLUE)

    img = draw_glow(img, W // 2, H // 3, 500, BLUE, 0.1)
    img = draw_glow(img, 200, 500, 300, GOLD, 0.04)
    img = draw_glow(img, 1080, 500, 300, GREEN, 0.04)
    draw = ImageDraw.Draw(img)

    # Decorative network nodes
    draw_node_network(draw, 120, 100, 70, 7, BLUE)
    draw_node_network(draw, 1160, 100, 60, 6, BLUE_L)

    # ── Logo centered ──
    try:
        logo = Image.open(LOGO_PATH).convert('RGBA').resize((80, 80), Image.LANCZOS)
        mask = Image.new('L', (80, 80), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, 80, 80], fill=255)
        logo.putalpha(mask)
        img.paste(logo, (W // 2 - 40, 50), logo)
    except:
        pass

    # Brand
    f_brand = get_font(18, bold=True)
    draw.text((W // 2, 142), "KAIROS 777", fill=WHITE, font=f_brand, anchor="mt")

    # Title
    f_title = get_font(48, bold=True)
    draw.text((W // 2, 185), "The Complete Decentralized", fill=WHITE, font=f_title, anchor="mt")
    draw.text((W // 2, 240), "Financial Ecosystem", fill=BLUE_L, font=f_title, anchor="mt")

    # Subtitle
    f_sub = get_font(18)
    draw.text((W // 2, 300), "Trade  ·  Coin  ·  Wallet — All Under One Roof", fill=GRAY, font=f_sub, anchor="mt")

    # ── Three product cards ──
    card_w, card_h = 350, 280
    gap = 40
    total = card_w * 3 + gap * 2
    start_x = (W - total) // 2
    card_y = 350

    cards = [
        {
            "title": "Kairos Trade",
            "color": BLUE,
            "icon": "📈",
            "features": [
                "Algorithmic Trading Bots",
                "Up to 150× Leverage",
                "33+ Crypto Pairs",
                "10 Broker Connections",
                "On-Chain via Arbitrum",
            ]
        },
        {
            "title": "Kairos Coin",
            "color": GOLD,
            "icon": "💰",
            "features": [
                "1 KAIROS = 1 USD",
                "0.08% Fee (60% Cheaper)",
                "Gasless Approvals",
                "4 Blockchains",
                "Verified on BscScan",
            ]
        },
        {
            "title": "Kairos Wallet",
            "color": GREEN,
            "icon": "👛",
            "features": [
                "6 Blockchains Supported",
                "Built-in Token Swaps",
                "WalletConnect v2",
                "NFT Gallery",
                "Installable PWA",
            ]
        },
    ]

    f_card_t = get_font(20, bold=True)
    f_card_f = get_font(13)
    f_check = get_font(12, bold=True)

    for i, card in enumerate(cards):
        cx = start_x + i * (card_w + gap)
        c = card["color"]

        # Card bg
        draw.rounded_rectangle(
            [cx, card_y, cx + card_w, card_y + card_h],
            radius=16, fill=(12, 12, 22, 240), outline=(*c, 60)
        )
        # Top accent line
        draw.rounded_rectangle(
            [cx, card_y, cx + card_w, card_y + 4],
            radius=2, fill=c
        )

        # Title
        draw.text((cx + card_w // 2, card_y + 30), card["title"], fill=WHITE, font=f_card_t, anchor="mt")

        # Features
        for j, feat in enumerate(card["features"]):
            fy = card_y + 65 + j * 32
            draw.text((cx + 24, fy), "✓", fill=GREEN, font=f_check)
            draw.text((cx + 44, fy), feat, fill=GRAY, font=f_card_f)

    # ── Bottom ──
    f_url = get_font(16, bold=True)
    f_motto = get_font(13)
    draw.text((W // 2, H - 55), "kairos-777.com", fill=BLUE_L, font=f_url, anchor="mt")
    draw.text((W // 2, H - 30), '"In God We Trust"  ·  Kairos 777 Inc.', fill=(*GOLD, 130), font=f_motto, anchor="mt")

    # Border
    draw.rounded_rectangle([2, 2, W - 3, H - 3], radius=0, outline=(*BLUE, 25), width=2)

    out_path = os.path.join(OUT, "kairos-ecosystem-banner-telegram.png")
    img.convert('RGB').save(out_path, quality=95)
    print(f"✅ Telegram banner: {out_path}")
    return out_path


# ═══════════════════════════════════════════════════════════════
# IMAGE 3: Trading Focus (Twitter alternate — shows bots/charts)
# ═══════════════════════════════════════════════════════════════
def create_trading_banner():
    W, H = 1200, 675
    img = Image.new('RGBA', (W, H), DARK)
    draw = ImageDraw.Draw(img)

    draw_gradient_rect(draw, (0, 0, W, H), DARK, (5, 5, 15), 'v')
    draw_grid(draw, W, H, 60, BLUE)

    img = draw_glow(img, 600, 350, 500, BLUE, 0.08)
    draw = ImageDraw.Draw(img)

    # ── Full-width chart area ──
    chart_y = 140
    chart_h = 300
    draw.rounded_rectangle([40, chart_y, W - 40, chart_y + chart_h], radius=20, fill=(8, 8, 18, 200), outline=(*BLUE, 30))

    # Chart header
    f_pair = get_font(24, bold=True)
    f_price = get_font(28, bold=True)
    f_change = get_font(14, bold=True)
    draw.text((70, chart_y + 18), "BTC / USDT", fill=WHITE, font=f_pair)
    draw.text((W - 70, chart_y + 16), "$96,482.30", fill=GREEN, font=f_price, anchor="rt")
    draw.text((W - 70, chart_y + 50), "▲ +3.24% (24h)", fill=GREEN, font=f_change, anchor="rt")

    # Separator
    draw.line([(60, chart_y + 75), (W - 60, chart_y + 75)], fill=(*BLUE, 20), width=1)

    # Candles
    random.seed(77)
    draw_candles(draw, 60, chart_y + 85, W - 120, 190, 40)

    # ── Top bar ──
    try:
        logo = Image.open(LOGO_PATH).convert('RGBA').resize((48, 48), Image.LANCZOS)
        mask = Image.new('L', (48, 48), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, 48, 48], fill=255)
        logo.putalpha(mask)
        img.paste(logo, (40, 30), logo)
    except:
        pass
    draw = ImageDraw.Draw(img)

    f_title_top = get_font(22, bold=True)
    draw.text((100, 42), "KAIROS TRADE", fill=WHITE, font=f_title_top)

    # Live badge
    draw.rounded_rectangle([260, 42, 340, 64], radius=10, fill=(*GREEN, 25), outline=(*GREEN, 80))
    draw.ellipse([270, 49, 278, 57], fill=GREEN)
    draw.text((284, 46), "LIVE", fill=GREEN, font=get_font(13, bold=True))

    # ── Bot cards row ──
    bots = [
        ("EMA Cross Bot", "BTC/USDT", "Running", "+$12,840", "68.4%", GREEN),
        ("RSI Momentum", "ETH/USDT", "Running", "+$4,290", "72.1%", GREEN),
        ("MACD Divergence", "SOL/USDT", "Paused", "+$1,850", "61.8%", GOLD),
    ]
    bot_y = 470
    bot_w = (W - 120) / 3
    f_bn = get_font(15, bold=True)
    f_bs = get_font(12)
    f_bv = get_font(18, bold=True)
    f_bl = get_font(10)

    for i, (name, pair, status, pnl, wr, sc) in enumerate(bots):
        bx = 40 + i * (bot_w + 20)
        draw.rounded_rectangle([bx, bot_y, bx + bot_w, bot_y + 100], radius=14, fill=(12, 12, 22, 230), outline=(*sc, 40))
        # Top accent
        draw.rounded_rectangle([bx, bot_y, bx + bot_w, bot_y + 3], radius=2, fill=sc)

        draw.ellipse([bx + 14, bot_y + 16, bx + 22, bot_y + 24], fill=sc)
        draw.text((bx + 30, bot_y + 12), name, fill=WHITE, font=f_bn)
        draw.text((bx + bot_w - 14, bot_y + 14), pair, fill=GRAY, font=f_bs, anchor="rt")

        # Stats
        stats_data = [("P&L", pnl, sc), ("Win Rate", wr, sc), ("Status", status, sc)]
        for j, (sl, sv, c) in enumerate(stats_data):
            sx = bx + 14 + j * (bot_w / 3)
            draw.text((sx, bot_y + 50), sl, fill=GRAY, font=f_bl)
            draw.text((sx, bot_y + 64), sv, fill=c, font=get_font(14, bold=True))

    # ── Bottom bar ──
    draw.line([(0, H - 60), (W, H - 60)], fill=(*BLUE, 20))
    f_foot = get_font(14, bold=True)
    f_motto = get_font(12)
    draw.text((40, H - 42), "kairos-777.com", fill=BLUE_L, font=f_foot)
    draw.text((W // 2, H - 42), "Algorithmic Trading  ·  150× Leverage  ·  33+ Pairs  ·  10 Brokers", fill=GRAY, font=f_motto, anchor="lt")
    draw.text((W - 40, H - 42), '"In God We Trust"', fill=(*GOLD, 120), font=f_motto, anchor="rt")

    # Border
    draw.rounded_rectangle([2, 2, W - 3, H - 3], radius=0, outline=(*BLUE, 25), width=2)

    out_path = os.path.join(OUT, "kairos-trade-banner.png")
    img.convert('RGB').save(out_path, quality=95)
    print(f"✅ Trading banner: {out_path}")
    return out_path


if __name__ == "__main__":
    print("🎨 Generating Kairos 777 promotional banners...\n")
    random.seed(42)
    create_main_banner()
    random.seed(42)
    create_telegram_banner()
    random.seed(42)
    create_trading_banner()
    print(f"\n📁 All images saved to: {OUT}/")
    print("   Use these for X (Twitter) and Telegram posts.")
