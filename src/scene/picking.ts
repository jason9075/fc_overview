import * as THREE from 'three';
import type { ComponentId } from '../data/components';

export interface PickResult {
  componentId: ComponentId | null;
  mesh: THREE.Mesh | null;
  point: THREE.Vector3 | null;
  subLabel?: string;
}

export class Picker {
  private readonly raycaster: THREE.Raycaster;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
  }

  /**
   * Raycasts with occlusion awareness: candidate objects behind the opaque PCB are discarded.
   */
  pick(normalizedX: number, normalizedY: number): PickResult {
    this.raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), this.camera);

    // Collect all pickable meshes & PCB meshes
    const candidates: THREE.Mesh[] = [];
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj.visible) {
        if (obj.userData.componentId || obj.userData.isPCB || obj.userData.isAnnotation) {
          candidates.push(obj as THREE.Mesh);
        }
      }
    });

    const intersects = this.raycaster.intersectObjects(candidates, false);
    if (intersects.length === 0) {
      return { componentId: null, mesh: null, point: null };
    }

    // Find the distance of the nearest solid PCB obstruction
    let nearestPcbDist = Infinity;
    for (const hit of intersects) {
      if (hit.object.userData.isPCB) {
        nearestPcbDist = hit.distance;
        break;
      }
    }

    // Find the first hit that is not occluded behind the PCB
    for (const hit of intersects) {
      // If this hit is significantly behind the solid PCB surface, it is on the occluded opposite side
      if (hit.distance > nearestPcbDist + 0.15) {
        continue;
      }

      const compId = this.findComponentId(hit.object);
      if (compId) {
        let subLabel: string | undefined = hit.object.userData.subLabel;
        if (!subLabel) {
          for (let p: THREE.Object3D | null = hit.object.parent; p; p = p.parent) {
            if (p.userData.subLabel) {
              subLabel = p.userData.subLabel;
              break;
            }
          }
        }

        return {
          componentId: compId,
          mesh: hit.object as THREE.Mesh,
          point: hit.point,
          subLabel,
        };
      }
    }

    return { componentId: null, mesh: null, point: null };
  }

  private findComponentId(obj: THREE.Object3D | null): ComponentId | null {
    for (let node = obj; node; node = node.parent) {
      if (typeof node.userData.componentId === 'string') {
        return node.userData.componentId as ComponentId;
      }
    }
    return null;
  }
}
