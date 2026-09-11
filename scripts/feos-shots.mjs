import { chromium } from 'playwright';
import fs from 'fs';

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
await shot(desktop, '01-home-tech-downstairs');

// click ISS-1047 pin via drawer already open - first issue selected is ISS-1061
// Open ISS-1047 from lens or by clicking pin. Let's click "Falling through" later.
// First: open ISS-1047 from live lens panel
await desktop.click('button.lens:has-text("Live")');
await desktop.waitForTimeout(200);
// panel lists issues - click damp area
const damp = desktop.locator('.lenspanel .zt', { hasText: 'Damp area' });
if (await damp.count()) {
  await damp.first().click();
  await desktop.waitForTimeout(400);
  await shot(desktop, '02-iss-1047-story');
}

// Who knew tab
const who = desktop.locator('.tab', { hasText: 'Who knew' });
if (await who.count()) { await who.click(); await desktop.waitForTimeout(200); await shot(desktop, '03-iss-1047-who'); }

const vendor = desktop.locator('.tab', { hasText: 'Contractor' });
if (await vendor.count()) { await vendor.click(); await desktop.waitForTimeout(200); await shot(desktop, '04-iss-1047-vendor'); }

const dom = desktop.locator('.tab', { hasText: 'Dominoes' });
if (await dom.count()) { await dom.click(); await desktop.waitForTimeout(200); await shot(desktop, '05-iss-1047-dominoes'); }

// P0 unassigned - rear exit
await desktop.click('button.lens:has-text("Needs me now")');
await desktop.waitForTimeout(200);
const p0 = desktop.locator('.lenspanel .zt', { hasText: 'Rear exit' });
if (await p0.count()) { await p0.first().click(); await desktop.waitForTimeout(300); await shot(desktop, '06-p0-unassigned'); }

// Falling through
await desktop.click('button.lens:has-text("Falling through")');
await desktop.waitForTimeout(250);
await shot(desktop, '07-lens-falling-through');

// Stacked
await desktop.click('button.rail-btn:has-text("See it stacked")');
await desktop.waitForTimeout(500);
await shot(desktop, '08-stacked');

// Property view
await desktop.click('button.rail-btn:has-text("Property view")');
await desktop.waitForTimeout(300);
await shot(desktop, '09-property');

// Back to floor - click East downstairs
await desktop.click('button.lvl:has-text("Downstairs")');
await desktop.waitForTimeout(200);

// Composer via FAB
await desktop.click('button.fab');
await desktop.waitForTimeout(200);
await desktop.locator('svg.map').click({ position: { x: 200, y: 420 } });
await desktop.waitForTimeout(400);
await shot(desktop, '10-composer');

// fill observation that triggers diagnosis warning
await desktop.fill('textarea', 'Urinal leaking, broken flush valve');
await desktop.waitForTimeout(200);
await shot(desktop, '11-composer-diagnosis-warn');
await desktop.keyboard.press('Escape').catch(()=>{});
await desktop.click('.scrim').catch(()=>{});
await desktop.waitForTimeout(200);

// Role switch to manager, open verify issue
await desktop.click('button.rolebtn'); // supervisor
await desktop.waitForTimeout(100);
await desktop.click('button.rolebtn'); // manager
await desktop.waitForTimeout(200);
await desktop.click('button.lens:has-text("Ready to verify")');
await desktop.waitForTimeout(250);
const sink = desktop.locator('.lenspanel .zt', { hasText: 'Sink 2' });
if (await sink.count()) { await sink.first().click(); await desktop.waitForTimeout(300); await shot(desktop, '12-verify-due-manager'); }

// Update this issue
const upd = desktop.locator('.updatebtn');
if (await upd.count()) {
  await upd.click();
  await desktop.waitForTimeout(300);
  await shot(desktop, '13-action-sheet-manager');
}

// Directory
await desktop.keyboard.press('Escape').catch(()=>{});
await desktop.click('.scrim').catch(()=>{});
await desktop.waitForTimeout(150);
await desktop.click('button.rail-btn:has-text("Vendors")');
await desktop.waitForTimeout(400);
await shot(desktop, '14-directory-vendors');

await desktop.click('.tab:has-text("Rooms")');
await desktop.waitForTimeout(250);
await shot(desktop, '15-directory-rooms');
await desktop.click('button.x');
await desktop.waitForTimeout(200);

// Calendar
await desktop.click('button.rail-btn:has-text("Calendar")');
await desktop.waitForTimeout(300);
await shot(desktop, '16-calendar');
await desktop.click('button.x');
await desktop.waitForTimeout(200);

// Search
await desktop.click('button.searchbtn');
await desktop.waitForTimeout(200);
await desktop.fill('.dir-search', 'urinal');
await desktop.waitForTimeout(200);
await shot(desktop, '17-search-urinal');
await desktop.click('button.x');

// Blank template
await desktop.click('button.rail-btn:has-text("blank template")');
await desktop.waitForTimeout(400);
await shot(desktop, '18-blank-template');

// Mobile
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mobile.goto('http://127.0.0.1:8765/', { waitUntil: 'networkidle' });
await mobile.waitForSelector('.app');
await shot(mobile, '19-mobile-home');
await mobile.click('button.fab');
await mobile.waitForTimeout(200);
await mobile.locator('svg.map').tap({ position: { x: 180, y: 280 } }).catch(async () => {
  await mobile.locator('svg.map').click({ position: { x: 180, y: 280 } });
});
await mobile.waitForTimeout(400);
await shot(mobile, '20-mobile-composer');

await browser.close();
console.log('done');
