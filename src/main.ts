import * as THREE from 'three';
import { setupScene } from './scene/setupScene';
import { MaterialLibrary } from './scene/materials';
import { createPCB } from './scene/createPCB';
import { createConnectors } from './scene/createConnectors';
import { createComponents } from './scene/createComponents';
import { ForwardArrow } from './scene/forwardArrow';
import { CameraManager } from './scene/cameraControls';
import { Picker } from './scene/picking';
import { HighlightManager } from './scene/highlight';

import { InfoCard } from './ui/infoCard';
import { Toolbar } from './ui/toolbar';
import { TutorialGuide } from './ui/tutorial';
import { ComponentDrawer, AbsentModal } from './ui/glossary';
import { componentCatalog, type ComponentId } from './data/components';
import { placements } from './data/placement';

// State
let selectedId: ComponentId | null = null;
let hoveredId: ComponentId | null = null;

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch {
    return false;
  }
}

function init() {
  const appContainer = document.getElementById('app');
  const canvasContainer = document.getElementById('canvas-container');
  const tooltip = document.getElementById('hover-tooltip') as HTMLElement;

  if (!appContainer || !canvasContainer) return;

  if (!checkWebGL()) {
    canvasContainer.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #f87171;">
        <h2>⚠️ 您的瀏覽器不支援 WebGL</h2>
        <p style="margin-top: 10px; color: #cbd5e1;">請使用支援硬體加速的現代瀏覽器（如 Chrome, Edge, Safari, Firefox）開啟此 3D 飛控探索器。</p>
      </div>
    `;
    return;
  }

  // 1. Scene setup
  const sceneCtx = setupScene(canvasContainer);

  // 2. Materials & texture loading
  const materials = new MaterialLibrary();
  materials.loadTextures();

  // 3. PCB Substrate & Plates
  const pcb = createPCB(materials);
  sceneCtx.scene.add(pcb.group);

  // 4. Connectors (JST, SH1.0, U.FL)
  const connectors = createConnectors(materials);
  sceneCtx.scene.add(connectors);

  // 5. ICs & Passives
  const components = createComponents(materials);
  sceneCtx.scene.add(components);

  // 6. Forward Arrow Annotation
  const forwardArrow = new ForwardArrow(materials);
  sceneCtx.scene.add(forwardArrow.group);

  // 7. Camera & Controls
  const camManager = new CameraManager(sceneCtx.camera, sceneCtx.renderer.domElement);

  // 8. Picker & Highlight
  const picker = new Picker(sceneCtx.scene, sceneCtx.camera);
  const highlight = new HighlightManager(sceneCtx.scene);

  // 9. UI Components
  const infoCard = new InfoCard(appContainer, {
    onFocusPart: (id) => focusComponent(id),
    onClearSelection: () => selectComponent(null),
    onSelectComponent: (id) => selectComponent(id),
  });

  const absentModal = new AbsentModal(appContainer, (id) => {
    selectComponent(id);
  });

  const drawer = new ComponentDrawer(appContainer, (id) => {
    if (id === null) {
      selectComponent(null);
    } else {
      selectComponent(id);
      focusComponent(id);
    }
  });

  const tutorialGuide = new TutorialGuide(appContainer, {
    onStepChange: (step) => {
      selectComponent(step.componentId);
      if (step.cameraView === 'top') {
        camManager.viewTop();
      } else if (step.cameraView === 'bottom') {
        camManager.viewBottom();
      } else {
        focusComponent(step.componentId);
      }
    },
    onClose: () => {
      // Return to overview
    },
  });

  new Toolbar(appContainer, {
    onViewTop: () => camManager.viewTop(),
    onViewBottom: () => camManager.viewBottom(),
    onViewReset: () => {
      camManager.viewReset();
      selectComponent(null);
    },
    onToggleTexture: (mode) => materials.setTextureMode(mode),
    onOpenTutorial: () => tutorialGuide.start(0),
    onToggleList: () => drawer.toggle(),
    onOpenGlossary: () => absentModal.show(),
  });

  // Selection & Focus helpers
  function selectComponent(id: ComponentId | null) {
    selectedId = id;
    highlight.setSelected(id);
    forwardArrow.setPulse(id === 'forward');
    infoCard.showComponent(id || 'board');
    drawer.setSelected(id);
  }

  function focusComponent(id: ComponentId) {
    if (id === 'forward') {
      camManager.focusPart(new THREE.Vector3(0, 0, -18.5), 'annotation');
      return;
    }
    const targetPos = highlight.getComponentWorldPosition(id);
    if (targetPos) {
      // Check which side this component is primarily on
      const placement = placements.find((p) => p.id === id);
      const side = placement ? placement.side : targetPos.y < 0 ? 'bottom' : 'top';
      camManager.focusPart(targetPos, side);
    } else {
      camManager.viewReset();
    }
  }

  // Pointer Interaction Handling (distinguish drag from click)
  let isPointerDown = false;
  let pointerDownPos = { x: 0, y: 0 };
  let hasDragged = false;

  const dom = sceneCtx.renderer.domElement;

  dom.addEventListener('pointerdown', (e) => {
    isPointerDown = true;
    hasDragged = false;
    pointerDownPos = { x: e.clientX, y: e.clientY };
  });

  dom.addEventListener('pointermove', (e) => {
    const rect = dom.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    if (isPointerDown) {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 4) {
        hasDragged = true;
        tooltip.classList.remove('visible');
        return;
      }
    }

    // Raycast hover only when not dragging (ignore generic PCB board body for hover tooltip)
    const hit = picker.pick(nx, ny);
    if (hit.componentId && hit.componentId !== 'board') {
      hoveredId = hit.componentId;
      dom.style.cursor = 'pointer';

      const info = componentCatalog[hit.componentId];
      const displayName = hit.subLabel
        ? `${info.title.split('｜')[1] || info.title} (${hit.subLabel})`
        : info.title.split('｜')[1] || info.title;

      tooltip.textContent = `${info.abbr} · ${displayName}`;
      tooltip.style.left = `${e.clientX}px`;
      tooltip.style.top = `${e.clientY}px`;
      tooltip.classList.add('visible');
    } else {
      hoveredId = null;
      dom.style.cursor = 'default';
      tooltip.classList.remove('visible');
    }

    highlight.setHover(hoveredId);
  });

  dom.addEventListener('pointerup', (e) => {
    isPointerDown = false;
    if (!hasDragged) {
      const rect = dom.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      const hit = picker.pick(nx, ny);

      if (hit.componentId && hit.componentId !== 'board') {
        if (selectedId === hit.componentId) {
          // Clicking already selected component toggles off
          selectComponent(null);
        } else {
          selectComponent(hit.componentId);
        }
      } else {
        // Click on background or empty PCB clears component selection / returns to overview
        selectComponent(null);
      }
    }
  });

  dom.addEventListener('pointerleave', () => {
    isPointerDown = false;
    hoveredId = null;
    highlight.setHover(null);
    tooltip.classList.remove('visible');
  });

  // Keyboard shortcut: Escape clears selection
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      selectComponent(null);
      drawer.close();
      absentModal.hide();
      tutorialGuide.close();
    }
  });

  // Animation Loop
  let lastTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    camManager.update(delta);
    forwardArrow.update(delta);

    sceneCtx.renderer.render(sceneCtx.scene, sceneCtx.camera);
  }

  animate();
}

window.addEventListener('DOMContentLoaded', init);
