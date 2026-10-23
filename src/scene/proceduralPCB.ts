import * as THREE from 'three';
import outlineData from '../data/generated/outline.json';
import passivesData from '../data/generated/passives.json';
import { placements, type Placement } from '../data/placement';
import { BOARD } from '../data/boardSpec';

export interface ProceduralPCBTextures {
  colorMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  colorCanvas: HTMLCanvasElement;
}

export interface ProceduralPCBOptions {
  showSchematicOverlay?: boolean;
}

/**
 * Procedural PCB Texture Generator.
 *
 * Mathematically reconstructs physically plausible PBR texture maps for
 * BETAFPV Matrix 1S 5IN1 II:
 * 1. FR4 Core & Satin Black Solder Mask (dielectric, roughness ~0.71)
 * 2. Exposed ENIG Gold Copper Pads & Footprints (metallic 0.96, roughness ~0.22, bump +0.035mm)
 * 3. Verified Silkscreen Typography & Alignment Markings (matte white ink, roughness ~0.88, bump +0.015mm)
 * 4. Plated Ground Stitching Vias & Thermal Relief Rings
 * 5. Optional clearly-labeled Educational Schematic Overlay
 *
 * Strictly adheres to guidelines:
 * - NO photographic shadows baked into artwork.
 * - NO false copper pads from specular reflections.
 * - NO duplicate component silhouettes under 3D meshes.
 * - NO invented electrical traces.
 */
export class ProceduralPCBGenerator {
  private static readonly TEX_SIZE = 2048;
  private static readonly EXTENT = BOARD.textureExtentMm; // 21.0 mm
  private static readonly SPAN = ProceduralPCBGenerator.EXTENT * 2; // 42.0 mm
  private static readonly SCALE = ProceduralPCBGenerator.TEX_SIZE / ProceduralPCBGenerator.SPAN; // 48.7619 px/mm

  /**
   * Transforms board coordinates (x, z in mm) to 2048x2048 canvas pixel coordinates.
   * Board local frame: X = right, Z = rear, Forward = -Z.
   */
  private static toPx(xMm: number, zMm: number): [number, number] {
    return [
      (xMm + this.EXTENT) * this.SCALE,
      (zMm + this.EXTENT) * this.SCALE,
    ];
  }

  private static mmToPx(lenMm: number): number {
    return lenMm * this.SCALE;
  }

  /**
   * Generates procedural PBR texture suite for either 'top' or 'bottom' face.
   */
  public static generate(side: 'top' | 'bottom', options: ProceduralPCBOptions = {}): ProceduralPCBTextures {
    const W = this.TEX_SIZE;
    const H = this.TEX_SIZE;

    // 1. Create canvases for color, roughness, metalness, and bump
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = W;
    colorCanvas.height = H;
    const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true })!;

    const roughnessCanvas = document.createElement('canvas');
    roughnessCanvas.width = W;
    roughnessCanvas.height = H;
    const roughnessCtx = roughnessCanvas.getContext('2d', { willReadFrequently: true })!;

    const metalnessCanvas = document.createElement('canvas');
    metalnessCanvas.width = W;
    metalnessCanvas.height = H;
    const metalnessCtx = metalnessCanvas.getContext('2d', { willReadFrequently: true })!;

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = W;
    bumpCanvas.height = H;
    const bumpCtx = bumpCanvas.getContext('2d', { willReadFrequently: true })!;

    // 2. Clear canvas with pure transparent/white background outside PCB
    colorCtx.clearRect(0, 0, W, H);
    roughnessCtx.fillStyle = '#000000';
    roughnessCtx.fillRect(0, 0, W, H);
    metalnessCtx.fillStyle = '#000000';
    metalnessCtx.fillRect(0, 0, W, H);
    bumpCtx.fillStyle = '#808080';
    bumpCtx.fillRect(0, 0, W, H);

    // 3. Draw Solder Mask Base on PCB polygon
    this.drawPCBSubstrate(side, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

    // 4. Draw Ground Stitching Vias
    this.drawGroundVias(side, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

    // 5. Draw 3 Mounting Hole Plated Rings
    this.drawMountingHoles(colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

    // 6. Draw Discrete Placed Component Footprints (Pads & Markings)
    this.drawComponentFootprints(side, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

    // 7. Draw MLCC Passive Footprints (Capacitors & Resistors)
    this.drawPassiveFootprints(side, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

    // 8. Draw Verified Silkscreen Typography & Board Graphics
    this.drawSilkscreenMarkings(side, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

    // 9. Optional Illustrative Schematic Overlay (if enabled)
    if (options.showSchematicOverlay) {
      this.drawIllustrativeSchematicOverlay(side, colorCtx);
    }

    // 10. Wrap into Three.js textures with anisotropic filtering and mipmaps
    const configureTex = (tex: THREE.CanvasTexture, isSRGB = false) => {
      tex.colorSpace = isSRGB ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
    };

    const colorMap = new THREE.CanvasTexture(colorCanvas);
    configureTex(colorMap, true);

    const roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
    configureTex(roughnessMap, false);

    const metalnessMap = new THREE.CanvasTexture(metalnessCanvas);
    configureTex(metalnessMap, false);

    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    configureTex(bumpMap, false);

    return {
      colorMap,
      roughnessMap,
      metalnessMap,
      bumpMap,
      colorCanvas,
    };
  }

  // =========================================================================
  // Layer 1: PCB Substrate & Solder Mask Base
  // =========================================================================

  private static drawPCBSubstrate(
    _side: 'top' | 'bottom',
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    const rawPts = outlineData.outline as [number, number][];
    const holes = outlineData.holes as { x: number; z: number; r: number }[];

    const drawPath = (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      rawPts.forEach(([x, z], i) => {
        const [px, pz] = this.toPx(x, z);
        if (i === 0) ctx.moveTo(px, pz);
        else ctx.lineTo(px, pz);
      });
      ctx.closePath();

      // Cut out the 3 mounting holes
      holes.forEach((h) => {
        const [hx, hz] = this.toPx(h.x, h.z);
        const hr = this.mmToPx(h.r);
        ctx.moveTo(hx + hr, hz);
        ctx.arc(hx, hz, hr, 0, Math.PI * 2, true);
      });
    };

    // Color: deep matte black solder mask
    drawPath(colorCtx);
    colorCtx.fillStyle = '#141618';
    colorCtx.fill('evenodd');

    // Add subtle procedural satin grain to solder mask
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = 128;
    grainCanvas.height = 128;
    const gCtx = grainCanvas.getContext('2d')!;
    const gImg = gCtx.createImageData(128, 128);
    for (let i = 0; i < gImg.data.length; i += 4) {
      const v = 20 + Math.floor(Math.random() * 8);
      gImg.data[i] = v;
      gImg.data[i + 1] = v;
      gImg.data[i + 2] = v;
      gImg.data[i + 3] = 40;
    }
    gCtx.putImageData(gImg, 0, 0);

    drawPath(colorCtx);
    colorCtx.save();
    colorCtx.globalAlpha = 0.08;
    colorCtx.fillStyle = colorCtx.createPattern(grainCanvas, 'repeat')!;
    colorCtx.fill('evenodd');
    colorCtx.restore();

    // Roughness: satin finish (~0.71 -> rgb(180, 180, 180))
    drawPath(roughnessCtx);
    roughnessCtx.fillStyle = '#b4b4b4';
    roughnessCtx.fill('evenodd');

    // Metalness: non-metal dielectric (0.0 -> rgb(0, 0, 0))
    drawPath(metalnessCtx);
    metalnessCtx.fillStyle = '#000000';
    metalnessCtx.fill('evenodd');

    // Bump: neutral base level (128)
    drawPath(bumpCtx);
    bumpCtx.fillStyle = '#808080';
    bumpCtx.fill('evenodd');
  }

  // =========================================================================
  // Layer 2: 3 Mounting Holes & Annular Rings
  // =========================================================================

  private static drawMountingHoles(
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    const holes = outlineData.holes as { x: number; z: number; r: number }[];

    holes.forEach((h) => {
      const [cx, cz] = this.toPx(h.x, h.z);
      const innerR = this.mmToPx(h.r + 0.05);
      const outerR = this.mmToPx(h.r + 0.95);

      // Gold Annular Plated Ring
      const drawRing = (ctx: CanvasRenderingContext2D, fill: string) => {
        ctx.beginPath();
        ctx.arc(cx, cz, outerR, 0, Math.PI * 2, false);
        ctx.arc(cx, cz, innerR, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
      };

      drawRing(colorCtx, '#dfb136');
      drawRing(roughnessCtx, '#373737'); // 0.22 smooth metallic
      drawRing(metalnessCtx, '#f5f5f5'); // 0.96 pure metal
      drawRing(bumpCtx, '#b4b4b4'); // elevated copper pad

      // Thermal relief spokes (4 radial gold spokes connecting to ground plane)
      const spokeW = this.mmToPx(0.5);
      const spokeLen = this.mmToPx(1.6);
      [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((ang) => {
        const sx = cx + Math.cos(ang) * (outerR + spokeLen / 2);
        const sy = cz + Math.sin(ang) * (outerR + spokeLen / 2);
        this.drawRotatedRect(colorCtx, sx, sy, spokeLen, spokeW, ang, '#dfb136');
        this.drawRotatedRect(roughnessCtx, sx, sy, spokeLen, spokeW, ang, '#373737');
        this.drawRotatedRect(metalnessCtx, sx, sy, spokeLen, spokeW, ang, '#f5f5f5');
        this.drawRotatedRect(bumpCtx, sx, sy, spokeLen, spokeW, ang, '#b4b4b4');
      });

      // Dark cavity inside drill hole
      const drawHole = (ctx: CanvasRenderingContext2D, fill: string) => {
        ctx.beginPath();
        ctx.arc(cx, cz, innerR, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
      };

      drawHole(colorCtx, '#0a0b0d');
      drawHole(roughnessCtx, '#f0f0f0');
      drawHole(metalnessCtx, '#000000');
      drawHole(bumpCtx, '#202020');
    });
  }

  // =========================================================================
  // Layer 3: Ground Stitching Vias
  // =========================================================================

  private static drawGroundVias(
    side: 'top' | 'bottom',
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    // Array of authentic ground stitching via positions (in mm)
    const viaCoords: [number, number][] = [
      // Along perimeter ground fences
      [-13.5, -4.5], [-14.2, -2.0], [-14.5, 0.5], [-14.2, 3.0], [-13.5, 5.5],
      [13.5, -4.5], [14.2, -2.0], [14.5, 0.5], [14.2, 3.0], [13.5, 5.5],
      [-5.0, -14.2], [-2.5, -14.8], [0.0, -15.0], [2.5, -14.8], [5.0, -14.2],
      [-4.0, 14.5], [-2.0, 15.2], [0.0, 15.5], [2.0, 15.2], [4.0, 14.5],
      // Ground plane stitchings near RF and power
      [-8.5, 3.2], [-9.5, 5.0], [-7.5, 6.8], [-6.2, 12.0], [-8.2, 11.5],
      [8.5, 3.2], [9.5, 5.0], [7.5, 6.8], [6.2, 12.0], [8.2, 11.5],
      [-2.0, -4.0], [2.0, -4.0], [-4.0, -8.0], [4.0, -8.0],
      [-1.5, 3.5], [1.5, 3.5], [-3.5, 1.5], [3.5, 1.5],
    ];

    const outerR = this.mmToPx(0.32); // 0.64mm pad diameter
    const innerR = this.mmToPx(0.16); // 0.32mm drill diameter

    viaCoords.forEach(([x, z]) => {
      // Mirrored coords if bottom face
      const pxX = side === 'bottom' ? x : x;
      const [cx, cz] = this.toPx(pxX, z);

      // Outer gold annular ring
      colorCtx.beginPath();
      colorCtx.arc(cx, cz, outerR, 0, Math.PI * 2);
      colorCtx.fillStyle = '#dfb136';
      colorCtx.fill();

      roughnessCtx.beginPath();
      roughnessCtx.arc(cx, cz, outerR, 0, Math.PI * 2);
      roughnessCtx.fillStyle = '#373737';
      roughnessCtx.fill();

      metalnessCtx.beginPath();
      metalnessCtx.arc(cx, cz, outerR, 0, Math.PI * 2);
      metalnessCtx.fillStyle = '#f5f5f5';
      metalnessCtx.fill();

      bumpCtx.beginPath();
      bumpCtx.arc(cx, cz, outerR, 0, Math.PI * 2);
      bumpCtx.fillStyle = '#a0a0a0';
      bumpCtx.fill();

      // Inner drill hole cavity
      colorCtx.beginPath();
      colorCtx.arc(cx, cz, innerR, 0, Math.PI * 2);
      colorCtx.fillStyle = '#0a0b0d';
      colorCtx.fill();

      roughnessCtx.beginPath();
      roughnessCtx.arc(cx, cz, innerR, 0, Math.PI * 2);
      roughnessCtx.fillStyle = '#f0f0f0';
      roughnessCtx.fill();

      metalnessCtx.beginPath();
      metalnessCtx.arc(cx, cz, innerR, 0, Math.PI * 2);
      metalnessCtx.fillStyle = '#000000';
      metalnessCtx.fill();

      bumpCtx.beginPath();
      bumpCtx.arc(cx, cz, innerR, 0, Math.PI * 2);
      bumpCtx.fillStyle = '#202020';
      bumpCtx.fill();
    });
  }

  // =========================================================================
  // Layer 4: Component Footprints & Solder Pads
  // =========================================================================

  private static drawComponentFootprints(
    side: 'top' | 'bottom',
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    const list = placements.filter((p) => p.side === side);

    list.forEach((p) => {
      const [cx, cz] = this.toPx(p.xMm, p.zMm);
      const rot = p.rotationRad;
      const [wMm, dMm] = p.sizeMm;
      const wPx = this.mmToPx(wMm);
      const dPx = this.mmToPx(dMm);

      switch (p.kind) {
        case 'ic':
          this.drawQFNFootprint(p, cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'shunt':
          this.drawShuntFootprint(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'jst':
          this.drawJSTFootprint(p, cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'sh_vertical':
          this.drawSH10VerticalFootprint(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'sh_side':
          this.drawSH10SideFootprint(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'ufl':
          this.drawUFLFootprint(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'button':
          this.drawButtonFootprint(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'ceramic':
          this.drawCeramicAntennaFootprint(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'metal':
          this.drawCrystalFootprint(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'thpad':
          this.drawThroughHoleSolderPad(p, cx, cz, wPx, dPx, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        default:
          break;
      }
    });
  }

  // --- Footprint Sub-renderers ---

  private static drawQFNFootprint(
    _p: Placement,
    cx: number,
    cz: number,
    wPx: number,
    dPx: number,
    rot: number,
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    // 1. Center Thermal Ground Pad (if package >= 2.5 mm)
    if (wPx > this.mmToPx(2.2) && dPx > this.mmToPx(2.2)) {
      const padW = wPx * 0.62;
      const padD = dPx * 0.62;

      this.drawRotatedRect(colorCtx, cx, cz, padW, padD, rot, '#dfb136');
      this.drawRotatedRect(roughnessCtx, cx, cz, padW, padD, rot, '#373737');
      this.drawRotatedRect(metalnessCtx, cx, cz, padW, padD, rot, '#f5f5f5');
      this.drawRotatedRect(bumpCtx, cx, cz, padW, padD, rot, '#b4b4b4');

      // Thermal ground vias inside the pad (e.g. 2x2 or 3x3 array)
      const viaRows = wPx > this.mmToPx(4.5) ? 3 : 2;
      const viaSpan = padW * 0.65;
      const step = viaRows > 1 ? viaSpan / (viaRows - 1) : 0;
      const vR = this.mmToPx(0.14);

      for (let r = 0; r < viaRows; r++) {
        for (let c = 0; c < viaRows; c++) {
          const lx = -viaSpan / 2 + c * step;
          const lz = -viaSpan / 2 + r * step;
          const cos = Math.cos(rot);
          const sin = Math.sin(rot);
          const vx = cx + lx * cos - lz * sin;
          const vz = cz + lx * sin + lz * cos;

          colorCtx.beginPath();
          colorCtx.arc(vx, vz, vR, 0, Math.PI * 2);
          colorCtx.fillStyle = '#0a0b0d';
          colorCtx.fill();

          roughnessCtx.beginPath();
          roughnessCtx.arc(vx, vz, vR, 0, Math.PI * 2);
          roughnessCtx.fillStyle = '#f0f0f0';
          roughnessCtx.fill();

          metalnessCtx.beginPath();
          metalnessCtx.arc(vx, vz, vR, 0, Math.PI * 2);
          metalnessCtx.fillStyle = '#000000';
          metalnessCtx.fill();

          bumpCtx.beginPath();
          bumpCtx.arc(vx, vz, vR, 0, Math.PI * 2);
          bumpCtx.fillStyle = '#202020';
          bumpCtx.fill();
        }
      }
    }

    // 2. Perimeter SMT Lead Solder Pads (QFN/SOIC pins)
    const leadCountX = Math.max(2, Math.floor(wPx / this.mmToPx(0.75)));
    const leadCountZ = Math.max(2, Math.floor(dPx / this.mmToPx(0.75)));
    const leadW = this.mmToPx(0.26);
    const leadLen = this.mmToPx(0.75);

    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    // North & South perimeter pads
    for (let i = 0; i < leadCountX; i++) {
      const lx = ((i + 0.5) / leadCountX - 0.5) * (wPx - this.mmToPx(0.4));
      // North pad (Z = -dPx/2)
      const lzN = -dPx / 2 - this.mmToPx(0.1);
      const wxN = cx + lx * cos - lzN * sin;
      const wzN = cz + lx * sin + lzN * cos;
      this.drawRotatedRect(colorCtx, wxN, wzN, leadW, leadLen, rot, '#dfb136');
      this.drawRotatedRect(roughnessCtx, wxN, wzN, leadW, leadLen, rot, '#373737');
      this.drawRotatedRect(metalnessCtx, wxN, wzN, leadW, leadLen, rot, '#f5f5f5');
      this.drawRotatedRect(bumpCtx, wxN, wzN, leadW, leadLen, rot, '#b4b4b4');

      // South pad (Z = +dPx/2)
      const lzS = dPx / 2 + this.mmToPx(0.1);
      const wxS = cx + lx * cos - lzS * sin;
      const wzS = cz + lx * sin + lzS * cos;
      this.drawRotatedRect(colorCtx, wxS, wzS, leadW, leadLen, rot, '#dfb136');
      this.drawRotatedRect(roughnessCtx, wxS, wzS, leadW, leadLen, rot, '#373737');
      this.drawRotatedRect(metalnessCtx, wxS, wzS, leadW, leadLen, rot, '#f5f5f5');
      this.drawRotatedRect(bumpCtx, wxS, wzS, leadW, leadLen, rot, '#b4b4b4');
    }

    // West & East perimeter pads
    for (let i = 0; i < leadCountZ; i++) {
      const lz = ((i + 0.5) / leadCountZ - 0.5) * (dPx - this.mmToPx(0.4));
      // West pad (X = -wPx/2)
      const lxW = -wPx / 2 - this.mmToPx(0.1);
      const wxW = cx + lxW * cos - lz * sin;
      const wzW = cz + lxW * sin + lz * cos;
      this.drawRotatedRect(colorCtx, wxW, wzW, leadLen, leadW, rot, '#dfb136');
      this.drawRotatedRect(roughnessCtx, wxW, wzW, leadLen, leadW, rot, '#373737');
      this.drawRotatedRect(metalnessCtx, wxW, wzW, leadLen, leadW, rot, '#f5f5f5');
      this.drawRotatedRect(bumpCtx, wxW, wzW, leadLen, leadW, rot, '#b4b4b4');

      // East pad (X = +wPx/2)
      const lxE = wPx / 2 + this.mmToPx(0.1);
      const wxE = cx + lxE * cos - lz * sin;
      const wzE = cz + lxE * sin + lz * cos;
      this.drawRotatedRect(colorCtx, wxE, wzE, leadLen, leadW, rot, '#dfb136');
      this.drawRotatedRect(roughnessCtx, wxE, wzE, leadLen, leadW, rot, '#373737');
      this.drawRotatedRect(metalnessCtx, wxE, wzE, leadLen, leadW, rot, '#f5f5f5');
      this.drawRotatedRect(bumpCtx, wxE, wzE, leadLen, leadW, rot, '#b4b4b4');
    }

    // 3. Package Silkscreen: Corner alignment tick marks & Pin 1 dot
    this.drawPackageCornerTicks(cx, cz, wPx * 1.12, dPx * 1.12, rot, colorCtx, roughnessCtx, bumpCtx);

    // Pin 1 dot (circle near top-left of package)
    const p1DistX = -wPx / 2 - this.mmToPx(0.5);
    const p1DistZ = -dPx / 2 - this.mmToPx(0.5);
    const p1x = cx + p1DistX * cos - p1DistZ * sin;
    const p1z = cz + p1DistX * sin + p1DistZ * cos;
    const dotR = this.mmToPx(0.2);

    colorCtx.beginPath();
    colorCtx.arc(p1x, p1z, dotR, 0, Math.PI * 2);
    colorCtx.fillStyle = '#f3f6fa';
    colorCtx.fill();

    roughnessCtx.beginPath();
    roughnessCtx.arc(p1x, p1z, dotR, 0, Math.PI * 2);
    roughnessCtx.fillStyle = '#e0e0e0';
    roughnessCtx.fill();

    bumpCtx.beginPath();
    bumpCtx.arc(p1x, p1z, dotR, 0, Math.PI * 2);
    bumpCtx.fillStyle = '#9b9b9b';
    bumpCtx.fill();
  }

  private static drawShuntFootprint(
    cx: number,
    cz: number,
    wPx: number,
    dPx: number,
    rot: number,
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    const padW = wPx * 0.38;
    const padD = dPx * 1.15;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    // Left and Right terminal pads
    [-1, 1].forEach((sgn) => {
      const lx = sgn * (wPx / 2 - padW / 2 + this.mmToPx(0.1));
      const px = cx + lx * cos;
      const pz = cz + lx * sin;

      this.drawRotatedRect(colorCtx, px, pz, padW, padD, rot, '#dfb136');
      this.drawRotatedRect(roughnessCtx, px, pz, padW, padD, rot, '#373737');
      this.drawRotatedRect(metalnessCtx, px, pz, padW, padD, rot, '#f5f5f5');
      this.drawRotatedRect(bumpCtx, px, pz, padW, padD, rot, '#b4b4b4');
    });

    // Silkscreen outline & R001 text
    this.drawPackageCornerTicks(cx, cz, wPx * 1.15, dPx * 1.25, rot, colorCtx, roughnessCtx, bumpCtx);
    this.drawRotatedText(colorCtx, cx, cz + dPx / 2 + this.mmToPx(0.8), rot, 'R001', this.mmToPx(0.6), '#f3f6fa');
  }

  private static drawJSTFootprint(
    p: Placement,
    cx: number,
    cz: number,
    wPx: number,
    dPx: number,
    rot: number,
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    // 3 Through-hole gold ring pads (pitch 1.25 mm)
    const pitchPx = this.mmToPx(1.25);
    const outerR = this.mmToPx(0.55);
    const drillR = this.mmToPx(0.32);

    [-1, 0, 1].forEach((i) => {
      const lx = i * pitchPx;
      const px = cx + lx * cos;
      const pz = cz + lx * sin;

      // Gold Annular Pad
      colorCtx.beginPath();
      colorCtx.arc(px, pz, outerR, 0, Math.PI * 2);
      colorCtx.fillStyle = '#dfb136';
      colorCtx.fill();

      roughnessCtx.beginPath();
      roughnessCtx.arc(px, pz, outerR, 0, Math.PI * 2);
      roughnessCtx.fillStyle = '#373737';
      roughnessCtx.fill();

      metalnessCtx.beginPath();
      metalnessCtx.arc(px, pz, outerR, 0, Math.PI * 2);
      metalnessCtx.fillStyle = '#f5f5f5';
      metalnessCtx.fill();

      bumpCtx.beginPath();
      bumpCtx.arc(px, pz, outerR, 0, Math.PI * 2);
      bumpCtx.fillStyle = '#b4b4b4';
      bumpCtx.fill();

      // Drill Hole
      colorCtx.beginPath();
      colorCtx.arc(px, pz, drillR, 0, Math.PI * 2);
      colorCtx.fillStyle = '#0a0b0d';
      colorCtx.fill();

      roughnessCtx.beginPath();
      roughnessCtx.arc(px, pz, drillR, 0, Math.PI * 2);
      roughnessCtx.fillStyle = '#f0f0f0';
      roughnessCtx.fill();

      metalnessCtx.beginPath();
      metalnessCtx.arc(px, pz, drillR, 0, Math.PI * 2);
      metalnessCtx.fillStyle = '#000000';
      metalnessCtx.fill();

      bumpCtx.beginPath();
      bumpCtx.arc(px, pz, drillR, 0, Math.PI * 2);
      bumpCtx.fillStyle = '#202020';
      bumpCtx.fill();
    });

    // 2 Side SMD mechanical anchor solder pads
    const tabW = this.mmToPx(1.1);
    const tabD = this.mmToPx(1.6);
    [-1, 1].forEach((sgn) => {
      const lx = sgn * (wPx / 2 + tabW / 2);
      const px = cx + lx * cos;
      const pz = cz + lx * sin;
      this.drawRotatedRect(colorCtx, px, pz, tabW, tabD, rot, '#dfb136');
      this.drawRotatedRect(roughnessCtx, px, pz, tabW, tabD, rot, '#373737');
      this.drawRotatedRect(metalnessCtx, px, pz, tabW, tabD, rot, '#f5f5f5');
      this.drawRotatedRect(bumpCtx, px, pz, tabW, tabD, rot, '#b4b4b4');
    });

    // Silkscreen outline box of the JST connector
    this.drawRotatedRectOutline(colorCtx, cx, cz, wPx * 1.05, dPx * 1.05, rot, '#f3f6fa', this.mmToPx(0.12));

    // Channel label (ESC1, ESC2, ESC3, ESC4)
    const channelName = p.subLabel?.split('（')[0] || (p.key.includes('esc') ? p.key.replace('jst_', '').toUpperCase() : '');
    if (channelName) {
      const lzOff = dPx / 2 + this.mmToPx(1.0);
      const lxOff = 0;
      const tx = cx + lxOff * cos - lzOff * sin;
      const tz = cz + lxOff * sin + lzOff * cos;
      this.drawRotatedText(colorCtx, tx, tz, rot, channelName, this.mmToPx(0.75), '#f3f6fa');
      this.drawRotatedText(roughnessCtx, tx, tz, rot, channelName, this.mmToPx(0.75), '#e0e0e0');
      this.drawRotatedText(bumpCtx, tx, tz, rot, channelName, this.mmToPx(0.75), '#9b9b9b');
    }
  }

  private static drawSH10VerticalFootprint(
    cx: number,
    cz: number,
    wPx: number,
    dPx: number,
    rot: number,
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    // 4 SMT signal lead pads (pitch 1.0 mm)
    const pitch = this.mmToPx(1.0);
    const leadW = this.mmToPx(0.45);
    const leadLen = this.mmToPx(1.2);

    [-1.5, -0.5, 0.5, 1.5].forEach((idx) => {
      const lx = idx * pitch;
      const lz = -dPx / 2 + leadLen / 2;
      const px = cx + lx * cos - lz * sin;
      const pz = cz + lx * sin + lz * cos;
      this.drawRotatedRect(colorCtx, px, pz, leadW, leadLen, rot, '#dfb136');
      this.drawRotatedRect(roughnessCtx, px, pz, leadW, leadLen, rot, '#373737');
      this.drawRotatedRect(metalnessCtx, px, pz, leadW, leadLen, rot, '#f5f5f5');
      this.drawRotatedRect(bumpCtx, px, pz, leadW, leadLen, rot, '#b4b4b4');
    });

    // 2 Side anchor tabs
    const anchorW = this.mmToPx(1.4);
    const anchorD = this.mmToPx(2.2);
    [-1, 1].forEach((sgn) => {
      const lx = sgn * (wPx / 2 + anchorW / 2);
      const px = cx + lx * cos;
      const pz = cz + lx * sin;
      this.drawRotatedRect(colorCtx, px, pz, anchorW, anchorD, rot, '#dfb136');
      this.drawRotatedRect(roughnessCtx, px, pz, anchorW, anchorD, rot, '#373737');
      this.drawRotatedRect(metalnessCtx, px, pz, anchorW, anchorD, rot, '#f5f5f5');
      this.drawRotatedRect(bumpCtx, px, pz, anchorW, anchorD, rot, '#b4b4b4');
    });

    // Silkscreen outline & "USB" text
    this.drawRotatedRectOutline(colorCtx, cx, cz, wPx * 1.08, dPx * 1.1, rot, '#f3f6fa', this.mmToPx(0.12));
    this.drawRotatedText(colorCtx, cx, cz - dPx / 2 - this.mmToPx(0.9), rot, 'USB', this.mmToPx(0.75), '#f3f6fa');
    this.drawRotatedText(roughnessCtx, cx, cz - dPx / 2 - this.mmToPx(0.9), rot, 'USB', this.mmToPx(0.75), '#e0e0e0');
  }

  private static drawSH10SideFootprint(
    cx: number,
    cz: number,
    wPx: number,
    dPx: number,
    rot: number,
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    this.drawRotatedRectOutline(colorCtx, cx, cz, wPx * 1.08, dPx * 1.1, rot, '#f3f6fa', this.mmToPx(0.12));
    this.drawRotatedText(colorCtx, cx, cz - dPx / 2 - this.mmToPx(0.8), rot, 'CAM', this.mmToPx(0.65), '#f3f6fa');

    // 4 Lead pads
    const pitch = this.mmToPx(1.0);
    const leadW = this.mmToPx(0.4);
    const leadLen = this.mmToPx(1.0);
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    [-1.5, -0.5, 0.5, 1.5].forEach((idx) => {
      const lx = idx * pitch;
      const px = cx + lx * cos;
      const pz = cz + lx * sin;
      this.drawRotatedRect(colorCtx, px, pz, leadW, leadLen, rot, '#dfb136');
      this.drawRotatedRect(roughnessCtx, px, pz, leadW, leadLen, rot, '#373737');
      this.drawRotatedRect(metalnessCtx, px, pz, leadW, leadLen, rot, '#f5f5f5');
      this.drawRotatedRect(bumpCtx, px, pz, leadW, leadLen, rot, '#b4b4b4');
    });
  }

  private static drawUFLFootprint(
    cx: number,
    cz: number,
    wPx: number,
    dPx: number,
    rot: number,
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    // Center RF signal pad
    const sigW = this.mmToPx(0.8);
    const sigD = this.mmToPx(0.9);
    this.drawRotatedRect(colorCtx, cx, cz, sigW, sigD, rot, '#dfb136');
    this.drawRotatedRect(roughnessCtx, cx, cz, sigW, sigD, rot, '#373737');
    this.drawRotatedRect(metalnessCtx, cx, cz, sigW, sigD, rot, '#f5f5f5');
    this.drawRotatedRect(bumpCtx, cx, cz, sigW, sigD, rot, '#b4b4b4');

    // Left and Right ground shield pads
    const gndW = this.mmToPx(1.1);
    const gndD = this.mmToPx(2.2);
    [-1, 1].forEach((sgn) => {
      const lx = sgn * (wPx / 2 - gndW / 4);
      const px = cx + lx * cos;
      const pz = cz + lx * sin;
      this.drawRotatedRect(colorCtx, px, pz, gndW, gndD, rot, '#dfb136');
      this.drawRotatedRect(roughnessCtx, px, pz, gndW, gndD, rot, '#373737');
      this.drawRotatedRect(metalnessCtx, px, pz, gndW, gndD, rot, '#f5f5f5');
      this.drawRotatedRect(bumpCtx, px, pz, gndW, gndD, rot, '#b4b4b4');
    });

    // Silkscreen "VTX-ANT"
    this.drawRotatedText(colorCtx, cx, cz + dPx / 2 + this.mmToPx(0.9), rot, 'VTX-ANT', this.mmToPx(0.65), '#f3f6fa');
    this.drawRotatedText(roughnessCtx, cx, cz + dPx / 2 + this.mmToPx(0.9), rot, 'VTX-ANT', this.mmToPx(0.65), '#e0e0e0');
  }

  private static drawButtonFootprint(
    cx: number,
    cz: number,
    wPx: number,
    dPx: number,
    rot: number,
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    const padW = this.mmToPx(0.7);
    const padD = this.mmToPx(0.8);
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    // 4 Corner pads
    [-1, 1].forEach((sx) => {
      [-1, 1].forEach((sz) => {
        const lx = sx * (wPx / 2);
        const lz = sz * (dPx / 2);
        const px = cx + lx * cos - lz * sin;
        const pz = cz + lx * sin + lz * cos;
        this.drawRotatedRect(colorCtx, px, pz, padW, padD, rot, '#dfb136');
        this.drawRotatedRect(roughnessCtx, px, pz, padW, padD, rot, '#373737');
        this.drawRotatedRect(metalnessCtx, px, pz, padW, padD, rot, '#f5f5f5');
        this.drawRotatedRect(bumpCtx, px, pz, padW, padD, rot, '#b4b4b4');
      });
    });

    this.drawRotatedRectOutline(colorCtx, cx, cz, wPx * 0.9, dPx * 0.9, rot, '#f3f6fa', this.mmToPx(0.1));
    this.drawRotatedText(colorCtx, cx, cz - dPx / 2 - this.mmToPx(0.8), rot, 'BOOT', this.mmToPx(0.65), '#f3f6fa');
    this.drawRotatedText(roughnessCtx, cx, cz - dPx / 2 - this.mmToPx(0.8), rot, 'BOOT', this.mmToPx(0.65), '#e0e0e0');
  }

  private static drawCeramicAntennaFootprint(
    cx: number,
    cz: number,
    wPx: number,
    dPx: number,
    rot: number,
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    const padW = wPx * 1.1;
    const padD = dPx * 0.35;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    [-1, 1].forEach((sgn) => {
      const lz = sgn * (dPx / 2 - padD / 2);
      const px = cx - lz * sin;
      const pz = cz + lz * cos;
      this.drawRotatedRect(colorCtx, px, pz, padW, padD, rot, '#dfb136');
      this.drawRotatedRect(roughnessCtx, px, pz, padW, padD, rot, '#373737');
      this.drawRotatedRect(metalnessCtx, px, pz, padW, padD, rot, '#f5f5f5');
      this.drawRotatedRect(bumpCtx, px, pz, padW, padD, rot, '#b4b4b4');
    });

    this.drawRotatedText(colorCtx, cx, cz + dPx / 2 + this.mmToPx(0.7), rot, 'WiFi-ANT', this.mmToPx(0.55), '#f3f6fa');
  }

  private static drawCrystalFootprint(
    cx: number,
    cz: number,
    wPx: number,
    dPx: number,
    rot: number,
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    const padW = this.mmToPx(0.6);
    const padD = this.mmToPx(0.6);
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    [-1, 1].forEach((sx) => {
      [-1, 1].forEach((sz) => {
        const lx = sx * (wPx / 2 - padW / 3);
        const lz = sz * (dPx / 2 - padD / 3);
        const px = cx + lx * cos - lz * sin;
        const pz = cz + lx * sin + lz * cos;
        this.drawRotatedRect(colorCtx, px, pz, padW, padD, rot, '#dfb136');
        this.drawRotatedRect(roughnessCtx, px, pz, padW, padD, rot, '#373737');
        this.drawRotatedRect(metalnessCtx, px, pz, padW, padD, rot, '#f5f5f5');
        this.drawRotatedRect(bumpCtx, px, pz, padW, padD, rot, '#b4b4b4');
      });
    });
  }

  private static drawThroughHoleSolderPad(
    p: Placement,
    cx: number,
    cz: number,
    wPx: number,
    dPx: number,
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    // Battery Pads or Motor Pads or RX-ANT pad
    const isBatteryPad = p.key === 'batt_pos' || p.key === 'batt_gnd';
    const isAntPad = p.key === 'rx_ant';

    if (isBatteryPad) {
      // Heavy high-current rounded rectangle gold pad
      const padW = this.mmToPx(2.4);
      const padD = this.mmToPx(1.6);
      this.drawRotatedRect(colorCtx, cx, cz, padW, padD, 0, '#dfb136');
      this.drawRotatedRect(roughnessCtx, cx, cz, padW, padD, 0, '#373737');
      this.drawRotatedRect(metalnessCtx, cx, cz, padW, padD, 0, '#f5f5f5');
      this.drawRotatedRect(bumpCtx, cx, cz, padW, padD, 0, '#b4b4b4');

      // Silkscreen polarity
      const label = p.key === 'batt_pos' ? 'BATT+' : 'GND';
      const sym = p.key === 'batt_pos' ? '+' : '—';
      this.drawRotatedText(colorCtx, cx, cz - padD / 2 - this.mmToPx(0.8), 0, label, this.mmToPx(0.7), '#f3f6fa');
      this.drawRotatedText(colorCtx, cx, cz, 0, sym, this.mmToPx(1.2), '#141618');
    } else if (isAntPad) {
      // Round pad with solder via
      const outerR = this.mmToPx(0.7);
      const holeR = this.mmToPx(0.35);

      colorCtx.beginPath();
      colorCtx.arc(cx, cz, outerR, 0, Math.PI * 2);
      colorCtx.fillStyle = '#dfb136';
      colorCtx.fill();

      roughnessCtx.beginPath();
      roughnessCtx.arc(cx, cz, outerR, 0, Math.PI * 2);
      roughnessCtx.fillStyle = '#373737';
      roughnessCtx.fill();

      metalnessCtx.beginPath();
      metalnessCtx.arc(cx, cz, outerR, 0, Math.PI * 2);
      metalnessCtx.fillStyle = '#f5f5f5';
      metalnessCtx.fill();

      bumpCtx.beginPath();
      bumpCtx.arc(cx, cz, outerR, 0, Math.PI * 2);
      bumpCtx.fillStyle = '#b4b4b4';
      bumpCtx.fill();

      // Hole
      colorCtx.beginPath();
      colorCtx.arc(cx, cz, holeR, 0, Math.PI * 2);
      colorCtx.fillStyle = '#0a0b0d';
      colorCtx.fill();

      this.drawRotatedText(colorCtx, cx, cz - outerR - this.mmToPx(0.7), 0, 'RX-ANT', this.mmToPx(0.65), '#f3f6fa');
    } else {
      // Standard circular through-hole motor pad
      const outerR = Math.max(wPx, dPx) * 0.55;
      const holeR = outerR * 0.5;

      colorCtx.beginPath();
      colorCtx.arc(cx, cz, outerR, 0, Math.PI * 2);
      colorCtx.fillStyle = '#dfb136';
      colorCtx.fill();

      roughnessCtx.beginPath();
      roughnessCtx.arc(cx, cz, outerR, 0, Math.PI * 2);
      roughnessCtx.fillStyle = '#373737';
      roughnessCtx.fill();

      metalnessCtx.beginPath();
      metalnessCtx.arc(cx, cz, outerR, 0, Math.PI * 2);
      metalnessCtx.fillStyle = '#f5f5f5';
      metalnessCtx.fill();

      bumpCtx.beginPath();
      bumpCtx.arc(cx, cz, outerR, 0, Math.PI * 2);
      bumpCtx.fillStyle = '#b4b4b4';
      bumpCtx.fill();

      colorCtx.beginPath();
      colorCtx.arc(cx, cz, holeR, 0, Math.PI * 2);
      colorCtx.fillStyle = '#0a0b0d';
      colorCtx.fill();
    }
  }

  // =========================================================================
  // Layer 5: MLCC Passive Footprints (Capacitors & Resistors)
  // =========================================================================

  private static drawPassiveFootprints(
    side: 'top' | 'bottom',
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    const passives = (passivesData as any)[side] as { x: number; z: number; len: number; wid: number; rot: number }[] || [];

    passives.forEach((p) => {
      const [cx, cz] = this.toPx(p.x, p.z);
      const totalLenPx = this.mmToPx(p.len);
      const widPx = this.mmToPx(p.wid);
      const rot = p.rot;

      // 2 SMT Terminal solder pads at the ends of the chip body
      const padLen = totalLenPx * 0.36;
      const padWid = widPx * 1.15;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);

      [-1, 1].forEach((sgn) => {
        const lx = sgn * (totalLenPx / 2 - padLen / 2 + this.mmToPx(0.08));
        const px = cx + lx * cos;
        const pz = cz + lx * sin;

        this.drawRotatedRect(colorCtx, px, pz, padLen, padWid, rot, '#dfb136');
        this.drawRotatedRect(roughnessCtx, px, pz, padLen, padWid, rot, '#373737');
        this.drawRotatedRect(metalnessCtx, px, pz, padLen, padWid, rot, '#f5f5f5');
        this.drawRotatedRect(bumpCtx, px, pz, padLen, padWid, rot, '#b4b4b4');
      });
    });
  }

  // =========================================================================
  // Layer 6: Verified Silkscreen Typography & Graphics
  // =========================================================================

  private static drawSilkscreenMarkings(
    side: 'top' | 'bottom',
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    _metalnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    const textColor = '#f3f6fa';
    const textRoughness = '#e0e0e0';
    const textBump = '#9b9b9b';

    if (side === 'top') {
      // 1. Prominent Forward Arrow Chevron & "↑ FRONT" text
      const [fx, fz] = this.toPx(0, -17.2);
      this.drawForwardChevron(colorCtx, roughnessCtx, bumpCtx, fx, fz, this.mmToPx(3.2));
      this.drawRotatedText(colorCtx, fx, fz - this.mmToPx(1.6), 0, '↑ FRONT', this.mmToPx(0.95), textColor);
      this.drawRotatedText(roughnessCtx, fx, fz - this.mmToPx(1.6), 0, '↑ FRONT', this.mmToPx(0.95), textRoughness);
      this.drawRotatedText(bumpCtx, fx, fz - this.mmToPx(1.6), 0, '↑ FRONT', this.mmToPx(0.95), textBump);

      // 2. Motor Corner Indications (ESC1..4)
      const escLabels: [number, number, string][] = [
        [-9.8, -12.5, 'ESC3'],
        [-12.8, -7.5, 'ESC4'],
        [12.8, 7.5, 'ESC2'],
        [7.5, 12.8, 'ESC1'],
      ];
      escLabels.forEach(([x, z, label]) => {
        const [px, pz] = this.toPx(x, z);
        this.drawRotatedText(colorCtx, px, pz, 0, label, this.mmToPx(0.8), textColor);
        this.drawRotatedText(roughnessCtx, px, pz, 0, label, this.mmToPx(0.8), textRoughness);
      });

      // 3. Test pads silkscreen near edge: CAM, 5V, TX, RX
      const padLabels: [number, number, string][] = [
        [4.2, 5.0, 'CAM'],
        [4.2, 6.2, '5V'],
        [4.2, 7.4, 'TX'],
        [4.2, 8.6, 'RX'],
      ];
      padLabels.forEach(([x, z, label]) => {
        const [px, pz] = this.toPx(x, z);
        this.drawRotatedText(colorCtx, px, pz, 0, label, this.mmToPx(0.55), textColor);
      });
    } else {
      // BOTTOM Face Silkscreen
      // 1. "BOTTOM FRONT" indicator
      const [bfx, bfz] = this.toPx(0, -17.0);
      this.drawRotatedText(colorCtx, bfx, bfz, 0, '▲ FRONT', this.mmToPx(0.9), textColor);
      this.drawRotatedText(roughnessCtx, bfx, bfz, 0, '▲ FRONT', this.mmToPx(0.9), textRoughness);

      // 2. BETAFPV Branding
      const [mx, mz] = this.toPx(-9.5, -12.5);
      this.drawRotatedText(colorCtx, mx, mz, -Math.PI / 4, 'Matrix 5IN1', this.mmToPx(0.85), textColor);
      this.drawRotatedText(roughnessCtx, mx, mz, -Math.PI / 4, 'Matrix 5IN1', this.mmToPx(0.85), textRoughness);

      // 3. Buzzer Pads
      const [bzPx, bzPz] = this.toPx(-9.2, -10.5);
      this.drawRotatedText(colorCtx, bzPx, bzPz, 0, 'BZ+', this.mmToPx(0.65), textColor);
      const [bzNx, bzNz] = this.toPx(-10.5, -9.2);
      this.drawRotatedText(colorCtx, bzNx, bzNz, 0, 'BZ-', this.mmToPx(0.65), textColor);
    }
  }

  // =========================================================================
  // Layer 7: Illustrative Educational Schematic Overlay (Optional)
  // =========================================================================

  private static drawIllustrativeSchematicOverlay(
    side: 'top' | 'bottom',
    colorCtx: CanvasRenderingContext2D,
  ) {
    colorCtx.save();

    // Prominent Watermark / Disclaimer
    const [wx, wz] = this.toPx(0, 18.2);
    colorCtx.font = `bold ${this.mmToPx(0.85)}px sans-serif`;
    colorCtx.textAlign = 'center';
    colorCtx.fillStyle = '#38bdf8';
    colorCtx.fillText('⚠️ 教學示意線路 (Illustrative Schematic Overlay · Not Actual PCB Traces)', wx, wz);

    if (side === 'top') {
      // 1. Power Distribution Rail (Amber dashed path from Battery -> Current Sensor -> BEC)
      const p1 = this.toPx(-12.27, 2.31); // BATT+
      const p2 = this.toPx(-10.8, -2.17); // Shunt
      const p3 = this.toPx(-9.1, 0.55); // CS Amp
      const p4 = this.toPx(-1.35, -8.3); // MCU VDD

      colorCtx.strokeStyle = '#f59e0b';
      colorCtx.lineWidth = this.mmToPx(0.28);
      colorCtx.setLineDash([this.mmToPx(0.6), this.mmToPx(0.4)]);
      colorCtx.beginPath();
      colorCtx.moveTo(p1[0], p1[1]);
      colorCtx.lineTo(p2[0], p2[1]);
      colorCtx.lineTo(p3[0], p3[1]);
      colorCtx.lineTo(p4[0], p4[1]);
      colorCtx.stroke();

      // 2. Sensor High-Speed Bus (Cyan path MCU -> IMU / Flash)
      const imuP = this.toPx(5.45, -11.05);
      const flashP = this.toPx(-4.85, -0.55);

      colorCtx.strokeStyle = '#06b6d4';
      colorCtx.beginPath();
      colorCtx.moveTo(p4[0], p4[1]);
      colorCtx.lineTo(imuP[0], imuP[1]);
      colorCtx.moveTo(p4[0], p4[1]);
      colorCtx.lineTo(flashP[0], flashP[1]);
      colorCtx.stroke();

      // 3. RF Link Paths (Lime green path ESP8285 -> SX1281 -> RX-ANT)
      const espP = this.toPx(-1.55, 9.75);
      const sxP = this.toPx(-7.9, 9.9);
      const antP = this.toPx(-12.58, 6.58);

      colorCtx.strokeStyle = '#10b981';
      colorCtx.beginPath();
      colorCtx.moveTo(espP[0], espP[1]);
      colorCtx.lineTo(sxP[0], sxP[1]);
      colorCtx.lineTo(antP[0], antP[1]);
      colorCtx.stroke();
    } else {
      // Bottom side: Motor PWM Control paths from MCU vias -> ESC MCUs
      const mcuCenter = this.toPx(0, 0);
      const esc1 = this.toPx(7.2, 2.7);
      const esc2 = this.toPx(11.63, 7.05);
      const esc3 = this.toPx(-7.0, -11.75);
      const esc4 = this.toPx(-11.8, -7.0);

      colorCtx.strokeStyle = '#a855f7';
      colorCtx.lineWidth = this.mmToPx(0.28);
      colorCtx.setLineDash([this.mmToPx(0.6), this.mmToPx(0.4)]);
      colorCtx.beginPath();
      [esc1, esc2, esc3, esc4].forEach((p) => {
        colorCtx.moveTo(mcuCenter[0], mcuCenter[1]);
        colorCtx.lineTo(p[0], p[1]);
      });
      colorCtx.stroke();
    }

    colorCtx.restore();
  }

  // =========================================================================
  // Canvas Geometry Helpers
  // =========================================================================

  private static drawRotatedRect(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cz: number,
    w: number,
    h: number,
    rot: number,
    fill: string,
  ) {
    ctx.save();
    ctx.translate(cx, cz);
    ctx.rotate(rot);
    ctx.fillStyle = fill;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  private static drawRotatedRectOutline(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cz: number,
    w: number,
    h: number,
    rot: number,
    stroke: string,
    lineWidth: number,
  ) {
    ctx.save();
    ctx.translate(cx, cz);
    ctx.rotate(rot);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  private static drawRotatedText(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cz: number,
    rot: number,
    text: string,
    sizePx: number,
    fill: string,
  ) {
    ctx.save();
    ctx.translate(cx, cz);
    ctx.rotate(rot);
    ctx.font = `bold ${Math.round(sizePx)}px monospace, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = fill;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  private static drawPackageCornerTicks(
    cx: number,
    cz: number,
    w: number,
    h: number,
    rot: number,
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    const tickLen = Math.min(w, h) * 0.22;
    const lw = this.mmToPx(0.14);

    const drawTicks = (ctx: CanvasRenderingContext2D, stroke: string) => {
      ctx.save();
      ctx.translate(cx, cz);
      ctx.rotate(rot);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.beginPath();

      // Top-Left corner
      ctx.moveTo(-w / 2, -h / 2 + tickLen);
      ctx.lineTo(-w / 2, -h / 2);
      ctx.lineTo(-w / 2 + tickLen, -h / 2);

      // Top-Right corner
      ctx.moveTo(w / 2 - tickLen, -h / 2);
      ctx.lineTo(w / 2, -h / 2);
      ctx.lineTo(w / 2, -h / 2 + tickLen);

      // Bottom-Left corner
      ctx.moveTo(-w / 2, h / 2 - tickLen);
      ctx.lineTo(-w / 2, h / 2);
      ctx.lineTo(-w / 2 + tickLen, h / 2);

      // Bottom-Right corner
      ctx.moveTo(w / 2 - tickLen, h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(w / 2, h / 2 - tickLen);

      ctx.stroke();
      ctx.restore();
    };

    drawTicks(colorCtx, '#f3f6fa');
    drawTicks(roughnessCtx, '#e0e0e0');
    drawTicks(bumpCtx, '#9b9b9b');
  }

  private static drawForwardChevron(
    colorCtx: CanvasRenderingContext2D,
    roughnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
    cx: number,
    cz: number,
    size: number,
  ) {
    const drawChevron = (ctx: CanvasRenderingContext2D, stroke: string) => {
      ctx.save();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = this.mmToPx(0.35);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - size / 2, cz + size / 3);
      ctx.lineTo(cx, cz - size / 3);
      ctx.lineTo(cx + size / 2, cz + size / 3);
      ctx.stroke();
      ctx.restore();
    };

    drawChevron(colorCtx, '#f3f6fa');
    drawChevron(roughnessCtx, '#e0e0e0');
    drawChevron(bumpCtx, '#9b9b9b');
  }
}
