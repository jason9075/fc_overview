import * as THREE from 'three';
import type { ComponentId } from '../data/components';

export class HighlightManager {
  private readonly scene: THREE.Scene;

  // Mesh indexing
  private readonly meshesByComponent = new Map<ComponentId, THREE.Mesh[]>();
  private readonly meshesByPlacementKey = new Map<string, THREE.Mesh[]>();
  private readonly allManagedMeshes = new Set<THREE.Mesh>();

  // State
  private hoveredId: ComponentId | null = null;
  private selectedId: ComponentId | null = null;
  private selectedPlacementKey: string | null = null;

  // Material caches to avoid memory leaks & redundant allocations on hover
  private readonly originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private readonly hoverMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private readonly selectMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private readonly dimMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

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
    this.meshesByPlacementKey.clear();
    this.allManagedMeshes.clear();

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj.visible) {
        const mesh = obj as THREE.Mesh;
        const compId = this.findComponentId(mesh);
        if (compId && compId !== 'board') {
          // Index by component
          let list = this.meshesByComponent.get(compId);
          if (!list) {
            list = [];
            this.meshesByComponent.set(compId, list);
          }
          list.push(mesh);

          // Index by placementKey (physical part level)
          const pKey = this.findPlacementKey(mesh);
          if (pKey) {
            let pList = this.meshesByPlacementKey.get(pKey);
            if (!pList) {
              pList = [];
              this.meshesByPlacementKey.set(pKey, pList);
            }
            pList.push(mesh);
          }

          this.allManagedMeshes.add(mesh);
          if (!this.originalMaterials.has(mesh)) {
            this.originalMaterials.set(mesh, mesh.material);
          }
        }
      }
    });
  }

  setHover(id: ComponentId | null) {
    if (this.hoveredId === id) return;
    this.hoveredId = id;
    this.applyHighlights();
  }

  setSelected(id: ComponentId | null, placementKey: string | null = null) {
    if (this.selectedId === id && this.selectedPlacementKey === placementKey) return;
    this.selectedId = id;
    this.selectedPlacementKey = placementKey;
    this.applyHighlights();
    this.updateSelectionBox();
  }

  private applyHighlights() {
    // 1. Reset all managed meshes back to original materials
    this.originalMaterials.forEach((origMat, mesh) => {
      mesh.material = origMat;
    });

    // 2. Dim other components when a component is selected (contrast enhancement)
    if (this.selectedId && this.selectedId !== 'board') {
      const selectedMeshes = new Set(this.meshesByComponent.get(this.selectedId) || []);

      this.allManagedMeshes.forEach((mesh) => {
        if (!selectedMeshes.has(mesh)) {
          mesh.material = this.getOrCreateDimMaterial(mesh);
        }
      });

      // 3. Apply Selected Highlight to the target meshes (clean emissive glow, markings visible)
      selectedMeshes.forEach((mesh) => {
        mesh.material = this.getOrCreateSelectMaterial(mesh);
      });
    }

    // 4. Apply Hover Highlight (if hoveredId is not currently selected)
    if (this.hoveredId && this.hoveredId !== this.selectedId && this.hoveredId !== 'board') {
      const hoverMeshes = this.meshesByComponent.get(this.hoveredId) || [];
      hoverMeshes.forEach((mesh) => {
        mesh.material = this.getOrCreateHoverMaterial(mesh);
      });
    }
  }

  private getOrCreateHoverMaterial(mesh: THREE.Mesh): THREE.Material | THREE.Material[] {
    let mat = this.hoverMaterials.get(mesh);
    if (!mat) {
      const orig = this.originalMaterials.get(mesh) || mesh.material;
      mat = this.cloneWithTint(orig, 0x00d8f0, 0.22);
      this.hoverMaterials.set(mesh, mat);
    }
    return mat;
  }

  private getOrCreateSelectMaterial(mesh: THREE.Mesh): THREE.Material | THREE.Material[] {
    let mat = this.selectMaterials.get(mesh);
    if (!mat) {
      const orig = this.originalMaterials.get(mesh) || mesh.material;
      mat = this.cloneWithTint(orig, 0x00f0ff, 0.40);
      this.selectMaterials.set(mesh, mat);
    }
    return mat;
  }

  private getOrCreateDimMaterial(mesh: THREE.Mesh): THREE.Material | THREE.Material[] {
    let mat = this.dimMaterials.get(mesh);
    if (!mat) {
      const orig = this.originalMaterials.get(mesh) || mesh.material;
      mat = this.cloneWithDim(orig, 0.55);
      this.dimMaterials.set(mesh, mat);
    }
    return mat;
  }

  private cloneWithTint(
    mat: THREE.Material | THREE.Material[],
    emissiveColor: number,
    intensity: number
  ): THREE.Material | THREE.Material[] {
    if (Array.isArray(mat)) {
      return mat.map((m) => this.cloneSingleTint(m, emissiveColor, intensity));
    }
    return this.cloneSingleTint(mat, emissiveColor, intensity);
  }

  private cloneSingleTint(mat: THREE.Material, emissiveColor: number, intensity: number): THREE.Material {
    const clone = mat.clone();
    if ('emissive' in clone) {
      (clone as THREE.MeshStandardMaterial).emissive = new THREE.Color(emissiveColor);
      (clone as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
    }
    return clone;
  }

  private cloneWithDim(mat: THREE.Material | THREE.Material[], factor: number): THREE.Material | THREE.Material[] {
    if (Array.isArray(mat)) {
      return mat.map((m) => this.cloneSingleDim(m, factor));
    }
    return this.cloneSingleDim(mat, factor);
  }

  private cloneSingleDim(mat: THREE.Material, factor: number): THREE.Material {
    const clone = mat.clone();
    if ('color' in clone && (clone as THREE.MeshStandardMaterial).color) {
      (clone as THREE.MeshStandardMaterial).color.multiplyScalar(factor);
    }
    if ('emissive' in clone && (clone as THREE.MeshStandardMaterial).emissive) {
      (clone as THREE.MeshStandardMaterial).emissiveIntensity = 0;
    }
    return clone;
  }

  private updateSelectionBox() {
    if (!this.selectedId || this.selectedId === 'board') {
      this.selectionBox.visible = false;
      return;
    }

    let targetMeshes: THREE.Mesh[] = [];

    // Level 1: If a specific physical component was clicked, box ONLY that component!
    if (this.selectedPlacementKey && this.meshesByPlacementKey.has(this.selectedPlacementKey)) {
      targetMeshes = this.meshesByPlacementKey.get(this.selectedPlacementKey) || [];
    } else {
      // Level 2: Functional Group selected
      const allMeshes = this.meshesByComponent.get(this.selectedId) || [];
      if (allMeshes.length <= 4) {
        targetMeshes = allMeshes;
      } else {
        // For large distributed groups (like ESC with 16+ parts on both faces),
        // box the primary cluster on the top face or first placement rather than spanning both sides
        const topCluster = allMeshes.filter((m) => m.userData.side === 'top' || m.position.y > 0);
        targetMeshes = topCluster.length > 0 ? topCluster : allMeshes;
      }
    }

    if (targetMeshes.length === 0) {
      this.selectionBox.visible = false;
      return;
    }

    const bbox = new THREE.Box3();
    targetMeshes.forEach((m) => {
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

    // Expand slightly for clean outline gap
    bbox.expandByScalar(0.35);

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

  private findPlacementKey(obj: THREE.Object3D | null): string | null {
    for (let node = obj; node; node = node.parent) {
      if (typeof node.userData.placementKey === 'string') {
        return node.userData.placementKey;
      }
    }
    return null;
  }

  getComponentWorldPosition(id: ComponentId, placementKey?: string | null): THREE.Vector3 | null {
    let meshes: THREE.Mesh[] | undefined;
    if (placementKey && this.meshesByPlacementKey.has(placementKey)) {
      meshes = this.meshesByPlacementKey.get(placementKey);
    } else {
      meshes = this.meshesByComponent.get(id);
    }

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

  dispose() {
    this.hoverMaterials.forEach((m) => this.disposeMat(m));
    this.selectMaterials.forEach((m) => this.disposeMat(m));
    this.dimMaterials.forEach((m) => this.disposeMat(m));
    this.hoverMaterials.clear();
    this.selectMaterials.clear();
    this.dimMaterials.clear();
    this.originalMaterials.clear();
    this.selectionBox.geometry.dispose();
    (this.selectionBox.material as THREE.Material).dispose();
  }

  private disposeMat(mat: THREE.Material | THREE.Material[]) {
    if (Array.isArray(mat)) {
      mat.forEach((m) => m.dispose());
    } else {
      mat.dispose();
    }
  }
}
