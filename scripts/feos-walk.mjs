import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const DIR = '/workspace/screenshots/walk';
mkdirSync(DIR, { recursive: true });
let n = 0;
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(15000);
page.on('pageerror', e => log('PAGEERROR', e.message));
page.on('console', m => {
  const t = m.text();
  if (/error|Error|fail/i.test(t) && !/Download the React DevTools/.test(t))
    log('C', m.type(), t.slice(0, 240));
});

async function shot(name) {
  n++;
  const f = `${DIR}/${String(n).padStart(2,'0')}-${name}.png`;
  await page.screenshot({ path: f });
  log('SHOT', f);
}
async function dump(label) {
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 1200);
  log('DUMP', label, text);
}
async function ready() {
  await page.waitForFunction(() => /My Work|Main Building|New Property/.test(document.body.innerText||''), { timeout: 30000 });
}
async function toMap() {
  const full = page.getByRole('button', { name: /Full map/i });
  if (await full.count()) { await full.click(); await page.waitForTimeout(400); }
}
async function setRole(want) {
  for (let i=0;i<5;i++){
    const btn = page.locator('button.rolebtn');
    if (!(await btn.count())) {
      const t = await page.locator('body').innerText();
      if (/tech/i.test(want) && /My Work/.test(t)) { log('role Tech (My Work)'); return; }
      log('no rolebtn'); return;
    }
    const t = await btn.innerText();
    if (new RegExp(want, 'i').test(t)) { log('role', t); return; }
    await btn.click();
    await page.waitForTimeout(280);
  }
}
async function closePanel() {
  const x = page.locator('.dirwrap button.x').first();
  await x.waitFor({ state: 'visible', timeout: 8000 });
  await x.click({ force: true });
  await page.waitForTimeout(350);
}

try {
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await ready();
  await page.waitForTimeout(300);
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch(_){} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready();
  await page.waitForTimeout(700);
  await shot('01-boot-mywork');
  await dump('boot');

  await toMap();
  await page.waitForTimeout(400);
  await shot('02-map');

  if (await page.getByRole('button', { name: /Load pre-build/i }).count()) {
    await page.getByRole('button', { name: /Load pre-build/i }).click();
    await page.waitForTimeout(600);
  }
  await shot('03-prebuild');
  await setRole('Manager');

  await page.getByRole('button', { name: /Inventory/i }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Add inventory item/i }).click();
  await page.waitForTimeout(250);
  await page.locator('.invadd input.txt').nth(0).fill('Flush valve spud gasket');
  await page.locator('.invadd .chip', { hasText: /^Plumbing$/ }).click();
  const invInputs = page.locator('.invadd input.txt');
  await invInputs.nth(1).fill('each');
  await invInputs.nth(2).fill('5');
  await invInputs.nth(3).fill('8');
  await invInputs.nth(4).fill('66');
  await page.getByRole('button', { name: /Add to inventory/i }).click();
  await page.locator('.invname').filter({ hasText: 'Flush valve spud gasket' }).waitFor({ timeout: 8000 });
  await shot('04-inventory-added');
  await dump('inventory');
  await closePanel();

  await page.getByRole('button', { name: /Budget/i }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Add a budget line/i }).click();
  await page.waitForTimeout(200);
  await page.locator('.invadd .chip', { hasText: /^Plumbing$/ }).click();
  const budInputs = page.locator('.invadd input.txt');
  await budInputs.nth(0).fill('FY 2026');
  await budInputs.nth(1).fill('24000');
  await budInputs.nth(2).fill('0');
  await page.getByRole('button', { name: /^Add line$/i }).click();
  await page.locator('.bud-cat', { hasText: 'Plumbing' }).waitFor({ timeout: 8000 });
  await shot('05-budget-added');
  await dump('budget-before');
  await closePanel();

  await setRole('Tech');
  await toMap();
  await page.waitForTimeout(400);
  await shot('06-tech-map');

  await page.getByRole('button', { name: /Vendors & rooms/i }).click();
  await page.waitForTimeout(350);
  const roomsTab = page.getByRole('tab', { name: /Rooms/i });
  if (await roomsTab.count()) await roomsTab.click();
  await page.waitForTimeout(200);
  await page.locator('.zt', { hasText: 'Restroom' }).first().click();
  await page.waitForTimeout(500);
  await shot('07-restroom');
  await dump('restroom');

  await page.getByRole('button', { name: /Report something here/i }).click();
  await page.waitForSelector('.modal textarea');
  await page.locator('.modal textarea').fill('Water pooling 18 inches out from the base of urinal 2. Floor is wet. No odor.');
  await page.locator('.modal input[type=file]').nth(1).setInputFiles('/tmp/feos-walk/urinal.jpg');
  await page.waitForTimeout(1400);
  await page.locator('.modal .chip', { hasText: /^Plumbing$/ }).click();
  await page.locator('.modal .chip.pri', { hasText: /Today/ }).click();
  await shot('08-composer');
  await page.getByRole('button', { name: /Send it up/i }).click();
  await page.waitForTimeout(900);
  await shot('09-reported');
  await dump('reported');

  if (!(await page.getByRole('button', { name: /Update this issue/i }).count())) {
    const attn = page.locator('.attn-row').first();
    if (await attn.count()) await attn.click();
    await page.waitForTimeout(400);
  }
  await shot('10-drawer');

  await page.getByRole('button', { name: /Update this issue/i }).click();
  await page.waitForTimeout(400);
  await shot('11-actions');
  await page.getByText(/Log parts used/i).click();
  await page.waitForTimeout(400);
  await page.locator('.modal .chip').first().click();
  await page.locator('.modal input.txt').first().fill('1');
  await shot('12-parts-form');
  await page.getByRole('button', { name: /Put it on the record/i }).click();
  await page.waitForTimeout(800);
  await shot('13-parts-logged');
  await dump('parts-logged');

  const afterParts = await page.locator('body').innerText();
  log('HAS_$66', /\$66/.test(afterParts));
  log('HAS_GASKET', /gasket|Parts used/i.test(afterParts));

  await setRole('Manager');
  await shot('14-manager-map');

  const drawerX = page.locator('.drawer button.x');
  if (await drawerX.count()) {
    await drawerX.click({ force: true });
    await page.waitForTimeout(400);
  }

  await page.getByRole('button', { name: /Budget/i }).first().click();
  await page.waitForTimeout(600);
  const plumbingRow = page.locator('.bud-h').filter({ hasText: 'Plumbing' });
  if (await plumbingRow.count()) await plumbingRow.click();
  await page.waitForTimeout(300);
  await shot('15-budget-after');
  await dump('budget-after');
  const budgetText = await page.locator('.dirwrap').innerText();
  log('BUDGET_PANEL', budgetText.replace(/\s+/g,' ').slice(0, 900));
  log('RESULT remaining', /23,934/.test(budgetText),
      'accounted66', /\$66/.test(budgetText),
      'unexplained', /unexplained/i.test(budgetText),
      'records', /1 record/.test(budgetText));

  await closePanel();
  await page.getByRole('button', { name: /Inventory/i }).first().click();
  await page.waitForTimeout(400);
  await shot('16-inventory-after');
  await dump('inventory-after');
  const invText = await page.locator('body').innerText();
  log('ONHAND4', /4\s*on hand/.test(invText));
  log('INV_SLICE', invText.replace(/\s+/g,' ').match(/Flush[\s\S]{0,120}/)?.[0]);

  log('WALK_DONE');
} catch (e) {
  log('WALK_FAIL', e.stack || e.message);
  await shot('fail');
  await dump('fail');
} finally {
  await browser.close();
}
