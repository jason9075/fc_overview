import { chromium } from 'playwright-core';
import { preview } from 'vite';
import fs from 'fs';
import path from 'path';

async function main() {
  const root = process.cwd();
  const outDir = path.join(root, 'tools', 'screenshots');
  fs.mkdirSync(outDir, { recursive: true });

  console.log('Starting Vite preview server...');
  const server = await preview({
    root,
    preview: { port: 4173 },
  });

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err));

  console.log('Navigating to http://localhost:4173 ...');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });

  // Wait for 3D render to stabilize
  await page.waitForTimeout(1500);

  // 1. Initial overview (Procedural PCB Mode)
  console.log('Taking screenshot: 01_overview.png ...');
  await page.screenshot({ path: path.join(outDir, '01_overview.png') });

  // 2. Click "正面" (Procedural Mode)
  console.log('Clicking 正面 view (Procedural Mode)...');
  await page.click('#btn-view-top');
  await page.waitForTimeout(1000);
  console.log('Taking screenshot: 02_top_view.png ...');
  await page.screenshot({ path: path.join(outDir, '02_top_view.png') });

  // Switch to photographic texture
  console.log('Toggling texture mode to Photo...');
  await page.click('#btn-toggle-texture');
  await page.waitForTimeout(800);
  console.log('Taking screenshot: 02b_top_photo.png ...');
  await page.screenshot({ path: path.join(outDir, '02b_top_photo.png') });

  // Switch back to procedural mode
  console.log('Toggling texture mode back to Procedural...');
  await page.click('#btn-toggle-texture');
  await page.waitForTimeout(800);
  console.log('Taking screenshot: 03_artwork_mode.png (Procedural Mode) ...');
  await page.screenshot({ path: path.join(outDir, '03_artwork_mode.png') });

  // 3. Open drawer and select MCU
  console.log('Opening drawer and selecting MCU...');
  await page.click('#btn-toggle-list');
  await page.waitForTimeout(400);
  await page.click('.drawer-item[data-id="mcu"]');
  await page.waitForTimeout(1000);
  console.log('Taking screenshot: 04_mcu_selected.png ...');
  await page.screenshot({ path: path.join(outDir, '04_mcu_selected.png') });

  // Close drawer before next view
  await page.click('#btn-close-drawer');
  await page.waitForTimeout(400);

  // 4. Click "背面" (Procedural Mode)
  console.log('Clicking 背面 view (Procedural Mode)...');
  await page.click('#btn-view-bottom');
  await page.waitForTimeout(1000);
  console.log('Taking screenshot: 05_bottom_view.png ...');
  await page.screenshot({ path: path.join(outDir, '05_bottom_view.png') });

  // Switch to photographic texture for bottom
  console.log('Toggling texture mode to Photo (Bottom)...');
  await page.click('#btn-toggle-texture');
  await page.waitForTimeout(800);
  console.log('Taking screenshot: 05b_bottom_photo.png ...');
  await page.screenshot({ path: path.join(outDir, '05b_bottom_photo.png') });

  // Switch back to procedural
  await page.click('#btn-toggle-texture');
  await page.waitForTimeout(600);

  // 5. Select AT7456E OSD
  await page.click('#btn-toggle-list');
  await page.waitForTimeout(400);
  await page.click('.drawer-item[data-id="osd"]');
  await page.waitForTimeout(1000);
  console.log('Taking screenshot: 06_osd_bottom_selected.png ...');
  await page.screenshot({ path: path.join(outDir, '06_osd_bottom_selected.png') });

  // Close drawer before tutorial
  await page.click('#btn-close-drawer');
  await page.waitForTimeout(400);

  // 6. Open Comparison Modal (3-Way Comparison)
  console.log('Opening comparison modal...');
  await page.click('#btn-open-comparison');
  await page.waitForTimeout(800);
  console.log('Taking screenshot: 10_comparison_modal.png ...');
  await page.screenshot({ path: path.join(outDir, '10_comparison_modal.png') });

  // Close comparison modal
  await page.click('#btn-close-comparison');
  await page.waitForTimeout(400);

  // 7. Click "互動教學"
  console.log('Starting tutorial...');
  await page.click('#btn-open-tutorial');
  await page.waitForTimeout(800);
  console.log('Taking screenshot: 07_tutorial_step.png ...');
  await page.screenshot({ path: path.join(outDir, '07_tutorial_step.png') });

  // Click next step in tutorial
  await page.click('#btn-tutorial-next');
  await page.waitForTimeout(800);
  console.log('Taking screenshot: 08_tutorial_step_mcu.png ...');
  await page.screenshot({ path: path.join(outDir, '08_tutorial_step_mcu.png') });

  // Close tutorial
  await page.click('#btn-tutorial-close');
  await page.waitForTimeout(400);

  // 8. Open absent features modal
  console.log('Opening absent features modal...');
  await page.click('#btn-open-glossary');
  await page.waitForTimeout(600);
  console.log('Taking screenshot: 09_absent_modal.png ...');
  await page.screenshot({ path: path.join(outDir, '09_absent_modal.png') });

  await browser.close();
  server.httpServer.close();
  console.log('All screenshots completed successfully!');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
