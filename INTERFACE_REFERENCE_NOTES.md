# Matrix 1S 5IN1 II Interface Reference Notes

Checked against manufacturer sources on 2026-10-23. This file distinguishes observed connections from generic interface explanations. It does not establish hidden routing or manufacturing coordinates.

## Confirmed Interfaces

| Item | Evidence and implementation guidance |
| --- | --- |
| USB | The board uses **SH1.0-4Pin**; the package includes an external **Type-C to SH1.0 adapter** and cable. Describe computer configuration/flashing through that adapter. Do not label the board socket Type-C. [Product specifications and package list](https://betafpv.com/products/matrix-1s-5in1-ii-brushless-flight-controller) |
| Motor plugs | **JST1.25** motor connectors are pre-soldered on the solder-free version. They connect motors to the integrated four-channel ESC, not an external ESC stack. [Product build options](https://betafpv.com/products/matrix-1s-5in1-ii-brushless-flight-controller) |
| Power | The manufacturer lists **1S input only** and **5V BEC, maximum 3A**. The 3A rating belongs to the BEC output, not to every individual pad. [Specifications](https://betafpv.com/products/matrix-1s-5in1-ii-brushless-flight-controller) |
| UART | The product lists UART1/2/3/4; UART2 serves onboard VTX and UART3 serves onboard RX by default. The external connection diagram explicitly exposes **TX1/RX1**. [Serial-port section](https://betafpv.com/products/matrix-1s-5in1-ii-brushless-flight-controller), [connection diagram](public/references/connection_diagram.jpg) |

## Exact Labels Visible in Manufacturer Diagrams

- **Top camera connection:** `CAM`, `GND`, `+5V` in the connection diagram. The component map marks `CAM IN` at the socket. This supports a camera-input description; its exact connector pitch/pin order should not be inferred from appearance. [Official top map](https://cdn.shopify.com/s/files/1/1778/6615/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_top_front_gyro_update_600x600.jpg?v=1777532692), [official wiring diagram](https://cdn.shopify.com/s/files/1/1778/6615/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_connection_diagram_1024x1024.jpg?v=1769569778)
- **Top left pad group:** `GND`, `TX1`, `RX1`, `+5V`. These are the documented external UART1 pads. TX-to-peripheral-RX and RX-to-peripheral-TX is the general UART connection convention, not evidence that every listed peripheral is supported at every voltage. [Official wiring diagram](https://cdn.shopify.com/s/files/1/1778/6615/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_connection_diagram_1024x1024.jpg?v=1769569778)
- **Top right pad group:** `+5V`, `LED`, `GND`; the top map calls the signal `RGB-LED`. The diagram shows external LED wiring. This is sufficient for an LED control-pad card; do not assume an LED protocol/current allowance not specified here. [Official wiring diagram](https://cdn.shopify.com/s/files/1/1778/6615/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_connection_diagram_1024x1024.jpg?v=1769569778)
- **Bottom buzzer pads:** `BZ+`, `BZ−` connected to a buzzer in the wiring illustration. It establishes polarity, not a separately rated buzzer supply/current. [Official wiring diagram](https://cdn.shopify.com/s/files/1/1778/6615/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_connection_diagram_1024x1024.jpg?v=1769569778)
- **Battery pads:** `BATT+` and `GND` appear on the top component map. Treat these as the board's 1S battery connection; a 3S–6S VBAT description does not apply. [Official top map](https://cdn.shopify.com/s/files/1/1778/6615/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_top_front_gyro_update_600x600.jpg?v=1777532692)
- **USB signal pads:** `USB-D−` and `USB-D+` appear next to the USB connector in the bottom map. [Official bottom map](https://cdn.shopify.com/s/files/1/1778/6615/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_bottom_front_600x600.jpg?v=1769053662)

## BOOT Button: Confirmed Hardware and Supported Instructions

The bottom component map labels the physical button **`FC&RX-BOOT`**. The top map also annotates **`RX&FC-BOOT0`**. Thus, describe it using the manufacturer's shared FC/RX label rather than claiming a dedicated independent FC-only switch. [Official bottom map](https://cdn.shopify.com/s/files/1/1778/6615/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_bottom_front_600x600.jpg?v=1769053662)

BETAFPV's flashing guide instructs holding BOOT while connecting the flight controller to the computer through a data cable, then releasing BOOT and checking for DFU. Betaflight documents the same USB-startup procedure. This supports an FC bootloader/DFU explanation for firmware recovery and flashing, **not a claim that pressing the button automatically repairs damaged hardware**. [BETAFPV flashing guide](https://support.betafpv.com/hc/en-us/articles/50823460477977-How-to-update-firmware-or-CLI-using-Betaflight), [Betaflight USB flashing](https://betaflight.com/docs/wiki/guides/current/USB-Flashing)

The reviewed model documentation does **not** specify RX runtime short-press/long-press actions or timing. Do not invent ELRS binding/Wi-Fi/button behavior. Use the [model-specific firmware support page](https://support.betafpv.com/hc/en-us/articles/54655791332761-Firmware-for-Matrix-1S-Brushless-Flight-Controller-5IN1-II) to choose firmware for the installed IMU; the product page cautions that some IMUs require manufacturer builds.

## Omit Unverified Items from the Interface

The reviewed diagrams do not establish external `9V`, `12V`, `4V5`, `3V3`, `VBAT`, `SCL/SDA`, or external `M1–M4/S1–S4` control pads. Do not add them. The listed motor sockets are three-phase motor outputs from the integrated ESC, not FC-to-ESC signal connectors. The product mentions possible serial HD-VTX use but does not establish a dedicated DJI plug-and-play socket or its power compatibility. Do not add a DJI connector card.

No new 3D pad geometry or pad coordinates should be created solely from these labels. Link the manufacturer connection diagram from explanatory cards where precise model geometry is unavailable.
