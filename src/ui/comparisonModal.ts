import type { MaterialLibrary } from '../scene/materials';

export interface ComparisonModalCallbacks {
  onApplyMode: (mode: 'photo' | 'procedural') => void;
}

/**
 * Three-Way Comparison Modal.
 * Compares:
 * 1. BETAFPV Official Photograph
 * 2. Current Photo-textured 3D Model
 * 3. New Physically Plausible Procedural PCB Mode
 */
export class ComparisonModal {
  private readonly backdrop: HTMLElement;
  private currentFace: 'top' | 'bottom' = 'top';
  private readonly materials: MaterialLibrary;
  private readonly callbacks: ComparisonModalCallbacks;

  constructor(root: HTMLElement, materials: MaterialLibrary, callbacks: ComparisonModalCallbacks) {
    this.materials = materials;
    this.callbacks = callbacks;

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'comparison-modal-backdrop';
    this.backdrop.style.display = 'none';
    root.appendChild(this.backdrop);

    this.render();
  }

  show(face: 'top' | 'bottom' = 'top') {
    this.currentFace = face;
    this.render();
    this.backdrop.style.display = 'flex';
  }

  hide() {
    this.backdrop.style.display = 'none';
  }

  toggle(face: 'top' | 'bottom' = 'top') {
    if (this.backdrop.style.display === 'flex') {
      this.hide();
    } else {
      this.show(face);
    }
  }

  private render() {
    const isTop = this.currentFace === 'top';
    const activeMode = this.materials.getTextureMode();

    // Image sources
    const officialPhotoSrc = isTop ? './references/solderfree_front.jpg' : './references/solderfree_back.jpg';
    const photoModeSrc = isTop ? './assets/top_photo.jpg' : './assets/bottom_photo.jpg';

    // Procedural canvas image
    let proceduralSrc = '';
    const procSuit = isTop ? this.materials.topProcedural : this.materials.bottomProcedural;
    if (procSuit?.colorCanvas) {
      try {
        proceduralSrc = procSuit.colorCanvas.toDataURL('image/jpeg', 0.85);
      } catch {
        proceduralSrc = isTop ? './assets/top_artwork.png' : './assets/bottom_artwork.png';
      }
    } else {
      proceduralSrc = isTop ? './assets/top_artwork.png' : './assets/bottom_artwork.png';
    }

    this.backdrop.innerHTML = `
      <div class="comparison-card">
        <div class="comparison-header">
          <div class="comparison-title-wrap">
            <h2 class="comparison-title">🔍 飛控貼圖與精度三方對比 (3-Way Comparison View)</h2>
            <div class="comparison-subtitle">
              對比「BETAFPV 官方照片」、「現行相片貼圖模型」與「擬真物理程序化 PCB 模式」
            </div>
          </div>
          <div class="comparison-controls">
            <div class="face-toggle-group">
              <button class="face-btn ${isTop ? 'active' : ''}" id="btn-comp-face-top">正面 (Top Face)</button>
              <button class="face-btn ${!isTop ? 'active' : ''}" id="btn-comp-face-bottom">背面 (Bottom Face)</button>
            </div>
            <button class="modal-close-btn" id="btn-close-comparison" title="關閉對比">✕</button>
          </div>
        </div>

        <div class="comparison-grid">
          <!-- Column 1: Official Photograph -->
          <div class="comparison-col">
            <div class="comparison-col-header">
              <span class="col-badge badge-official">1. 官方實體照片</span>
              <h3 class="col-title">BETAFPV 原廠實拍照</h3>
            </div>
            <div class="comparison-img-box">
              <img src="${officialPhotoSrc}" alt="BETAFPV 官方實體照片" class="comparison-img" />
            </div>
            <div class="comparison-details">
              <div class="detail-tag tag-official">原廠出廠真實硬體</div>
              <ul class="detail-list">
                <li><span class="icon-pos">✓</span> 真實反映焊接成型、晶片絲印與接頭實貌</li>
                <li><span class="icon-neg">✗</span> 鏡頭透視、拍攝傾角與反光光斑</li>
                <li><span class="icon-neg">✗</span> JST/SH1.0 立體接頭遮擋底部焊盤</li>
                <li><span class="icon-neg">✗</span> 單一角度照射產生強烈固定陰影</li>
              </ul>
            </div>
          </div>

          <!-- Column 2: Current Photo Texture Mode -->
          <div class="comparison-col">
            <div class="comparison-col-header">
              <span class="col-badge badge-photo">2. 現行相片貼圖模型</span>
              <h3 class="col-title">實體相片投影 3D 模型</h3>
            </div>
            <div class="comparison-img-box">
              <img src="${photoModeSrc}" alt="現行相片貼圖模型" class="comparison-img" />
            </div>
            <div class="comparison-details">
              <div class="detail-tag tag-photo">相片平面投影 (Photo Mode)</div>
              <ul class="detail-list">
                <li><span class="icon-pos">✓</span> 直觀呈現官方照片紋理</li>
                <li><span class="icon-neg">✗</span> 拍攝時的陰影被「烘焙」在 PCB 表面</li>
                <li><span class="icon-neg">✗</span> 金屬接腳反光被誤判為銅箔走線</li>
                <li><span class="icon-neg">✗</span> 3D 晶片模型底下重複印有 2D 晶片剪影</li>
              </ul>
            </div>
          </div>

          <!-- Column 3: Procedural PCB Mode (New) -->
          <div class="comparison-col highlight-col">
            <div class="comparison-col-header">
              <span class="col-badge badge-procedural">3. 擬真物理程序化 PCB</span>
              <h3 class="col-title">Procedural PCB Mode (新)</h3>
            </div>
            <div class="comparison-img-box">
              <img src="${proceduralSrc}" alt="擬真物理程序化 PCB" class="comparison-img" />
            </div>
            <div class="comparison-details">
              <div class="detail-tag tag-procedural">PBR 物理分層重構</div>
              <ul class="detail-list">
                <li><span class="icon-pos">✓</span> <b>零烘焙陰影</b>：純淨消光黑防焊漆 (Satin Mask)</li>
                <li><span class="icon-pos">✓</span> <b>PBR 金屬高光</b>：ENIG 鍍金焊盤金屬度 0.96 / 粗糙度 0.22</li>
                <li><span class="icon-pos">✓</span> <b>無重複影子</b>：3D 晶片精確貼合於裸銅焊盤之上</li>
                <li><span class="icon-pos">✓</span> <b>官方標籤考證</b>：↑ FRONT、BATT+、GND、RX-ANT、ESC1~4</li>
                <li><span class="icon-pos">✓</span> <b>無杜撰線路</b>：忠於真實現代高密度黑漆電路板</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="comparison-footer">
          <div class="footer-info">
            當前視圖貼圖狀態：<strong style="color: ${activeMode === 'procedural' ? '#38bdf8' : '#f59e0b'};">
              ${activeMode === 'procedural' ? '擬真物理程序化 PCB 模式 (PBR)' : '實體相片貼圖模式 (Photo)'}
            </strong>
          </div>
          <div class="footer-actions">
            <button class="comp-btn btn-apply-photo" id="btn-comp-apply-photo">
              切換至實體相片模式
            </button>
            <button class="comp-btn btn-apply-procedural" id="btn-comp-apply-procedural">
              ⚡ 啟用擬真程序化 PCB 模式
            </button>
            <button class="comp-btn btn-close" id="btn-comp-done">
              關閉對比
            </button>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    this.backdrop.querySelector('#btn-comp-face-top')?.addEventListener('click', () => {
      this.currentFace = 'top';
      this.render();
    });

    this.backdrop.querySelector('#btn-comp-face-bottom')?.addEventListener('click', () => {
      this.currentFace = 'bottom';
      this.render();
    });

    this.backdrop.querySelector('#btn-close-comparison')?.addEventListener('click', () => {
      this.hide();
    });

    this.backdrop.querySelector('#btn-comp-done')?.addEventListener('click', () => {
      this.hide();
    });

    this.backdrop.querySelector('#btn-comp-apply-procedural')?.addEventListener('click', () => {
      this.callbacks.onApplyMode('procedural');
      this.render();
    });

    this.backdrop.querySelector('#btn-comp-apply-photo')?.addEventListener('click', () => {
      this.callbacks.onApplyMode('photo');
      this.render();
    });

    // Close on clicking backdrop outside card
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.hide();
      }
    });
  }
}
