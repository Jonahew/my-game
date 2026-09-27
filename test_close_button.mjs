import { firefox } from 'playwright';

async function testCloseButtons() {
  console.log('--- Testing Modal Close Buttons and HUD Buttons ---');
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  await page.goto('http://localhost:8000/');
  await page.waitForFunction(() => {
    const btn = document.getElementById('begin');
    return btn && !btn.disabled;
  }, { timeout: 15000 });

  // 1. Open Solar System Map from intro
  console.log('1. Testing opening map from intro...');
  await page.click('#open-map-intro');
  await page.waitForSelector('#map-modal:not(.hidden)');
  console.log('✓ Map modal is visible.');

  // 2. Click top-right 'x' close button
  console.log('2. Clicking top-right close-map-btn (✕)...');
  await page.click('#close-map-btn');
  await page.waitForSelector('#map-modal', { state: 'hidden' });
  console.log('✓ Map modal closed successfully via top-right close button!');

  // 3. Test opening map during gameplay and closing with 'x'
  console.log('3. Starting game and opening map from HUD...');
  await page.click('#begin');
  await page.waitForTimeout(300);
  await page.click('#map-btn');
  await page.waitForSelector('#map-modal:not(.hidden)');
  console.log('✓ Map modal opened during gameplay.');

  console.log('4. Clicking top-right close-map-btn (✕) during gameplay...');
  await page.click('#close-map-btn');
  await page.waitForSelector('#map-modal', { state: 'hidden' });
  console.log('✓ Map modal closed and gameplay resumed.');

  // 4. Test Gear HUD button during gameplay
  console.log('5. Clicking top menu Gear button (#customize-hud-btn)...');
  await page.click('#customize-hud-btn');
  await page.waitForSelector('#customize-modal:not(.hidden)');
  console.log('✓ Customize Explorer modal opened successfully via top menu Gear button!');

  console.log('6. Clicking close-customize-btn (✕) to resume gameplay...');
  await page.click('#close-customize-btn');
  await page.waitForSelector('#customize-modal', { state: 'hidden' });
  console.log('✓ Customize modal closed and gameplay resumed.');

  // 5. Test KeyG shortcut
  console.log('7. Testing KeyG keyboard shortcut...');
  await page.keyboard.press('KeyG');
  await page.waitForSelector('#customize-modal:not(.hidden)');
  console.log('✓ Customize modal opened via KeyG shortcut.');
  await page.keyboard.press('KeyG');
  await page.waitForSelector('#customize-modal', { state: 'hidden' });
  console.log('✓ Customize modal closed via KeyG shortcut.');

  // 6. Test opening map from pause menu and closing with 'x'
  console.log('8. Pausing game and opening map from pause menu...');
  await page.click('#pause');
  await page.waitForSelector('#pause-modal:not(.hidden)');
  await page.click('#pause-map-btn');
  await page.waitForSelector('#map-modal:not(.hidden)');

  console.log('9. Clicking close-map-btn (✕) from pause origin...');
  await page.click('#close-map-btn');
  await page.waitForSelector('#map-modal', { state: 'hidden' });
  await page.waitForSelector('#pause-modal:not(.hidden)');
  console.log('✓ Map modal closed and returned to pause menu!');

  // 7. Test customize modal from pause menu
  console.log('10. Testing customize modal from pause menu...');
  await page.click('#pause-custom-btn');
  await page.waitForSelector('#customize-modal:not(.hidden)');
  await page.click('#close-customize-btn');
  await page.waitForSelector('#customize-modal', { state: 'hidden' });
  await page.waitForSelector('#pause-modal:not(.hidden)');
  console.log('✓ Customize modal closed and returned to pause menu!');

  await page.screenshot({ path: 'dist/test_gear_verified.png' });
  console.log('✓ ALL GEAR BUTTON AND MODAL CLOSE TESTS PASSED CLEANLY!');

  await browser.close();
}

testCloseButtons().catch(e => {
  console.error(e);
  process.exit(1);
});
