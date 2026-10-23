export interface ToolbarCallbacks {
  onViewTop: () => void;
  onViewBottom: () => void;
  onViewReset: () => void;
  onOpenTutorial: () => void;
  onToggleList: () => void;
}

export class Toolbar {
  private readonly container: HTMLElement;

  constructor(root: HTMLElement, callbacks: ToolbarCallbacks) {
    this.container = document.createElement('div');
    this.container.className = 'top-toolbar';
    root.appendChild(this.container);

    this.render(callbacks);
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
        <button class="tool-btn highlight-btn" id="btn-open-tutorial" title="開啟互動式繁體中文教學">
          🎓 互動教學
        </button>
        <button class="tool-btn" id="btn-toggle-list" title="瀏覽元件索引清單">
          📋 元件目錄
        </button>
      </div>
    `;

    // Event listeners
    this.container.querySelector('#btn-view-top')?.addEventListener('click', callbacks.onViewTop);
    this.container.querySelector('#btn-view-bottom')?.addEventListener('click', callbacks.onViewBottom);
    this.container.querySelector('#btn-view-reset')?.addEventListener('click', callbacks.onViewReset);

    this.container.querySelector('#btn-open-tutorial')?.addEventListener('click', callbacks.onOpenTutorial);
    this.container.querySelector('#btn-toggle-list')?.addEventListener('click', callbacks.onToggleList);
  }
}
