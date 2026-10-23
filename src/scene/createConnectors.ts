import * as THREE from 'three';
import type { MaterialLibrary } from './materials';
import { placements, type Placement } from '../data/placement';
import { BOARD } from '../data/boardSpec';

/**
 * Creates 3D volumetric meshes for connectors (JST1.25 motor plugs, SH1.0 USB header, U.FL socket).
 */
export function createConnectors(materials: MaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  group.name = 'connectors_assembly';

  const connectorPlacements = placements.filter(
    (p) => p.kind === 'jst' || p.kind === 'sh_vertical' || p.kind === 'sh_side' || p.kind === 'ufl'
  );

  connectorPlacements.forEach((p) => {
    let mesh: THREE.Object3D;
    if (p.kind === 'jst') {
      mesh = createJST125(materials, p);
    } else if (p.kind === 'sh_vertical') {
      mesh = createSH10Vertical(materials, p);
    } else if (p.kind === 'sh_side') {
      mesh = createSH10Side(materials, p);
    } else {
      mesh = createUFL(materials, p);
    }

    const yBase = p.side === 'top' ? BOARD.thicknessMm / 2 : -BOARD.thicknessMm / 2;

    mesh.position.set(p.xMm, yBase, p.zMm);
    if (p.side === 'bottom') {
      mesh.rotation.x = Math.PI;
      mesh.rotation.y = -p.rotationRad;
    } else {
      mesh.rotation.y = p.rotationRad;
    }

    // Set userData recursively
    mesh.traverse((node) => {
      node.userData.componentId = p.id;
      node.userData.placementKey = p.key;
      node.userData.partKind = p.kind;
      node.userData.subLabel = p.subLabel;
    });

    group.add(mesh);
  });

  return group;
}

/**
 * 3-pin JST-1.25 receptacle with recessed cavity and contact pins.
 */
function createJST125(materials: MaterialLibrary, p: Placement): THREE.Group {
  const g = new THREE.Group();
  g.name = `jst_${p.key}`;

  const [w, d, h] = p.sizeMm;
  const wall = 0.5;

  // Base / outer housing
  const outerGeo = new THREE.BoxGeometry(w, h, d);
  // Shift so bottom is at y=0
  outerGeo.translate(0, h / 2, 0);

  // Hollow cavity on the top/front face
  const cavityH = h * 0.7;
  const cavityGeo = new THREE.BoxGeometry(w - wall * 2, cavityH, d - wall * 2);
  cavityGeo.translate(0, h - cavityH / 2 + 0.01, 0);

  // Main body
  const body = new THREE.Mesh(outerGeo, materials.jstNylon);
  g.add(body);

  // Internal dark cavity representation
  const innerMat = materials.substrateEdge;
  const cavity = new THREE.Mesh(cavityGeo, innerMat);
  g.add(cavity);

  // 3 Brass pins inside
  const pinGeo = new THREE.CylinderGeometry(0.12, 0.12, cavityH * 0.85, 8);
  const pinSpacing = 1.25;
  for (let i = -1; i <= 1; i++) {
    const pin = new THREE.Mesh(pinGeo, materials.connectorPin);
    pin.position.set(i * pinSpacing, h - cavityH * 0.45, 0);
    g.add(pin);
  }

  // Side solder tabs
  const tabGeo = new THREE.BoxGeometry(0.3, 0.8, d * 0.5);
  const leftTab = new THREE.Mesh(tabGeo, materials.solderTin);
  leftTab.position.set(-w / 2 - 0.12, 0.4, 0);
  const rightTab = leftTab.clone();
  rightTab.position.x = w / 2 + 0.12;
  g.add(leftTab, rightTab);

  return g;
}

/**
 * SH1.0 4-Pin USB connector at the rear edge.
 */
function createSH10Vertical(materials: MaterialLibrary, p: Placement): THREE.Group {
  const g = new THREE.Group();
  g.name = `sh10_usb_${p.key}`;

  const [w, d, h] = p.sizeMm;
  const wall = 0.5;

  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  bodyGeo.translate(0, h / 2, 0);
  const body = new THREE.Mesh(bodyGeo, materials.shBody);
  g.add(body);

  // Cavity
  const cavH = h * 0.75;
  const cavGeo = new THREE.BoxGeometry(w - wall * 2, cavH, d - wall * 2);
  cavGeo.translate(0, h - cavH / 2 + 0.01, 0);
  const cav = new THREE.Mesh(cavGeo, materials.substrateEdge);
  g.add(cav);

  // 4 gold contact pins
  const pinGeo = new THREE.BoxGeometry(0.15, cavH * 0.75, 0.15);
  const pitch = 1.0;
  for (let i = 0; i < 4; i++) {
    const pin = new THREE.Mesh(pinGeo, materials.connectorPin);
    pin.position.set((i - 1.5) * pitch, h - cavH * 0.45, 0);
    g.add(pin);
  }

  // Solder ground tabs on sides
  const tabGeo = new THREE.BoxGeometry(0.35, 1.2, 1.5);
  const tabL = new THREE.Mesh(tabGeo, materials.solderTin);
  tabL.position.set(-w / 2 - 0.15, 0.6, 0);
  const tabR = tabL.clone();
  tabR.position.x = w / 2 + 0.15;
  g.add(tabL, tabR);

  return g;
}

/**
 * Camera SH1.0 side connector on top face.
 */
function createSH10Side(materials: MaterialLibrary, p: Placement): THREE.Group {
  const g = new THREE.Group();
  const [w, d, h] = p.sizeMm;

  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  bodyGeo.translate(0, h / 2, 0);
  const body = new THREE.Mesh(bodyGeo, materials.shBody);
  g.add(body);

  return g;
}

/**
 * Gold U.FL (IPEX) antenna receptacle.
 */
function createUFL(materials: MaterialLibrary, p: Placement): THREE.Group {
  const g = new THREE.Group();
  g.name = `ufl_${p.key}`;

  // Square base plate
  const baseGeo = new THREE.BoxGeometry(2.6, 0.35, 2.6);
  baseGeo.translate(0, 0.175, 0);
  const base = new THREE.Mesh(baseGeo, materials.goldPlating);
  g.add(base);

  // Outer cylindrical rim
  const rimGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.9, 16);
  rimGeo.translate(0, 0.35 + 0.45, 0);
  const rim = new THREE.Mesh(rimGeo, materials.goldPlating);
  g.add(rim);

  // Inner plastic insulator ring
  const insGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.85, 16);
  insGeo.translate(0, 0.35 + 0.45, 0);
  const ins = new THREE.Mesh(insGeo, materials.substrateEdge);
  g.add(ins);

  // Center gold contact pin
  const pinGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.9, 8);
  pinGeo.translate(0, 0.35 + 0.45, 0);
  const pin = new THREE.Mesh(pinGeo, materials.goldPlating);
  g.add(pin);

  return g;
}
