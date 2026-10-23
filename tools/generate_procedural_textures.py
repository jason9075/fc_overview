#!/usr/bin/env python3
"""
Procedural PCB Texture Generator (Python reference and offline baker).

Reconstructs clean, physically plausible PCB maps directly from
- src/data/generated/outline.json (board silhouette and 3 mounting holes)
- src/data/placement.ts (component footprints and orientations)
- src/data/generated/passives.json (MLCC capacitor footprints)

Eliminates HSV thresholding, photo reflections, baked shadows, and invented traces.
"""

import json
import math
import os
import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'public', 'assets')
GEN = os.path.join(ROOT, 'src', 'data', 'generated')
DEBUG = os.path.join(ROOT, 'tools', 'debug')
for d in (ASSETS, DEBUG):
    os.makedirs(d, exist_ok=True)

TEX = 2048
EXTENT = 21.0
PX_PER_MM = TEX / (2 * EXTENT)


def to_px(x, z):
    return int(round((x + EXTENT) * PX_PER_MM)), int(round((z + EXTENT) * PX_PER_MM))


def mm(v):
    return int(round(v * PX_PER_MM))


def draw_rotated_rect(img, cx, cz, w_mm, h_mm, rot_rad, color, thickness=-1):
    w_px = mm(w_mm)
    h_px = mm(h_mm)
    deg = math.degrees(rot_rad)
    box = cv2.boxPoints(((cx, cz), (w_px, h_px), deg))
    pts = np.int32(box)
    if thickness == -1:
        cv2.fillPoly(img, [pts], color)
    else:
        cv2.polylines(img, [pts], True, color, thickness)


def generate_face(side, outline_data, passives_data):
    # Base BGR image: Deep satin black solder mask
    img = np.zeros((TEX, TEX, 3), dtype=np.uint8)
    img[:] = (255, 255, 255)  # white outside

    # 1. PCB Silhouette Mask
    pts = [to_px(x, z) for x, z in outline_data['outline']]
    cv2.fillPoly(img, [np.int32(pts)], (24, 22, 20))  # BGR #141618

    # 2. Ground Stitching Vias
    via_coords = [
        (-13.5, -4.5), (-14.2, -2.0), (-14.5, 0.5), (-14.2, 3.0), (-13.5, 5.5),
        (13.5, -4.5), (14.2, -2.0), (14.5, 0.5), (14.2, 3.0), (13.5, 5.5),
        (-5.0, -14.2), (-2.5, -14.8), (0.0, -15.0), (2.5, -14.8), (5.0, -14.2),
        (-4.0, 14.5), (-2.0, 15.2), (0.0, 15.5), (2.0, 15.2), (4.0, 14.5),
        (-8.5, 3.2), (-9.5, 5.0), (-7.5, 6.8), (-6.2, 12.0), (-8.2, 11.5),
        (8.5, 3.2), (9.5, 5.0), (7.5, 6.8), (6.2, 12.0), (8.2, 11.5),
        (-2.0, -4.0), (2.0, -4.0), (-4.0, -8.0), (4.0, -8.0),
        (-1.5, 3.5), (1.5, 3.5), (-3.5, 1.5), (3.5, 1.5),
    ]
    for vx, vz in via_coords:
        px, pz = to_px(vx, vz)
        cv2.circle(img, (px, pz), mm(0.32), (54, 177, 223), -1)  # ENIG gold ring
        cv2.circle(img, (px, pz), mm(0.16), (13, 11, 10), -1)   # drill cavity

    # 3. 3 Mounting Holes
    for h in outline_data['holes']:
        hx, hz = to_px(h['x'], h['z'])
        inner_r = mm(h['r'] + 0.05)
        outer_r = mm(h['r'] + 0.95)
        # Gold Annular Ring
        cv2.circle(img, (hx, hz), outer_r, (54, 177, 223), -1)
        # Drill Hole
        cv2.circle(img, (hx, hz), inner_r, (255, 255, 255), -1)

    # 4. Passives MLCC SMT pads
    for p in passives_data.get(side, []):
        cx, cz = to_px(p['x'], p['z'])
        total_len = p['len']
        wid = p['wid']
        rot = p['rot']
        pad_len = total_len * 0.36
        pad_wid = wid * 1.15
        cos_a = math.cos(rot)
        sin_a = math.sin(rot)
        for sgn in (-1, 1):
            lx = sgn * (total_len / 2 - pad_len / 2 + 0.08)
            px = int(round(cx + mm(lx) * cos_a))
            pz = int(round(cz + mm(lx) * sin_a))
            draw_rotated_rect(img, px, pz, pad_len, pad_wid, rot, (54, 177, 223))

    # 5. Component Placements from placement table
    R2 = math.sqrt(2)
    def sq_to_xz(a, b):
        return (a + b) / R2, (b - a) / R2

    if side == 'top':
        # MCU STM32G473
        mx, mz = sq_to_xz(-1.35, -8.3)
        cx, cz = to_px(mx, mz)
        draw_rotated_rect(img, cx, cz, 4.8, 4.8, math.pi / 4, (54, 177, 223))  # thermal ground pad

        # Power pads
        bx, bz = sq_to_xz(-12.27, 2.31)
        px, pz = to_px(bx, bz)
        draw_rotated_rect(img, px, pz, 2.4, 1.6, 0, (54, 177, 223))
        cv2.putText(img, "BATT+", (px - mm(1.6), pz - mm(1.5)), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (250, 246, 243), 2)

        gx, gz = sq_to_xz(-12.17, 4.6)
        px, pz = to_px(gx, gz)
        draw_rotated_rect(img, px, pz, 2.4, 1.6, 0, (54, 177, 223))
        cv2.putText(img, "GND", (px - mm(1.2), pz - mm(1.5)), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (250, 246, 243), 2)

        # Forward Chevron & Text
        fx, fz = to_px(0, -17.2)
        cv2.putText(img, "^ FRONT", (fx - mm(2.5), fz), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (250, 246, 243), 2)
    else:
        # Bottom side: OSD, VTX, USB, ESC
        ox, oz = sq_to_xz(0.7, 0.28)
        cx, cz = to_px(ox, oz)
        draw_rotated_rect(img, cx, cz, 4.2, 6.5, math.pi / 4, (54, 177, 223))

        vx, vz = sq_to_xz(6.75, -5.2)
        cx, cz = to_px(vx, vz)
        draw_rotated_rect(img, cx, cz, 4.2, 4.2, math.pi / 4, (54, 177, 223))

        # USB SH1.0
        ux, uz = to_px(-0.2, 13.5)
        draw_rotated_rect(img, ux, uz, 6.0, 3.8, 0, (54, 177, 223), 2)
        cv2.putText(img, "USB", (ux - mm(1.2), uz - mm(2.5)), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (250, 246, 243), 2)

        # FRONT Indicator
        fx, fz = to_px(0, -17.0)
        cv2.putText(img, "^ FRONT", (fx - mm(2.5), fz), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (250, 246, 243), 2)
        cv2.putText(img, "Matrix 5IN1", (to_px(-9.5, -12.5)[0] - mm(2.5), to_px(-9.5, -12.5)[1]), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (250, 246, 243), 2)

    return img


def main():
    with open(os.path.join(GEN, 'outline.json')) as f:
        outline_data = json.load(f)
    with open(os.path.join(GEN, 'passives.json')) as f:
        passives_data = json.load(f)

    for side in ('top', 'bottom'):
        art = generate_face(side, outline_data, passives_data)
        out_path = os.path.join(ASSETS, f'{side}_artwork.png')
        cv2.imwrite(out_path, art)
        print(f"Generated clean procedural PCB texture: {out_path}")


if __name__ == '__main__':
    main()
