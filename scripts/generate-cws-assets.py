#!/usr/bin/env python3
"""Generate Chrome Web Store promotional assets for Kairos Wallet Extension."""

from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'kairos-extension', 'cws-assets')
os.makedirs(OUT_DIR, exist_ok=True)

# Brand colors
GOLD = '#D4AF37'
DARK = '#0D0D0D'
DARK2 = '#1A1A1A'
WHITE = '#FFFFFF'
GOLD_RGB = (212, 175, 55)
DARK_RGB = (13, 13, 13)
DARK2_RGB = (26, 26, 26)
WHITE_RGB = (255, 255, 255)
GRAY_RGB = (128, 128, 128)

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def get_font(size, bold=False):
    """Try to load a nice font, fallback to default."""
    font_paths = [
        '/System/Library/Fonts/Helvetica.ttc',
        '/System/Library/Fonts/SFNSDisplay.ttf',
        '/System/Library/Fonts/SFPro-Bold.ttf' if bold else '/System/Library/Fonts/SFPro-Regular.ttf',
        '/Library/Fonts/Arial.ttf',
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except:
                continue
    return ImageFont.load_default()

def draw_gradient_bg(draw, width, height):
    """Draw a dark gradient background."""
    for y in range(height):
        r = int(13 + (26 - 13) * y / height)
        g = int(13 + (26 - 13) * y / height)
        b = int(13 + (26 - 13) * y / height)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

def draw_gold_accent(draw, width, height):
    """Draw subtle gold accent lines."""
    # Top gold line
    draw.rectangle([(0, 0), (width, 3)], fill=GOLD_RGB)
    # Bottom gold line
    draw.rectangle([(0, height - 3), (width, height)], fill=GOLD_RGB)

def draw_kairos_logo(draw, cx, cy, radius):
    """Draw a stylized K circle logo."""
    # Gold circle
    draw.ellipse(
        [(cx - radius, cy - radius), (cx + radius, cy + radius)],
        fill=GOLD_RGB
    )
    # Dark inner circle
    inner_r = int(radius * 0.85)
    draw.ellipse(
        [(cx - inner_r, cy - inner_r), (cx + inner_r, cy + inner_r)],
        fill=DARK_RGB
    )
    # Gold K letter
    k_font = get_font(int(radius * 1.2), bold=True)
    draw.text((cx, cy), 'K', fill=GOLD_RGB, font=k_font, anchor='mm')

def draw_wallet_mockup(draw, x, y, w, h):
    """Draw a simplified wallet popup mockup."""
    # Popup background
    draw.rounded_rectangle([(x, y), (x + w, y + h)], radius=12, fill=(20, 20, 20))
    draw.rounded_rectangle([(x, y), (x + w, y + h)], radius=12, outline=GOLD_RGB, width=2)
    
    # Header bar
    draw.rounded_rectangle([(x, y), (x + w, y + 50)], radius=12, fill=(30, 30, 30))
    draw.rectangle([(x, y + 38), (x + w, y + 50)], fill=(30, 30, 30))
    header_font = get_font(16, bold=True)
    draw.text((x + w // 2, y + 25), 'Kairos Wallet', fill=GOLD_RGB, font=header_font, anchor='mm')
    
    # Balance section
    bal_font = get_font(28, bold=True)
    draw.text((x + w // 2, y + 90), '$12,450.00', fill=WHITE_RGB, font=bal_font, anchor='mm')
    
    small_font = get_font(12)
    draw.text((x + w // 2, y + 115), 'Total Balance', fill=GRAY_RGB, font=small_font, anchor='mm')
    
    # Token list items
    token_y = y + 145
    tokens = [
        ('KAIROS', '$5,000.00', GOLD_RGB),
        ('BNB', '$3,200.00', (243, 186, 47)),
        ('USDT', '$2,150.00', (38, 161, 123)),
        ('ETH', '$2,100.00', (98, 126, 234)),
    ]
    item_font = get_font(13, bold=True)
    val_font = get_font(12)
    
    for name, val, color in tokens:
        # Token icon circle
        draw.ellipse([(x + 15, token_y), (x + 35, token_y + 20)], fill=color)
        letter_font = get_font(10, bold=True)
        draw.text((x + 25, token_y + 10), name[0], fill=DARK_RGB, font=letter_font, anchor='mm')
        # Token name
        draw.text((x + 45, token_y + 4), name, fill=WHITE_RGB, font=item_font, anchor='lm')
        # Token value
        draw.text((x + w - 15, token_y + 4), val, fill=WHITE_RGB, font=val_font, anchor='rm')
        # Separator
        draw.line([(x + 15, token_y + 28), (x + w - 15, token_y + 28)], fill=(40, 40, 40))
        token_y += 35
    
    # Bottom action buttons
    btn_y = y + h - 55
    btn_w = (w - 40) // 3
    actions = ['Send', 'Receive', 'Swap']
    for i, action in enumerate(actions):
        bx = x + 10 + i * (btn_w + 5)
        draw.rounded_rectangle([(bx, btn_y), (bx + btn_w, btn_y + 35)], radius=8, fill=GOLD_RGB if i == 2 else (40, 40, 40))
        btn_font = get_font(11, bold=True)
        text_color = DARK_RGB if i == 2 else WHITE_RGB
        draw.text((bx + btn_w // 2, btn_y + 17), action, fill=text_color, font=btn_font, anchor='mm')

def create_screenshot_1(width=1280, height=800):
    """Main screenshot: Extension in action."""
    img = Image.new('RGB', (width, height), DARK_RGB)
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, width, height)
    draw_gold_accent(draw, width, height)
    
    # Left side: Text content
    title_font = get_font(48, bold=True)
    sub_font = get_font(22)
    feat_font = get_font(18)
    
    draw.text((80, 150), 'Kairos Wallet', fill=GOLD_RGB, font=title_font)
    draw.text((80, 220), 'Chrome Extension', fill=WHITE_RGB, font=sub_font)
    
    features = [
        '✦  Multi-chain: BSC, Ethereum, Polygon, Base, Arbitrum',
        '✦  Secure vault with AES-256 encryption',
        '✦  EIP-1193 compatible — works with all dApps',
        '✦  Send, receive, and swap tokens seamlessly',
        '✦  Beautiful dark + gold premium design',
    ]
    
    fy = 290
    for feat in features:
        draw.text((80, fy), feat, fill=(200, 200, 200), font=feat_font)
        fy += 36
    
    # Right side: Wallet mockup
    draw_wallet_mockup(draw, width - 400, 100, 320, 580)
    
    # Logo in bottom-left
    draw_kairos_logo(draw, 120, height - 80, 30)
    brand_font = get_font(16, bold=True)
    draw.text((160, height - 80), 'Kairos 777 Inc', fill=GRAY_RGB, font=brand_font, anchor='lm')
    
    img.save(os.path.join(OUT_DIR, 'screenshot-1-main.png'))
    print(f'  ✓ screenshot-1-main.png ({width}x{height})')

def create_screenshot_2(width=1280, height=800):
    """Multi-chain support screenshot."""
    img = Image.new('RGB', (width, height), DARK_RGB)
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, width, height)
    draw_gold_accent(draw, width, height)
    
    title_font = get_font(44, bold=True)
    draw.text((width // 2, 80), 'Multi-Chain Support', fill=GOLD_RGB, font=title_font, anchor='mm')
    
    sub_font = get_font(22)
    draw.text((width // 2, 130), 'One wallet for all your chains', fill=WHITE_RGB, font=sub_font, anchor='mm')
    
    # Chain cards
    chains = [
        ('BSC', '#F3BA2F', 'BNB Smart Chain'),
        ('ETH', '#627EEA', 'Ethereum'),
        ('MATIC', '#8247E5', 'Polygon'),
        ('BASE', '#0052FF', 'Base'),
        ('ARB', '#28A0F0', 'Arbitrum'),
        ('AVAX', '#E84142', 'Avalanche'),
    ]
    
    card_w = 170
    card_h = 200
    total_w = len(chains) * card_w + (len(chains) - 1) * 20
    start_x = (width - total_w) // 2
    card_y = 220
    
    for i, (symbol, color, name) in enumerate(chains):
        cx = start_x + i * (card_w + 20)
        color_rgb = hex_to_rgb(color)
        
        # Card bg
        draw.rounded_rectangle([(cx, card_y), (cx + card_w, card_y + card_h)], radius=16, fill=(25, 25, 25))
        draw.rounded_rectangle([(cx, card_y), (cx + card_w, card_y + card_h)], radius=16, outline=color_rgb, width=2)
        
        # Chain circle
        draw.ellipse([(cx + card_w//2 - 30, card_y + 30), (cx + card_w//2 + 30, card_y + 90)], fill=color_rgb)
        sym_font = get_font(18, bold=True)
        draw.text((cx + card_w//2, card_y + 60), symbol[:3], fill=WHITE_RGB, font=sym_font, anchor='mm')
        
        # Chain name
        name_font = get_font(14, bold=True)
        draw.text((cx + card_w//2, card_y + 120), name, fill=WHITE_RGB, font=name_font, anchor='mm')
        
        # Checkmark
        check_font = get_font(20)
        draw.text((cx + card_w//2, card_y + 160), '✓ Active', fill=(100, 200, 100), font=check_font, anchor='mm')
    
    # Bottom text
    bottom_font = get_font(18)
    draw.text((width // 2, 520), 'Switch chains instantly. All networks ready.', fill=GRAY_RGB, font=bottom_font, anchor='mm')
    
    # Wallet mockup on the right side
    draw_wallet_mockup(draw, width // 2 - 160, 560, 320, 200)
    
    img.save(os.path.join(OUT_DIR, 'screenshot-2-multichain.png'))
    print(f'  ✓ screenshot-2-multichain.png ({width}x{height})')

def create_screenshot_3(width=1280, height=800):
    """Security features screenshot."""
    img = Image.new('RGB', (width, height), DARK_RGB)
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, width, height)
    draw_gold_accent(draw, width, height)
    
    title_font = get_font(44, bold=True)
    draw.text((width // 2, 80), 'Bank-Grade Security', fill=GOLD_RGB, font=title_font, anchor='mm')
    
    sub_font = get_font(22)
    draw.text((width // 2, 130), 'Your keys, your crypto — always encrypted', fill=WHITE_RGB, font=sub_font, anchor='mm')
    
    # Security feature cards
    features = [
        ('🔐', 'AES-256-GCM', 'Military-grade encryption\nfor your private keys'),
        ('🛡️', 'Auto-Lock', '15-minute auto-lock\nprotects your wallet'),
        ('🔑', 'Non-Custodial', 'Only you control\nyour private keys'),
        ('⚡', 'Secure Signing', 'Transaction approval\nwith visual confirmation'),
    ]
    
    card_w = 250
    card_h = 280
    total_w = len(features) * card_w + (len(features) - 1) * 30
    start_x = (width - total_w) // 2
    card_y = 220
    
    for i, (icon, title, desc) in enumerate(features):
        cx = start_x + i * (card_w + 30)
        
        # Card
        draw.rounded_rectangle([(cx, card_y), (cx + card_w, card_y + card_h)], radius=16, fill=(20, 20, 20))
        draw.rounded_rectangle([(cx, card_y), (cx + card_w, card_y + card_h)], radius=16, outline=GOLD_RGB, width=1)
        
        # Icon
        icon_font = get_font(48)
        draw.text((cx + card_w // 2, card_y + 50), icon, fill=WHITE_RGB, font=icon_font, anchor='mm')
        
        # Title
        t_font = get_font(20, bold=True)
        draw.text((cx + card_w // 2, card_y + 110), title, fill=GOLD_RGB, font=t_font, anchor='mm')
        
        # Description
        d_font = get_font(14)
        for j, line in enumerate(desc.split('\n')):
            draw.text((cx + card_w // 2, card_y + 150 + j * 22), line, fill=(180, 180, 180), font=d_font, anchor='mm')
    
    # Gold shield at bottom
    draw_kairos_logo(draw, width // 2, height - 100, 35)
    
    img.save(os.path.join(OUT_DIR, 'screenshot-3-security.png'))
    print(f'  ✓ screenshot-3-security.png ({width}x{height})')

def create_small_promo(width=440, height=280):
    """Small promo tile for CWS."""
    img = Image.new('RGB', (width, height), DARK_RGB)
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, width, height)
    
    # Gold top accent
    draw.rectangle([(0, 0), (width, 4)], fill=GOLD_RGB)
    
    # Logo
    draw_kairos_logo(draw, width // 2, 85, 40)
    
    # Title
    title_font = get_font(28, bold=True)
    draw.text((width // 2, 150), 'Kairos Wallet', fill=GOLD_RGB, font=title_font, anchor='mm')
    
    # Subtitle
    sub_font = get_font(16)
    draw.text((width // 2, 185), 'Multi-Chain Crypto Wallet', fill=WHITE_RGB, font=sub_font, anchor='mm')
    
    # Features line
    feat_font = get_font(12)
    draw.text((width // 2, 220), 'BSC • Ethereum • Polygon • Base • Arbitrum • Avalanche', fill=GRAY_RGB, font=feat_font, anchor='mm')
    
    # Bottom accent
    draw.rectangle([(0, height - 4), (width, height)], fill=GOLD_RGB)
    
    img.save(os.path.join(OUT_DIR, 'small-promo-tile.png'))
    print(f'  ✓ small-promo-tile.png ({width}x{height})')

def create_large_promo(width=920, height=680):
    """Large promo tile for CWS."""
    img = Image.new('RGB', (width, height), DARK_RGB)
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, width, height)
    draw_gold_accent(draw, width, height)
    
    # Left side content
    # Logo
    draw_kairos_logo(draw, 100, 120, 45)
    
    title_font = get_font(42, bold=True)
    draw.text((80, 200), 'Kairos', fill=GOLD_RGB, font=title_font, anchor='lm')
    draw.text((80, 250), 'Wallet', fill=WHITE_RGB, font=title_font, anchor='lm')
    
    sub_font = get_font(20)
    draw.text((80, 310), 'The premium multi-chain', fill=(180, 180, 180), font=sub_font, anchor='lm')
    draw.text((80, 340), 'crypto wallet extension', fill=(180, 180, 180), font=sub_font, anchor='lm')
    
    # Feature bullets
    feat_font = get_font(16)
    features = [
        '✦  6 chains supported',
        '✦  AES-256 encryption',
        '✦  EIP-1193 compatible',
        '✦  Premium dark + gold UI',
    ]
    fy = 400
    for f in features:
        draw.text((80, fy), f, fill=GOLD_RGB, font=feat_font, anchor='lm')
        fy += 32
    
    # Brand
    brand_font = get_font(14)
    draw.text((80, height - 50), 'By Kairos 777 Inc', fill=GRAY_RGB, font=brand_font, anchor='lm')
    
    # Right side: Wallet mockup
    draw_wallet_mockup(draw, width - 380, 50, 320, 580)
    
    img.save(os.path.join(OUT_DIR, 'large-promo-tile.png'))
    print(f'  ✓ large-promo-tile.png ({width}x{height})')

def create_marquee_promo(width=1400, height=560):
    """Marquee promo tile for CWS."""
    img = Image.new('RGB', (width, height), DARK_RGB)
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, width, height)
    
    # Top gold line
    draw.rectangle([(0, 0), (width, 4)], fill=GOLD_RGB)
    draw.rectangle([(0, height - 4), (width, height)], fill=GOLD_RGB)
    
    # Logo
    draw_kairos_logo(draw, 200, height // 2, 60)
    
    # Title
    title_font = get_font(56, bold=True)
    draw.text((320, height // 2 - 50), 'Kairos Wallet', fill=GOLD_RGB, font=title_font, anchor='lm')
    
    sub_font = get_font(28)
    draw.text((320, height // 2 + 10), 'The Premium Multi-Chain Crypto Wallet', fill=WHITE_RGB, font=sub_font, anchor='lm')
    
    feat_font = get_font(18)
    draw.text((320, height // 2 + 60), 'BSC  •  Ethereum  •  Polygon  •  Base  •  Arbitrum  •  Avalanche', fill=GRAY_RGB, font=feat_font, anchor='lm')
    
    # Right side: mini mockup
    draw_wallet_mockup(draw, width - 380, 40, 300, 480)
    
    img.save(os.path.join(OUT_DIR, 'marquee-promo-tile.png'))
    print(f'  ✓ marquee-promo-tile.png ({width}x{height})')

if __name__ == '__main__':
    print('Generating Chrome Web Store assets...\n')
    
    create_screenshot_1()
    create_screenshot_2()
    create_screenshot_3()
    create_small_promo()
    create_large_promo()
    create_marquee_promo()
    
    print(f'\n✅ All assets saved to: {os.path.abspath(OUT_DIR)}')
