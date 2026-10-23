import type { ComponentId } from './components';

/**
 * Component placements on the Matrix 1S 5IN1 II.
 *
 * Units: millimetres. Board-local frame: X = right, Z = backward, FORWARD = −Z, Y = up (top face).
 * Bottom-face parts use the SAME board-local X/Z frame (as if looking through the board from
 * above). The bottom product photo was mirrored left/right to get there (guideline §5).
 *
 * Almost every IC on this board is aligned to the 26 mm "square" body, which is rotated 45° on
 * screen. Positions were therefore read in a rotated "square frame" (a, b):
 *     a = (x − z) / √2      b = (x + z) / √2
 * and converted with `sq()`. Rotation π/4 aligns a part's local X axis with +a.
 *
 * Numbers are NOT CAD measurements – they are read from rectified official product photos
 * (see tools/extract_assets.py and public/references/SOURCE.md). Every entry has a confidence.
 */

export type Confidence = 'verified' | 'estimated_from_photo' | 'illustrative';

export type PartKind =
  | 'ic' // plastic package with optional photo-textured top
  | 'metal' // crystal / shielded inductor can
  | 'shunt' // current-sense resistor with terminations
  | 'ufl' // U.FL antenna receptacle
  | 'jst' // JST1.25 3-pin motor plug
  | 'sh_vertical' // SH1.0 vertical connector (USB)
  | 'sh_side' // SH1.0 camera connector
  | 'button' // boot button
  | 'ceramic' // small ceramic chip antenna
  | 'thpad'; // plated through-hole pad (ring)

export interface Placement {
  key: string;
  /** Logical selectable group; null = decorative part (selecting it selects the board). */
  id: ComponentId | null;
  side: 'top' | 'bottom' | 'annotation';
  kind: PartKind;
  xMm: number;
  zMm: number;
  rotationRad: number;
  /** [width along local X, depth along local Z, height above the board face] */
  sizeMm: [number, number, number];
  confidence: Confidence;
  /** Marking text used for the procedural (non-photo) texture. */
  marking?: string;
  /** Extra hover text, e.g. ESC channel names. */
  subLabel?: string;
}

const R2 = Math.SQRT2;
const D45 = Math.PI / 4;
export function sq(a: number, b: number): { xMm: number; zMm: number } {
  return { xMm: (a + b) / R2, zMm: (b - a) / R2 };
}
export function toSquare(x: number, z: number): { a: number; b: number } {
  return { a: (x - z) / R2, b: (x + z) / R2 };
}

type P = Omit<Placement, 'xMm' | 'zMm' | 'rotationRad' | 'confidence'> & {
  a: number;
  b: number;
  rot?: number;
  confidence?: Confidence;
};
function make(p: P): Placement {
  const { a, b, rot, confidence, ...rest } = p;
  return { ...rest, ...sq(a, b), rotationRad: rot ?? D45, confidence: confidence ?? 'estimated_from_photo' };
}

const top: P[] = [
  // ---- flight controller core ----
  { key: 'mcu', id: 'mcu', side: 'top', kind: 'ic', a: -1.35, b: -8.3, sizeMm: [7.0, 7.0, 0.55], marking: 'STM32G473\nCEU6' },
  { key: 'imu', id: 'imu', side: 'top', kind: 'ic', a: 5.45, b: -11.05, sizeMm: [2.5, 3.0, 0.91], marking: 'IMU' },
  { key: 'flash', id: 'blackbox', side: 'top', kind: 'ic', a: -4.85, b: -0.55, sizeMm: [5.0, 6.0, 0.75], marking: 'PY25Q128HA' },
  // ---- current sensing (official label: "Current Sensor") ----
  { key: 'cs_amp', id: 'current_sensor', side: 'top', kind: 'ic', a: -9.1, b: 0.55, sizeMm: [1.6, 2.9, 1.0], marking: 'CS' },
  { key: 'cs_shunt', id: 'current_sensor', side: 'top', kind: 'shunt', a: -10.8, b: -2.17, sizeMm: [4.2, 1.9, 0.6], marking: 'R001' },
  // ---- ELRS receiver ----
  { key: 'sx128x', id: 'elrs_rx', side: 'top', kind: 'ic', a: -7.9, b: 9.9, sizeMm: [4.0, 4.0, 0.85], marking: 'SX1281' },
  { key: 'esp8285', id: 'elrs_rx', side: 'top', kind: 'ic', a: -1.55, b: 9.75, sizeMm: [5.0, 5.0, 0.85], marking: 'ESP8285' },
  { key: 'wifi_ant', id: 'elrs_rx', side: 'top', kind: 'ceramic', a: -0.5, b: 5.1, sizeMm: [0.9, 1.8, 0.5], subLabel: 'WiFi-ANT' },
  { key: 'rx_ant', id: 'elrs_rx', side: 'top', kind: 'thpad', a: -12.58, b: 6.58, rot: 0, sizeMm: [0.95, 0.95, 0.05], subLabel: 'RX-ANT 焊點' },
  // ---- VTX antenna receptacle (official label: "VTX-ANT") ----
  { key: 'vtx_ufl', id: 'vtx', side: 'top', kind: 'ufl', a: 4.6, b: -1.45, sizeMm: [2.6, 3.0, 1.25], subLabel: 'VTX-ANT（U.FL）' },
  // ---- power pads (official labels: BATT+, GND) ----
  { key: 'batt_pos', id: 'battery_connector', side: 'top', kind: 'thpad', a: -12.27, b: 2.31, rot: 0, sizeMm: [1.5, 1.5, 0.05], subLabel: 'BATT+' },
  { key: 'batt_gnd', id: 'battery_connector', side: 'top', kind: 'thpad', a: -12.17, b: 4.6, rot: 0, sizeMm: [1.5, 1.5, 0.05], subLabel: 'GND' },
  // ---- ESC power stage, top side ----
  { key: 'fet_t1', id: 'esc', side: 'top', kind: 'ic', a: -6.95, b: -9.5, sizeMm: [3.0, 3.0, 0.75], marking: 'MOS' },
  { key: 'fet_t2', id: 'esc', side: 'top', kind: 'ic', a: -9.45, b: -5.8, sizeMm: [3.0, 3.0, 0.75], marking: 'MOS' },
  { key: 'fet_t3', id: 'esc', side: 'top', kind: 'ic', a: 9.6, b: 7.05, sizeMm: [3.0, 3.0, 0.75], marking: 'MOS' },
  { key: 'fet_t4', id: 'esc', side: 'top', kind: 'ic', a: 5.95, b: 9.55, sizeMm: [3.0, 3.0, 0.75], marking: 'MOS' },
  // ---- decorative / unlabeled in this explorer ----
  { key: 'mm32f003', id: null, side: 'top', kind: 'ic', a: 10.7, b: -8.26, sizeMm: [3.0, 3.0, 0.75], marking: 'MM32F003' },
  { key: 'ic_right', id: null, side: 'top', kind: 'ic', a: 9.97, b: -2.1, sizeMm: [4.0, 4.0, 0.85] },
  { key: 'xtal_top', id: null, side: 'top', kind: 'metal', a: 4.15, b: -6.65, sizeMm: [1.3, 3.1, 0.8] },
  { key: 'xtal_26m', id: null, side: 'top', kind: 'metal', a: 2.1, b: 10.7, sizeMm: [1.5, 2.0, 0.55] },
  { key: 'tcxo', id: null, side: 'top', kind: 'metal', a: -11.0, b: 10.1, sizeMm: [2.0, 2.0, 0.8] },
  { key: 'cam_in', id: null, side: 'top', kind: 'sh_side', a: 2.55, b: 4.5, sizeMm: [2.7, 5.0, 1.6] },
  { key: 'sot_t1', id: null, side: 'top', kind: 'ic', a: -0.85, b: -0.65, sizeMm: [2.0, 1.6, 0.9] },
  { key: 'sot_t2', id: null, side: 'top', kind: 'ic', a: -5.0, b: 4.5, sizeMm: [1.6, 3.0, 0.9] },
];

// Through-hole motor pads seen on the top face (the JST plugs are soldered from the bottom).
const motorPadRows: { a: number[]; b: number[]; label: string }[] = [
  { a: [-8.3, -7.1, -5.9], b: [-12.2, -12.2, -12.2], label: 'ESC3 焊點' },
  { a: [-12.1, -12.1, -12.1], b: [-8.3, -7.15, -5.95], label: 'ESC4 焊點' },
  { a: [12.1, 12.1, 12.1], b: [5.8, 6.95, 8.15], label: 'ESC2 焊點' },
  { a: [5.85, 7.0, 8.25], b: [12.1, 12.1, 12.1], label: 'ESC1 焊點' },
];
motorPadRows.forEach((row, r) =>
  row.a.forEach((a, i) =>
    top.push({
      key: `motor_pad_${r}_${i}`, id: 'motor_connectors', side: 'top', kind: 'thpad', a, b: row.b[i], rot: 0,
      sizeMm: [1.0, 1.0, 0.05], subLabel: row.label,
    }),
  ),
);

const bottom: P[] = [
  { key: 'vtx_chip', id: 'vtx', side: 'bottom', kind: 'ic', a: 6.75, b: -5.2, sizeMm: [5.8, 5.8, 0.85], marking: '5.8G VTX', subLabel: '5.8G VTX Chip' },
  { key: 'osd', id: 'osd', side: 'bottom', kind: 'ic', a: 0.7, b: 0.28, sizeMm: [4.0, 6.8, 0.9], marking: 'AT7456E' },
  // ESC control ICs (marking "BB51") and power MOSFET packages
  { key: 'esc_mcu1', id: 'esc', side: 'bottom', kind: 'ic', a: -2.4, b: -7.4, sizeMm: [3.0, 3.0, 0.6], marking: 'BB51' },
  { key: 'esc_mcu2', id: 'esc', side: 'bottom', kind: 'ic', a: -7.4, b: -0.5, sizeMm: [3.0, 3.0, 0.6], marking: 'BB51' },
  { key: 'esc_mcu3', id: 'esc', side: 'bottom', kind: 'ic', a: 7.2, b: 2.7, sizeMm: [3.0, 3.0, 0.6], marking: 'BB51' },
  { key: 'esc_mcu4', id: 'esc', side: 'bottom', kind: 'ic', a: -0.35, b: 7.9, sizeMm: [3.0, 3.0, 0.6], marking: 'BB51' },
  { key: 'fet_b1', id: 'esc', side: 'bottom', kind: 'ic', a: -7.9, b: -7.9, sizeMm: [3.0, 3.0, 0.75], marking: 'MOS' },
  { key: 'fet_b2', id: 'esc', side: 'bottom', kind: 'ic', a: -7.9, b: -4.25, sizeMm: [3.0, 3.0, 0.75], marking: 'MOS' },
  { key: 'fet_b3', id: 'esc', side: 'bottom', kind: 'ic', a: -11.5, b: -2.27, sizeMm: [3.0, 3.0, 0.75], marking: 'MOS' },
  { key: 'fet_b4', id: 'esc', side: 'bottom', kind: 'ic', a: -1.95, b: -11.55, sizeMm: [3.0, 3.0, 0.75], marking: 'MOS' },
  { key: 'fet_b5', id: 'esc', side: 'bottom', kind: 'ic', a: 11.5, b: 2.15, sizeMm: [3.0, 3.0, 0.75], marking: 'MOS' },
  { key: 'fet_b6', id: 'esc', side: 'bottom', kind: 'ic', a: 4.2, b: 7.7, sizeMm: [3.0, 3.0, 0.75], marking: 'MOS' },
  { key: 'fet_b7', id: 'esc', side: 'bottom', kind: 'ic', a: 7.9, b: 7.7, sizeMm: [3.0, 3.0, 0.75], marking: 'MOS' },
  { key: 'fet_b8', id: 'esc', side: 'bottom', kind: 'ic', a: 1.95, b: 11.8, sizeMm: [3.0, 3.0, 0.75], marking: 'MOS' },
  // JST1.25 motor plugs (official labels ESC1–ESC4). Opening faces away from the board.
  { key: 'jst_esc3', id: 'motor_connectors', side: 'bottom', kind: 'jst', a: -7.0, b: -11.75, sizeMm: [5.95, 3.5, 3.0], subLabel: 'ESC3（左前）' },
  { key: 'jst_esc4', id: 'motor_connectors', side: 'bottom', kind: 'jst', a: -11.8, b: -7.0, rot: D45 + Math.PI / 2, sizeMm: [5.95, 3.5, 3.0], subLabel: 'ESC4（左後）' },
  { key: 'jst_esc2', id: 'motor_connectors', side: 'bottom', kind: 'jst', a: 11.63, b: 7.05, rot: D45 + Math.PI / 2, sizeMm: [5.95, 3.5, 3.0], subLabel: 'ESC2（右前）' },
  { key: 'jst_esc1', id: 'motor_connectors', side: 'bottom', kind: 'jst', a: 6.95, b: 11.8, sizeMm: [5.95, 3.5, 3.0], subLabel: 'ESC1（右後）' },
  // decorative
  { key: 'boot_btn', id: null, side: 'bottom', kind: 'button', a: 2.5, b: -10.55, sizeMm: [2.0, 3.4, 0.6] },
  { key: 'xtal_8m', id: null, side: 'bottom', kind: 'metal', a: 6.05, b: -11.23, sizeMm: [3.1, 2.4, 0.8] },
  { key: 'xtal_27m', id: null, side: 'bottom', kind: 'metal', a: -3.1, b: 2.0, sizeMm: [2.0, 1.4, 0.5] },
  { key: 'inductor', id: null, side: 'bottom', kind: 'metal', a: -6.38, b: 7.4, sizeMm: [3.4, 2.7, 1.2] },
  { key: 'sot_b1', id: null, side: 'bottom', kind: 'ic', a: 1.4, b: -5.8, sizeMm: [2.4, 1.5, 0.9] },
  { key: 'sot_b2', id: null, side: 'bottom', kind: 'ic', a: -6.0, b: 4.15, sizeMm: [3.0, 2.6, 0.8] },
  { key: 'sot_b3', id: null, side: 'bottom', kind: 'ic', a: -5.03, b: 10.6, sizeMm: [2.0, 1.3, 0.8] },
  { key: 'sot_b4', id: null, side: 'bottom', kind: 'ic', a: -5.03, b: 12.3, sizeMm: [2.0, 1.15, 0.8] },
  { key: 'qfn_b5', id: null, side: 'bottom', kind: 'ic', a: -2.4, b: -1.2, sizeMm: [1.25, 1.25, 0.6] },
];

export const placements: Placement[] = [
  ...top.map(make),
  ...bottom.map(make),
  // USB SH1.0-4P is axis-aligned with the board-local X axis (not the 45° square frame).
  {
    key: 'usb', id: 'usb_connector', side: 'bottom', kind: 'sh_vertical', xMm: -0.2, zMm: 13.5, rotationRad: 0,
    sizeMm: [6.0, 4.0, 2.9], confidence: 'estimated_from_photo', subLabel: 'USB（SH1.0-4Pin）',
  },
];

/** The forward annotation lives in board space, just beyond the flat front edge. */
export const forwardAnnotation = { xMm: 0, zMm: -19.5, lengthMm: 5.5, confidence: 'verified' as Confidence };
