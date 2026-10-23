import { componentCatalog, listOrder, type ComponentId } from '../data/components';

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

    this.element.innerHTML = `
      <div class="drawer-header">
        <h3 class="drawer-title">📋 飛控元件目錄</h3>
        <button class="drawer-close-btn" id="btn-close-drawer">×</button>
      </div>
      <div class="drawer-content">
        <div class="drawer-section-label">板載實體硬體</div>
        ${physicalItemsHtml}
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
