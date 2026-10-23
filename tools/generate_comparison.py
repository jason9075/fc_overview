#!/usr/bin/env python3
"""Compare the official photographs with the photo-textured 3D views.

These images verify appearance and orientation, not electrical connectivity.
"""

import os
from PIL import Image, ImageDraw, ImageFont


def create_comparison():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    screenshots_dir = os.path.join(root, 'tools', 'screenshots')
    refs_dir = os.path.join(root, 'public', 'references')

    # Top sources
    top_photo_path = os.path.join(screenshots_dir, '02_top_view.png')
    top_ref_path = os.path.join(refs_dir, 'solderfree_front.jpg')

    # Bottom sources
    bot_photo_path = os.path.join(screenshots_dir, '05_bottom_view.png')
    bot_ref_path = os.path.join(refs_dir, 'solderfree_back.jpg')

    # Font setup
    cjk_bold = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
    cjk_regular = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
    try:
        title_font = ImageFont.truetype(cjk_bold, 22)
        sub_font = ImageFont.truetype(cjk_regular, 15)
        col_font = ImageFont.truetype(cjk_bold, 16)
        desc_font = ImageFont.truetype(cjk_regular, 13)
    except Exception:
        title_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()
        col_font = ImageFont.load_default()
        desc_font = ImageFont.load_default()

    sets = [
        (
            '10_comparison_top.png',
            'BETAFPV Matrix 1S 5IN1 II · 正面視角照片與模型外觀對比 (Top Face Photo Comparison)',
            [
                ('1. BETAFPV 官方實體照片', 'Official Photograph (BETAFPV CDN)', top_ref_path, (148, 163, 184)),
                ('2. 現行相片貼圖模型', 'Current Photo Texture 3D Mode', top_photo_path, (245, 158, 11)),
            ]
        ),
        (
            '11_comparison_bottom.png',
            'BETAFPV Matrix 1S 5IN1 II · 背面視角照片與模型外觀對比 (Bottom Face Photo Comparison)',
            [
                ('1. BETAFPV 官方實體照片', 'Official Photograph (BETAFPV CDN)', bot_ref_path, (148, 163, 184)),
                ('2. 現行相片貼圖模型', 'Current Photo Texture 3D Mode', bot_photo_path, (245, 158, 11)),
            ]
        )
    ]

    target_h = 560
    header_h = 75
    margin = 20

    for out_name, main_title, columns in sets:
        valid_cols = []
        for col_title, col_sub, pth, border_color in columns:
            if not os.path.exists(pth):
                print(f"Warning: {pth} not found, skipping {out_name}")
                break
            im = Image.open(pth).convert('RGB')
            # If 3D render, crop center board
            w, h = im.size
            if 'screenshot' in pth:
                crop_box = (int(w * 0.30), int(h * 0.08), int(w * 0.85), int(h * 0.92))
                im_cropped = im.crop(crop_box)
            else:
                im_cropped = im

            # Resize to target height
            cw = int(im_cropped.width * (target_h / im_cropped.height))
            resized = im_cropped.resize((cw, target_h), Image.Resampling.LANCZOS)
            valid_cols.append((col_title, col_sub, resized, border_color))

        if len(valid_cols) != 2:
            continue

        total_w = sum(c[2].width for c in valid_cols) + margin * (len(valid_cols) + 1)
        total_h = target_h + header_h + margin * 2 + 35

        canvas = Image.new('RGB', (total_w, total_h), color=(15, 23, 42))
        draw = ImageDraw.Draw(canvas)

        # Draw main header
        draw.text((margin, 16), main_title, fill=(241, 245, 249), font=title_font)
        draw.text((margin, 46), "Photo-textured visualization: component geometry is approximate; electrical routing is not reconstructed.", fill=(148, 163, 184), font=sub_font)

        # Draw columns
        cur_x = margin
        y_img = header_h + margin + 30

        for col_title, col_sub, img, border_color in valid_cols:
            w_col = img.width

            # Column header
            draw.text((cur_x + 4, header_h + margin - 2), col_title, fill=border_color, font=col_font)
            draw.text((cur_x + 4, header_h + margin + 14), col_sub, fill=(148, 163, 184), font=desc_font)

            # Paste image
            canvas.paste(img, (cur_x, y_img))

            # Border
            draw.rectangle([cur_x, y_img, cur_x + w_col, y_img + target_h], outline=border_color, width=2)

            cur_x += w_col + margin

        out_path = os.path.join(screenshots_dir, out_name)
        canvas.save(out_path, quality=95)
        print(f"Saved photo comparison to {out_path}")


if __name__ == '__main__':
    create_comparison()
