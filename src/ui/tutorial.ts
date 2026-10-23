import type { ComponentId } from '../data/components';

export interface TutorialStep {
  componentId: ComponentId;
  title: string;
  badge: string;
  cameraView: 'top' | 'bottom' | 'focus';
  body: string[];
  pilotTip: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    componentId: 'board',
    title: '歡迎探索 Matrix 1S 5IN1 II 飛控',
    badge: '架構總覽',
    cameraView: 'top',
    body: [
      '這片飛控是專為 1S 微型無刷穿越機（Whoop）設計的頂級高集成板。',
      '它在一片僅 1.0 mm 厚、重約 4.1 克的 PCB 上，整合了「飛控主控 (FC) + 四路電變 (ESC) + ELRS 接收機 + 400mW 類比圖傳 (VTX) + OSD 晶片」。',
      '請注意其標誌性的「三孔安裝結構」（左、右、後），符合 26 × 26 mm 規格，而非舊款的四孔設計。',
    ],
    pilotTip: '三孔設計能在減輕重量的同時，保留足夠的機械剛性與避震橡膠墊圈空間。',
  },
  {
    componentId: 'mcu',
    title: '飛控大腦：STM32G473 主控 MCU',
    badge: '主控運算',
    cameraView: 'focus',
    body: [
      '位於正面偏左的 7 × 7 mm 晶片是高階 STM32G473CEU6，擁有 170 MHz 的 Arm Cortex-M4F 核心並內建硬體浮點運算單元 (FPU)。',
      '它負責以高達數千赫茲（kHz）的頻率讀取陀螺儀資料，執行 Betaflight 的 PID 控制演算法，並計算出四顆馬達的輸出指令。',
    ],
    pilotTip: 'G4 系列運算效能遠超傳統 F411，能輕鬆開啟雙向 DShot 與 RPM 濾波器，讓微型機飛行更跟手滑順。',
  },
  {
    componentId: 'imu',
    title: '姿態感知：IMU / 陀螺儀',
    badge: '慣性測量',
    cameraView: 'focus',
    body: [
      '位於 MCU 右上方的微型晶片即為 IMU（慣性測量單元），整合了三軸陀螺儀與三軸加速度計。',
      '官方規格指出，依據生產批次不同可能搭載 ICM42688P、ICM42622、BMI270 或 LSM6DSK320X。實際型號需在連接 Betaflight Configurator 後確認。',
    ],
    pilotTip: '陀螺儀非常容易受到機架高頻震動干擾，安裝時務必使用柔軟避震橡膠球，避免訊號雜訊導致馬達發熱。',
  },
  {
    componentId: 'forward',
    title: '機頭方向 (Forward) 與 Board Alignment',
    badge: '飛行基準',
    cameraView: 'top',
    body: [
      'PCB 正面絲印繪有箭頭標示「飛控前方（-Z 軸）」。',
      '在機架組裝時，此箭頭應盡可能朝向無人機的機頭方向。如果機架空間限制必須旋轉 90°、180° 或翻轉安裝，必須在 Betaflight Configurator 的「設定」頁中微調 Board Alignment 角度！',
    ],
    pilotTip: '若安裝方向與韌體設定不一致，起飛瞬間無人機就會因姿態解算相反而猛烈翻滾炸機！',
  },
  {
    componentId: 'esc',
    title: '四路 12A/18A 電變 (ESC) 與馬達接頭',
    badge: '動力驅動',
    cameraView: 'bottom',
    body: [
      '翻到飛控背面，可以看到四組 JST1.25 馬達插座（ESC1～ESC4）以及分散在四周的功率 MOSFET 與 BB51 電變驅動晶片。',
      '每路 ESC 支援 1S 電源，提供高達 12A 持續電流與 18A 瞬間峰值，能驅動大推力 0802 / 1102 高 KV 無刷馬達。',
    ],
    pilotTip: 'solder-free 免焊接版本預裝了插座，可直接插拔馬達；若想追求極致輕量，亦可選擇需焊接版本剪線直焊。',
  },
  {
    componentId: 'vtx',
    title: '5.8GHz 400mW 類比圖傳與天線座',
    badge: '視訊傳輸',
    cameraView: 'top',
    body: [
      '板載內建 5.8 GHz 類比圖傳，最大發射功率達 400 mW，讓你在室內繞室或戶外花園都有清晰穩定的穿透力。',
      '發射晶片位於背面，而金色的 U.FL (IPEX) 天線座則位於正面中央。',
    ],
    pilotTip: '重要提醒：在未插上 5.8G 天線的情況下通電，圖傳功率會因反射而累積高溫，極易燒毀發射級！',
  },
  {
    componentId: 'osd',
    title: 'AT7456E 類比畫面疊加 (OSD)',
    badge: '飛行儀表',
    cameraView: 'bottom',
    body: [
      '背面中央的長方形晶片是經典的 AT7456E。',
      '它將鏡頭傳來的即時類比視訊信號與飛控資料結合，在飛行眼鏡畫面中疊加電池電壓、剩餘毫安時 (mAh)、飛行時間、收訊品質 (LQ) 等資訊。',
    ],
    pilotTip: '在 Betaflight Configurator 的 OSD 頁面，你可以自由拖曳擺放想要的儀表元件。',
  },
  {
    componentId: 'elrs_rx',
    title: 'Serial ELRS 2.4G 接收機與 WiFi 天線',
    badge: '遙控通訊',
    cameraView: 'top',
    body: [
      '正面右下區域由 SX128X 射頻晶片與 ESP8285 處理晶片組成 Serial ExpressLRS 接收機。',
      '白色的微型陶瓷元件為 WiFi 天線；當飛控通電幾十秒未連上遙控器時，會自動開啟 WiFi 熱點供飛手透過瀏覽器無線更新 ELRS 韌體。',
    ],
    pilotTip: 'ELRS 具備極低控制延遲（可達 500Hz/1000Hz 刷新率）與驚人的抗干擾距離，是目前 FPV 最主流的開源遙控協定。',
  },
  {
    componentId: 'blackbox',
    title: '16 MB 板載 Flash 飛行黑盒子',
    badge: '數據記錄',
    cameraView: 'top',
    body: [
      '位於正面左下的 PUYA PY25Q128HA 是一顆 128 Mbit（即 16 MB）的高速 SPI Flash 晶片。',
      '它用來記錄飛行時的陀螺儀原始訊號、PID 計算值與馬達驅動指令，供飛手事後匯入 Blackbox Explorer 分析機身震動並調校濾波器。',
    ],
    pilotTip: '記錄前請確認 Blackbox 設定與可用容量，飛行後下載日誌再進行分析。',
  },
  {
    componentId: 'current_sensor',
    title: '電流感測 (R001 分流電阻) 與 BT2.0 供電',
    badge: '電力監控',
    cameraView: 'top',
    body: [
      '在電池接點旁可看到一顆印有「R001」字樣的精密電阻。這是 1 mΩ（毫歐姆）的電流取樣電阻，搭配專用感測放大器量測全機耗電量。',
      '飛控採用低內阻的 BT2.0 電池接口，解決傳統 PH2.0 在大油門時嚴重的壓降問題。',
    ],
    pilotTip: '在 Betaflight 中正確校準 Current Meter Scale，就能在眼鏡中準確掌握剩餘電量，避免過放傷電池。',
  },
  {
    componentId: 'usb_connector',
    title: 'SH1.0-4Pin USB 連接介面',
    badge: '調參通訊',
    cameraView: 'bottom',
    body: [
      '底面後端的 SH1.0-4Pin 白色接頭提供 USB 連接介面。',
      '使用隨機附贈的 SH1.0 轉 USB 轉接線即可連接電腦的 Betaflight Configurator 進行韌體更新與調參。',
    ],
    pilotTip: '外出飛行若未攜帶轉接線，也可以直接透過 ESP8285 的 WiFi 連線或無線 ELRS Passthrough 進行部分設定！',
  },

];

export interface TutorialCallbacks {
  onStepChange: (step: TutorialStep) => void;
  onClose: () => void;
}

export class TutorialGuide {
  private readonly element: HTMLElement;
  private readonly callbacks: TutorialCallbacks;
  private currentStepIndex = 0;
  private isActive = false;

  constructor(root: HTMLElement, callbacks: TutorialCallbacks) {
    this.callbacks = callbacks;
    this.element = document.createElement('div');
    this.element.className = 'tutorial-modal';
    this.element.style.display = 'none';
    root.appendChild(this.element);
  }

  start(initialStep = 0) {
    this.isActive = true;
    this.currentStepIndex = Math.max(0, Math.min(initialStep, TUTORIAL_STEPS.length - 1));
    this.element.style.display = 'block';
    this.render();
    this.emitStep();
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  close() {
    this.isActive = false;
    this.element.style.display = 'none';
    this.callbacks.onClose();
  }

  private next() {
    if (this.currentStepIndex < TUTORIAL_STEPS.length - 1) {
      this.currentStepIndex++;
      this.render();
      this.emitStep();
    } else {
      this.close();
    }
  }

  private prev() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.render();
      this.emitStep();
    }
  }

  private emitStep() {
    const step = TUTORIAL_STEPS[this.currentStepIndex];
    this.callbacks.onStepChange(step);
  }

  private render() {
    const step = TUTORIAL_STEPS[this.currentStepIndex];
    const total = TUTORIAL_STEPS.length;
    const isFirst = this.currentStepIndex === 0;
    const isLast = this.currentStepIndex === total - 1;

    const dotsHtml = TUTORIAL_STEPS.map((_, i) => {
      const cls = i === this.currentStepIndex ? 'dot active' : 'dot';
      return `<button class="${cls}" data-step="${i}" title="跳至第 ${i + 1} 步"></button>`;
    }).join('');

    const bodyHtml = step.body.map((p) => `<p>${p}</p>`).join('');

    this.element.innerHTML = `
      <div class="tutorial-card">
        <div class="tutorial-header">
          <div class="tutorial-step-tag">
            <span class="step-num">步驟 ${this.currentStepIndex + 1} / ${total}</span>
            <span class="step-badge">${step.badge}</span>
          </div>
          <button class="tutorial-close-btn" id="btn-tutorial-close">×</button>
        </div>

        <h3 class="tutorial-title">${step.title}</h3>

        <div class="tutorial-content">
          ${bodyHtml}
          <div class="tutorial-tip">
            <span class="tip-icon">💡</span>
            <span class="tip-text"><strong>飛手筆記：</strong>${step.pilotTip}</span>
          </div>
        </div>

        <div class="tutorial-footer">
          <div class="tutorial-dots">
            ${dotsHtml}
          </div>
          <div class="tutorial-nav">
            ${!isFirst ? '<button class="btn btn-secondary" id="btn-tutorial-prev">上一步</button>' : ''}
            <button class="btn btn-primary" id="btn-tutorial-next">
              ${isLast ? '完成導覽 🎉' : '下一步 →'}
            </button>
          </div>
        </div>
      </div>
    `;

    this.element.querySelector('#btn-tutorial-close')?.addEventListener('click', () => this.close());
    this.element.querySelector('#btn-tutorial-prev')?.addEventListener('click', () => this.prev());
    this.element.querySelector('#btn-tutorial-next')?.addEventListener('click', () => this.next());

    this.element.querySelectorAll('.dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        const targetStep = parseInt(dot.getAttribute('data-step') || '0', 10);
        this.currentStepIndex = targetStep;
        this.render();
        this.emitStep();
      });
    });
  }
}
