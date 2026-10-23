import { componentCatalog, listOrder, glossaryOrder, type ComponentId } from '../data/components';

export class ComponentDrawer {
  private readonly element: HTMLElement;
  private readonly onSelect: (id: ComponentId | null) => void;
  private isOpen = false;
  private currentSelectedId: ComponentId | null = null;

  constructor(root: HTMLElement, onSelect: (id: ComponentId | null) => void) {
    this.onSelect = onSelect;
    this.element = document.createElement('div');
    this.element.className = 'component-drawer';
    root.appendChild(this.element);

    this.render();
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.element.classList.toggle('open', this.isOpen);
  }

  close() {
    this.isOpen = false;
    this.element.classList.remove('open');
  }

  setSelected(id: ComponentId | null) {
    this.currentSelectedId = id;
    this.element.querySelectorAll('.drawer-item').forEach((el) => {
      const itemId = el.getAttribute('data-id');
      el.classList.toggle('active', itemId === id);
    });
  }

  private render() {
    const physicalItemsHtml = listOrder
      .map((id) => {
        const item = componentCatalog[id];
        return `
          <div class="drawer-item" data-id="${id}">
            <div class="drawer-item-title">
              <span class="drawer-badge">${item.abbr}</span>
              <span>${item.title.split('｜')[1] || item.title}</span>
            </div>
            <div class="drawer-item-sub">${item.facts[0] ? item.facts[0].value : ''}</div>
          </div>
        `;
      })
      .join('');

    const glossaryItemsHtml = glossaryOrder
      .map((id) => {
        const item = componentCatalog[id];
        return `
          <div class="drawer-item glossary-item" data-id="${id}">
            <div class="drawer-item-title">
              <span class="drawer-badge absent">${item.abbr}</span>
              <span>${item.title.split('｜')[1] || item.title}</span>
            </div>
            <div class="drawer-item-sub absent-tag">未搭載於官方規格</div>
          </div>
        `;
      })
      .join('');

    this.element.innerHTML = `
      <div class="drawer-header">
        <h3 class="drawer-title">📋 飛控元件目錄</h3>
        <button class="drawer-close-btn" id="btn-close-drawer">×</button>
      </div>
      <div class="drawer-content">
        <div class="drawer-section-label">板載實體硬體</div>
        ${physicalItemsHtml}
        <div class="drawer-section-label" style="margin-top: 16px;">未搭載功能辨析（知識導覽）</div>
        ${glossaryItemsHtml}
      </div>
    `;

    this.element.querySelector('#btn-close-drawer')?.addEventListener('click', () => this.close());

    this.element.querySelectorAll('.drawer-item').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id') as ComponentId;
        if (id) {
          if (this.currentSelectedId === id) {
            // Clicking currently selected item toggles it off
            this.setSelected(null);
            this.onSelect(null);
          } else {
            // Select and highlight
            this.setSelected(id);
            this.onSelect(id);
          }
        }
      });
    });
  }
}

export class AbsentModal {
  private readonly modal: HTMLElement;

  constructor(root: HTMLElement, onSelectGlossary: (id: ComponentId) => void) {
    this.modal = document.createElement('div');
    this.modal.className = 'modal-backdrop';
    this.modal.style.display = 'none';
    root.appendChild(this.modal);

    const baro = componentCatalog['barometer_glossary'];
    const sd = componentCatalog['microsd_glossary'];

    this.modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">⚠️ 規格辨析：未搭載功能與飛控概念說明</h3>
          <button class="modal-close-btn" id="btn-close-modal">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-intro">
            在 FPV 穿越機與 Betaflight 飛控生態中，常有新手好奇「為什麼這片飛控不能像航拍機一樣自動定高？」「為什麼找不到插記憶卡的地方？」。
            <strong>本款 BETAFPV Matrix 1S 5IN1 II 官方規格明確未搭載氣壓計與 MicroSD 卡槽</strong>，以下為設計原因與技術概念解析：
          </p>

          <div class="concept-card" id="modal-baro-card" style="cursor: pointer;">
            <div class="concept-badge absent">未列於此機型官方規格（點擊載入說明）</div>
            <h4 class="concept-title">${baro.title}</h4>
            <p>${baro.description[0]}</p>
            <p>${baro.description[1]}</p>
            <div class="concept-reason">
              <strong>💡 為什麼 1S Whoop 不搭載氣壓計？</strong><br>
              1S 微型 Whoop 機（如 65mm / 75mm 機架）重量極度敏感（全機含電池常僅 20~30 克）。氣壓計在微型室內機極易受到涵道風道效應、地面效應與室內氣流亂流干擾，造成高度讀數震盪；且 FPV 穿越機追求手動姿態直覺操控（Acro / Angle），故追求極致輕量化而省略。
            </div>
          </div>

          <div class="concept-card" id="modal-sd-card" style="margin-top: 14px; cursor: pointer;">
            <div class="concept-badge absent">未列於此機型官方規格（點擊載入說明）</div>
            <h4 class="concept-title">${sd.title}</h4>
            <p>${sd.description[0]}</p>
            <div class="concept-reason">
              <strong>💡 為什麼改用板載 16 MB Flash？</strong><br>
              實體 MicroSD 卡座重量約 0.5 克，且在高速撞擊與墜機時記憶卡容易彈出噴飛或接腳接觸不良。板載 16 MB SPI 晶片（如 PUYA PY25Q128HA）直接焊在 PCB 上，重量小於 0.05 克且耐衝擊，能完整儲存調參所需的 PID 與陀螺儀日誌。
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" id="btn-modal-ack">我已瞭解</button>
        </div>
      </div>
    `;

    this.modal.querySelector('#btn-close-modal')?.addEventListener('click', () => this.hide());
    this.modal.querySelector('#btn-modal-ack')?.addEventListener('click', () => this.hide());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.hide();
    });

    // Clicking concept cards loads the detailed item into the info card
    const baroCard = this.modal.querySelector('#modal-baro-card');
    baroCard?.addEventListener('click', () => {
      onSelectGlossary('barometer_glossary');
      this.hide();
    });
    const sdCard = this.modal.querySelector('#modal-sd-card');
    sdCard?.addEventListener('click', () => {
      onSelectGlossary('microsd_glossary');
      this.hide();
    });
  }

  show() {
    this.modal.style.display = 'flex';
  }

  hide() {
    this.modal.style.display = 'none';
  }
}
