# Matrix 1S 5IN1 II — Interactive Three.js PCB Explorer

> Implementation guideline for a coding agent. Language of the UI: Traditional Chinese (Taiwan). Target: **BETAFPV Matrix 1S Brushless Flight Controller (5IN1 II)** only, not the original 5IN1.

## 0. Mission and definition of done

Build a web application that presents a recognizable, detailed, **double-sided 3D reconstruction** of the BETAFPV Matrix 1S 5IN1 II flight controller. Users should be able to rotate and zoom the PCB, hover over meaningful electronic parts to highlight them, click a part to keep it selected, and see an explanatory information card **anchored at the bottom-left of the screen**. Content must be technically accurate and distinguish actually installed parts from general flight-controller concepts.

Acceptance criteria:

- [ ] The board is visibly the **5IN1 II** version, with its distinctive three mounting holes (left, right, bottom in the official forward-up image), not the old four-hole layout.
- [ ] The visible top and bottom match the supplied official reference diagrams (including correct orientation, large IC placements, four motor connectors, antenna and USB connectors).
- [ ] Drag = orbit, wheel/pinch = zoom; limits avoid clipping; Reset View, Front, Back, and Fit controls work.
- [ ] Hovering a selectable component applies a clear emissive/outline highlight and changes the pointer cursor; tooltip contains its name.
- [ ] Clicking locks selection and populates a **fixed bottom-left information card**; clicking empty space clears selection or returns to board overview; selected objects remain distinguishable from merely hovered objects.
- [ ] Component information includes MCU, IMU, forward direction, OSD, onboard 16 MB Flash Blackbox, ESC, VTX, ELRS RX, current sensor and connectors.
- [ ] Barometer and MicroSD are **not fabricated** on the board; explain as general concepts in an "other flight-controller features" section with their absence/unverified state clearly displayed.
- [ ] Every selected region on the bottom side remains pickable when the user flips the board; do not accidentally select components on the occluded far side.
- [ ] No component placement or part identity is presented as verified when it is merely estimated from photographs.
- [ ] Works on contemporary desktop browsers, with responsive layout and graceful WebGL fallback.

## 1. Authoritative sources and references

Primary official product listing:

- https://betafpv.com/products/matrix-1s-5in1-ii-brushless-flight-controller

Official **labeled component maps** (use these as canonical face/orientation reference; verify whether a newer revision is available before replacing them):

- Top / front, labeled: https://cdn.shopify.com/s/files/1/1778/6615/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_top_front_gyro_update_600x600.jpg?v=1777532692
- Bottom / front, labeled: https://cdn.shopify.com/s/files/1/1778/6615/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_bottom_front_600x600.jpg?v=1769053662

Official unannotated product photos, useful for textures/placement (Solder-free):

- https://betafpv.com/cdn/shop/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_soldered_front.jpg?v=1769154277
- https://betafpv.com/cdn/shop/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_soldered_back.jpg?v=1769154294

Official unannotated product photos (Solder-required):

- https://betafpv.com/cdn/shop/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_unsoldered_front.jpg?v=1769154868
- https://betafpv.com/cdn/shop/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_unsoldered_back.jpg?v=1769154868

**Important:** The product photos' URLs may change or redirect. During development, download verified assets into `public/references/` and document their original URLs. If an exact photo URL fails, extract the current canonical image URL from the official product page; do not silently substitute a previous-generation board. The reference images are research/reference materials: check rights before publicly redistributing third-party photographs as texture assets.

Do not blindly use diagrams as textures: their labels, arrows and white backgrounds would be baked onto the physical PCB. Use **unannotated** photos for texture projection or create procedural geometry / reconstructed silkscreen and copper artwork instead.

## 2. Verified specification (official listing)

| Attribute | Value |
| --- | --- |
| Product | Matrix 1S Brushless Flight Controller (5IN1 II) |
| FC MCU | STM32G473CEU6 |
| IMU / gyro option | ICM42688P, ICM42622, BMI270, or LSM6DSK320X depending on production revision |
| OSD | AT7456E |
| Blackbox | **16 MB onboard Flash** |
| Sensors explicitly listed | Voltage and current |
| ESC | Four motor outputs; 1S, **12 A continuous / 18 A peak** ESC |
| Receiver | Integrated Serial ELRS 2.4 GHz |
| Video transmitter | Integrated analog 5.8 GHz VTX, up to 400 mW |
| BEC | 5 V, up to 3 A |
| Motor connectors | JST1.25 (solder-free configuration) |
| USB interface | SH1.0-4Pin connector (not a direct USB-C socket on the PCB) |
| Battery | BT2.0 |
| Board thickness | **1.0 mm** |
| Mounting arrangement | **Three mounting holes**, official mounting-size specification: 26 × 26 mm; this does **not** assert board outline dimensions or 26 mm separation between all three holes |
| Weight | Approx. 4.1 ± 0.1 g solder-free; 3.76 g solder-required, per specification |
| Barometer | **Not listed** in official onboard specification; do not model one as present |
| MicroSD slot | **Not listed**; do not model one as present |

The official labeled image shows `Gyroscope`, `STM32G473`, `Flash-16M`, `Current Sensor`, `ESP8285`, `SX128X`, `5.8G VTX Chip`, `AT7456E`, `ESC1–4`, motor connectors and pads. It also marks an **upwards forward arrow**. Note that the manufacturer specifies alternative IMUs; keep the *installed exact chip variant* configurable or unspecified unless separately verified for the pictured board.

**Unverified details:** exact outline dimensions, every component's XY placement and Z height, individual resistor/capacitor values, exact MCU package footprint dimensions inferred from photos, trace routing, internal board layers and net connectivity. Do not pretend they are certified CAD measurements.

## 3. Scope and experience

Create a polished but lightweight engineering-style product explorer:

- Canvas fills viewport with the board centered and ample space around it.
- Dark slate/charcoal background (subtle gradient/grid permitted); board materials realistically approximate black solder mask, copper/gold pads, dark plastic ICs and white/pale JST connectors.
- Bottom-left opaque/semi-transparent information card with readable Traditional Chinese labels. Card must not move with the board.
- Top or right lightweight controls: `正面`, `背面`, `重設視角`, optional `爆炸視圖` (stretch goal).
- Small visible orientation indicator `↑ FRONT / 機頭方向` that follows the board or appears as a separate selectable overlay with a line/arrow anchored to its PCB location. Do not replace the real board's arrow with a misleading world-space arrow.
- On first launch show board overview. On pointer hover, only preview/highlight; on click, persist selection and show details. Mobile tap selects; drag rotates.
- Add an optional sidebar feature glossary for absent components (barometer, MicroSD), clearly marked **「此型號未列出／未搭載於官方規格」** rather than pretending they are clickable physical chips.

## 4. Proposed technology

- **Three.js** with TypeScript and Vite; vanilla Three.js preferred to avoid unnecessary React stack. If the existing app already uses React, React Three Fiber is acceptable as an adaptation.
- `OrbitControls` for rotation and zoom; `Raycaster` for picking; `EffectComposer + OutlinePass` or a controlled emissive/overlay clone for highlighting.
- Geometry: `Shape` + `ExtrudeGeometry` for the 1.0 mm PCB with **three holes**; `BoxGeometry` for IC packages; short cylinders for mounting pads; connector meshes with recessed slots; `InstancedMesh` for repeated passives. Use higher detail only for close-up macro view.
- Use local assets in `public/assets/`, while preserving source and licensing notes.
- Data-driven interaction: each clickable group has `userData.componentId` and a `componentId -> metadata` lookup; avoid depending on arbitrary mesh names.

Suggested project layout:

```text
src/
  main.ts
  scene/
    setupScene.ts
    createPCB.ts
    createComponents.ts
    createConnectors.ts
    materials.ts
    cameraControls.ts
    picking.ts
    highlight.ts
  data/
    components.ts
    placement.ts
    boardSpec.ts
  ui/
    infoCard.ts
    toolbar.ts
    glossary.ts
  styles.css
public/
  references/            # official reference images + SOURCE.md
  assets/                # derived/original texture and icons
README.md
```

## 5. Coordinate conventions (critical)

Use consistent real-world units: **1 Three.js unit = 1 mm**. World Y is upward. Place PCB approximately in the **X-Z plane**, thickness centered on Y = 0: top face at Y = +0.5 mm; bottom face at Y = -0.5 mm. Define **PCB local forward as -Z**. Render the official top diagram with its printed forward arrow pointing toward the **top of the screen** in the initial camera orientation.

The official bottom diagram also explicitly labels FRONT upwards. **A board flipped over changes handedness**: construct its local component coordinates from the official bottom image using a documented flip/mirror transform rather than treating the two picture XY systems as identical. Test with landmarks (three mounting holes, USB connector, right-hand motor plugs).

Do not confuse the 26 × 26 mm official `mounting hole size` designation with measured bounding-box dimensions or with a guaranteed four-hole diagonal. The 5IN1 II has **three actual mounting holes**. Recover positions by aligning photo landmarks; if the exact center-to-center coordinates cannot be confirmed, mark as estimated in `placement.ts` and provide a calibration option.

## 6. Geometry and reconstruction pipeline

### 6.1 Reference alignment

1. Download the official top/bottom unannotated product images and diagrams locally. Confirm they depict 5IN1 II, and choose **Solder-free** as the default visual variant (four mounted motor plugs and battery leads).
2. Crop to PCB, preserve aspect ratio, and align the *physical* three mounting-hole centers and recognizable landmarks. Do not confuse perspective foreshortening with board outline.
3. Estimate the board silhouette via manual SVG tracing (preferred) or polygon point editing. The shape is a compact non-rectangular board with two lateral mounting tabs and one lower mounting tab. It is **not** the four-way symmetric shape of the first-generation board.
4. Keep `outline: [x,z][]`, `holes: [{x,z,r}]`, component rectangles and face texture UV calibration in one editable data file. Record whether each coordinate is `verified`, `estimated_from_photo`, or `illustrative`.
5. If the usable image has perspective distortion, rectify with an image-plane homography before extracting positions. A front-on marketing photo may already be approximately orthographic, but verify.
6. Face photographs may have lighting, shadows, perspective and surface occlusion. Treat traces/details as visual cues, not a reliable complete PCB layout.

### 6.2 Layered PCB

- True extruded physical substrate, thickness 1.0 mm, custom polygon outline and **three** cylindrical cutouts.
- Separate thin top/bottom solder-mask finishes; copper ring geometry at each mounting hole and through-hole pad.
- Top and bottom silkscreen and pads; avoid Z fighting with explicit offsets.
- ICs and passives are actual 3D meshes protruding from board surface; geometry should be simple but consistent with the reference images. Place each on correct board face.
- Four motor plugs on the **bottom** face per the labeled bottom image and solder-free photos; if implementing solder-required variant, remove the premounted connectors and cable where applicable while keeping bare pads.
- USB uses the small **SH1.0-4Pin** board connector, not a fabricated USB-C jack.
- Antenna ports and battery pads modelled where photographically supported.

### 6.3 Quality tiers

- **P0:** Correct silhouette/three-hole geometry; recognizable two faces, major chips and four motor connectors; interactivity fully functional.
- **P1:** More accurate positions, pads, U.FL, SMT passives, top and bottom labels, MCU and IC packages.
- **P2:** Fine PCB texture, copper routing aesthetics (visually approximated only), solder joints, close-up microdetails and optional GLB export.

Prefer finishing P0 interaction before adding hundreds of resistors.

## 7. Component placement and labeling

Follow the **official diagrams**, not earlier Matrix 5IN1 board images. Approximate visual landmarks (relative to each diagram's forward-up view, not exact coordinate assertions):

### Top face (official `TOP FRONT`)

- Gyroscope / IMU in the upper region near the left side.
- MCU `STM32G473` occupies a prominent central/upper-left region.
- `Flash-16M` toward the lower-left quadrant.
- `Current Sensor` in the lower region.
- ELRS/RF components including `SX128X` and `ESP8285` toward lower/right portion.
- VTX antenna connector in the upper-middle region.
- `RX-ANT`, `WiFi-ANT`, camera pads, LEDs, UART/GND/5V pads also annotated.

### Bottom face (official `BOTTOM FRONT`)

- `5.8G VTX Chip` in the upper-left region.
- `AT7456E` OSD toward lower-right of center.
- `ESC1`, `ESC2`, `ESC3`, `ESC4` are the **four motor output connectors/regions**, arranged as two connectors on each left/right side.
- `USB` SH1.0 connector at the lower edge.
- `BZ+`, `BZ-`, USB data pads and FC/RX boot locations are marked.

The labels `ESC1...ESC4` denote ESC/motor channels; do not claim each white motor connector itself is a discrete ESC microcontroller. The board's 12A ESC hardware includes multiple MOSFETs integrated into the power stage.

Treat the board-relative printed forward direction as a selectable *annotation* with its own hit region. Camera orbiting must not redefine which edge is forward.

## 8. Interaction model

State:

```ts
type ComponentId =
  | 'board' | 'mcu' | 'imu' | 'forward' | 'osd'
  | 'blackbox' | 'esc' | 'vtx' | 'elrs_rx'
  | 'current_sensor' | 'motor_connectors' | 'usb_connector'
  | 'battery_connector' | 'barometer_glossary' | 'microsd_glossary';

type SelectionState = {
  hoveredId: ComponentId | null;
  selectedId: ComponentId | null;
};
```

- Orbit with mouse primary drag. Hover raycast only when not dragging. Throttle picking to one check per animation frame if necessary.
- Raycast only visible/selectable meshes; use groups with stable IDs. For parts represented by many meshes, selection on any child highlights the whole group.
- Use near/far intersection and proper occlusion: back-face objects must not highlight through the front of the opaque PCB. One approach: raycast against the board and all pickable meshes, and ignore candidates behind the nearest opaque board intersection; verify with rotated angles. Avoid a permanent transparent invisible hit plane obscuring other selections.
- Visual hover: warm cyan edge glow or bright emissive border, mild intensity; selected: stronger cyan/yellow outline. Materials must revert on pointer leave, without mutating shared material instances used by other chips.
- Hover shows a minimal name hint near pointer; click/tap opens card. Drag does not accidentally click. Escape clears selection. Focus and pointer feedback must work without requiring pixel-perfect hitboxes: add small invisible per-part interaction proxies, but keep proxies behind occluding surfaces.
- Animate Front/Back camera views smoothly (quaternion tween) while preserving a consistent up vector and forward convention. Reset restores initial view and clears selection only if this is documented in UI.
- Clicking `forward` highlights/animates a front-direction arrow, and the card explains why the board must align with the quadcopter frame (or have the flight-controller alignment configured accordingly in firmware).
- Optional accessible HTML list of components can select/focus each feature without requiring precision mouse input.

### Information card details

Card is fixed CSS position: `left: 20px; bottom: 20px;` desktop width approx 320–380 px, `max-height: min(60vh, 500px)`, scrollable. On narrow screens use bottom sheet sizing that doesn't obscure the entire canvas. Card contains:

1. Part title in Traditional Chinese + English abbreviation.
2. Status chip: `已確認搭載`, `型號依批次不同`, `推估位置`, or `未列於此機型官方規格`.
3. 2–4 sentences explaining function and relation to the flight controller.
4. Official chip/parameter value where confirmed.
5. Optional source/link and a `定位元件` camera-focus button.

### Example content (`src/data/components.ts`)

Use content along these lines (can refine prose, but do not change confirmed hardware facts):

| ID | Display title | Description | Verified notes |
|---|---|---|---|
| `mcu` | `MCU｜主控微處理器` | `STM32G473CEU6 執行 Betaflight 飛控韌體，讀取感測資料並計算姿態控制與馬達輸出命令。` | Official spec confirms model. |
| `imu` | `IMU｜慣性測量單元` | `透過陀螺儀量測角速度、加速度計量測線性加速度，供姿態估測與控制迴路使用。實際晶片可能依生產批次而異。` | Official gyro alternatives: ICM42688P / ICM42622 / BMI270 / LSM6DSK320X. Do not claim all variants installed simultaneously. |
| `forward` | `Forward｜飛控前方` | `箭頭代表飛控板定義的前方，通常應與機頭方向一致；若安裝旋轉，必須在飛控韌體中設定正確的 Board Alignment。` | Official diagram arrows point up when viewed forward-up. |
| `osd` | `OSD｜畫面資訊疊加` | `AT7456E 將電池電壓、飛行時間等飛行資訊疊加至類比 FPV 畫面，讓飛手透過眼鏡看到即時資訊。實際顯示項目依 Betaflight 設定。` | AT7456E present. |
| `blackbox` | `Blackbox｜飛行資料紀錄` | `使用板載 16 MB Flash 儲存飛行控制相關紀錄，可用來分析控制迴路、PID 調校或故障事件。可記錄多久取決於紀錄頻率及欄位，不能保證固定航次數。` | Official spec: 16 MB. |
| `esc` | `ESC｜電子變速器` | `板載四路無刷馬達控制電路，接受飛控輸出以調整各馬達轉速；1S 電源，標稱 12A 持續／18A 峰值。` | 12A / 18A according to official specs; actual power elements are distributed. |
| `vtx` | `VTX｜類比影像發射器` | `將攝影機影像透過 5.8 GHz 類比無線鏈路送往 FPV 接收設備，最大輸出 400 mW。` | Official 5.8 GHz VTX. |
| `elrs_rx` | `ELRS RX｜遙控接收器` | `板載 2.4 GHz ExpressLRS 接收鏈路，接收遙控器指令並經 CRSF 序列協定傳送給飛控。` | Official Serial ELRS RX. |
| `current_sensor` | `Current Sensor｜電流感測` | `量測系統電流，提供耗電量估算與 OSD 電力相關資訊。` | Current sensor officially labeled. |
| `motor_connectors` | `Motor Connectors｜馬達接頭` | `四組 JST1.25 馬達接頭用來連接四顆無刷馬達；此為 solder-free 版本外觀。` | Check variant. |
| `usb_connector` | `USB Connector｜設定介面` | `使用 SH1.0-4Pin 介面接外部 USB 轉接線以連接 Betaflight Configurator。` | Not USB-C socket. |
| `battery_connector` | `BT2.0｜電池連接` | `以 BT2.0 連接 1S 電池為飛控和馬達供電。` | Official. |
| `barometer_glossary` | `Barometer｜氣壓計（一般知識）` | `氣壓計利用氣壓變化估算相對高度，常用於支援高度估測與定高功能的飛控。此型號官方規格未列出板載氣壓計，請勿在 3D PCB 上虛構此晶片。` | Not listed. |
| `microsd_glossary` | `MicroSD｜外部日誌儲存（一般知識）` | `部分飛控透過 MicroSD 卡長時間記錄 Blackbox 資料，但此板已列出的是 16 MB 板載 Flash；官方沒有列出 MicroSD 卡槽。` | Not listed. |

**Technical note on IMU:** Common supported IMU components integrate gyro and accelerometer, but in the original top-side official diagram the highlighted chip is called `Gyroscope`. Do not conflate IMU/gyro with a magnetometer or barometer.

**Technical note on Barometer:** Do not tell users this specific board can autonomously hold altitude just because barometers are sometimes used for altitude hold. This device has no confirmed barometer, and altitude hold also depends on firmware and other sensors/control logic.

## 9. Implementation guidance and pseudo-code

Store original per-component geometry and metadata in a declarative table. A placement example should look like this (numbers are **not** true measured positions):

```ts
interface Placement {
  id: ComponentId;
  side: 'top' | 'bottom' | 'annotation';
  xMm: number;
  zMm: number;
  rotationRad: number;
  sizeMm: [number, number, number];
  confidence: 'verified' | 'estimated_from_photo' | 'illustrative';
}
```

Build `THREE.Group` per logical component and assign `componentId` recursively or find it via parent traversal in the raycast hit chain:

```ts
function findComponentId(obj: THREE.Object3D | null): string | null {
  for (let node = obj; node; node = node.parent) {
    if (typeof node.userData.componentId === 'string') {
      return node.userData.componentId;
    }
  }
  return null;
}
```

When an object is selected, update UI separately from rendering:

```ts
function selectComponent(id: ComponentId | null) {
  state.selectedId = id;
  updateHighlight(state.hoveredId, state.selectedId);
  renderInfoCard(id ? componentCatalog[id] : boardOverview);
}
```

Example bottom-left CSS:

```css
.info-card {
  position: fixed;
  left: 20px;
  bottom: 20px;
  width: min(380px, calc(100vw - 40px));
  max-height: min(60vh, 520px);
  overflow: auto;
  color: #e8f3f6;
  background: rgba(12, 22, 30, 0.92);
  border: 1px solid rgba(94, 212, 235, 0.32);
  border-radius: 14px;
  padding: 18px;
  backdrop-filter: blur(14px);
  z-index: 10;
}
```

Memory/perf:

- Dispose geometries/materials/textures when recreating board variants.
- Use `InstancedMesh` for passives and discrete elements where possible; custom picking must resolve `instanceId` back to the right part/group.
- Cap `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, handle resize with `ResizeObserver` or a window listener, and suspend unnecessary animation when the tab is hidden.
- Prefer on-demand rendering (`invalidate`) when idle, but continuous animation is acceptable for a small model. Track FPS and scene triangles.
- Make raycast hit testing efficient; no expensive raycasting for every on-screen label.

## 10. Planned agent milestones

### M1 — Source validation and reference assets

- Download official photos/maps, document exact URLs and versions.
- Explicitly verify and note the board is 5IN1 II with 3 holes, 12A ESC and 1 mm board.
- Produce `REFERENCE_NOTES.md` containing photo orientation and component-side map; flag unknown dimensions.

### M2 — PCB 3D base and controls

- Build physically 1.0 mm-thick custom polygon with 3 holes, top/bottom materials.
- Add OrbitControls, fit, front/back and reset; verify camera forward convention.
- Use front/back reference images as temporary **separate** debug overlays (not final white-background textures).

### M3 — Main components and textures

- Add actual geometry for MCU, IMU, Flash, AT7456E, VTX region, ELRS chips, ESC components, JST1.25 motor plugs, SH1.0 USB port and battery pads.
- Use photo-derived placements; validate against each official face diagram; remove any previously invented ICs.
- Add solder mask, pads, silkscreen and enough passives for a credible macro-view.

### M4 — Interaction and localized content

- Implement hover glow + hint, click selection, bottom-left information card and camera focus.
- Add all content described above; mark absent/unverified barometer and MicroSD as generic glossary only.
- Validate selection on both faces and at grazing angles; no highlighting parts occluded by PCB.

### M5 — Polish and test

- Mobile tap/drag behavior, keyboard accessibility, card layout, high DPI, no text clipping.
- Visual comparison screenshots from aligned top and bottom orthographic views next to source diagrams.
- Typecheck/build/lint; verify performance with dozens/hundreds of passives.
- Document commands and how to replace estimated dimensions with confirmed measurements later.

## 11. Validation matrix

| Test | Expected |
|---|---|
| Load app | Initial 3D board and overview card visible |
| Orbit top -> underside | Correct upside-down board geometry and bottom chip placements |
| Click STM32 | MCU chip highlighted; card identifies STM32G473CEU6 |
| Click gyro | IMU highlighted; card explains gyro/accelerometer and variants |
| Click printed forward marker | Board-forward explanation and arrow animation; independent of camera direction |
| Click AT7456E | OSD card with correct analog FPV overlay explanation |
| Click Flash | Blackbox card states **16 MB onboard Flash** |
| Select barometer glossary | Clearly states not listed onboard; no fictitious chip on board |
| Select MicroSD glossary | Clearly states absent from official specification; no card slot shown |
| Click underneath through PCB | Does **not** highlight hidden components |
| Hover then move out | Temporary highlight disappears, persistent selection remains |
| Mobile tap | Selects item without breaking orbit gesture |
| Compare PCB silhouette | Exactly three mounting holes and 5IN1 II outline |

## 12. Agent guardrails

1. **DO NOT** use photos or code belonging to the original Matrix 1S 5IN1, Air 5IN1 or another FC as if they are this revision.
2. **DO NOT** invent a fourth mounting hole; there are **three**.
3. **DO NOT** place a Barometer or MicroSD slot on this particular physical PCB unless new manufacturer evidence establishes that exact board variant contains one.
4. **DO NOT** claim exact component coordinates or outline dimensions if guessed from 2D product photos. Record estimates, review alignment, and state limitations in README.
5. **DO NOT** render labels from the manufacturer diagram on the raw PCB; use the diagram to locate parts and implement your own interactive annotations.
6. **DO NOT** build this as a flat picture with CSS hover hotspots. Users must see genuinely dimensional IC packages, board thickness, connectors and be able to flip the model.
7. **DO** preserve user orientation when switching faces; confirm FRONT stays a board-local direction.
8. **DO** build actual working code, not only screenshots/mockups. Include `npm install`, `npm run dev`, `npm run build`, and a README.

## 13. Final deliverables

Deliver a running Three.js + TypeScript project with editable component metadata and placements, local references with documented source URLs, the PCB mesh/part library, functional interactive highlights and fixed bottom-left card, and side-by-side reference validation screenshots. Explain what is accurate versus photo-estimated. Prioritize faithful appearance and accurate educational labels over claims of electrical/CAD-level reconstruction.
