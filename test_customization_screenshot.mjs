import { firefox } from 'playwright';

async function captureCustomizeScreen() {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  await page.goto('http://localhost:8000/');
  await page.waitForFunction(() => {
    const btn = document.getElementById('begin');
    return btn && !btn.disabled;
  }, { timeout: 15000 });

  await page.click('#open-customize-intro');
  await page.waitForSelector('#customize-modal:not(.hidden)');
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'dist/customize_explorer_verified.png' });
  console.log('✓ Captured Customize Explorer screenshot.');

  await browser.close();
}

captureCustomizeScreen().catch(e => {
  console.error(e);
  process.exit(1);
});
