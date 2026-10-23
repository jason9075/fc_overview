#!/usr/bin/env python3
"""
Generate side-by-side visual comparison images between the 3D rendered board
and the BETAFPV official labeled reference diagrams.
"""

import os
from PIL import Image, ImageDraw, ImageFont

def create_comparison():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    screenshots_dir = os.path.join(root, 'tools', 'screenshots')
    refs_dir = os.path.join(root, 'public', 'references')

    # Top comparison
    top_render_path = os.path.join(screenshots_dir, '02_top_view.png')
    top_ref_path = os.path.join(refs_dir, 'top_front_labeled.jpg')
    
    # Bottom comparison
    bottom_render_path = os.path.join(screenshots_dir, '05_bottom_view.png')
    bottom_ref_path = os.path.join(refs_dir, 'bottom_front_labeled.jpg')

    pairs = [
        ('10_comparison_top.png', top_render_path, top_ref_path, '正面視角對比 (Top Face Comparison: 3D Render vs. BETAFPV Official Diagram)'),
        ('11_comparison_bottom.png', bottom_render_path, bottom_ref_path, '背面視角對比 (Bottom Face Comparison: 3D Render vs. BETAFPV Official Diagram)')
    ]

    for out_name, render_path, ref_path, title_text in pairs:
        if not os.path.exists(render_path) or not os.path.exists(ref_path):
            print(f"Skipping {out_name}, missing input file: {render_path} or {ref_path}")
            continue

        im_render = Image.open(render_path).convert('RGB')
        im_ref = Image.open(ref_path).convert('RGB')

        # The render is 2880 x 1800 (deviceScaleFactor: 2 of 1440x900)
        # Crop the center region containing the board
        w, h = im_render.size
        # The PCB is in the center-right of the screen (info card is on the left)
        # Center of board is roughly around x: 0.35 to 0.85, y: 0.15 to 0.85
        crop_box = (int(w * 0.30), int(h * 0.10), int(w * 0.85), int(h * 0.90))
        board_crop = im_render.crop(crop_box)

        # Scale board_crop and ref to same height (e.g. 700px)
        target_h = 700
        crop_w = int(board_crop.width * (target_h / board_crop.height))
        board_resized = board_crop.resize((crop_w, target_h), Image.Resampling.LANCZOS)

        ref_w = int(im_ref.width * (target_h / im_ref.height))
        ref_resized = im_ref.resize((ref_w, target_h), Image.Resampling.LANCZOS)

        # Create side-by-side canvas with header
        header_h = 70
        margin = 20
        total_w = crop_w + ref_w + margin * 3
        total_h = target_h + header_h + margin * 2

        canvas = Image.new('RGB', (total_w, total_h), color=(15, 23, 42)) # dark slate
        draw = ImageDraw.Draw(canvas)

        # Draw header text
        # Try loading default font or truetype
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
            sub_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
        except Exception:
            font = ImageFont.load_default()
            sub_font = ImageFont.load_default()

        draw.text((margin, 16), title_text, fill=(241, 245, 249), font=font)
        draw.text((margin, 44), "Left: Three.js Interactive 3D Model | Right: BETAFPV Matrix 1S 5IN1 II Official Diagram", fill=(148, 163, 184), font=sub_font)

        # Paste render and reference
        x_render = margin
        y_render = header_h + margin
        canvas.paste(board_resized, (x_render, y_render))

        x_ref = x_render + crop_w + margin
        canvas.paste(ref_resized, (x_ref, y_render))

        # Draw borders
        draw.rectangle([x_render, y_render, x_render + crop_w, y_render + target_h], outline=(56, 189, 248), width=2)
        draw.rectangle([x_ref, y_render, x_ref + ref_w, y_render + target_h], outline=(148, 163, 184), width=2)

        out_path = os.path.join(screenshots_dir, out_name)
        canvas.save(out_path, quality=95)
        print(f"Saved side-by-side comparison to {out_path}")

if __name__ == '__main__':
    create_comparison()
