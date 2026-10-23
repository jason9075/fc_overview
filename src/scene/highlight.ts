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
  private hoveredPlacementKey: string | null = null;
  private selectedId: ComponentId | null = null;
  private selectedPlacementKey: string | null = null;

  // Material caches to avoid memory leaks & redundant allocations on hover
  private readonly originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private readonly hoverMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private readonly selectMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private readonly dimMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

  // Reuse one outline per physical placement, including distributed connectors.
  private readonly selectionBoxes = new Map<string, THREE.Box3Helper>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
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

  setHover(id: ComponentId | null, placementKey: string | null = null) {
    if (this.hoveredId === id && this.hoveredPlacementKey === placementKey) return;
    this.hoveredId = id;
    this.hoveredPlacementKey = placementKey;
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

    const selectedMeshes = new Set(this.getTargetMeshes(this.selectedId, this.selectedPlacementKey));
    // A card without model geometry must not dim the entire board.
    if (selectedMeshes.size > 0) {
      this.allManagedMeshes.forEach((mesh) => {
        mesh.material = selectedMeshes.has(mesh)
          ? this.getOrCreateSelectMaterial(mesh)
          : this.getOrCreateDimMaterial(mesh);
      });
    }

    for (const mesh of this.getTargetMeshes(this.hoveredId, this.hoveredPlacementKey)) {
      if (!selectedMeshes.has(mesh)) mesh.material = this.getOrCreateHoverMaterial(mesh);
    }
  }

  private getTargetMeshes(id: ComponentId | null, placementKey: string | null): THREE.Mesh[] {
    if (!id || id === 'board') return [];
    const meshes = this.meshesByComponent.get(id) || [];
    return placementKey ? meshes.filter((mesh) => this.findPlacementKey(mesh) === placementKey) : meshes;
  }

  private getOrCreateHoverMaterial(mesh: THREE.Mesh): THREE.Material | THREE.Material[] {
    let mat = this.hoverMaterials.get(mesh);
    if (!mat) {
      const orig = this.originalMaterials.get(mesh) || mesh.material;
      mat = this.cloneWithTint(orig, 0x8fbcbb, 0.22);
      this.hoverMaterials.set(mesh, mat);
    }
    return mat;
  }

  private getOrCreateSelectMaterial(mesh: THREE.Mesh): THREE.Material | THREE.Material[] {
    let mat = this.selectMaterials.get(mesh);
    if (!mat) {
      const orig = this.originalMaterials.get(mesh) || mesh.material;
      mat = this.cloneWithTint(orig, 0x88c0d0, 0.40);
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
    this.selectionBoxes.forEach((outline) => { outline.visible = false; });
    const targets = this.getTargetMeshes(this.selectedId, this.selectedPlacementKey);
    if (targets.length === 0) return;

    this.scene.updateMatrixWorld(true);
    const boundsByPlacement = new Map<string, THREE.Box3>();
    for (const mesh of targets) {
      const key = this.findPlacementKey(mesh) || this.selectedId!;
      const bounds = boundsByPlacement.get(key) || new THREE.Box3();
      mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) {
        bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
      }
      boundsByPlacement.set(key, bounds);
    }

    for (const [key, bounds] of boundsByPlacement) {
      if (bounds.isEmpty()) continue;
      let outline = this.selectionBoxes.get(key);
      if (!outline) {
        outline = new THREE.Box3Helper(new THREE.Box3(), 0x88c0d0);
        outline.name = `selection_outline_${key}`;
        const material = outline.material as THREE.LineBasicMaterial;
        material.depthWrite = false;
        material.toneMapped = false;
        outline.renderOrder = 999;
        this.scene.add(outline);
        this.selectionBoxes.set(key, outline);
      }
      // A real Box3 gives the helper nonempty bounds, even for flat solder pads.
      outline.box.copy(bounds).expandByScalar(0.2);
      outline.visible = true;
    }
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
    this.scene.updateMatrixWorld(true);
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
    this.selectionBoxes.forEach((outline) => {
      this.scene.remove(outline);
      outline.geometry.dispose();
      (outline.material as THREE.Material).dispose();
    });
    this.selectionBoxes.clear();
  }

  private disposeMat(mat: THREE.Material | THREE.Material[]) {
    if (Array.isArray(mat)) {
      mat.forEach((m) => m.dispose());
    } else {
      mat.dispose();
    }
  }
}
