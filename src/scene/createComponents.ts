import * as THREE from 'three';
import type { MaterialLibrary } from './materials';
import { placements, type Placement } from '../data/placement';
import { BOARD } from '../data/boardSpec';
import passivesData from '../data/generated/passives.json';

/**
 * Creates 3D volumetric models of all ICs, passive MLCCs, crystals, shunt resistor, and test pads.
 */
export function createComponents(materials: MaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  group.name = 'components_assembly';

  // 1. Discrete placed components from placement table (excluding connectors handled in createConnectors)
  const discretePlacements = placements.filter(
    (p) => p.kind !== 'jst' && p.kind !== 'sh_vertical' && p.kind !== 'sh_side' && p.kind !== 'ufl'
  );

  discretePlacements.forEach((p) => {
    const mesh = createDiscretePart(materials, p);
    const yBase = p.side === 'top' ? BOARD.thicknessMm / 2 : -BOARD.thicknessMm / 2;

    mesh.position.set(p.xMm, yBase, p.zMm);
    if (p.side === 'bottom') {
      mesh.rotation.x = Math.PI;
      mesh.rotation.y = -p.rotationRad;
    } else {
      mesh.rotation.y = p.rotationRad;
    }

    mesh.traverse((node) => {
      node.userData.componentId = p.id;
      node.userData.placementKey = p.key;
      node.userData.partKind = p.kind;
      node.userData.subLabel = p.subLabel;
      node.userData.side = p.side;
    });

    group.add(mesh);
  });

  // 2. Passives (MLCC capacitors detected by photo pipeline)
  const topPassives = passivesData.top as { x: number; z: number; len: number; wid: number; rot: number }[];
  const botPassives = passivesData.bottom as { x: number; z: number; len: number; wid: number; rot: number }[];

  topPassives.forEach((p, idx) => {
    const cap = createMLCC(materials, p.len, p.wid, 0.6);
    cap.position.set(p.x, BOARD.thicknessMm / 2, p.z);
    cap.rotation.y = p.rot;
    cap.traverse((node) => {
      node.userData.componentId = null; // decorative passive
      node.userData.placementKey = `mlcc_top_${idx}`;
    });
    group.add(cap);
  });

  botPassives.forEach((p, idx) => {
    const cap = createMLCC(materials, p.len, p.wid, 0.6);
    cap.position.set(p.x, -BOARD.thicknessMm / 2, p.z);
    cap.rotation.x = Math.PI;
    cap.rotation.y = -p.rot;
    cap.traverse((node) => {
      node.userData.componentId = null;
      node.userData.placementKey = `mlcc_bot_${idx}`;
    });
    group.add(cap);
  });

  return group;
}

function createDiscretePart(materials: MaterialLibrary, p: Placement): THREE.Object3D {
  switch (p.kind) {
    case 'ic':
      return createICPackage(materials, p);
    case 'shunt':
      return createShuntResistor(materials, p);
    case 'metal':
      return createCrystalCan(materials, p);
    case 'thpad':
      return createThroughHolePad(materials, p);
    case 'ceramic':
      return createCeramicAntenna(materials, p);
    case 'button':
      return createTactSwitch(materials, p);
    default: {
      const g = new THREE.BoxGeometry(p.sizeMm[0], p.sizeMm[2], p.sizeMm[1]);
      g.translate(0, p.sizeMm[2] / 2, 0);
      return new THREE.Mesh(g, materials.icBody);
    }
  }
}

/**
 * Surface-mount IC package (QFN/LGA) with lead contacts and optional text silkscreen canvas texture.
 */
function createICPackage(materials: MaterialLibrary, p: Placement): THREE.Group {
  const g = new THREE.Group();
  g.name = `ic_${p.key}`;
  const [w, d, h] = p.sizeMm;

  // Package body
  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  bodyGeo.translate(0, h / 2, 0);

  // If marking text exists, create canvas texture for the top face
  let bodyMat: THREE.Material = materials.icBody;
  if (p.marking) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e2022';
      ctx.fillRect(0, 0, 256, 256);

      // Pin 1 indicator dot
      ctx.fillStyle = '#4a5056';
      ctx.beginPath();
      ctx.arc(32, 32, 12, 0, Math.PI * 2);
      ctx.fill();

      // Text marking
      ctx.fillStyle = '#9eabb5';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const lines = p.marking.split('\n');
      const startY = 128 - ((lines.length - 1) * 34) / 2;
      lines.forEach((line, i) => {
        ctx.fillText(line, 128, startY + i * 34);
      });

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      bodyMat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.55,
        metalness: 0.15,
      });
    }
  }

  const body = new THREE.Mesh(bodyGeo, bodyMat);
  g.add(body);

  // Silver lead terminals along perimeter (gives authentic QFN solder fillet look)
  const leadCountX = Math.max(2, Math.floor(w / 0.8));
  const leadCountZ = Math.max(2, Math.floor(d / 0.8));
  const leadW = 0.25;
  const leadH = 0.12;
  const leadD = 0.35;

  const leadGeoX = new THREE.BoxGeometry(leadW, leadH, leadD);
  const leadGeoZ = new THREE.BoxGeometry(leadD, leadH, leadW);

  // Leads on +/- Z edges
  for (let i = 0; i < leadCountX; i++) {
    const xOff = ((i + 0.5) / leadCountX - 0.5) * (w - 0.4);
    const leadNorth = new THREE.Mesh(leadGeoX, materials.icLead);
    leadNorth.position.set(xOff, leadH / 2, -d / 2);
    const leadSouth = new THREE.Mesh(leadGeoX, materials.icLead);
    leadSouth.position.set(xOff, leadH / 2, d / 2);
    g.add(leadNorth, leadSouth);
  }

  // Leads on +/- X edges
  for (let i = 0; i < leadCountZ; i++) {
    const zOff = ((i + 0.5) / leadCountZ - 0.5) * (d - 0.4);
    const leadWest = new THREE.Mesh(leadGeoZ, materials.icLead);
    leadWest.position.set(-w / 2, leadH / 2, zOff);
    const leadEast = new THREE.Mesh(leadGeoZ, materials.icLead);
    leadEast.position.set(w / 2, leadH / 2, zOff);
    g.add(leadWest, leadEast);
  }

  return g;
}

/**
 * Current shunt sense resistor (R001) with dark resistive ceramic core and large silver alloy lugs.
 */
function createShuntResistor(materials: MaterialLibrary, p: Placement): THREE.Group {
  const g = new THREE.Group();
  g.name = `shunt_${p.key}`;
  const [w, d, h] = p.sizeMm;

  const termW = w * 0.3;
  const centerW = w - termW * 2;

  // Center dark resistive element
  const centerGeo = new THREE.BoxGeometry(centerW, h, d);
  centerGeo.translate(0, h / 2, 0);

  // Text label R001 on top
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  let centerMat: THREE.Material = materials.shuntBody;
  if (ctx) {
    ctx.fillStyle = '#101418';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#e8ecf0';
    ctx.font = 'bold 58px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('R001', 128, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    centerMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.6,
      metalness: 0.2,
    });
  }

  const centerMesh = new THREE.Mesh(centerGeo, centerMat);
  g.add(centerMesh);

  // Left & Right silver termination terminals
  const termGeo = new THREE.BoxGeometry(termW, h * 1.02, d * 1.02);
  termGeo.translate(0, h / 2, 0);
  const leftTerm = new THREE.Mesh(termGeo, materials.solderTin);
  leftTerm.position.x = -w / 2 + termW / 2;
  const rightTerm = new THREE.Mesh(termGeo, materials.solderTin);
  rightTerm.position.x = w / 2 - termW / 2;
  g.add(leftTerm, rightTerm);

  return g;
}

/**
 * Metal crystal oscillator can.
 */
function createCrystalCan(materials: MaterialLibrary, p: Placement): THREE.Group {
  const g = new THREE.Group();
  g.name = `crystal_${p.key}`;
  const [w, d, h] = p.sizeMm;

  const canGeo = new THREE.BoxGeometry(w, h, d);
  canGeo.translate(0, h / 2, 0);
  const can = new THREE.Mesh(canGeo, materials.crystalMetal);
  g.add(can);

  return g;
}

/**
 * Circular exposed plated through-hole solder pad.
 */
function createThroughHolePad(materials: MaterialLibrary, p: Placement): THREE.Group {
  const g = new THREE.Group();
  const r = p.sizeMm[0] / 2;

  const shape = new THREE.Shape();
  shape.absarc(0, 0, r, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, r * 0.45, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ShapeGeometry(shape, 16);
  geo.rotateX(-Math.PI / 2);
  const pad = new THREE.Mesh(geo, materials.goldPlating);
  pad.position.y = 0.01;
  g.add(pad);

  return g;
}

/**
 * Ceramic chip antenna (WiFi-ANT).
 */
function createCeramicAntenna(materials: MaterialLibrary, p: Placement): THREE.Group {
  const g = new THREE.Group();
  const [w, d, h] = p.sizeMm;

  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, h / 2, 0);
  const mesh = new THREE.Mesh(geo, materials.ceramicBody);
  g.add(mesh);

  return g;
}

/**
 * Miniature tactile button (Boot button).
 */
function createTactSwitch(materials: MaterialLibrary, p: Placement): THREE.Group {
  const g = new THREE.Group();
  const [w, d, h] = p.sizeMm;

  // Metal case
  const caseGeo = new THREE.BoxGeometry(w, h * 0.8, d);
  caseGeo.translate(0, (h * 0.8) / 2, 0);
  const casing = new THREE.Mesh(caseGeo, materials.crystalMetal);
  g.add(casing);

  // Center golden actuator dot
  const btnGeo = new THREE.CylinderGeometry(0.4, 0.4, h * 0.3, 12);
  btnGeo.translate(0, h * 0.8 + 0.05, 0);
  const btn = new THREE.Mesh(btnGeo, materials.goldPlating);
  g.add(btn);

  return g;
}

/**
 * Multi-layer Ceramic Capacitor (MLCC) with tan ceramic body and 2 silver end terminations.
 */
function createMLCC(materials: MaterialLibrary, len: number, wid: number, height: number): THREE.Group {
  const g = new THREE.Group();
  const endCapLen = len * 0.22;
  const bodyLen = len - endCapLen * 2;

  // Tan central dielectric body
  const bodyGeo = new THREE.BoxGeometry(bodyLen, height, wid);
  bodyGeo.translate(0, height / 2, 0);
  const bodyMesh = new THREE.Mesh(bodyGeo, materials.mlccTan);
  g.add(bodyMesh);

  // Two silver metal end terminations
  const endGeo = new THREE.BoxGeometry(endCapLen, height * 1.02, wid * 1.02);
  endGeo.translate(0, height / 2, 0);

  const leftEnd = new THREE.Mesh(endGeo, materials.solderTin);
  leftEnd.position.x = -len / 2 + endCapLen / 2;

  const rightEnd = new THREE.Mesh(endGeo, materials.solderTin);
  rightEnd.position.x = len / 2 - endCapLen / 2;

  g.add(leftEnd, rightEnd);

  return g;
}
