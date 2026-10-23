import { PRODUCT_URL } from './boardSpec';

export type ComponentId =
  | 'board' | 'mcu' | 'imu' | 'forward' | 'osd'
  | 'blackbox' | 'esc' | 'vtx' | 'elrs_rx'
  | 'current_sensor' | 'motor_connectors' | 'usb_connector'
  | 'battery_connector' | 'boot_button' | 'camera_connector'
  | 'power_pads' | 'uart_pads' | 'buzzer_pads' | 'led_pad';

export type StatusChip = '已確認搭載' | '型號依批次不同' | '推估位置';

export interface FactRow {
  label: string;
  value: string;
  /** official = from the official listing / labeled map; photo = read from product photo; general = background knowledge */
  source: 'official' | 'photo' | 'general';
}

export interface ComponentInfo {
  id: ComponentId;
  title: string;
  abbr: string;
  status: StatusChip[];
  description: string[];
  facts: FactRow[];
  /** Whether the item exists as geometry on the 3D PCB. */
  physical: boolean;
  links?: { label: string; href: string }[];
  note?: string;
}

const official = [{ label: 'BETAFPV 官方產品頁', href: PRODUCT_URL }];
const wiring = [...official, { label: '原廠接線圖', href: './references/connection_diagram.jpg' }];

export const componentCatalog: Record<ComponentId, ComponentInfo> = {
  board: {
    id: 'board',
    title: 'Matrix 1S 5IN1 II｜飛控總覽',
    abbr: 'FC',
    status: ['已確認搭載'],
    description: [
      '這是一片整合「飛控 + 四合一 ESC + ELRS 接收機 + 類比圖傳 + OSD」的 1S 無刷 Whoop 飛控。所有功能集中在一片 1.0 mm 厚的 PCB 上，以三個安裝孔固定在機架。',
      '拖曳可旋轉、滾輪或雙指可縮放；滑過元件會預覽高亮，點擊後鎖定並在此卡片顯示說明。右側清單也可以直接選取元件。',
    ],
    facts: [
      { label: '主控', value: 'STM32G473CEU6', source: 'official' },
      { label: 'ESC', value: '1S，12 A 持續／18 A 峰值', source: 'official' },
      { label: '接收機', value: 'Serial ELRS 2.4 GHz', source: 'official' },
      { label: '圖傳', value: '5.8 GHz 類比，最高 400 mW', source: 'official' },
      { label: 'BEC', value: '5 V／3 A', source: 'official' },
      { label: '板厚', value: '1.0 mm', source: 'official' },
      { label: '安裝', value: '三孔（26 × 26 mm 規格）', source: 'official' },
      { label: '重量', value: '約 4.1 ± 0.1 g（solder-free）', source: 'official' },
    ],
    physical: true,
    links: official,
    note: '外形、孔位與元件位置是從官方產品照片校準推估，並非 CAD 量測資料。',
  },
  mcu: {
    id: 'mcu',
    title: 'MCU｜主控微處理器',
    abbr: 'MCU',
    status: ['已確認搭載', '推估位置'],
    description: [
      'STM32G473CEU6 執行 Betaflight 飛控韌體，讀取感測資料並計算姿態控制與馬達輸出命令。',
      '它以高頻率讀取 IMU 的角速度，執行 PID 控制迴路，再把四顆馬達的油門命令送給 ESC；同時負責與接收機、OSD、Blackbox Flash 溝通。',
    ],
    facts: [
      { label: '型號', value: 'STM32G473CEU6', source: 'official' },
      { label: '核心', value: 'Arm Cortex-M4F（含 FPU），最高 170 MHz', source: 'general' },
      { label: '封裝', value: 'UFQFPN48，7 × 7 mm', source: 'general' },
      { label: '位置', value: '正面，前方偏左（依官方標註圖）', source: 'official' },
    ],
    physical: true,
    links: official,
  },
  imu: {
    id: 'imu',
    title: 'IMU｜慣性測量單元',
    abbr: 'IMU / Gyro',
    status: ['已確認搭載', '型號依批次不同', '推估位置'],
    description: [
      '透過陀螺儀量測角速度、加速度計量測線性加速度，供姿態估測與控制迴路使用。實際晶片可能依生產批次而異。',
      '官方正面標註圖將此晶片標示為「Gyroscope」。它提供角速度與加速度資料，供飛控估算姿態。',
    ],
    facts: [
      { label: '可能型號', value: 'ICM42688P／ICM42622／BMI270／LSM6DSK320X（單板只搭載其中一種）', source: 'official' },
      { label: '本模型', value: '未指定實際型號', source: 'photo' },
      { label: '位置', value: '正面前方，MCU 右上側', source: 'official' },
    ],
    physical: true,
    links: official,
    note: '請在 Betaflight Configurator 的設定頁確認你手上這片板子偵測到的 Gyro 型號。',
  },
  forward: {
    id: 'forward',
    title: 'Forward｜飛控前方',
    abbr: 'FRONT',
    status: ['已確認搭載'],
    description: [
      '箭頭代表飛控板定義的前方，通常應與機頭方向一致；若安裝旋轉，必須在飛控韌體中設定正確的 Board Alignment。',
      '飛控用前方來解讀 IMU 的 Roll／Pitch／Yaw 軸。若方向錯誤，起飛時會出現翻滾或失控。這個箭頭跟著 PCB 一起旋轉，不會因為你轉動視角而改變。',
    ],
    facts: [
      { label: '官方圖示', value: 'TOP FRONT／BOTTOM FRONT 圖的箭頭朝上即為前方', source: 'official' },
      { label: '本模型', value: '前方 = PCB 局部座標 −Z（平邊那一端）', source: 'photo' },
    ],
    physical: true,
    links: official,
  },
  osd: {
    id: 'osd',
    title: 'OSD｜畫面資訊疊加',
    abbr: 'OSD',
    status: ['已確認搭載', '推估位置'],
    description: [
      'AT7456E 將電池電壓、飛行時間等飛行資訊疊加至類比 FPV 畫面，讓飛手透過眼鏡看到即時資訊。實際顯示項目依 Betaflight 設定。',
      '攝影機的類比影像先經過 OSD 晶片疊上文字，再送入 VTX 發射出去。',
    ],
    facts: [
      { label: '型號', value: 'AT7456E', source: 'official' },
      { label: '位置', value: '背面中央（依官方背面標註圖）', source: 'official' },
    ],
    physical: true,
    links: official,
  },
  blackbox: {
    id: 'blackbox',
    title: 'Blackbox｜飛行資料紀錄',
    abbr: 'Flash 16 MB',
    status: ['已確認搭載', '推估位置'],
    description: [
      '使用板載 16 MB Flash 儲存飛行控制相關紀錄，可用來分析控制迴路、PID 調校或故障事件。可記錄多久取決於紀錄頻率及欄位，不能保證固定航次數。',
      '紀錄可在 Betaflight Configurator 下載，再用 Blackbox Explorer 分析。',
    ],
    facts: [
      { label: '容量', value: '16 MB 板載 Flash', source: 'official' },
      { label: '照片印字', value: 'PY25Q128HA（128 Mbit = 16 MB，與官方規格一致）', source: 'photo' },
      { label: '位置', value: '正面中央偏左（官方圖標示 Flash-16M）', source: 'official' },
    ],
    physical: true,
    links: official,
  },
  esc: {
    id: 'esc',
    title: 'ESC｜電子變速器',
    abbr: 'ESC ×4',
    status: ['已確認搭載', '推估位置'],
    description: [
      '板載四路無刷馬達控制電路，接受飛控輸出以調整各馬達轉速；1S 電源，標稱 12A 持續／18A 峰值。',
      'ESC 不是單一顆晶片，而是由控制晶片與多顆功率 MOSFET 組成的功率級，分散在 PCB 兩面。官方背面圖的 ESC1–ESC4 標示的是四個馬達通道。',
    ],
    facts: [
      { label: '規格', value: '1S，12 A 持續／18 A 峰值', source: 'official' },
      { label: '照片觀察', value: '背面 4 顆印字「BB51」的小型 QFN（推測為各路 ESC 控制晶片）', source: 'photo' },
      { label: '照片觀察', value: '兩面共 12 顆功率元件封裝（推估每路 3 組半橋）', source: 'photo' },
    ],
    physical: true,
    links: official,
    note: '控制晶片與 MOSFET 的實際型號未經官方確認，此處僅依照片印字推測。',
  },
  vtx: {
    id: 'vtx',
    title: 'VTX｜類比影像發射器',
    abbr: 'VTX 5.8G',
    status: ['已確認搭載', '推估位置'],
    description: [
      '將攝影機影像透過 5.8 GHz 類比無線鏈路送往 FPV 接收設備，最大輸出 400 mW。',
      '發射晶片位於背面（官方圖標示「5.8G VTX Chip」），天線則接在正面的 U.FL 座（官方圖標示「VTX-ANT」）。通電前務必先接上天線，避免損壞發射端。',
    ],
    facts: [
      { label: '頻段', value: '5.8 GHz 類比', source: 'official' },
      { label: '最大功率', value: '400 mW', source: 'official' },
      { label: '天線座', value: '正面 U.FL（IPEX）', source: 'official' },
    ],
    physical: true,
    links: official,
    note: '實際可用功率與頻道請依當地法規設定。',
  },
  elrs_rx: {
    id: 'elrs_rx',
    title: 'ELRS RX｜遙控接收器',
    abbr: 'ELRS 2.4G',
    status: ['已確認搭載', '推估位置'],
    description: [
      '板載 2.4 GHz ExpressLRS 接收鏈路，接收遙控器指令並經 CRSF 序列協定傳送給飛控。',
      'SX128X 是 2.4 GHz 射頻收發晶片；ESP8285 執行接收機韌體，並可開啟 WiFi 進行韌體更新。RX-ANT 焊點接接收天線，WiFi-ANT 是 ESP8285 的天線。',
    ],
    facts: [
      { label: '類型', value: 'Serial ELRS 2.4 GHz', source: 'official' },
      { label: '官方圖標示', value: 'SX128X、ESP8285、WiFi-ANT、RX-ANT', source: 'official' },
      { label: '照片印字', value: '射頻晶片可辨識「1281」字樣', source: 'photo' },
    ],
    physical: true,
    links: official,
  },
  current_sensor: {
    id: 'current_sensor',
    title: 'Current Sensor｜電流感測',
    abbr: 'Current',
    status: ['已確認搭載', '推估位置'],
    description: [
      '量測系統電流，提供耗電量估算與 OSD 電力相關資訊。',
      '官方正面圖在電池焊點附近標示 Current Sensor。旁邊印有「R001」的元件推測為電流取樣（分流）電阻，R001 通常代表 1 mΩ。',
    ],
    facts: [
      { label: '官方規格', value: '支援電壓與電流感測', source: 'official' },
      { label: '照片觀察', value: '印字 R001 的取樣電阻（推測）', source: 'photo' },
    ],
    physical: true,
    links: official,
    note: '電流讀數需在 Betaflight 設定正確的 scale 才會準確。',
  },
  motor_connectors: {
    id: 'motor_connectors',
    title: 'Motor Connectors｜馬達接頭',
    abbr: 'JST1.25 ×4',
    status: ['已確認搭載', '推估位置'],
    description: [
      '免焊版的四組 JST1.25 三芯插座，分別連接四顆無刷馬達；每組傳送板載 ESC 的三相馬達輸出。',
      '接頭位於背面，正面對應位置可看到三孔焊點。依官方背面圖（由上往下看、機頭朝前）：ESC1 右後、ESC2 右前、ESC3 左前、ESC4 左後。',
    ],
    facts: [
      { label: '接頭', value: 'JST1.25，3 pin（solder-free 版本）', source: 'official' },
      { label: '需焊接版', value: '不含預焊接頭，僅有焊點', source: 'official' },
    ],
    physical: true,
    links: official,
    note: 'Betaflight 的 Motor 1–4 順序與 ESC 標籤的對應，請在 Configurator 的馬達頁面實際確認，不要只靠絲印推論。',
  },
  usb_connector: {
    id: 'usb_connector',
    title: 'USB Connector｜設定介面',
    abbr: 'SH1.0-4P',
    status: ['已確認搭載', '推估位置'],
    description: [
      '板上 SH1.0-4Pin USB 接頭透過隨附的 Type-C 轉 SH1.0 轉接板與線材連接電腦，可使用 Betaflight Configurator 設定參數、下載日誌與更新韌體。',
      '接頭旁另有原廠標示的 USB-D+／USB-D− 焊點，分別為 USB 差動資料線。更新韌體時請依實際 IMU 批次選用原廠對應韌體。',
    ],
    facts: [
      { label: '板上接頭', value: 'SH1.0-4Pin', source: 'official' },
      { label: '電腦端轉接', value: '隨附 Type-C 轉 SH1.0 轉接板及線材', source: 'official' },
      { label: '位置', value: '背面後端，靠近後安裝孔', source: 'official' },
    ],
    physical: true,
    links: official,
  },
  battery_connector: {
    id: 'battery_connector',
    title: 'BT2.0｜電池連接',
    abbr: 'BT2.0',
    status: ['已確認搭載', '推估位置'],
    description: [
      '以 BT2.0 連接 1S 電池為飛控和板載 ESC 供電；BATT+ 是電池正極輸入，GND 為接地。',
      '官方正面圖在左後方標示 BATT+ 與 GND 焊點。此 3D 模型只呈現 PCB 上的焊點，未繪出電源線材。',
    ],
    facts: [
      { label: '電池接頭', value: 'BT2.0', source: 'official' },
      { label: '電池節數', value: '1S（依官方 ESC 規格）', source: 'official' },
    ],
    physical: true,
    links: official,
  },
  boot_button: {
    id: 'boot_button',
    title: 'BOOT｜FC／RX 開機燒錄按鈕',
    abbr: 'BOOT',
    status: ['已確認搭載', '推估位置'],
    description: [
      '背面黃色按鈕由原廠標示為 FC&RX-BOOT，供飛控與接收機的開機／燒錄操作使用。',
      '飛控需要進入 DFU 重新刷寫時，按住 BOOT，再透過 USB 轉接線連接電腦，連接後放開按鈕並確認 Configurator 顯示 DFU，再依原廠流程刷寫相符韌體。',
    ],
    facts: [
      { label: '原廠標示', value: 'FC&RX-BOOT', source: 'official' },
      { label: '位置', value: '背面前方，黃色實體按鈕', source: 'official' },
      { label: '用途', value: '飛控 DFU／燒錄操作', source: 'general' },
    ],
    physical: true,
    links: [...official, { label: '原廠刷機流程', href: 'https://support.betafpv.com/hc/en-us/articles/50823460477977-How-to-update-firmware-or-CLI-using-Betaflight' }],
    note: '按鍵也涉及接收機開機操作；飛控與 ELRS 接收機的韌體及更新流程需分開確認。飛控韌體請依實際 IMU 批次選用原廠版本。',
  },
  camera_connector: {
    id: 'camera_connector',
    title: 'CAM｜類比相機連接介面',
    abbr: 'CAM',
    status: ['已確認搭載', '推估位置'],
    description: [
      '相機介面提供 CAM、GND 與 +5V，分別連接相機的類比影像、接地與電源。請依原廠接線圖核對腳位順序。',
      '相機影像經板載 AT7456E OSD 疊上飛行資訊，再交由板載 5.8 GHz VTX 發射。',
    ],
    facts: [
      { label: '接線標示', value: 'CAM／GND／+5V', source: 'official' },
      { label: '影像類型', value: '類比 FPV 影像', source: 'official' },
      { label: '5V 供電', value: '與其他 5V 周邊共用 BEC 輸出額度', source: 'general' },
    ],
    physical: true,
    links: wiring,
  },
  power_pads: {
    id: 'power_pads',
    title: '5V／GND｜周邊供電與接地',
    abbr: '5V / GND',
    status: ['已確認搭載'],
    description: [
      '原廠接線圖在相機、UART1 與 LED 介面標出 +5V 和 GND。+5V 為穩壓供電，GND 是周邊與飛控共用的電壓參考。',
      '官方 BEC 規格為 5V、最大 3A。這是 BEC 的總輸出額度，所有由它供電的負載須合計，不能把每個 5V 接點都當成各自可供 3A。',
    ],
    facts: [
      { label: 'BEC', value: '5 V，最大 3 A', source: 'official' },
      { label: '正極標示', value: '+5V', source: 'official' },
      { label: '接地標示', value: 'GND', source: 'official' },
    ],
    physical: false,
    links: wiring,
    note: '焊盤位置與排列請依原廠接線圖核對；接線前先確認周邊的輸入電壓、極性與耗電量。',
  },
  uart_pads: {
    id: 'uart_pads',
    title: 'UART1｜外部序列通訊焊盤',
    abbr: 'TX1 / RX1',
    status: ['已確認搭載'],
    description: [
      '原廠接線圖提供 GND、TX1、RX1 與 +5V，可供外部序列裝置連接。一般 UART 接法為飛控 TX 接周邊 RX、飛控 RX 接周邊 TX，並共地。',
      '依接入裝置在 Betaflight 的 Ports 頁面設定對應 UART。原廠預設 UART2 用於板載 VTX、UART3 用於板載接收機，設定時應保留這些既有配置。',
    ],
    facts: [
      { label: '外部焊盤', value: 'GND／TX1／RX1／+5V', source: 'official' },
      { label: '板載 VTX', value: 'UART2，TBS SmartAudio', source: 'official' },
      { label: '板載接收機', value: 'UART3，Serial RX／CRSF', source: 'official' },
    ],
    physical: false,
    links: wiring,
    note: '焊盤位置請參考原廠接線圖；訊號電位與協定也需符合所接周邊的規格。',
  },
  buzzer_pads: {
    id: 'buzzer_pads',
    title: 'BZ+／BZ−｜蜂鳴器焊盤',
    abbr: 'BUZZER',
    status: ['已確認搭載'],
    description: [
      '背面前端的 BZ+ 與 BZ− 焊盤可連接外部蜂鳴器，原廠接線圖標出正負極。蜂鳴器需另接，這裡介紹的是板上的接點。',
      '搭配 Betaflight 蜂鳴器功能，可供警示或尋機使用；請依蜂鳴器規格及原廠接線圖接線。',
    ],
    facts: [
      { label: '焊盤', value: 'BZ+／BZ−', source: 'official' },
      { label: '位置', value: '背面前端（機頭方向一側）', source: 'official' },
    ],
    physical: false,
    links: wiring,
  },
  led_pad: {
    id: 'led_pad',
    title: 'LED｜外接燈組控制接點',
    abbr: 'LED',
    status: ['已確認搭載'],
    description: [
      '原廠接線圖在板邊標示 +5V、LED 與 GND，用來連接外部 LED 模組的供電、控制訊號與接地。',
      '燈效需配合相容 LED 模組與 Betaflight 設定；LED 負載也要計入 5V BEC 的總供電額度。',
    ],
    facts: [
      { label: '接點', value: '+5V／LED／GND', source: 'official' },
      { label: '用途', value: '外接 LED 模組供電與控制', source: 'official' },
    ],
    physical: false,
    links: wiring,
  },

};

/** Order of the accessible component list. */
export const listOrder: ComponentId[] = [
  'forward', 'mcu', 'imu', 'blackbox', 'osd', 'esc', 'vtx', 'elrs_rx',
  'current_sensor', 'motor_connectors', 'usb_connector', 'boot_button', 'camera_connector',
  'battery_connector', 'power_pads', 'uart_pads', 'buzzer_pads', 'led_pad',
];
