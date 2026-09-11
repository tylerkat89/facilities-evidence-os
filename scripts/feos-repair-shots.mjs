import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(20000);
await page.goto('http://127.0.0.1:8080/feos.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: '/tmp/feos-desktop.png', fullPage: false });
const title = await page.locator('.stage-title').first().textContent().catch(()=>null);
const work = await page.locator('.workattn').count();
const attn = await page.locator('.attn').count();
const kindEmo = await page.locator('text=🚻').count();
const myWork = await page.locator('.mywork').count();
const role = await page.locator('.rolebtn').textContent().catch(()=>null);
console.log({ title, work, attn, kindEmo, myWork, role });
// open composer
const fab = page.locator('.fab');
if (await fab.count()) {
  await fab.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/feos-composer.png' });
  const h = await page.locator('.comp-h').textContent().catch(()=>null);
  const tabs = await page.locator('.modal .tab').allTextContents().catch(()=>[]);
  console.log({ composerH: h, tabs });
  await page.locator('button:has-text("Cancel")').click().catch(()=>{});
}
// phone
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
await phone.goto('http://127.0.0.1:8080/feos.html', { waitUntil: 'networkidle' });
await phone.waitForTimeout(2500);
await phone.screenshot({ path: '/tmp/feos-phone.png' });
await browser.close();
