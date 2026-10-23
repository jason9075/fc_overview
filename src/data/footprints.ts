/** Explicit visible package-contact geometry in local millimeters, backed by
 * a cited drawing/photo. This does not imply an electrical net or pin function.
 */
export interface Footprint {
  package: 'QFN' | 'DFN' | 'SOIC' | 'SSOP' | 'LGA' | 'WLCSP' | 'SOT' | 'other';
  source: string;
  contacts: readonly {
    xMm: number;
    yMm: number;
    zMm: number;
    sizeMm: readonly [number, number, number]; // width, height, depth
  }[];
}

// No production definitions are enabled yet: the existing reference set does
// not establish the exact contact geometry for the installed IC variants.
