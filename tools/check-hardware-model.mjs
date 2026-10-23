import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const server = await createServer({
  server: { host: '127.0.0.1', port: 4174, strictPort: true },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-webgl'] });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4174');
  const result = await page.evaluate(async () => {
    const { MaterialLibrary } = await import('/src/scene/materials.ts');
    const { createComponents } = await import('/src/scene/createComponents.ts');
    const { placements } = await import('/src/data/placement.ts');
    const { createConnectors } = await import('/src/scene/createConnectors.ts');
    const { setupScene } = await import('/src/scene/setupScene.ts');
    const { CameraManager } = await import('/src/scene/cameraControls.ts');
    const controlsElement = document.createElement('div');
    controlsElement.style.cssText = 'width: 640px; height: 480px;';
    document.body.appendChild(controlsElement);
    const scene = setupScene(controlsElement);
    const camera = scene.camera;
    const manager = new CameraManager(camera, scene.renderer.domElement);
    const views = [];
    for (const side of ['top', 'bottom', 'top', 'bottom']) {
      if (side === 'top') manager.viewTop();
      else manager.viewBottom();
      manager.update(1);
      for (let i = 0; i < 30; i++) manager.update(1 / 60);
      camera.updateMatrixWorld();
      const nose = camera.position.clone().set(0, 0, -10).project(camera);
      const origin = camera.position.clone().set(0, 0, 0).project(camera);
      const offset = camera.position.clone().sub(manager.controls.target);
      views.push({ side, position: offset.toArray(), distance: offset.length(), noseX: nose.x - origin.x, noseY: nose.y - origin.y });
    }
    manager.controls.dispose();
    scene.dispose();
    controlsElement.remove();
    const materials = new MaterialLibrary();
    const assembly = createComponents(materials);
    const connectors = createConnectors(materials);
    const interactiveParts = [];
    for (const group of [assembly, connectors]) {
      group.traverse((node) => {
        if (node.isMesh && ['boot_button', 'camera_connector'].includes(node.userData.componentId)) {
          interactiveParts.push({ id: node.userData.componentId, side: node.userData.side });
        }
      });
    }
    const unsupportedContacts = placements.filter((p) => p.kind === 'ic' && !p.footprint)
      .filter((p) => assembly.getObjectByName(`ic_${p.key}`).children.length !== 1)
      .map((p) => p.key);

    // A synthetic fixture checks the explicit geometry path; this is not a
    // package assertion about any real component on the BETAFPV board.
    const originalPlacements = placements.slice();
    let explicitContacts;
    const fixture = {
      key: 'test_package', id: null, kind: 'ic', side: 'top',
      xMm: 0, zMm: 0, rotationRad: Math.PI / 2, sizeMm: [8, 8, 1],
      confidence: 'illustrative',
    };
    try {
      placements.splice(0, placements.length, fixture);
      fixture.footprint = {
        package: 'other', source: 'Synthetic regression fixture, not hardware evidence',
        contacts: [{ xMm: 1, yMm: 0.05, zMm: 2, sizeMm: [0.5, 0.1, 0.3] }],
      };
      const explicitBody = createComponents(materials).getObjectByName('ic_test_package');
      explicitContacts = explicitBody.children.slice(1).map((mesh) => ({
        position: mesh.position.toArray(),
        size: [mesh.geometry.parameters.width, mesh.geometry.parameters.height, mesh.geometry.parameters.depth],
      }));
    } finally {
      placements.splice(0, placements.length, ...originalPlacements);

    }

    await new Promise((resolve) => materials.loadTextures(resolve));
    const textures = [materials.topPhotoTex, materials.bottomPhotoTex];
    const photoMapsBound = materials.topFaceMat.map === textures[0]
      && materials.bottomFaceMat.map === textures[1];
    const photosLoaded = textures.every((texture) => texture.image?.naturalWidth > 0);
    let disposalCount = 0;
    textures.forEach((texture) => texture.addEventListener('dispose', () => disposalCount++));
    materials.dispose();
    return { unsupportedContacts, explicitContacts, photoMapsBound, photosLoaded, disposalCount, views, interactiveParts };
  });
  const [top, bottom] = result.views;
  assert.ok(Math.abs(top.distance - bottom.distance) < 1e-6, 'Top and bottom presets must use the same orbit distance');
  for (let axis = 0; axis < 3; axis++) {
    assert.ok(Math.abs(top.position[axis] + bottom.position[axis]) < 1e-6,
      'Top and bottom presets must use matching orbit angles');
  }
  for (const view of result.views) {
    assert.ok(Math.abs(view.noseX) < 1e-6 && view.noseY > 0, `${view.side} must keep the nose centered and pointing up`);
  }
  assert.ok(result.interactiveParts.some((part) => part.id === 'boot_button' && part.side === 'bottom'),
    'The existing BOOT button must be selectable on the bottom face');
  assert.ok(result.interactiveParts.some((part) => part.id === 'camera_connector' && part.side === 'top'),
    'The existing camera connector must be selectable on the top face');
  assert.deepEqual(result.unsupportedContacts, [], 'ICs without documented packages must not invent contacts');
  assert.deepEqual(result.explicitContacts, [{ position: [1, 0.05, 2], size: [0.5, 0.1, 0.3] }],
    'Visible contacts must follow explicit geometry');
  assert.equal(result.photoMapsBound, true, 'Both board faces must use the official photo textures');
  assert.equal(result.photosLoaded, true, 'Photo textures must load successfully');
  assert.equal(result.disposalCount, 2, 'Both photo textures must be released at teardown');
  console.log('Camera presets, hardware model, and texture lifecycle checks passed.');
} finally {
  try {
    await browser?.close();
  } finally {
    await server.close();
  }
}
