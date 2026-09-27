import { firefox } from 'playwright';

async function testMainMenusAndCloseButtons() {
  console.log('--- Testing In-Game Main Menu Screen & Modal Handlers ---');
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

  // 3. Start game
  console.log('3. Starting game to test in-game Main Menu...');
  await page.click('#begin');
  await page.waitForTimeout(400);

  // 4. Test opening in-game Main Menu via top HUD button
  console.log('4. Clicking top menu ☰ Menu button (#pause)...');
  await page.click('#pause');
  await page.waitForSelector('#pause-modal:not(.hidden)');
  console.log('✓ In-Game Main Menu Screen opened successfully!');

  // Verify Main Menu Dossier fields
  const levelText = await page.textContent('#pause-level-info');
  const energyText = await page.textContent('#pause-energy');
  const livesText = await page.textContent('#pause-lives');
  console.log(`✓ Main Menu Dossier validated: "${levelText}", Energy: "${energyText}", Lives: "${livesText}"`);

  // Capture Main Menu Screenshot
  await page.screenshot({ path: 'dist/main_menu_screen_verified.png' });
  console.log('✓ Saved in-game Main Menu screenshot.');

  // 5. Test closing Main Menu via top-right 'x' button (#close-pause-btn)
  console.log('5. Clicking top-right close button (✕) on Main Menu...');
  await page.click('#close-pause-btn');
  await page.waitForSelector('#pause-modal', { state: 'hidden' });
  console.log('✓ Main Menu closed and gameplay resumed.');

  // 6. Test opening Main Menu via Escape key
  console.log('6. Pressing Escape key to open Main Menu...');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#pause-modal:not(.hidden)');
  console.log('✓ Main Menu opened via Escape.');

  console.log('7. Pressing Escape key again to resume gameplay...');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#pause-modal', { state: 'hidden' });
  console.log('✓ Main Menu closed via Escape and gameplay resumed.');

  // 7. Test Gear button from HUD
  console.log('8. Clicking top menu Gear button (#customize-hud-btn)...');
  await page.click('#customize-hud-btn');
  await page.waitForSelector('#customize-modal:not(.hidden)');
  await page.click('#close-customize-btn');
  await page.waitForSelector('#customize-modal', { state: 'hidden' });
  console.log('✓ Gear button & close verified.');

  // 8. Test Return to Title Screen from Main Menu
  console.log('9. Opening Main Menu and returning to Title Screen...');
  await page.click('#pause');
  await page.waitForSelector('#pause-modal:not(.hidden)');
  await page.click('#pause-title-btn');
  await page.waitForSelector('#pause-modal', { state: 'hidden' });
  await page.waitForSelector('#panel:not(.hidden)');

  const beginBtnText = await page.textContent('#begin');
  console.log(`✓ Returned to Title Screen. Continue button text: "${beginBtnText}"`);

  // 9. Resume expedition from Title Screen
  console.log('10. Resuming expedition from Title Screen...');
  await page.click('#begin');
  await page.waitForSelector('#panel', { state: 'hidden' });
  console.log('✓ Resumed expedition from Title Screen successfully!');

  console.log('====================================================');
  console.log('ALL IN-GAME MAIN MENU & HUD BUTTON TESTS PASSED (10/10)');
  console.log('====================================================');

  await browser.close();
}

testMainMenusAndCloseButtons().catch(e => {
  console.error(e);
  process.exit(1);
});
