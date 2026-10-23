import * as THREE from 'three';
import outlineData from '../data/generated/outline.json';
import { BOARD } from '../data/boardSpec';
import type { MaterialLibrary } from './materials';

export interface PCBBuildResult {
  group: THREE.Group;
  topFaceMesh: THREE.Mesh;
  bottomFaceMesh: THREE.Mesh;
  substrateMesh: THREE.Mesh;
  holes: { x: number; z: number; r: number }[];
}

/**
 * Builds the 1.0 mm thick 3-hole PCB model for Matrix 1S 5IN1 II.
 */
export function createPCB(materials: MaterialLibrary): PCBBuildResult {
  const group = new THREE.Group();
  group.name = 'pcb_assembly';

  // 1. Build 2D shape in (x, y) where y = -z (so forward -Z maps to +y)
  const shape = new THREE.Shape();
  const rawPts = outlineData.outline as [number, number][];
  rawPts.forEach(([x, z], i) => {
    const y = -z;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();

  // Add the 3 holes (CW direction in 2D shape)
  const holes = outlineData.holes as { x: number; z: number; r: number }[];
  holes.forEach((h) => {
    const hole = new THREE.Path();
    hole.absarc(h.x, -h.z, h.r, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  });

  // 2. Extruded Substrate Mesh (1.0 mm thickness)
  const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: BOARD.thicknessMm,
    bevelEnabled: false,
    curveSegments: 24,
  });
  const ePos = extrudeGeo.attributes.position;
  for (let i = 0; i < ePos.count; i++) {
    const x = ePos.getX(i);
    const y = ePos.getY(i);
    const zExt = ePos.getZ(i);
    ePos.setXYZ(i, x, zExt - BOARD.thicknessMm / 2, -y);
  }
  extrudeGeo.computeVertexNormals();

  const substrateMesh = new THREE.Mesh(extrudeGeo, materials.substrateEdge);
  substrateMesh.name = 'pcb_substrate';
  substrateMesh.userData = { componentId: 'board', isPCB: true };
  group.add(substrateMesh);

  // 3. Top Face Finish Plate
  const topGeo = new THREE.ShapeGeometry(shape, 24);
  const tPos = topGeo.attributes.position;
  const tUvs = new Float32Array(tPos.count * 2);
  const ext = BOARD.textureExtentMm;
  const span = ext * 2;
  for (let i = 0; i < tPos.count; i++) {
    const x = tPos.getX(i);
    const y = tPos.getY(i);
    const z = -y;
    tPos.setXYZ(i, x, BOARD.thicknessMm / 2 + 0.002, z);
    tUvs[i * 2] = (x + ext) / span;
    tUvs[i * 2 + 1] = (ext - z) / span;
  }
  topGeo.setAttribute('uv', new THREE.BufferAttribute(tUvs, 2));
  topGeo.computeVertexNormals();

  const topFaceMesh = new THREE.Mesh(topGeo, materials.topFaceMat);
  topFaceMesh.name = 'pcb_top_face';
  topFaceMesh.userData = { componentId: 'board', isPCB: true, face: 'top' };
  group.add(topFaceMesh);

  // 4. Bottom Face Finish Plate
  const botGeo = new THREE.ShapeGeometry(shape, 24);
  const bPos = botGeo.attributes.position;
  const bUvs = new Float32Array(bPos.count * 2);
  for (let i = 0; i < bPos.count; i++) {
    const x = bPos.getX(i);
    const y = bPos.getY(i);
    const z = -y;
    bPos.setXYZ(i, x, -BOARD.thicknessMm / 2 - 0.002, z);
    bUvs[i * 2] = (x + ext) / span;
    bUvs[i * 2 + 1] = (ext - z) / span;
  }
  botGeo.setAttribute('uv', new THREE.BufferAttribute(bUvs, 2));
  // Reverse indices to point normal downward (-Y)
  const bIdx = botGeo.getIndex();
  if (bIdx) {
    const arr = bIdx.array;
    for (let i = 0; i < arr.length; i += 3) {
      const tmp = arr[i + 1];
      arr[i + 1] = arr[i + 2];
      arr[i + 2] = tmp;
    }
  }
  botGeo.computeVertexNormals();

  const bottomFaceMesh = new THREE.Mesh(botGeo, materials.bottomFaceMat);
  bottomFaceMesh.name = 'pcb_bottom_face';
  bottomFaceMesh.userData = { componentId: 'board', isPCB: true, face: 'bottom' };
  group.add(bottomFaceMesh);

  // 5. Exposed gold rings at each of the 3 mounting holes
  holes.forEach((h) => {
    const ringShape = new THREE.Shape();
    ringShape.absarc(0, 0, h.r + 0.9, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, h.r + 0.04, 0, Math.PI * 2, true);
    ringShape.holes.push(holePath);

    const ringGeo = new THREE.ShapeGeometry(ringShape, 32);
    ringGeo.rotateX(-Math.PI / 2);

    // Top ring
    const topRing = new THREE.Mesh(ringGeo, materials.goldPlating);
    topRing.position.set(h.x, BOARD.thicknessMm / 2 + 0.005, h.z);
    topRing.userData = { componentId: 'board', isPCB: true };
    group.add(topRing);

    // Bottom ring
    const botRingGeo = ringGeo.clone();
    botRingGeo.rotateX(Math.PI);
    const botRing = new THREE.Mesh(botRingGeo, materials.goldPlating);
    botRing.position.set(h.x, -BOARD.thicknessMm / 2 - 0.005, h.z);
    botRing.userData = { componentId: 'board', isPCB: true };
    group.add(botRing);
  });

  return {
    group,
    topFaceMesh,
    bottomFaceMesh,
    substrateMesh,
    holes,
  };
}
