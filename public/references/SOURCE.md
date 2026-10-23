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
