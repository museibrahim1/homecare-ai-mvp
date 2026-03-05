#!/usr/bin/env python3
"""
Build marketing graphics using REAL app screenshots.

Composites actual PalmCare AI iOS screenshots into professional
marketing layouts with brand styling (teal #0d9488).
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCREENSHOTS = PROJECT_ROOT / "screenshots"
IOS = SCREENSHOTS / "ios"
OUTPUT = PROJECT_ROOT / "marketing" / "generated"
OUTPUT.mkdir(parents=True, exist_ok=True)

TEAL = (13, 148, 136)
TEAL_DARK = (8, 100, 92)
DARK_BG = (15, 17, 23)
WHITE = (255, 255, 255)
LIGHT_GRAY = (249, 250, 251)
MUTED = (156, 163, 175)

def get_font(size, bold=False):
    """Get system font, falling back gracefully."""
    font_paths = [
        "/System/Library/Fonts/SFPro-Bold.otf" if bold else "/System/Library/Fonts/SFPro-Regular.otf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSDisplay.ttf",
    ]
    for fp in font_paths:
        try:
            return ImageFont.truetype(fp, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def add_phone_frame(screenshot, target_height=800):
    """Place a screenshot inside a rounded phone frame."""
    img = Image.open(screenshot).convert("RGBA")
    ratio = target_height / img.height
    new_w = int(img.width * ratio)
    img = img.resize((new_w, target_height), Image.LANCZOS)

    padding = 16
    frame_w = new_w + padding * 2
    frame_h = target_height + padding * 2
    frame = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))

    mask = Image.new("L", (frame_w, frame_h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, frame_w - 1, frame_h - 1], radius=30, fill=255)

    bg = Image.new("RGBA", (frame_w, frame_h), (30, 30, 30, 255))
    frame = Image.composite(bg, frame, mask)
    frame.paste(img, (padding, padding))

    return frame


def draw_text_centered(draw, y, text, font, fill, width):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, y), text, font=font, fill=fill)


def build_linkedin_hero():
    """LinkedIn banner: 3 phones on teal gradient with tagline."""
    W, H = 1920, 1080
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)

    for y in range(H):
        r = int(TEAL_DARK[0] + (TEAL[0] - TEAL_DARK[0]) * y / H)
        g = int(TEAL_DARK[1] + (TEAL[1] - TEAL_DARK[1]) * y / H)
        b = int(TEAL_DARK[2] + (TEAL[2] - TEAL_DARK[2]) * y / H)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    phones = [
        add_phone_frame(IOS / "01-landing.png", 650),
        add_phone_frame(SCREENSHOTS / "01_landing.png", 720),
        add_phone_frame(IOS / "05-record.png", 650),
    ]

    total_w = sum(p.width for p in phones) + 80
    start_x = (W - total_w) // 2

    positions = [
        (start_x, 220),
        (start_x + phones[0].width + 40, 160),
        (start_x + phones[0].width + 40 + phones[1].width + 40, 220),
    ]

    for phone, (x, y) in zip(phones, positions):
        img.paste(phone, (x, y), phone)

    font_big = get_font(56, bold=True)
    font_sub = get_font(24)

    draw_text_centered(draw, 50, "PalmCare AI", font_big, WHITE, W)
    draw_text_centered(draw, 120, "Where care meets intelligence", font_sub, (200, 240, 235), W)

    img.save(OUTPUT / "linkedin_hero_real.png", quality=95)
    print("  linkedin_hero_real.png")


def build_instagram_square():
    """Instagram 1:1: Single phone on dark bg with feature callouts."""
    W, H = 1080, 1080
    img = Image.new("RGB", (W, H), DARK_BG)
    draw = ImageDraw.Draw(img)

    for y in range(H):
        alpha = y / H
        r = int(DARK_BG[0] * (1 - alpha * 0.3) + TEAL_DARK[0] * alpha * 0.3)
        g = int(DARK_BG[1] * (1 - alpha * 0.3) + TEAL_DARK[1] * alpha * 0.3)
        b = int(DARK_BG[2] * (1 - alpha * 0.3) + TEAL_DARK[2] * alpha * 0.3)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    phone = add_phone_frame(SCREENSHOTS / "01_landing.png", 750)
    px = (W - phone.width) // 2
    img.paste(phone, (px, 200), phone)

    font_title = get_font(42, bold=True)
    font_sub = get_font(22)

    draw_text_centered(draw, 50, "Record. Transcribe. Contract.", font_title, WHITE, W)
    draw_text_centered(draw, 105, "Voice-powered care assessments", font_sub, MUTED, W)

    draw_text_centered(draw, 1000, "palmcareai.com  |  Palm It", font_sub, TEAL, W)

    img.save(OUTPUT / "instagram_square_real.png", quality=95)
    print("  instagram_square_real.png")


def build_instagram_story():
    """Instagram Story 9:16: Full phone screenshot with stats overlay."""
    W, H = 1080, 1920
    img = Image.new("RGB", (W, H), DARK_BG)
    draw = ImageDraw.Draw(img)

    for y in range(H):
        alpha = y / H
        r = int(DARK_BG[0] + (TEAL_DARK[0] - DARK_BG[0]) * alpha * 0.5)
        g = int(DARK_BG[1] + (TEAL_DARK[1] - DARK_BG[1]) * alpha * 0.5)
        b = int(DARK_BG[2] + (TEAL_DARK[2] - DARK_BG[2]) * alpha * 0.5)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    phone = add_phone_frame(IOS / "07-main-tabs.png", 900)
    px = (W - phone.width) // 2
    img.paste(phone, (px, 350), phone)

    font_big = get_font(52, bold=True)
    font_med = get_font(32, bold=True)
    font_sm = get_font(22)

    draw_text_centered(draw, 60, "PalmCare AI", font_big, WHITE, W)
    draw_text_centered(draw, 130, "Your care management dashboard", font_sm, MUTED, W)

    stats = [
        ("90%", "Faster Assessments"),
        ("50%", "Less Paperwork"),
        ("$0.37", "Per Assessment"),
    ]
    stat_y = 1340
    for i, (num, label) in enumerate(stats):
        x = 100 + i * 310
        draw.rounded_rectangle([x, stat_y, x + 280, stat_y + 110], radius=16, fill=(30, 35, 45))
        draw.rounded_rectangle([x, stat_y, x + 280, stat_y + 110], radius=16, outline=TEAL, width=2)
        bbox = draw.textbbox((0, 0), num, font=font_med)
        tw = bbox[2] - bbox[0]
        draw.text((x + (280 - tw) // 2, stat_y + 15), num, font=font_med, fill=TEAL)
        bbox2 = draw.textbbox((0, 0), label, font=font_sm)
        tw2 = bbox2[2] - bbox2[0]
        draw.text((x + (280 - tw2) // 2, stat_y + 60), label, font=font_sm, fill=MUTED)

    draw.rounded_rectangle([300, 1520, 780, 1590], radius=30, fill=TEAL)
    cta_font = get_font(28, bold=True)
    draw_text_centered(draw, 1535, "Palm It", cta_font, WHITE, W)

    draw_text_centered(draw, 1650, "Where care meets intelligence", font_sm, (100, 120, 115), W)

    img.save(OUTPUT / "instagram_story_real.png", quality=95)
    print("  instagram_story_real.png")


def build_facebook_ad():
    """Facebook ad 16:9: Before/after with real screenshots."""
    W, H = 1200, 628
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)

    for x in range(W // 2):
        gray = int(60 + 30 * x / (W // 2))
        draw.line([(x, 0), (x, H)], fill=(gray, gray, gray))

    for x in range(W // 2, W):
        progress = (x - W // 2) / (W // 2)
        r = int(TEAL_DARK[0] + (TEAL[0] - TEAL_DARK[0]) * progress)
        g = int(TEAL_DARK[1] + (TEAL[1] - TEAL_DARK[1]) * progress)
        b = int(TEAL_DARK[2] + (TEAL[2] - TEAL_DARK[2]) * progress)
        draw.line([(x, 0), (x, H)], fill=(r, g, b))

    draw.line([(W // 2, 0), (W // 2, H)], fill=TEAL, width=4)

    phone_left = add_phone_frame(IOS / "05-record.png", 420)
    phone_right = add_phone_frame(IOS / "07-main-tabs.png", 420)

    img.paste(phone_left, (W // 4 - phone_left.width // 2, 130), phone_left)
    img.paste(phone_right, (3 * W // 4 - phone_right.width // 2, 130), phone_right)

    font_title = get_font(26, bold=True)
    font_sm = get_font(18)

    draw_text_centered(draw, 20, "From Voice to Contract", font_title, WHITE, W)

    bbox_l = draw.textbbox((0, 0), "Record", font=font_title)
    draw.text((W // 4 - (bbox_l[2] - bbox_l[0]) // 2, 80), "Record", font=font_title, fill=(180, 180, 180))

    bbox_r = draw.textbbox((0, 0), "Manage", font=font_title)
    draw.text((3 * W // 4 - (bbox_r[2] - bbox_r[0]) // 2, 80), "Manage", font=font_title, fill=WHITE)

    draw_text_centered(draw, 590, "PalmCare AI  —  Where care meets intelligence", font_sm, (200, 220, 215), W)

    img.save(OUTPUT / "facebook_ad_real.png", quality=95)
    print("  facebook_ad_real.png")


def build_carousel_slides():
    """3-slide Instagram carousel with real screenshots."""
    W, H = 1080, 1350
    slides = [
        (SCREENSHOTS / "01_landing.png", "Step 1", "Open PalmCare AI", "Your AI-powered care assistant"),
        (IOS / "05-record.png", "Step 2", "Record Assessment", "Just talk. The AI listens."),
        (IOS / "07-main-tabs.png", "Step 3", "Manage Everything", "Clients. Calendar. Contracts."),
    ]

    for i, (screenshot, step, title, subtitle) in enumerate(slides, 1):
        img = Image.new("RGB", (W, H), DARK_BG)
        draw = ImageDraw.Draw(img)

        for y in range(H):
            alpha = y / H
            r = int(DARK_BG[0] + (TEAL_DARK[0] - DARK_BG[0]) * alpha * 0.4)
            g = int(DARK_BG[1] + (TEAL_DARK[1] - DARK_BG[1]) * alpha * 0.4)
            b = int(DARK_BG[2] + (TEAL_DARK[2] - DARK_BG[2]) * alpha * 0.4)
            draw.line([(0, y), (W, y)], fill=(r, g, b))

        font_step = get_font(20)
        font_title = get_font(44, bold=True)
        font_sub = get_font(24)

        draw.rounded_rectangle([440, 40, 640, 80], radius=20, fill=TEAL)
        draw_text_centered(draw, 48, step, font_step, WHITE, W)

        draw_text_centered(draw, 110, title, font_title, WHITE, W)
        draw_text_centered(draw, 170, subtitle, font_sub, MUTED, W)

        phone = add_phone_frame(screenshot, 880)
        px = (W - phone.width) // 2
        img.paste(phone, (px, 240), phone)

        dots_y = 1200
        for d in range(3):
            cx = W // 2 - 30 + d * 30
            color = TEAL if d == i - 1 else (60, 65, 75)
            r_size = 8 if d == i - 1 else 6
            draw.ellipse([cx - r_size, dots_y - r_size, cx + r_size, dots_y + r_size], fill=color)

        draw_text_centered(draw, 1240, "palmcareai.com", font_step, MUTED, W)

        img.save(OUTPUT / f"carousel_{i}_real.png", quality=95)
        print(f"  carousel_{i}_real.png")


def build_twitter_banner():
    """Twitter/X banner: ultra-wide with 3 phones."""
    W, H = 1500, 500
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)

    for y in range(H):
        r = int(DARK_BG[0] + (TEAL_DARK[0] - DARK_BG[0]) * y / H * 0.6)
        g = int(DARK_BG[1] + (TEAL_DARK[1] - DARK_BG[1]) * y / H * 0.6)
        b = int(DARK_BG[2] + (TEAL_DARK[2] - DARK_BG[2]) * y / H * 0.6)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    phones = [
        add_phone_frame(IOS / "01-landing.png", 350),
        add_phone_frame(SCREENSHOTS / "01_landing.png", 380),
        add_phone_frame(IOS / "05-record.png", 350),
    ]

    total_w = sum(p.width for p in phones) + 60
    start_x = (W - total_w) // 2

    offsets = [70, 30, 70]
    x = start_x
    for phone, offset in zip(phones, offsets):
        img.paste(phone, (x, offset), phone)
        x += phone.width + 30

    font_title = get_font(36, bold=True)
    font_sub = get_font(18)

    draw.text((50, 40), "PalmCare AI", font=font_title, fill=WHITE)
    draw.text((50, 90), "Record. Transcribe. Contract.", font=font_sub, fill=TEAL)
    draw.text((50, 120), "Where care meets intelligence", font=font_sub, fill=MUTED)

    img.save(OUTPUT / "twitter_banner_real.png", quality=95)
    print("  twitter_banner_real.png")


def build_email_header():
    """Email header banner with app logo screenshot."""
    W, H = 600, 200
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)

    for x in range(W):
        progress = x / W
        r = int(TEAL_DARK[0] + (TEAL[0] - TEAL_DARK[0]) * progress)
        g = int(TEAL_DARK[1] + (TEAL[1] - TEAL_DARK[1]) * progress)
        b = int(TEAL_DARK[2] + (TEAL[2] - TEAL_DARK[2]) * progress)
        draw.line([(x, 0), (x, H)], fill=(r, g, b))

    mini_phone = add_phone_frame(SCREENSHOTS / "01_landing.png", 160)
    img.paste(mini_phone, (W - mini_phone.width - 20, 20), mini_phone)

    font_title = get_font(32, bold=True)
    font_sub = get_font(16)
    font_tag = get_font(14)

    draw.text((30, 50), "PalmCare AI", font=font_title, fill=WHITE)
    draw.text((30, 95), "Where care meets intelligence", font=font_sub, fill=(200, 230, 225))
    draw.text((30, 130), "Record. Transcribe. Contract.", font=font_tag, fill=(150, 200, 190))

    img.save(OUTPUT / "email_header_real.png", quality=95)
    print("  email_header_real.png")


def main():
    print("=" * 50)
    print("Building marketing graphics with REAL screenshots")
    print("=" * 50)

    print("\n1. LinkedIn Hero (1920x1080)...")
    build_linkedin_hero()

    print("2. Instagram Square (1080x1080)...")
    build_instagram_square()

    print("3. Instagram Story (1080x1920)...")
    build_instagram_story()

    print("4. Facebook Ad (1200x628)...")
    build_facebook_ad()

    print("5-7. Instagram Carousel (1080x1350 x3)...")
    build_carousel_slides()

    print("8. Twitter Banner (1500x500)...")
    build_twitter_banner()

    print("9. Email Header (600x200)...")
    build_email_header()

    print(f"\n{'=' * 50}")
    print(f"DONE: 9 graphics built with real app screenshots")
    print(f"Output: {OUTPUT}")
    print("=" * 50)


if __name__ == "__main__":
    main()
