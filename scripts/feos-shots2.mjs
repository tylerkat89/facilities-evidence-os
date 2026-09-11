import { chromium } from 'playwright';
const out = '/workspace/screenshots';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
async function shot(page, name) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
  console.log('wrote', name);
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desktop.goto('http://127.0.0.1:8765/', { waitUntil: 'networkidle', timeout: 30000 });
await desktop.waitForSelector('.app');

// manager role
await desktop.click('button.rolebtn');
await desktop.waitForTimeout(80);
await desktop.click('button.rolebtn');
await desktop.waitForTimeout(150);

await desktop.click('button.lens:has-text("Ready to verify")');
await desktop.waitForTimeout(250);
const sink = desktop.locator('.lenspanel .zt', { hasText: 'Sink 2' });
if (await sink.count()) { await sink.first().click(); await desktop.waitForTimeout(300); await shot(desktop, '12-verify-due-manager'); }

const upd = desktop.locator('.updatebtn');
if (await upd.count()) {
  await upd.click();
  await desktop.waitForTimeout(300);
  await shot(desktop, '13-action-sheet-manager');
  await desktop.click('.modal .btn.ghost');
  await desktop.waitForTimeout(200);
}

await desktop.click('button.rail-btn:has-text("Vendors")');
await desktop.waitForTimeout(400);
await shot(desktop, '14-directory-vendors');
await desktop.click('.tab:has-text("Rooms")');
await desktop.waitForTimeout(250);
await shot(desktop, '15-directory-rooms');
await desktop.click('.dirwrap button.x');
await desktop.waitForTimeout(200);

await desktop.click('button.rail-btn:has-text("Calendar")');
await desktop.waitForTimeout(300);
await shot(desktop, '16-calendar');
await desktop.click('.dirwrap button.x');
await desktop.waitForTimeout(200);

await desktop.click('button.searchbtn');
await desktop.waitForTimeout(200);
await desktop.fill('.dir-search', 'urinal');
await desktop.waitForTimeout(200);
await shot(desktop, '17-search-urinal');
await desktop.click('.dirwrap button.x');
await desktop.waitForTimeout(200);

// zone sheet
await desktop.click('button.lvl:has-text("East · Downstairs")');
await desktop.waitForTimeout(200);
// click men's restroom - need to click svg. Use a text... zone labels are svg text. Click via evaluate
await desktop.evaluate(() => {
  const t = [...document.querySelectorAll('text')].find(x => x.textContent.includes("Men's Restroom"));
  if (t) t.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await desktop.waitForTimeout(300);
await shot(desktop, '21-zone-sheet');

await desktop.click('button.rail-btn:has-text("blank template")');
await desktop.waitForTimeout(400);
await shot(desktop, '18-blank-template');

// edit layout manager on demo - reload demo first? currently blank. Load northgate then edit
await desktop.click('button.rail-btn:has-text("Northgate")');
await desktop.waitForTimeout(400);
await desktop.click('button.rail-btn:has-text("Edit layout")');
await desktop.waitForTimeout(300);
await shot(desktop, '22-edit-layout');

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mobile.goto('http://127.0.0.1:8765/', { waitUntil: 'networkidle' });
await mobile.waitForSelector('.app');
await shot(mobile, '19-mobile-home');
await mobile.evaluate(() => window.scrollTo(0, 0));
await mobile.click('button.fab');
await mobile.waitForTimeout(200);
const box = await mobile.locator('svg.map').boundingBox();
if (box) {
  await mobile.mouse.click(box.x + 160, box.y + 220);
}
await mobile.waitForTimeout(400);
await shot(mobile, '20-mobile-composer');

// mobile drawer of selected issue
await mobile.click('.btn.ghost:has-text("Cancel")').catch(()=>{});
await mobile.waitForTimeout(200);
await mobile.evaluate(() => window.scrollTo(0, 700));
await mobile.waitForTimeout(200);
await shot(mobile, '23-mobile-drawer');

await browser.close();
console.log('done');
