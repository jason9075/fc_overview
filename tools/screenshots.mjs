import assert from 'node:assert/strict';
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
    preview: { port: 4173, strictPort: true },
  });

  let browser;
  try {
    browser = await chromium.launch({
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
    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
      console.error('PAGE ERROR:', err);
    });

    console.log('Navigating to http://localhost:4173 ...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });

    // Unsupported electrical routing must never be offered as a board overlay.
    assert.equal(await page.locator('#btn-toggle-schematic').count(), 0,
      'Unverified schematic routing is still exposed in the toolbar');

    assert.equal(await page.locator('#btn-toggle-texture, #btn-open-comparison, .comparison-modal-backdrop').count(), 0,
      'Removed PCB modes and comparison UI must not return');

    assert.equal(await page.locator('#btn-open-glossary, .modal-backdrop, .glossary-item').count(), 0,
      'Only onboard components should be presented');

    // Wait for 3D render to stabilize
    await page.waitForTimeout(1500);

    // 1. Initial photo-textured overview
    console.log('Taking screenshot: 01_overview.png ...');
    await page.screenshot({ path: path.join(outDir, '01_overview.png') });

    // 2. Top photo-textured view
    console.log('Clicking 正面 view...');
    await page.click('#btn-view-top');
    await page.waitForTimeout(1000);
    console.log('Taking screenshot: 02_top_view.png ...');
    await page.screenshot({ path: path.join(outDir, '02_top_view.png') });

    // 3. Open drawer and select MCU
    console.log('Opening drawer and selecting MCU...');
    await page.click('#btn-toggle-list');
    await page.waitForTimeout(400);
    assert.doesNotMatch(await page.locator('.component-drawer').textContent(), /氣壓計|MicroSD|未搭載/);
    await page.click('.drawer-item[data-id="mcu"]');
    await page.waitForTimeout(1000);
    console.log('Taking screenshot: 04_mcu_selected.png ...');
    await page.screenshot({ path: path.join(outDir, '04_mcu_selected.png') });

    // Close drawer before next view
    await page.click('#btn-close-drawer');
    await page.waitForTimeout(400);

    // 4. Bottom photo-textured view
    console.log('Clicking 背面 view...');
    await page.click('#btn-view-bottom');
    await page.waitForTimeout(1000);
    console.log('Taking screenshot: 05_bottom_view.png ...');
    await page.screenshot({ path: path.join(outDir, '05_bottom_view.png') });

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

    // Confirmed board interfaces: existing geometry is selectable; pad groups
    // without modeled geometry provide the manufacturer's wiring diagram.
    await page.click('#btn-toggle-list');
    const interfaceChecks = [
      ['boot_button', /FC&RX-BOOT/, true],
      ['camera_connector', /CAM.*GND.*\+5V/, true],
      ['power_pads', /最大 3 A/, false],
      ['uart_pads', /TX1.*RX1/, false],
      ['buzzer_pads', /BZ\+.*BZ−/, false],
      ['led_pad', /LED/, false],
    ];
    for (const [id, expected, hasGeometry] of interfaceChecks) {
      await page.click(`.drawer-item[data-id="${id}"]`);
      const card = page.locator('.info-card');
      assert.match(await card.textContent(), expected);
      assert.equal(await card.locator('#btn-focus-part').count(), hasGeometry ? 1 : 0);
      if (id !== 'boot_button') {
        const diagram = card.locator('a[href="./references/connection_diagram.jpg"]');
        assert.equal(await diagram.count(), 1);
      }
      if (id === 'boot_button' || id === 'uart_pads') {
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(outDir,
          id === 'boot_button' ? '09_boot_button.png' : '12_uart_pads.png') });
      }
    }
    const diagramResponse = await page.request.get('http://localhost:4173/references/connection_diagram.jpg');
    assert.equal(diagramResponse.ok(), true, 'Manufacturer wiring diagram must be available');
    await page.click('#btn-close-drawer');

    const connectorViews = [
      ['battery_connector', /BT2.0/, '13_battery_highlight.png'],
      ['motor_connectors', /馬達接頭/, '14_motor_connector_highlight.png'],
      ['usb_connector', /設定介面/, '15_usb_connector_highlight.png'],
      ['camera_connector', /相機/, '16_camera_connector_highlight.png'],
    ];
    for (const [id, title, filename] of connectorViews) {
      await page.click('#btn-toggle-list');
      await page.click(`.drawer-item[data-id="${id}"]`);
      await page.click('#btn-close-drawer');
      await page.waitForTimeout(900);
      assert.match(await page.locator('.card-title').textContent(), title);
      await page.screenshot({ path: path.join(outDir, filename) });
    }
    await page.keyboard.press('Escape');
    assert.match(await page.locator('.card-title').textContent(), /飛控總覽/);

    assert.deepEqual(pageErrors, [], 'Browser must complete without runtime errors');
    console.log('All screenshots and regression checks completed successfully!');
  } finally {
    try {
      await browser?.close();
    } finally {
      await new Promise((resolve, reject) => {
        server.httpServer.close((error) => error ? reject(error) : resolve());
      });
    }
  }
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
