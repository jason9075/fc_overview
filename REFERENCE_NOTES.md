# BETAFPV Matrix 1S 5IN1 II — Reference & Reconstruction Notes

## 1. Physical Board Landmarks & Orientation

### Mounting Configuration (5IN1 II)
- **Mounting holes**: Exactly **3 holes**, with clearance for M2 rubber grommets / screws.
- **Coordinates in model**:
  - Left ear: `x = -18.385 mm, z = 0 mm`
  - Right ear: `x = +18.385 mm, z = 0 mm`
  - Rear tab: `x = 0 mm, z = +18.385 mm`
  - Hole radius: `~1.8 mm` (~3.6 mm inner diameter through-hole)
- **Board Thickness**: Officially specified as **1.0 mm** (modeled from `y = -0.5 mm` to `y = +0.5 mm`).

### Top Face (Official `TOP FRONT`)
- **Forward direction**: Printed arrow pointing toward local `-Z` (upper edge in initial view).
- **MCU**: STM32G473CEU6 in 7 × 7 mm UFQFPN48 package, situated at upper-left of board center.
- **IMU / Gyro**: Upper region near MCU (`x ≈ -3.9 mm, z ≈ -11.7 mm`). Officially ICM42688P, ICM42622, BMI270, or LSM6DSK320X depending on production revision.
- **Blackbox Flash**: 16 MB SPI Flash (`PY25Q128HA`), lower-left quadrant.
- **Current Sensor**: Dedicated IC and high-power low-resistance shunt resistor (`R001`, 1 mΩ).
- **Receiver (ELRS)**: SX128X 2.4GHz RF chip and ESP8285 MCU with ceramic WiFi antenna and RX-ANT solder pad.
- **VTX Antenna**: Gold U.FL (IPEX) connector in upper-center region.

### Bottom Face (Official `BOTTOM FRONT`)
- **5.8G VTX Chip**: Main RF transmitter chip in upper-left quadrant (`x ≈ -1.1 mm, z ≈ -8.4 mm`).
- **AT7456E OSD**: Monolithic analog OSD generator chip, centered (`x ≈ 0.7 mm, z ≈ 0.3 mm`).
- **Motor Connectors (JST 1.25)**: 4 pre-soldered 3-pin receptacles on the solder-free edition:
  - ESC3: Left-front
  - ESC4: Left-rear
  - ESC2: Right-front
  - ESC1: Right-rear
- **USB Connector**: SH1.0-4Pin horizontal receptacle at the rear edge (`z ≈ +13.5 mm`), not a direct USB-C jack.

### Non-Existent Components (Educational Note)
- **Barometer**: NOT present on this ultralight 1S whoop board. Included in interactive glossary as educational reference only.
- **MicroSD Card Slot**: NOT present; flight logs are recorded to the onboard 16 MB flash instead.

## 2. Derivation Methodology
1. **Homographic Rectification**: Official high-resolution 1600×1600 marketing photographs were rectified into a metric 2D coordinate system matching the 3-hole triangular layout.
2. **Procedural Geometry**: All integrated circuits, connectors, antenna sockets, crystal oscillators, and passive MLCC capacitors are rendered as authentic 3D volumetric meshes protruding from the 1.0 mm substrate.
3. **Texture Layers**:
   - `photo`: Exact photography projection from official units.
   - `artwork`: Vector-style reconstruction isolating solder mask, exposed immersion gold pads, and white silkscreen markings.
