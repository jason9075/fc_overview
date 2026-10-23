import type { ComponentInfo, ComponentId } from '../data/components';
import { componentCatalog } from '../data/components';

export interface InfoCardCallbacks {
  onFocusPart?: (id: ComponentId) => void;
  onClearSelection?: () => void;
  onSelectComponent?: (id: ComponentId) => void;
}

export class InfoCard {
  private readonly container: HTMLElement;
  private callbacks: InfoCardCallbacks = {};
  private currentId: ComponentId = 'board';

  constructor(root: HTMLElement, callbacks?: InfoCardCallbacks) {
    if (callbacks) this.callbacks = callbacks;

    this.container = document.createElement('div');
    this.container.className = 'info-card';
    root.appendChild(this.container);

    this.render(componentCatalog['board']);
  }

  setCallbacks(callbacks: InfoCardCallbacks) {
    this.callbacks = callbacks;
  }

  getCurrentId(): ComponentId {
    return this.currentId;
  }

  showComponent(id: ComponentId, subLabel?: string) {
    this.currentId = id;
    const info = componentCatalog[id] || componentCatalog['board'];
    this.render(info, subLabel);
  }

  private render(info: ComponentInfo, subLabel?: string) {
    const isBoardOverview = info.id === 'board';

    const statusChipsHtml = info.status
      .map((st) => {
        let cls = 'status-verified';
        if (st === '型號依批次不同') cls = 'status-batch';
        else if (st === '推估位置') cls = 'status-estimated';
        else if (st === '未列於此機型官方規格') cls = 'status-absent';
        return `<span class="chip ${cls}">${st}</span>`;
      })
      .join('');

    const descHtml = info.description.map((p) => `<p class="card-desc">${p}</p>`).join('');

    const factsHtml =
      info.facts.length > 0
        ? `
        <div class="card-section">
          <div class="section-title">硬體規格與標籤</div>
          <table class="facts-table">
            <tbody>
              ${info.facts
                .map(
                  (f) => `
                <tr>
                  <td class="fact-label">${f.label}</td>
                  <td class="fact-value">${f.value}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
        : '';

    const noteHtml = info.note
      ? `<div class="card-note"><span class="note-icon">ℹ</span> ${info.note}</div>`
      : '';

    const linksHtml =
      info.links && info.links.length > 0
        ? `
        <div class="card-links">
          ${info.links
            .map(
              (l) => `
            <a href="${l.href}" target="_blank" rel="noopener noreferrer" class="card-link-btn">
              🔗 ${l.label}
            </a>
          `
            )
            .join('')}
        </div>
      `
        : '';

    const focusBtnHtml =
      info.physical && !isBoardOverview
        ? `<button class="btn btn-primary" id="btn-focus-part">🎯 定位元件</button>`
        : '';

    const clearBtnHtml = !isBoardOverview
      ? `<button class="btn btn-secondary" id="btn-clear-selection">飛控總覽</button>`
      : '';

    this.container.innerHTML = `
      <div class="card-header">
        <div class="header-left">
          <span class="card-abbr">${info.abbr}</span>
          <h2 class="card-title">${info.title}${subLabel ? `<span class="card-sublabel">（${subLabel}）</span>` : ''}</h2>
        </div>
        ${!isBoardOverview ? '<button class="card-close-btn" id="btn-card-close" title="返回總覽">×</button>' : ''}
      </div>

      <div class="card-chips">
        ${statusChipsHtml}
      </div>

      <div class="card-body">
        ${descHtml}
        ${factsHtml}
        ${noteHtml}
      </div>

      <div class="card-actions">
        ${focusBtnHtml}
        ${clearBtnHtml}
        ${linksHtml}
      </div>
    `;

    // Bind action events
    const focusBtn = this.container.querySelector('#btn-focus-part');
    if (focusBtn) {
      focusBtn.addEventListener('click', () => {
        if (this.callbacks.onFocusPart) {
          this.callbacks.onFocusPart(info.id);
        }
      });
    }

    const clearBtn = this.container.querySelector('#btn-clear-selection');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (this.callbacks.onClearSelection) {
          this.callbacks.onClearSelection();
        }
      });
    }

    const closeBtn = this.container.querySelector('#btn-card-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (this.callbacks.onClearSelection) {
          this.callbacks.onClearSelection();
        }
      });
    }
  }
}
