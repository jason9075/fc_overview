import * as THREE from 'three';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  container: HTMLElement;
  dispose: () => void;
}

/**
 * Initializes Three.js scene, camera, lights, and responsive WebGL renderer.
 */
export function setupScene(container: HTMLElement): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c1117);

  // Subtle coordinate grid on floor for spatial orientation
  const gridHelper = new THREE.GridHelper(120, 24, 0x1f2e3d, 0x141e28);
  gridHelper.position.y = -12;
  scene.add(gridHelper);

  // Camera: initial view angled toward front face
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 500);
  camera.position.set(0, 52, 44);
  camera.lookAt(0, 0, 0);

  // WebGL Renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  // Lighting setup
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x1a202c, 0.6);
  scene.add(hemiLight);

  // Top Key Light
  const dirLight1 = new THREE.DirectionalLight(0xfffaed, 1.4);
  dirLight1.position.set(25, 45, 30);
  scene.add(dirLight1);

  // Top Rim Light
  const dirLight2 = new THREE.DirectionalLight(0x90c5ff, 0.8);
  dirLight2.position.set(-30, 35, -25);
  scene.add(dirLight2);

  // Bottom Fill Light (vital when user orbits to view bottom face)
  const dirLightBottom = new THREE.DirectionalLight(0xffffff, 1.1);
  dirLightBottom.position.set(0, -45, 10);
  scene.add(dirLightBottom);

  const dirLightBottomBack = new THREE.DirectionalLight(0x99ccff, 0.6);
  dirLightBottomBack.position.set(-20, -35, -25);
  scene.add(dirLightBottomBack);

  // Resize handling
  const handleResize = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(container);
  window.addEventListener('resize', handleResize);

  return {
    scene,
    camera,
    renderer,
    container,
    dispose: () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
