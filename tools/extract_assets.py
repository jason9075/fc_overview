#!/usr/bin/env python3
"""
Asset extraction pipeline for the Matrix 1S 5IN1 II explorer.

Inputs : public/references/*.jpg (official BETAFPV product photos, see SOURCE.md)
Outputs:
  public/assets/top_photo.jpg / bottom_photo.jpg   rectified face textures (board-local X/Z frame)
  src/data/generated/outline.json                  board outline (mm) + hole estimates
  src/data/generated/passives.json                 MLCC-like passives detected on each face
  tools/debug/*.png                                 overlays for visual verification
Note:
  Procedural PCB rendering is physically reconstructed in src/scene/proceduralPCB.ts
  from component placements, footprints, and verified silkscreen, completely eliminating
  HSV-based color thresholding from the production pipeline.

Coordinate convention (see guideline §5):
  1 unit = 1 mm, board centre at origin, X = right, Z = backward (FORWARD = -Z).
  Bottom-face photos are mirrored left/right when mapped into this frame, because a board
  flipped about its forward axis swaps handedness.

Calibration: the three mounting holes are assumed to sit on three corners of a 26 x 26 mm
square rotated 45 deg (left / right / rear). This is consistent with the photos (the rear hole
is half the left-right spacing below the centre line) and with IC package sizes (STM32G473CEU6
UFQFPN48 = 7 x 7 mm). Everything derived here is `estimated_from_photo`.
"""
import json
import math
import os

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, 'public', 'references')
ASSETS = os.path.join(ROOT, 'public', 'assets')
GEN = os.path.join(ROOT, 'src', 'data', 'generated')
DEBUG = os.path.join(ROOT, 'tools', 'debug')
for d in (ASSETS, GEN, DEBUG):
    os.makedirs(d, exist_ok=True)

H = 26.0 / math.sqrt(2)  # 18.385 mm: hole distance from centre
TEX = 2048
EXTENT = 21.0  # texture covers x,z in [-EXTENT, EXTENT]
PX_PER_MM = TEX / (2 * EXTENT)


def detect_holes(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    bg = ((hsv[..., 2] > 215) & (hsv[..., 1] < 30)).astype(np.uint8)
    board = cv2.morphologyEx(1 - bg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    cnts, hier = cv2.findContours(board * 255, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    hier = hier[0]
    outer = max(range(len(cnts)), key=lambda i: cv2.contourArea(cnts[i]) if hier[i][3] < 0 else 0)
    holes = []
    for i, c in enumerate(cnts):
        if hier[i][3] != outer or cv2.contourArea(c) < 3000:
            continue
        circ = 4 * math.pi * cv2.contourArea(c) / cv2.arcLength(c, True) ** 2
        if circ < 0.85:
            continue
        (x, y), r = cv2.minEnclosingCircle(c)
        holes.append((x, y, r))
    assert len(holes) == 3, holes
    holes.sort(key=lambda h: h[1])  # rear hole has the largest v
    left_right = sorted(holes[:2], key=lambda h: h[0])
    return left_right[0], left_right[1], holes[2]


def affine_for(img, mirrored):
    sl, sr, rear = detect_holes(img)
    if mirrored:
        board_pts = np.float32([[H, 0], [-H, 0], [0, H]])  # screen-left hole is board-right
    else:
        board_pts = np.float32([[-H, 0], [H, 0], [0, H]])
    img_pts = np.float32([sl[:2], sr[:2], rear[:2]])
    M = cv2.getAffineTransform(board_pts, img_pts)
    scale = math.sqrt(abs(np.linalg.det(M[:, :2])))
    radius_mm = np.mean([sl[2], sr[2], rear[2]]) / scale
    return M, scale, radius_mm


def rectify(img, M):
    coords = (np.arange(TEX) + 0.5) / PX_PER_MM - EXTENT
    X, Z = np.meshgrid(coords, coords)
    mapx = (M[0, 0] * X + M[0, 1] * Z + M[0, 2]).astype(np.float32)
    mapy = (M[1, 0] * X + M[1, 1] * Z + M[1, 2]).astype(np.float32)
    return cv2.remap(img, mapx, mapy, cv2.INTER_CUBIC, borderValue=(255, 255, 255))


def to_px(x, z):
    return ((x + EXTENT) * PX_PER_MM, (z + EXTENT) * PX_PER_MM)


def to_mm(u, v):
    return (u / PX_PER_MM - EXTENT, v / PX_PER_MM - EXTENT)


def board_mask(rect):
    hsv = cv2.cvtColor(rect, cv2.COLOR_BGR2HSV)
    bg = (hsv[..., 2] > 215) & (hsv[..., 1] < 30)
    return (~bg).astype(np.float32)


def detect_passives(rect, outline_mask, side):
    """Find tan MLCC bodies that have metallic terminations on both short ends."""
    hsv = cv2.cvtColor(rect, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)
    tan = ((h >= 8) & (h <= 24) & (s >= 70) & (s <= 150) & (v >= 120)).astype(np.uint8)
    tan &= (outline_mask > 0).astype(np.uint8)
    tan = cv2.morphologyEx(tan, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(tan)
    silver = ((s < 70) & (v > 115)).astype(np.uint8)
    # gold pads hugging the board edge (BZ+/-, UART, USB-D) look like MLCCs; reject them
    edge_dist = cv2.distanceTransform((outline_mask > 0).astype(np.uint8), cv2.DIST_L2, 5) / PX_PER_MM
    found = []
    for i in range(1, n):
        area_mm2 = stats[i, cv2.CC_STAT_AREA] / PX_PER_MM ** 2
        if area_mm2 < 0.12 or area_mm2 > 4.5:
            continue
        ys, xs = np.nonzero(lab == i)
        pts = np.stack([xs, ys], 1).astype(np.float32)
        (cx, cy), (w, hh), ang = cv2.minAreaRect(pts)
        if edge_dist[int(cy), int(cx)] < 1.4:
            continue
        fill = stats[i, cv2.CC_STAT_AREA] / max(w * hh, 1)
        if fill < 0.72:
            continue
        # long axis direction
        if w >= hh:
            L, Wd, theta = w, hh, math.radians(ang)
        else:
            L, Wd, theta = hh, w, math.radians(ang + 90)
        if Wd / PX_PER_MM < 0.3:
            continue
        ux, uy = math.cos(theta), math.sin(theta)
        ok = 0
        term = []
        for sgn in (-1, 1):
            hits = 0
            best = 0
            for step in range(2, int(0.45 * PX_PER_MM)):
                px_ = int(round(cx + sgn * ux * (L / 2 + step)))
                py_ = int(round(cy + sgn * uy * (L / 2 + step)))
                if 0 <= px_ < TEX and 0 <= py_ < TEX and silver[py_, px_]:
                    hits += 1
                    best = step
            if hits >= 3:
                ok += 1
                term.append(best)
        if ok < 2:
            continue
        total_len = (L + term[0] + term[1]) / PX_PER_MM
        width = Wd / PX_PER_MM
        if total_len > 4.2 or width > 2.6:
            continue
        x, z = to_mm(cx + ux * (term[1] - term[0]) / 2, cy + uy * (term[1] - term[0]) / 2)
        if min(math.hypot(x - hx, z - hz) for hx, hz in ((-H, 0), (H, 0), (0, H))) < 3.6:
            continue  # pads on the mounting tabs
        # image v grows with +Z, so the in-plane angle maps directly to a rotation about Y of -theta
        found.append({
            'x': round(x, 3), 'z': round(z, 3),
            'len': round(total_len, 3), 'wid': round(width, 3),
            'rot': round(-theta, 4),
        })
    return found


def main():
    sources = {
        'top': [('solderfree_front.jpg', False), ('unsoldered_front.jpg', False)],
        'bottom': [('solderfree_back.jpg', True), ('unsoldered_back.jpg', True)],
    }
    calib = {}
    masks = []
    rects = {}
    for side, items in sources.items():
        for i, (fn, mirrored) in enumerate(items):
            img = cv2.imread(os.path.join(REF, fn))
            M, scale, r = affine_for(img, mirrored)
            calib[fn] = {'px_per_mm': round(scale, 3), 'hole_radius_mm': round(r, 3),
                         'affine_board_to_image': np.round(M, 4).tolist(), 'mirrored': mirrored}
            rect = rectify(img, M)
            rects[(side, i)] = rect
            if fn != 'solderfree_back.jpg':  # mounted connectors overhang the outline
                m = board_mask(rect)
                masks += [m, m[:, ::-1]]  # also mirror -> enforce left/right symmetry
    vote = np.mean(masks, 0)
    vote = cv2.GaussianBlur(vote, (0, 0), 2.0)
    outline_mask = (vote > 0.5).astype(np.uint8)
    cnts, _ = cv2.findContours(outline_mask * 255, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cnts, key=cv2.contourArea)
    approx = cv2.approxPolyDP(c, 0.03 * PX_PER_MM, True).reshape(-1, 2)
    pts = [to_mm(float(u), float(v)) for u, v in approx]
    # ensure CCW in X/(-Z) plane is handled on the TS side; just store
    filled = np.zeros_like(outline_mask)
    cv2.drawContours(filled, [c], -1, 1, -1)
    hole_r = float(np.median([v['hole_radius_mm'] for v in calib.values()]))
    outline = {
        'confidence': 'estimated_from_photo',
        'note': 'Traced from official product photos via 3-hole affine calibration; not CAD data.',
        'outline': [[round(x, 3), round(z, 3)] for x, z in pts],
        'holes': [
            {'x': -round(H, 3), 'z': 0, 'r': round(hole_r, 3)},
            {'x': round(H, 3), 'z': 0, 'r': round(hole_r, 3)},
            {'x': 0, 'z': round(H, 3), 'r': round(hole_r, 3)},
        ],
        'calibration': calib,
    }
    with open(os.path.join(GEN, 'outline.json'), 'w') as f:
        json.dump(outline, f, indent=1)

    passives = {}
    for side in ('top', 'bottom'):
        rect = rects[(side, 0)]  # solder-free variant is the default
        out = rect.copy()
        out[filled == 0] = (255, 255, 255)
        cv2.imwrite(os.path.join(ASSETS, f'{side}_photo.jpg'), out, [cv2.IMWRITE_JPEG_QUALITY, 88])
        pas = detect_passives(rect, filled, side)
        passives[side] = pas
        dbg = out.copy()
        for p in pas:
            u, v = to_px(p['x'], p['z'])
            box = cv2.boxPoints(((u, v), (p['len'] * PX_PER_MM, p['wid'] * PX_PER_MM), -math.degrees(p['rot'])))
            cv2.drawContours(dbg, [box.astype(np.int32)], -1, (255, 0, 255), 2)
        cv2.drawContours(dbg, [c], -1, (0, 255, 0), 2)
        cv2.imwrite(os.path.join(DEBUG, f'{side}_passives.png'), dbg)
    with open(os.path.join(GEN, 'passives.json'), 'w') as f:
        json.dump({'confidence': 'estimated_from_photo', **passives}, f)
    print('outline points', len(pts), 'hole r', hole_r)
    print('passives', {k: len(v) for k, v in passives.items()})
    print(json.dumps({k: (v['px_per_mm'], v['hole_radius_mm']) for k, v in calib.items()}))


if __name__ == '__main__':
    main()
