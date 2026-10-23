import * as THREE from 'three';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls.js';

export class CameraManager {
  // ArcballControls exposes `target` at runtime but not in its type declarations.
  readonly controls: ArcballControls & { target: THREE.Vector3 };
  private readonly camera: THREE.PerspectiveCamera;

  // Animation transition state
  private isTransitioning = false;
  private startPos = new THREE.Vector3();
  private targetPos = new THREE.Vector3();
  private startLookAt = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private startUp = new THREE.Vector3();
  private targetUp = new THREE.Vector3();
  private transitionProgress = 0;
  private transitionDuration = 0.8; // seconds

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.controls = new ArcballControls(camera, domElement) as ArcballControls & { target: THREE.Vector3 };
    this.controls.setGizmosVisible(false);
    this.controls.enableAnimations = true;
    this.controls.dampingFactor = 20;
    this.controls.minDistance = 14;
    this.controls.maxDistance = 130;
  }

  update(delta: number) {
    if (this.isTransitioning) {
      this.transitionProgress += delta / this.transitionDuration;
      const t = Math.min(1, this.transitionProgress);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3);

      this.camera.position.lerpVectors(this.startPos, this.targetPos, ease);
      this.controls.target.lerpVectors(this.startLookAt, this.targetLookAt, ease);
      this.camera.up.lerpVectors(this.startUp, this.targetUp, ease).normalize();
      this.camera.lookAt(this.controls.target);

      if (t >= 1) {
        this.isTransitioning = false;
        this.camera.up.set(0, 1, 0);
        this.controls.enabled = true;
        this.controls.update();
      }
    } else {
      this.controls.update();
    }
  }

  animateTo(pos: THREE.Vector3, lookAt: THREE.Vector3, up: THREE.Vector3 = new THREE.Vector3(0, 1, 0), duration = 0.75) {
    this.controls.enabled = false;
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.transitionDuration = duration;

    this.startPos.copy(this.camera.position);
    this.targetPos.copy(pos);

    this.startLookAt.copy(this.controls.target);
    this.targetLookAt.copy(lookAt);

    this.startUp.copy(this.camera.up);
    this.targetUp.copy(up);
  }

  viewReset() {
    this.animateTo(
      new THREE.Vector3(0, 48, 42),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0)
    );
  }

  viewTop() {
    this.viewFace(1);
  }

  viewBottom() {
    this.viewFace(-1);
  }

  private viewFace(side: 1 | -1) {
    // Mirror both Y and Z to keep identical tilt/distance and forward (-Z)
    // pointing upward on screen from either face, with a stable world-up axis.
    this.animateTo(
      new THREE.Vector3(0, side * 54, side * 18),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0)
    );
  }

  viewPerspectiveTop() {
    this.animateTo(
      new THREE.Vector3(0, 46, 28),
      new THREE.Vector3(0, 0, -2),
      new THREE.Vector3(0, 1, 0)
    );
  }

  focusPart(worldPos: THREE.Vector3, side: 'top' | 'bottom' | 'annotation') {
    const isBottom = side === 'bottom';
    const yOffset = isBottom ? -22 : 22;
    const zOffset = isBottom ? -18 : 18;
    const upVector = new THREE.Vector3(0, 1, 0);

    const camTargetPos = new THREE.Vector3(
      worldPos.x * 0.7,
      worldPos.y + yOffset,
      worldPos.z + zOffset
    );

    this.animateTo(camTargetPos, worldPos, upVector, 0.65);
  }

  getCurrentSide(): 'top' | 'bottom' {
    return this.camera.position.y < 0 ? 'bottom' : 'top';
  }
}
