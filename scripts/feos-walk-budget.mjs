import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => /My Work|Main Building|Budget/.test(document.body.innerText||''), { timeout: 30000 });
await page.waitForTimeout(800);
if (await page.getByRole('button', { name: /Full map/i }).count()) {
  await page.getByRole('button', { name: /Full map/i }).click();
  await page.waitForTimeout(400);
}
// close issue drawer if open
const dx = page.locator('.drawer .x, [class*="draw"] button.x, button.x').first();
if (await page.getByText(/ISS-/).count()) {
  // click the issue close × in drawer header
  const closeIss = page.locator('button.x').first();
  await closeIss.click({ force: true }).catch(()=>{});
  await page.waitForTimeout(400);
}
await page.getByRole('button', { name: /Budget/i }).first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: '/workspace/screenshots/walk/17-budget-only.png' });
const t = await page.locator('body').innerText();
console.log('SLICE', t.replace(/\s+/g,' ').match(/Budget[\s\S]{0,700}/)?.[0]);
console.log('remaining', /23,934/.test(t), 'unexplained', /unexplained/i.test(t), '66', /\$66/.test(t));
await browser.close();
