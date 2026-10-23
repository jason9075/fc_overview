export interface ToolbarCallbacks {
  onViewTop: () => void;
  onViewBottom: () => void;
  onViewReset: () => void;
  onToggleTexture: (mode: 'photo' | 'procedural') => void;
  onToggleSchematic?: (active: boolean) => void;
  onOpenComparison: () => void;
  onOpenTutorial: () => void;
  onToggleList: () => void;
  onOpenGlossary: () => void;
}

export class Toolbar {
  private readonly container: HTMLElement;
  private currentTextureMode: 'photo' | 'procedural' = 'procedural';
  private schematicActive = false;

  constructor(root: HTMLElement, callbacks: ToolbarCallbacks) {
    this.container = document.createElement('div');
    this.container.className = 'top-toolbar';
    root.appendChild(this.container);

    this.render(callbacks);
  }

  setTextureMode(mode: 'photo' | 'procedural') {
    this.currentTextureMode = mode;
    const texBtn = this.container.querySelector('#btn-toggle-texture') as HTMLButtonElement;
    if (texBtn) {
      texBtn.textContent = `貼圖: ${this.currentTextureMode === 'photo' ? '實體相片' : '擬真 PCB'}`;
    }
  }

  private render(callbacks: ToolbarCallbacks) {
    this.container.innerHTML = `
      <div class="toolbar-brand">
        <span class="brand-badge">5IN1 II</span>
        <span class="brand-title">BETAFPV Matrix 1S 3D 飛控探索器</span>
      </div>

      <div class="toolbar-group">
        <button class="tool-btn" id="btn-view-top" title="正面俯視視角">正面</button>
        <button class="tool-btn" id="btn-view-bottom" title="背面馬達接頭視角">背面</button>
        <button class="tool-btn" id="btn-view-reset" title="重設預設視角">重設視角</button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button class="tool-btn" id="btn-toggle-texture" title="切換實體相片或擬真程序化 PBR 電路板貼圖">
          貼圖: 擬真 PCB
        </button>
        <button class="tool-btn" id="btn-toggle-schematic" title="切換教學示意走線（標示為示意，非真實走線）">
          ⚡ 示意走線: 關
        </button>
        <button class="tool-btn" id="btn-open-comparison" title="對比原廠照片、相片貼圖模型與擬真程序化 PCB">
          🔍 模式對比
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button class="tool-btn highlight-btn" id="btn-open-tutorial" title="開啟互動式繁體中文教學">
          🎓 互動教學
        </button>
        <button class="tool-btn" id="btn-toggle-list" title="瀏覽元件索引清單">
          📋 元件目錄
        </button>
        <button class="tool-btn" id="btn-open-glossary" title="氣壓計與 MicroSD 等未搭載功能概念說明">
          ❓ 未搭載說明
        </button>
      </div>
    `;

    // Event listeners
    this.container.querySelector('#btn-view-top')?.addEventListener('click', callbacks.onViewTop);
    this.container.querySelector('#btn-view-bottom')?.addEventListener('click', callbacks.onViewBottom);
    this.container.querySelector('#btn-view-reset')?.addEventListener('click', callbacks.onViewReset);

    const texBtn = this.container.querySelector('#btn-toggle-texture') as HTMLButtonElement;
    if (texBtn) {
      texBtn.addEventListener('click', () => {
        this.currentTextureMode = this.currentTextureMode === 'photo' ? 'procedural' : 'photo';
        texBtn.textContent = `貼圖: ${this.currentTextureMode === 'photo' ? '實體相片' : '擬真 PCB'}`;
        callbacks.onToggleTexture(this.currentTextureMode);
      });
    }

    const schemBtn = this.container.querySelector('#btn-toggle-schematic') as HTMLButtonElement;
    if (schemBtn) {
      schemBtn.addEventListener('click', () => {
        this.schematicActive = !this.schematicActive;
        schemBtn.textContent = `⚡ 示意走線: ${this.schematicActive ? '開' : '關'}`;
        schemBtn.style.color = this.schematicActive ? '#00e5ff' : '';
        if (callbacks.onToggleSchematic) {
          callbacks.onToggleSchematic(this.schematicActive);
        }
      });
    }

    this.container.querySelector('#btn-open-comparison')?.addEventListener('click', callbacks.onOpenComparison);
    this.container.querySelector('#btn-open-tutorial')?.addEventListener('click', callbacks.onOpenTutorial);
    this.container.querySelector('#btn-toggle-list')?.addEventListener('click', callbacks.onToggleList);
    this.container.querySelector('#btn-open-glossary')?.addEventListener('click', callbacks.onOpenGlossary);
  }
}
