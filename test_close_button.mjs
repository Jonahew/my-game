import { firefox } from 'playwright';

async function testCloseButtons() {
  console.log('--- Testing Modal Close Buttons ---');
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

  // 4. Test opening map from pause menu and closing with 'x'
  console.log('5. Pausing game and opening map from pause menu...');
  await page.click('#pause');
  await page.waitForSelector('#pause-modal:not(.hidden)');
  await page.click('#pause-map-btn');
  await page.waitForSelector('#map-modal:not(.hidden)');

  console.log('6. Clicking close-map-btn (✕) from pause origin...');
  await page.click('#close-map-btn');
  await page.waitForSelector('#map-modal', { state: 'hidden' });
  await page.waitForSelector('#pause-modal:not(.hidden)');
  console.log('✓ Map modal closed and returned to pause menu!');

  // 5. Test customize modal close button
  console.log('7. Testing customize modal close button (✕)...');
  await page.click('#pause-custom-btn');
  await page.waitForSelector('#customize-modal:not(.hidden)');
  await page.click('#close-customize-btn');
  await page.waitForSelector('#customize-modal', { state: 'hidden' });
  console.log('✓ Customize modal closed successfully via close button!');

  await page.screenshot({ path: 'dist/test_close_verified.png' });
  console.log('✓ All close button tests passed cleanly!');

  await browser.close();
}

testCloseButtons().catch(e => {
  console.error(e);
  process.exit(1);
});
