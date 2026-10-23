import * as THREE from 'three';
import type { ComponentId } from '../data/components';

export class HighlightManager {
  private readonly scene: THREE.Scene;
  private readonly originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private readonly meshesByComponent = new Map<ComponentId, THREE.Mesh[]>();

  private hoveredId: ComponentId | null = null;
  private selectedId: ComponentId | null = null;

  // Selection accent box wireframe in 3D space
  private readonly selectionBox: THREE.BoxHelper;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.selectionBox = new THREE.BoxHelper(new THREE.Object3D(), 0x00f0ff);
    this.selectionBox.visible = false;
    (this.selectionBox.material as THREE.LineBasicMaterial).linewidth = 2;
    this.selectionBox.renderOrder = 999;
    (this.selectionBox.material as THREE.LineBasicMaterial).depthTest = false;
    this.scene.add(this.selectionBox);

    this.indexMeshes();
  }

  indexMeshes() {
    this.meshesByComponent.clear();
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj.visible) {
        const compId = this.findComponentId(obj);
        if (compId && compId !== 'board') {
          let list = this.meshesByComponent.get(compId);
          if (!list) {
            list = [];
            this.meshesByComponent.set(compId, list);
          }
          list.push(obj as THREE.Mesh);
        }
      }
    });
  }

  setHover(id: ComponentId | null) {
    if (this.hoveredId === id) return;
    this.hoveredId = id;
    this.applyHighlights();
  }

  setSelected(id: ComponentId | null) {
    if (this.selectedId === id) return;
    this.selectedId = id;
    this.applyHighlights();
    this.updateSelectionBox();
  }

  private applyHighlights() {
    // Reset all previously altered meshes to their original materials
    this.originalMaterials.forEach((origMat, mesh) => {
      mesh.material = origMat;
    });
    this.originalMaterials.clear();

    // 1. Apply Hover Highlight (mild emissive glow)
    if (this.hoveredId && this.hoveredId !== this.selectedId && this.hoveredId !== 'board') {
      const meshes = this.meshesByComponent.get(this.hoveredId) || [];
      meshes.forEach((mesh) => {
        this.cacheAndTint(mesh, 0x00c8e6, 0.45);
      });
    }

    // 2. Apply Selected Highlight (strong vibrant emissive glow)
    if (this.selectedId && this.selectedId !== 'board') {
      const meshes = this.meshesByComponent.get(this.selectedId) || [];
      meshes.forEach((mesh) => {
        this.cacheAndTint(mesh, 0x00f0ff, 0.85);
      });
    }
  }

  private cacheAndTint(mesh: THREE.Mesh, emissiveColor: number, intensity: number) {
    if (!this.originalMaterials.has(mesh)) {
      this.originalMaterials.set(mesh, mesh.material);
    }

    const currentMat = mesh.material;
    if (Array.isArray(currentMat)) {
      mesh.material = currentMat.map((m) => this.cloneWithTint(m, emissiveColor, intensity));
    } else {
      mesh.material = this.cloneWithTint(currentMat, emissiveColor, intensity);
    }
  }

  private cloneWithTint(mat: THREE.Material, emissiveColor: number, intensity: number): THREE.Material {
    const clone = mat.clone();
    if ('emissive' in clone) {
      (clone as THREE.MeshStandardMaterial).emissive = new THREE.Color(emissiveColor);
      (clone as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
    }
    return clone;
  }

  private updateSelectionBox() {
    if (!this.selectedId || this.selectedId === 'board') {
      this.selectionBox.visible = false;
      return;
    }

    const meshes = this.meshesByComponent.get(this.selectedId);
    if (!meshes || meshes.length === 0) {
      this.selectionBox.visible = false;
      return;
    }

    // Compute composite bounding box for all meshes in this component group
    const bbox = new THREE.Box3();
    meshes.forEach((m) => {
      m.geometry.computeBoundingBox();
      if (m.geometry.boundingBox) {
        const box = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
        bbox.union(box);
      }
    });

    if (bbox.isEmpty()) {
      this.selectionBox.visible = false;
      return;
    }

    // Expand slightly
    bbox.expandByScalar(0.4);

    // Update selectionBox points directly from bbox
    const dummy = new THREE.Object3D();
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    bbox.getCenter(center);
    bbox.getSize(size);

    dummy.position.copy(center);
    dummy.scale.copy(size);
    this.selectionBox.setFromObject(dummy);
    this.selectionBox.visible = true;
  }

  private findComponentId(obj: THREE.Object3D | null): ComponentId | null {
    for (let node = obj; node; node = node.parent) {
      if (typeof node.userData.componentId === 'string') {
        return node.userData.componentId as ComponentId;
      }
    }
    return null;
  }

  getComponentWorldPosition(id: ComponentId): THREE.Vector3 | null {
    const meshes = this.meshesByComponent.get(id);
    if (!meshes || meshes.length === 0) return null;
    const bbox = new THREE.Box3();
    meshes.forEach((m) => {
      m.geometry.computeBoundingBox();
      if (m.geometry.boundingBox) {
        bbox.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));
      }
    });
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    return center;
  }
}
