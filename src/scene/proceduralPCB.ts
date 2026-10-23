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
 * Physically Plausible Layered Procedural PCB Generator.
 *
 * Reconstructs accurate PBR textures for BETAFPV Matrix 1S 5IN1 II based on
 * verified hardware specifications and official high-resolution photographs.
 *
 * Guardrails:
 * - Priority: Physical accuracy > Visual decoration > Component density.
 * - Solder mask: FR4 core with satin matte black epoxy (dielectric, roughness ~0.71).
 * - Exposed copper/gold: ENIG plating (metallic 0.96, roughness 0.22, bump +0.035 mm).
 * - Package-specific footprints: UFQFPN-48, LGA-14, USON-8, QFN-24, QFN-32, QFN-20,
 *   PDFN3333 DFN-8 MOSFET, SSOP/QFN-28, SOT-23, 2512 Shunt, JST-1.25, SH1.0, U.FL.
 * - Solid annular mounting rings without invented thermal spokes.
 * - Zero unverified ground stitching vias.
 * - Zero invented electrical copper traces.
 * - Verified silkscreen typography only (↑ FRONT, BATT+, GND, RX-ANT, WiFi-ANT, VTX-ANT, ESC1~4, USB, BOOT, CAM, 5V, TX, RX, BZ+, BZ-).
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

    // 2. Initialize background outside PCB boundary
    colorCtx.clearRect(0, 0, W, H);
    roughnessCtx.fillStyle = '#000000';
    roughnessCtx.fillRect(0, 0, W, H);
    metalnessCtx.fillStyle = '#000000';
    metalnessCtx.fillRect(0, 0, W, H);
    bumpCtx.fillStyle = '#808080';
    bumpCtx.fillRect(0, 0, W, H);

    // 3. Layer 1: Draw Solder Mask Base on PCB polygon (FR4 + Matte Black Solder Mask)
    this.drawPCBSubstrate(colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

    // 4. Layer 2: Draw 3 Mounting Holes (Solid Gold Annular Rings, No Invented Spokes)
    this.drawMountingHoles(colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

    // 5. Layer 3: Draw Package-Specific Component Footprints (True ENIG Gold Solder Pads)
    this.drawComponentFootprints(side, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

    // 6. Layer 4: Draw MLCC Passive Footprints (Capacitors & Resistors from passives.json)
    this.drawPassiveFootprints(side, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

    // 7. Layer 5: Draw Verified Silkscreen Markings (↑ FRONT, BATT+, GND, RX-ANT, etc.)
    this.drawSilkscreenMarkings(side, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

    // 8. Optional Illustrative Schematic Overlay (Clearly labeled, not actual PCB traces)
    if (options.showSchematicOverlay) {
      this.drawIllustrativeSchematicOverlay(side, colorCtx);
    }

    // 9. Wrap into Three.js textures
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
  // Layer 1: PCB Substrate & Solder Mask Base (Verified)
  // =========================================================================

  private static drawPCBSubstrate(
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

    // Color: Deep matte black solder mask (#141618)
    drawPath(colorCtx);
    colorCtx.fillStyle = '#141618';
    colorCtx.fill('evenodd');

    // Subtle satin grain pattern
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

    // Roughness: Satin finish (~0.71 -> #b4b4b4)
    drawPath(roughnessCtx);
    roughnessCtx.fillStyle = '#b4b4b4';
    roughnessCtx.fill('evenodd');

    // Metalness: Non-metal dielectric (0.0 -> #000000)
    drawPath(metalnessCtx);
    metalnessCtx.fillStyle = '#000000';
    metalnessCtx.fill('evenodd');

    // Bump: Neutral base plane (128 -> #808080)
    drawPath(bumpCtx);
    bumpCtx.fillStyle = '#808080';
    bumpCtx.fill('evenodd');
  }

  // =========================================================================
  // Layer 2: 3 Mounting Holes (Solid Gold Annular Rings, No Spokes - Verified)
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
      const innerR = this.mmToPx(h.r + 0.04);
      const outerR = this.mmToPx(h.r + 0.85);

      // Solid Gold Annular Plated Ring (Authentic ENIG plating, no invented spokes)
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
      drawRing(bumpCtx, '#b4b4b4'); // +0.035 mm copper relief

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
  // Layer 3: Package-Specific Footprint Definitions
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

      switch (p.key) {
        // --- Top Face Packages ---
        case 'mcu':
          // STM32G473CEU6: UFQFPN-48 (7 x 7 mm, 0.5 mm pitch, 12 pins/side, 5.1x5.1mm thermal pad)
          this.drawUFQFPN48(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'imu':
          // ICM42688P: LGA-14 (2.5 x 3.0 mm, 14 pads along perimeter)
          this.drawLGA14(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'flash':
          // PY25Q128HA: USON-8 / SOP-8 (5.0 x 6.0 mm, 4 pads on top, 4 pads on bottom, pitch 1.27 mm)
          this.drawUSON8(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'cs_amp':
          // Current Sense Amp: SOT23-5 (1.6 x 2.9 mm, 3 pins on one side, 2 on opposite)
          this.drawSOT23_5(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'cs_shunt':
          // 2512 Shunt Sense Resistor R001 (4.2 x 1.9 mm, 2 heavy terminal pads)
          this.drawShunt2512(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'sx128x':
        case 'ic_right':
          // SX1281 / RF QFN-24 (4.0 x 4.0 mm, 6 pins/side, pitch 0.5 mm, center thermal pad)
          this.drawQFN24(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'esp8285':
          // ESP8285 MCU: QFN-32 (5.0 x 5.0 mm, 8 pins/side, pitch 0.5 mm, center thermal pad)
          this.drawQFN32(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'mm32f003':
          // MM32F003: QFN-20 (3.0 x 3.0 mm, 5 pins/side, pitch 0.5 mm, center thermal pad)
          this.drawQFN20(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'fet_t1':
        case 'fet_t2':
        case 'fet_t3':
        case 'fet_t4':
        case 'fet_b1':
        case 'fet_b2':
        case 'fet_b3':
        case 'fet_b4':
        case 'fet_b5':
        case 'fet_b6':
        case 'fet_b7':
        case 'fet_b8':
          // ESC Power MOSFETs: PDFN3333 DFN-8 (3.0 x 3.0 mm: 4 leads on side 1, large drain tab on side 2)
          this.drawPDFN3333_MOSFET(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        // --- Bottom Face Packages ---
        case 'esc_mcu1':
        case 'esc_mcu2':
        case 'esc_mcu3':
        case 'esc_mcu4':
          // BB51 ESC Controller ICs: QFN-20 (3.0 x 3.0 mm, 5 pins/side, pitch 0.5 mm)
          this.drawQFN20(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'osd':
          // AT7456E OSD: QFN-28 / SSOP-28 (4.0 x 6.8 mm, 14 leads on each long side, pitch 0.65 mm)
          this.drawQFN28_OSD(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'vtx_chip':
          // 5.8G VTX Chip: QFN-32 (5.8 x 5.8 mm, 8 pins/side, pitch 0.5 mm, center thermal pad)
          this.drawQFN32_VTX(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'inductor':
          // Power Inductor (3.4 x 2.7 mm, 2 heavy terminal pads)
          this.drawInductor(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        // --- Connectors & Passives ---
        case 'jst_esc1':
        case 'jst_esc2':
        case 'jst_esc3':
        case 'jst_esc4':
          this.drawJST125(p, cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'usb':
          this.drawSH10Vertical(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'cam_in':
          this.drawSH10Side(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'vtx_ufl':
          this.drawUFL(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'boot_btn':
          this.drawButton(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'wifi_ant':
          this.drawCeramicAntenna(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'xtal_top':
        case 'xtal_26m':
        case 'tcxo':
        case 'xtal_8m':
        case 'xtal_27m':
          this.drawCrystal(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        case 'sot_t1':
        case 'sot_t2':
        case 'sot_b1':
        case 'sot_b2':
        case 'sot_b3':
        case 'sot_b4':
          this.drawSOT23(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          break;

        default:
          if (p.kind === 'thpad') {
            this.drawThroughHoleSolderPad(p, cx, cz, wPx, dPx, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
          }
          break;
      }
    });
  }

  // --- Specific Footprint Implementations ---

  /**
   * STM32G473CEU6: UFQFPN-48 (7.0 x 7.0 mm).
   * 12 leads per side (pitch 0.5 mm), 5.1 x 5.1 mm center thermal pad.
   */
  private static drawUFQFPN48(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    // 1. Center Thermal Ground Pad
    const thermalPadSize = this.mmToPx(5.1);
    this.drawGoldPad(cx, cz, thermalPadSize, thermalPadSize, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

    // 2. 48 Perimeter Leads (12 on each side, pitch 0.5 mm)
    const pitch = this.mmToPx(0.5);
    const leadLen = this.mmToPx(0.7);
    const leadWid = this.mmToPx(0.24);
    const dist = wPx / 2 + leadLen / 2 - this.mmToPx(0.15);

    this.drawPerimeterPads(cx, cz, 12, 12, pitch, pitch, dist, dist, leadLen, leadWid, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    this.drawPackageCornerTicks(cx, cz, wPx * 1.08, dPx * 1.08, rot, colorCtx, roughnessCtx, bumpCtx);
    this.drawPin1Dot(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, bumpCtx);
  }

  /**
   * IMU (ICM42688P): LGA-14 (2.5 x 3.0 mm).
   * 4 leads on each long edge, 3 leads on each short edge.
   */
  private static drawLGA14(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    const pitch = this.mmToPx(0.5);
    const leadLen = this.mmToPx(0.45);
    const leadWid = this.mmToPx(0.25);
    const distX = wPx / 2;
    const distZ = dPx / 2;

    this.drawPerimeterPads(cx, cz, 3, 4, pitch, pitch, distX, distZ, leadLen, leadWid, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    this.drawPackageCornerTicks(cx, cz, wPx * 1.15, dPx * 1.15, rot, colorCtx, roughnessCtx, bumpCtx);
    this.drawPin1Dot(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, bumpCtx);
  }

  /**
   * Flash Memory (PY25Q128HA): USON-8 / SOP-8 (5.0 x 6.0 mm).
   * 4 leads on North edge, 4 leads on South edge (pitch 1.27 mm). NO leads on East/West.
   */
  private static drawUSON8(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    // Center Thermal Pad
    this.drawGoldPad(cx, cz, this.mmToPx(3.4), this.mmToPx(4.2), rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

    const pitch = this.mmToPx(1.27);
    const leadLen = this.mmToPx(0.85);
    const leadWid = this.mmToPx(0.45);
    const distZ = dPx / 2 + leadLen / 2 - this.mmToPx(0.15);
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    [-1.5, -0.5, 0.5, 1.5].forEach((idx) => {
      const lx = idx * pitch;
      // North pad
      const pxN = cx + lx * cos - (-distZ) * sin;
      const pzN = cz + lx * sin + (-distZ) * cos;
      this.drawGoldPad(pxN, pzN, leadWid, leadLen, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

      // South pad
      const pxS = cx + lx * cos - (distZ) * sin;
      const pzS = cz + lx * sin + (distZ) * cos;
      this.drawGoldPad(pxS, pzS, leadWid, leadLen, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    });

    this.drawPackageCornerTicks(cx, cz, wPx * 1.08, dPx * 1.08, rot, colorCtx, roughnessCtx, bumpCtx);
    this.drawPin1Dot(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, bumpCtx);
  }

  /**
   * QFN-24 (SX1281 / RF, 4.0 x 4.0 mm). 6 pins/side, pitch 0.5 mm.
   */
  private static drawQFN24(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    this.drawGoldPad(cx, cz, this.mmToPx(2.5), this.mmToPx(2.5), rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    const pitch = this.mmToPx(0.5);
    const leadLen = this.mmToPx(0.65);
    const leadWid = this.mmToPx(0.24);
    const dist = wPx / 2 + leadLen / 2 - this.mmToPx(0.12);

    this.drawPerimeterPads(cx, cz, 6, 6, pitch, pitch, dist, dist, leadLen, leadWid, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    this.drawPackageCornerTicks(cx, cz, wPx * 1.1, dPx * 1.1, rot, colorCtx, roughnessCtx, bumpCtx);
    this.drawPin1Dot(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, bumpCtx);
  }

  /**
   * QFN-32 (ESP8285 MCU, 5.0 x 5.0 mm). 8 pins/side, pitch 0.5 mm.
   */
  private static drawQFN32(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    this.drawGoldPad(cx, cz, this.mmToPx(3.4), this.mmToPx(3.4), rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    const pitch = this.mmToPx(0.5);
    const leadLen = this.mmToPx(0.65);
    const leadWid = this.mmToPx(0.24);
    const dist = wPx / 2 + leadLen / 2 - this.mmToPx(0.12);

    this.drawPerimeterPads(cx, cz, 8, 8, pitch, pitch, dist, dist, leadLen, leadWid, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    this.drawPackageCornerTicks(cx, cz, wPx * 1.08, dPx * 1.08, rot, colorCtx, roughnessCtx, bumpCtx);
    this.drawPin1Dot(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, bumpCtx);
  }

  /**
   * QFN-20 (BB51 ESC MCUs, 3.0 x 3.0 mm). 5 pins/side, pitch 0.5 mm.
   */
  private static drawQFN20(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    this.drawGoldPad(cx, cz, this.mmToPx(1.7), this.mmToPx(1.7), rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    const pitch = this.mmToPx(0.5);
    const leadLen = this.mmToPx(0.55);
    const leadWid = this.mmToPx(0.22);
    const dist = wPx / 2 + leadLen / 2 - this.mmToPx(0.12);

    this.drawPerimeterPads(cx, cz, 5, 5, pitch, pitch, dist, dist, leadLen, leadWid, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    this.drawPackageCornerTicks(cx, cz, wPx * 1.12, dPx * 1.12, rot, colorCtx, roughnessCtx, bumpCtx);
    this.drawPin1Dot(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, bumpCtx);
  }

  /**
   * ESC Power MOSFET (PDFN3333 / DFN-8, 3.0 x 3.0 mm).
   * Edge 1 (Pins 1-4: Source & Gate): 4 individual lead pads (pitch 0.65 mm).
   * Edge 2 (Pins 5-8: Drain): Large continuous thermal drain copper pad.
   */
  private static drawPDFN3333_MOSFET(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    // 1. Large Drain Thermal Tab (occupies 60% of package depth)
    const drainTabW = this.mmToPx(2.5);
    const drainTabD = this.mmToPx(1.7);
    const drainOffZ = this.mmToPx(0.45);
    const dx = cx - drainOffZ * sin;
    const dz = cz + drainOffZ * cos;
    this.drawGoldPad(dx, dz, drainTabW, drainTabD, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

    // 2. 4 Source / Gate leads along opposite edge (pitch 0.65 mm)
    const pitch = this.mmToPx(0.65);
    const leadW = this.mmToPx(0.32);
    const leadL = this.mmToPx(0.65);
    const leadOffZ = -this.mmToPx(1.25);

    [-1.5, -0.5, 0.5, 1.5].forEach((idx) => {
      const lx = idx * pitch;
      const px = cx + lx * cos - leadOffZ * sin;
      const pz = cz + lx * sin + leadOffZ * cos;
      this.drawGoldPad(px, pz, leadW, leadL, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    });

    this.drawPackageCornerTicks(cx, cz, wPx * 1.12, dPx * 1.12, rot, colorCtx, roughnessCtx, bumpCtx);
  }

  /**
   * AT7456E OSD: QFN-28 (4.0 x 6.8 mm, 7 pins on short sides, 7 pins on long sides, center ground pad).
   */
  private static drawQFN28_OSD(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    // Center ground pad
    this.drawGoldPad(cx, cz, this.mmToPx(2.6), this.mmToPx(5.0), rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    const pitchX = this.mmToPx(0.5);
    const pitchZ = this.mmToPx(0.65);
    const leadLen = this.mmToPx(0.65);
    const leadWid = this.mmToPx(0.24);

    this.drawPerimeterPads(cx, cz, 5, 9, pitchX, pitchZ, wPx / 2 + leadLen / 2 - this.mmToPx(0.12), dPx / 2 + leadLen / 2 - this.mmToPx(0.12), leadLen, leadWid, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    this.drawPackageCornerTicks(cx, cz, wPx * 1.08, dPx * 1.08, rot, colorCtx, roughnessCtx, bumpCtx);
    this.drawPin1Dot(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, bumpCtx);
  }

  /**
   * 5.8G VTX Chip (QFN-32, 5.8 x 5.8 mm). 8 pins/side, pitch 0.5 mm, center thermal pad.
   */
  private static drawQFN32_VTX(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    this.drawGoldPad(cx, cz, this.mmToPx(3.8), this.mmToPx(3.8), rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    const pitch = this.mmToPx(0.5);
    const leadLen = this.mmToPx(0.7);
    const leadWid = this.mmToPx(0.24);
    const dist = wPx / 2 + leadLen / 2 - this.mmToPx(0.12);

    this.drawPerimeterPads(cx, cz, 8, 8, pitch, pitch, dist, dist, leadLen, leadWid, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    this.drawPackageCornerTicks(cx, cz, wPx * 1.08, dPx * 1.08, rot, colorCtx, roughnessCtx, bumpCtx);
    this.drawPin1Dot(cx, cz, wPx, dPx, rot, colorCtx, roughnessCtx, bumpCtx);
  }

  /**
   * SOT23-5: Current Sense Amp (3 pins on one side, 2 on opposite side).
   */
  private static drawSOT23_5(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    const pitch = this.mmToPx(0.95);
    const leadW = this.mmToPx(0.42);
    const leadL = this.mmToPx(0.65);
    const distZ = dPx / 2 + leadL / 2 - this.mmToPx(0.1);
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    // Side 1: 3 pins
    [-1, 0, 1].forEach((idx) => {
      const lx = idx * pitch;
      const px = cx + lx * cos - (-distZ) * sin;
      const pz = cz + lx * sin + (-distZ) * cos;
      this.drawGoldPad(px, pz, leadW, leadL, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    });

    // Side 2: 2 pins
    [-0.5, 0.5].forEach((idx) => {
      const lx = idx * pitch;
      const px = cx + lx * cos - distZ * sin;
      const pz = cz + lx * sin + distZ * cos;
      this.drawGoldPad(px, pz, leadW, leadL, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    });

    this.drawPackageCornerTicks(cx, cz, wPx * 1.2, dPx * 1.15, rot, colorCtx, roughnessCtx, bumpCtx);
  }

  /**
   * SOT-23 / SOT-323: 3-lead transistor package (2 pins on side 1, 1 pin on side 2).
   */
  private static drawSOT23(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    const pitch = this.mmToPx(0.95);
    const leadW = this.mmToPx(0.38);
    const leadL = this.mmToPx(0.55);
    const distZ = dPx / 2 + leadL / 2 - this.mmToPx(0.1);
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    // 2 pins on side 1
    [-0.5, 0.5].forEach((idx) => {
      const lx = idx * pitch;
      const px = cx + lx * cos - (-distZ) * sin;
      const pz = cz + lx * sin + (-distZ) * cos;
      this.drawGoldPad(px, pz, leadW, leadL, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    });

    // 1 pin on side 2 (center)
    const px = cx - distZ * -sin;
    const pz = cz + distZ * cos;
    this.drawGoldPad(px, pz, leadW, leadL, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

    this.drawPackageCornerTicks(cx, cz, wPx * 1.15, dPx * 1.15, rot, colorCtx, roughnessCtx, bumpCtx);
  }

  /**
   * 2512 Shunt Resistor (R001, 4.2 x 1.9 mm): 2 large high-current terminal solder pads.
   */
  private static drawShunt2512(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    const padW = wPx * 0.36;
    const padD = dPx * 1.15;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    [-1, 1].forEach((sgn) => {
      const lx = sgn * (wPx / 2 - padW / 2 + this.mmToPx(0.08));
      const px = cx + lx * cos;
      const pz = cz + lx * sin;
      this.drawGoldPad(px, pz, padW, padD, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    });

    this.drawPackageCornerTicks(cx, cz, wPx * 1.15, dPx * 1.2, rot, colorCtx, roughnessCtx, bumpCtx);
    this.drawRotatedText(colorCtx, cx, cz + dPx / 2 + this.mmToPx(0.8), rot, 'R001', this.mmToPx(0.6), '#f3f6fa');
  }

  /**
   * Power Inductor (3.4 x 2.7 mm): 2 heavy terminal pads.
   */
  private static drawInductor(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    const padW = this.mmToPx(1.0);
    const padD = this.mmToPx(2.5);
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    [-1, 1].forEach((sgn) => {
      const lx = sgn * (wPx / 2 - padW / 2);
      const px = cx + lx * cos;
      const pz = cz + lx * sin;
      this.drawGoldPad(px, pz, padW, padD, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    });
    this.drawPackageCornerTicks(cx, cz, wPx * 1.1, dPx * 1.1, rot, colorCtx, roughnessCtx, bumpCtx);
  }

  /**
   * Crystal Oscillator: 4 corner SMT pads.
   */
  private static drawCrystal(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
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
        this.drawGoldPad(px, pz, padW, padD, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
      });
    });
    this.drawPackageCornerTicks(cx, cz, wPx * 1.1, dPx * 1.1, rot, colorCtx, roughnessCtx, bumpCtx);
  }

  /**
   * JST1.25 Motor Connector: 3 through-hole annular pads (pitch 1.25 mm) + 2 SMD anchor tabs.
   */
  private static drawJST125(
    p: Placement, cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    // 3 Through-hole annular gold pads (pitch 1.25 mm)
    const pitchPx = this.mmToPx(1.25);
    const outerR = this.mmToPx(0.55);
    const drillR = this.mmToPx(0.32);

    [-1, 0, 1].forEach((i) => {
      const lx = i * pitchPx;
      const px = cx + lx * cos;
      const pz = cz + lx * sin;

      // Annular gold pad
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

      // Drill hole cavity
      colorCtx.beginPath();
      colorCtx.arc(px, pz, drillR, 0, Math.PI * 2);
      colorCtx.fillStyle = '#0a0b0d';
      colorCtx.fill();

      roughnessCtx.beginPath();
      roughnessCtx.arc(px, pz, drillR, 0, Math.PI * 2);
      roughnessCtx.fillStyle = '#f0f0f0';
      roughnessCtx.fill();

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
      this.drawGoldPad(px, pz, tabW, tabD, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    });

    // Connector housing outline
    this.drawRotatedRectOutline(colorCtx, cx, cz, wPx * 1.05, dPx * 1.05, rot, '#f3f6fa', this.mmToPx(0.12));

    // Verified channel label: ESC1..4
    const channelName = p.subLabel?.split('（')[0] || (p.key.includes('esc') ? p.key.replace('jst_', '').toUpperCase() : '');
    if (channelName) {
      const lzOff = dPx / 2 + this.mmToPx(1.0);
      const tx = cx - lzOff * sin;
      const tz = cz + lzOff * cos;
      this.drawRotatedText(colorCtx, tx, tz, rot, channelName, this.mmToPx(0.75), '#f3f6fa');
      this.drawRotatedText(roughnessCtx, tx, tz, rot, channelName, this.mmToPx(0.75), '#e0e0e0');
    }
  }

  /**
   * USB SH1.0-4Pin Connector: 4 SMD lead pads (pitch 1.0 mm) + 2 side anchor tabs.
   */
  private static drawSH10Vertical(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const pitch = this.mmToPx(1.0);
    const leadW = this.mmToPx(0.45);
    const leadLen = this.mmToPx(1.1);

    [-1.5, -0.5, 0.5, 1.5].forEach((idx) => {
      const lx = idx * pitch;
      const lz = -dPx / 2 + leadLen / 2;
      const px = cx + lx * cos - lz * sin;
      const pz = cz + lx * sin + lz * cos;
      this.drawGoldPad(px, pz, leadW, leadLen, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    });

    // 2 Side anchor tabs
    const anchorW = this.mmToPx(1.4);
    const anchorD = this.mmToPx(2.2);
    [-1, 1].forEach((sgn) => {
      const lx = sgn * (wPx / 2 + anchorW / 2);
      const px = cx + lx * cos;
      const pz = cz + lx * sin;
      this.drawGoldPad(px, pz, anchorW, anchorD, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    });

    this.drawRotatedRectOutline(colorCtx, cx, cz, wPx * 1.08, dPx * 1.1, rot, '#f3f6fa', this.mmToPx(0.12));
    this.drawRotatedText(colorCtx, cx, cz - dPx / 2 - this.mmToPx(0.9), rot, 'USB', this.mmToPx(0.75), '#f3f6fa');
    this.drawRotatedText(roughnessCtx, cx, cz - dPx / 2 - this.mmToPx(0.9), rot, 'USB', this.mmToPx(0.75), '#e0e0e0');
  }

  /**
   * Camera SH1.0 Side Connector: 4 SMD leads (pitch 1.0 mm) + 2 side anchor tabs.
   */
  private static drawSH10Side(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    this.drawRotatedRectOutline(colorCtx, cx, cz, wPx * 1.08, dPx * 1.1, rot, '#f3f6fa', this.mmToPx(0.12));
    this.drawRotatedText(colorCtx, cx, cz - dPx / 2 - this.mmToPx(0.8), rot, 'CAM', this.mmToPx(0.65), '#f3f6fa');

    const pitch = this.mmToPx(1.0);
    const leadW = this.mmToPx(0.4);
    const leadLen = this.mmToPx(1.0);
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    [-1.5, -0.5, 0.5, 1.5].forEach((idx) => {
      const lx = idx * pitch;
      const px = cx + lx * cos;
      const pz = cz + lx * sin;
      this.drawGoldPad(px, pz, leadW, leadLen, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    });
  }

  /**
   * U.FL VTX Antenna Socket: Center RF signal pad + 2 side ground shield pads.
   */
  private static drawUFL(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    // Center RF signal pad
    this.drawGoldPad(cx, cz, this.mmToPx(0.8), this.mmToPx(0.9), rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

    // Ground shield pads
    const gndW = this.mmToPx(1.1);
    const gndD = this.mmToPx(2.2);
    [-1, 1].forEach((sgn) => {
      const lx = sgn * (wPx / 2 - gndW / 4);
      const px = cx + lx * cos;
      const pz = cz + lx * sin;
      this.drawGoldPad(px, pz, gndW, gndD, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    });

    this.drawRotatedText(colorCtx, cx, cz + dPx / 2 + this.mmToPx(0.9), rot, 'VTX-ANT', this.mmToPx(0.65), '#f3f6fa');
    this.drawRotatedText(roughnessCtx, cx, cz + dPx / 2 + this.mmToPx(0.9), rot, 'VTX-ANT', this.mmToPx(0.65), '#e0e0e0');
  }

  /**
   * Boot Button: 4 corner SMT solder pads.
   */
  private static drawButton(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    const padW = this.mmToPx(0.7);
    const padD = this.mmToPx(0.8);
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    [-1, 1].forEach((sx) => {
      [-1, 1].forEach((sz) => {
        const lx = sx * (wPx / 2);
        const lz = sz * (dPx / 2);
        const px = cx + lx * cos - lz * sin;
        const pz = cz + lx * sin + lz * cos;
        this.drawGoldPad(px, pz, padW, padD, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
      });
    });

    this.drawRotatedRectOutline(colorCtx, cx, cz, wPx * 0.9, dPx * 0.9, rot, '#f3f6fa', this.mmToPx(0.1));
    this.drawRotatedText(colorCtx, cx, cz - dPx / 2 - this.mmToPx(0.8), rot, 'BOOT', this.mmToPx(0.65), '#f3f6fa');
  }

  /**
   * Ceramic WiFi Antenna (0.9 x 1.8 mm): 2 terminal solder pads.
   */
  private static drawCeramicAntenna(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    const padW = wPx * 1.1;
    const padD = dPx * 0.35;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    [-1, 1].forEach((sgn) => {
      const lz = sgn * (dPx / 2 - padD / 2);
      const px = cx - lz * sin;
      const pz = cz + lz * cos;
      this.drawGoldPad(px, pz, padW, padD, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    });

    this.drawRotatedText(colorCtx, cx, cz + dPx / 2 + this.mmToPx(0.7), rot, 'WiFi-ANT', this.mmToPx(0.55), '#f3f6fa');
  }

  /**
   * Through-hole and surface solder pads (Battery, RX-ANT, Motor pad triplets).
   */
  private static drawThroughHoleSolderPad(
    p: Placement, cx: number, cz: number, wPx: number, dPx: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    if (p.key === 'batt_pos' || p.key === 'batt_gnd') {
      // Heavy high-current battery pad
      const padW = this.mmToPx(2.4);
      const padD = this.mmToPx(1.6);
      this.drawGoldPad(cx, cz, padW, padD, 0, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);

      const label = p.key === 'batt_pos' ? 'BATT+' : 'GND';
      const sym = p.key === 'batt_pos' ? '+' : '—';
      this.drawRotatedText(colorCtx, cx, cz - padD / 2 - this.mmToPx(0.8), 0, label, this.mmToPx(0.7), '#f3f6fa');
      this.drawRotatedText(colorCtx, cx, cz, 0, sym, this.mmToPx(1.2), '#141618');
    } else if (p.key === 'rx_ant') {
      // RX antenna pad with solder hole
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

      colorCtx.beginPath();
      colorCtx.arc(cx, cz, holeR, 0, Math.PI * 2);
      colorCtx.fillStyle = '#0a0b0d';
      colorCtx.fill();

      this.drawRotatedText(colorCtx, cx, cz - outerR - this.mmToPx(0.7), 0, 'RX-ANT', this.mmToPx(0.65), '#f3f6fa');
    } else {
      // Motor pad triplet (ESC1..4 through-holes seen on top face)
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
  // Layer 4: MLCC Passive Footprints (Capacitors & Resistors from passives.json)
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
        this.drawGoldPad(px, pz, padLen, padWid, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
      });
    });
  }

  // =========================================================================
  // Layer 5: Verified Silkscreen Markings (Verified from Product Photographs)
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
      // 1. Prominent Forward Arrow Chevron & "↑ FRONT"
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

      // 3. Verified Camera / UART Test Pad Labels near right ear
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
      // BOTTOM Face Silkscreen (Verified from bottom photos)
      // 1. "▲ FRONT" indicator
      const [bfx, bfz] = this.toPx(0, -17.0);
      this.drawRotatedText(colorCtx, bfx, bfz, 0, '▲ FRONT', this.mmToPx(0.9), textColor);
      this.drawRotatedText(roughnessCtx, bfx, bfz, 0, '▲ FRONT', this.mmToPx(0.9), textRoughness);

      // 2. BETAFPV Logo Text on left wing
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
  // Layer 6: Illustrative Educational Schematic Overlay (Optional)
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
      // 1. Power Distribution Rail (Amber dashed path from Battery -> Current Sensor -> MCU)
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

  private static drawGoldPad(
    cx: number, cz: number, w: number, h: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    this.drawRotatedRect(colorCtx, cx, cz, w, h, rot, '#dfb136');
    this.drawRotatedRect(roughnessCtx, cx, cz, w, h, rot, '#373737'); // 0.22 metallic
    this.drawRotatedRect(metalnessCtx, cx, cz, w, h, rot, '#f5f5f5'); // 0.96 metal
    this.drawRotatedRect(bumpCtx, cx, cz, w, h, rot, '#b4b4b4'); // +0.035 mm copper relief
  }

  private static drawPerimeterPads(
    cx: number, cz: number,
    countX: number, countZ: number,
    pitchX: number, pitchZ: number,
    distX: number, distZ: number,
    leadLen: number, leadWid: number,
    rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    metalnessCtx: CanvasRenderingContext2D, bumpCtx: CanvasRenderingContext2D,
  ) {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    // North & South edges
    for (let i = 0; i < countX; i++) {
      const lx = (i - (countX - 1) / 2) * pitchX;
      // North
      const pxN = cx + lx * cos - (-distZ) * sin;
      const pzN = cz + lx * sin + (-distZ) * cos;
      this.drawGoldPad(pxN, pzN, leadWid, leadLen, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
      // South
      const pxS = cx + lx * cos - distZ * sin;
      const pzS = cz + lx * sin + distZ * cos;
      this.drawGoldPad(pxS, pzS, leadWid, leadLen, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    }

    // West & East edges
    for (let i = 0; i < countZ; i++) {
      const lz = (i - (countZ - 1) / 2) * pitchZ;
      // West
      const pxW = cx + (-distX) * cos - lz * sin;
      const pzW = cz + (-distX) * sin + lz * cos;
      this.drawGoldPad(pxW, pzW, leadLen, leadWid, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
      // East
      const pxE = cx + distX * cos - lz * sin;
      const pzE = cz + distX * sin + lz * cos;
      this.drawGoldPad(pxE, pzE, leadLen, leadWid, rot, colorCtx, roughnessCtx, metalnessCtx, bumpCtx);
    }
  }

  private static drawPin1Dot(
    cx: number, cz: number, wPx: number, dPx: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
  ) {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const p1DistX = -wPx / 2 - this.mmToPx(0.45);
    const p1DistZ = -dPx / 2 - this.mmToPx(0.45);
    const p1x = cx + p1DistX * cos - p1DistZ * sin;
    const p1z = cz + p1DistX * sin + p1DistZ * cos;
    const dotR = this.mmToPx(0.18);

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

  private static drawRotatedRect(
    ctx: CanvasRenderingContext2D,
    cx: number, cz: number, w: number, h: number, rot: number,
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
    cx: number, cz: number, w: number, h: number, rot: number,
    stroke: string, lineWidth: number,
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
    cx: number, cz: number, rot: number,
    text: string, sizePx: number, fill: string,
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
    cx: number, cz: number, w: number, h: number, rot: number,
    colorCtx: CanvasRenderingContext2D, roughnessCtx: CanvasRenderingContext2D,
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
    cx: number, cz: number, size: number,
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
