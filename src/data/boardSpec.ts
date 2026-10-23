/**
 * Verified specification of the BETAFPV Matrix 1S Brushless Flight Controller (5IN1 II),
 * transcribed from the official product listing (guideline §2).
 * Do NOT add values here that are not on the official page.
 */
export const PRODUCT_URL = 'https://betafpv.com/products/matrix-1s-5in1-ii-brushless-flight-controller';

export interface SpecRow {
  label: string;
  value: string;
}

export const boardSpec: SpecRow[] = [
  { label: '主控 MCU', value: 'STM32G473CEU6' },
  { label: 'IMU（陀螺儀）', value: 'ICM42688P / ICM42622 / BMI270 / LSM6DSK320X（依生產批次）' },
  { label: 'OSD', value: 'AT7456E' },
  { label: 'Blackbox', value: '板載 16 MB Flash' },
  { label: '感測', value: '電壓、電流' },
  { label: 'ESC', value: '1S，12 A 持續／18 A 峰值，四路' },
  { label: '接收機', value: '內建 Serial ELRS 2.4 GHz' },
  { label: '圖傳', value: '內建類比 5.8 GHz VTX，最高 400 mW' },
  { label: 'BEC', value: '5 V，最高 3 A' },
  { label: '馬達接頭', value: 'JST1.25（solder-free 版本）' },
  { label: 'USB 介面', value: 'SH1.0-4Pin（非 USB-C 母座）' },
  { label: '電池接頭', value: 'BT2.0' },
  { label: '板厚', value: '1.0 mm' },
  { label: '安裝孔', value: '三孔，官方標示 26 × 26 mm 安裝規格' },
  { label: '重量', value: '約 4.1 ± 0.1 g（solder-free）／3.76 g（需焊接版）' },
];

/** Physical constants used by the 3D model. Only thickness is an official value. */
export const BOARD = {
  thicknessMm: 1.0, // official
  /** Hole centres sit on three corners of a 26 mm square rotated 45° (estimated, see README). */
  holeOffsetMm: 26 / Math.SQRT2,
  /** Texture extent: textures cover x,z ∈ [-EXTENT, EXTENT] mm (see tools/extract_assets.py). */
  textureExtentMm: 21,
};
