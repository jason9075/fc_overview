# Reference Sources & Validation Notes

## 1. Official Target
- **Product**: BETAFPV Matrix 1S Brushless Flight Controller (5IN1 II)
- **Target URL**: https://betafpv.com/products/matrix-1s-5in1-ii-brushless-flight-controller
- **Confirmation**: This is explicitly the **5IN1 II** model, characterized by:
  - **Three mounting holes** arranged at 26 × 26 mm mounting standard (two lateral ears and one rear tab).
  - Four JST1.25 motor connectors on the bottom side for the solder-free version.
  - Board thickness: **1.0 mm**.
  - Weight: ~4.1 ± 0.1 g (solder-free), 3.76 g (unsoldered).
  - Integrated 1S 12A continuous / 18A peak ESC.
  - Integrated Serial ELRS 2.4G RX.
  - Integrated 5.8G 400mW analog VTX.
  - Integrated AT7456E OSD.
  - Onboard 16 MB Flash Blackbox (PY25Q128HA).
  - Main MCU: STM32G473CEU6.
  - Gyro / IMU alternatives: ICM42688P / ICM42622 / BMI270 / LSM6DSK320X (depending on production batch).
  - **Barometer**: NOT present in official specification.
  - **MicroSD slot**: NOT present; onboard 16 MB Flash is used instead.

## 2. Downloaded Official Assets
The following files were retrieved from BETAFPV CDN:
1. `top_front_labeled.jpg`
   - URL: `https://cdn.shopify.com/s/files/1/1778/6615/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_top_front_gyro_update_600x600.jpg?v=1777532692`
   - Used for verifying top-side component identities and printed forward arrow orientation.
2. `bottom_front_labeled.jpg`
   - URL: `https://cdn.shopify.com/s/files/1/1778/6615/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_bottom_front_600x600.jpg?v=1769053662`
   - Used for verifying bottom-side component identities (VTX chip, AT7456E OSD, ESC1-4 channels, USB connector).
3. `solderfree_front.jpg`
   - URL: `https://betafpv.com/cdn/shop/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_soldered_front.jpg?v=1769154277`
   - 1600x1600 unannotated photograph, used for top-side texture rectification and package verification.
4. `solderfree_back.jpg`
   - URL: `https://betafpv.com/cdn/shop/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_soldered_back.jpg?v=1769154294`
   - 1600x1600 unannotated photograph, used for bottom-side texture rectification and connector placements.
5. `unsoldered_front.jpg` & `unsoldered_back.jpg`
   - URLs: `https://betafpv.com/cdn/shop/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_unsoldered_front.jpg?v=1769154868`
   - Used for cross-validating the PCB silhouette and bare pad layouts without connector occlusion.

## 3. Coordinate System & Calibration
- Units: **1 unit = 1 mm**.
- Forward orientation: **PCB local -Z**.
- Top surface: **Y = +0.5 mm**, Bottom surface: **Y = -0.5 mm**.
- Affine rectification assumes three mounting holes sit on corners of a 26 x 26 mm diagonal square ($H = 26/\sqrt{2} \approx 18.385\text{ mm}$).
- All component placements are documented as `estimated_from_photo` with package dimensions and confidence tags in `src/data/placement.ts`.

## 4. Feature Verification & Classification Matrix

In accordance with strict physical accuracy guardrails (**Physical accuracy > Visual decoration > Component density**):

### A. Verified Features (Source: Official Listing & Hardware Photos)
- **Substrate Geometry**: 1.0 mm thickness extruded FR4 core with asymmetric 3 mounting holes ($26 \times 26\text{ mm}$ mounting standard).
- **Mounting Hole Gold Rings**: Solid ENIG annular rings (inner $r = 1.05\text{ mm}$, outer $r = 1.90\text{ mm}$) without invented thermal relief spokes.
- **Package-Specific Footprints**:
  - STM32G473CEU6: UFQFPN-48 ($7.0 \times 7.0\text{ mm}$, $0.5\text{ mm}$ pitch, $5.1 \times 5.1\text{ mm}$ center thermal ground pad).
  - AT7456E: QFN-28 ($4.0 \times 6.8\text{ mm}$, center ground pad).
  - PY25Q128HA: USON-8 ($5.0 \times 6.0\text{ mm}$, 4 leads on North, 4 on South, pitch $1.27\text{ mm}$, no leads on lateral edges).
  - SX1281: QFN-24 ($4.0 \times 4.0\text{ mm}$, $0.5\text{ mm}$ pitch, center thermal pad).
  - ESP8285: QFN-32 ($5.0 \times 5.0\text{ mm}$, $0.5\text{ mm}$ pitch, center thermal pad).
  - BB51 ESC Controllers: QFN-20 ($3.0 \times 3.0\text{ mm}$, $0.5\text{ mm}$ pitch) $\times 4$.
  - ESC Power MOSFETs: PDFN3333 DFN-8 ($3.0 \times 3.0\text{ mm}$, 4 leads on side 1, large drain tab on side 2) $\times 12$.
  - JST1.25 Motor Sockets: 3 through-hole pin pads ($1.25\text{ mm}$ pitch) $+ 2$ side SMD anchor tabs $\times 4$.
  - USB SH1.0-4Pin Header: 4 SMD lead pads ($1.0\text{ mm}$ pitch) $+ 2$ side mechanical solder tabs.
  - VTX U.FL Receptacle: Center RF signal pad $+ 2$ side ground shield tabs.
  - Shunt Resistor: 2512 package ($4.2 \times 1.9\text{ mm}$, R001).
  - Power Pads: High-current BT2.0 solder pads (`BATT+`, `GND`).
- **Verified Silkscreen Markings**:
  - Top: `↑ FRONT` chevron & direction label, `BATT+`, `GND`, `RX-ANT`, `WiFi-ANT`, `VTX-ANT`, `ESC1~4`, `CAM`, `5V`, `TX`, `RX`, IC pin 1 dots and corner tick marks.
  - Bottom: `▲ FRONT`, `Matrix 5IN1`, `USB`, `BOOT`, `ESC1~4`, `BZ+`, `BZ-`.
- **Physical PBR Material Properties**:
  - Black Solder Mask: Satin matte dielectric (Roughness $0.71$, Metalness $0.0$).
  - Exposed Copper/Gold: ENIG immersion gold (Roughness $0.22$, Metalness $0.96$, Bump $+0.035\text{ mm}$).
  - Silkscreen Ink: Matte white (Roughness $0.88$, Metalness $0.0$, Bump $+0.015\text{ mm}$).
- **Absence of Fabricated Elements**:
  - Zero unverified ground stitching vias.
  - Zero invented thermal relief spokes around mounting holes.
  - Zero invented copper routing traces.

### B. Estimated Features (Source: Image Rectification & Photogrammetry)
- Passive 0402 / 0603 MLCC capacitors and resistors ($x, z, \text{rot}$ extracted from homographic rectification in `src/data/generated/passives.json`).
- Discrete SOT-23 transistor orientations.
- Internal ground and power planes (buried inside the opaque black FR4 substrate).

### C. Illustrative Features (Source: Educational Explanations)
- **Schematic Signal Overlay** (`⚡ 示意走線` in toolbar):
  - Illustrative high-visibility functional bus overlays (Power, SPI/I2C, Motor PWM, RF Feedlines).
  - Clearly watermarked with `⚠️ 教學示意線路 (Illustrative Schematic Overlay · Not Actual PCB Traces)`.
  - In default Procedural PCB Mode, this overlay is disabled and zero invented traces are rendered on the PCB.
