import * as THREE from 'three';
import { forwardAnnotation } from '../data/placement';
import type { MaterialLibrary } from './materials';

export class ForwardArrow {
  readonly group: THREE.Group;
  private readonly arrowHead: THREE.Mesh;
  private readonly textMesh: THREE.Mesh;
  private isAnimated = false;
  private animTime = 0;

  constructor(materials: MaterialLibrary) {
    this.group = new THREE.Group();
    this.group.name = 'forward_indicator';

    // 1. Arrow 3D shape (pointing in -Z direction)
    const arrowShape = new THREE.Shape();
    // Tip at (0, -len)
    const len = forwardAnnotation.lengthMm;
    const halfW = 2.4;
    const stemHalfW = 0.8;
    const tipLen = 2.8;

    arrowShape.moveTo(0, -len);
    arrowShape.lineTo(halfW, -len + tipLen);
    arrowShape.lineTo(stemHalfW, -len + tipLen);
    arrowShape.lineTo(stemHalfW, 0);
    arrowShape.lineTo(-stemHalfW, 0);
    arrowShape.lineTo(-stemHalfW, -len + tipLen);
    arrowShape.lineTo(-halfW, -len + tipLen);
    arrowShape.closePath();

    const arrowGeo = new THREE.ExtrudeGeometry(arrowShape, {
      depth: 0.6,
      bevelEnabled: true,
      bevelThickness: 0.15,
      bevelSize: 0.15,
      bevelSegments: 2,
    });
    // In shape (x, y), y is along -Z. Rotate so shape y is along 3D -Z, and depth is along Y:
    // If we rotate X by -PI/2:
    // y' = z_ext, z' = -y.
    // If shape y is negative, z' = -(-len) = +len (pointing toward +Z, which is rear!).
    // So let's invert y or rotate by +PI/2:
    arrowGeo.rotateX(Math.PI / 2);

    this.arrowHead = new THREE.Mesh(arrowGeo, materials.forwardArrowMat);
    this.arrowHead.position.set(0, 0.4, 0);
    this.group.add(this.arrowHead);

    // 2. Text label billboard: "↑ 機頭前方 / FRONT"
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(10, 25, 35, 0.85)';
      ctx.roundRect(10, 10, 492, 108, 24);
      ctx.fill();

      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 4;
      ctx.roundRect(10, 10, 492, 108, 24);
      ctx.stroke();

      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▲ 機頭方向 FRONT', 256, 64);
    }
    const labelTex = new THREE.CanvasTexture(canvas);
    labelTex.colorSpace = THREE.SRGBColorSpace;

    const labelMat = new THREE.MeshBasicMaterial({
      map: labelTex,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const labelGeo = new THREE.PlaneGeometry(8, 2);
    labelGeo.rotateX(-Math.PI / 2);
    this.textMesh = new THREE.Mesh(labelGeo, labelMat);
    this.textMesh.position.set(0, 0.5, 2.8);
    this.group.add(this.textMesh);

    // Position whole group at forwardAnnotation coordinates
    this.group.position.set(forwardAnnotation.xMm, 0.2, forwardAnnotation.zMm);

    // Tag for picking
    this.group.traverse((child) => {
      child.userData.componentId = 'forward';
      child.userData.isAnnotation = true;
    });
  }

  setPulse(active: boolean) {
    this.isAnimated = active;
    if (!active) {
      this.arrowHead.position.z = 0;
      this.arrowHead.scale.set(1, 1, 1);
    }
  }

  update(deltaSeconds: number) {
    if (!this.isAnimated) return;
    this.animTime += deltaSeconds * 4.0;
    const offsetZ = Math.sin(this.animTime) * 0.8 - 0.4;
    this.arrowHead.position.z = offsetZ;
    const s = 1.0 + Math.sin(this.animTime) * 0.08;
    this.arrowHead.scale.set(s, 1, s);
  }
}
