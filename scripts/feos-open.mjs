import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
page.on('requestfailed', r => console.log('FAIL', r.url(), r.failure()?.errorText));
page.on('console', m => console.log('C', m.type(), m.text().slice(0,400)));
page.on('response', r => {
  if (r.status()>=400 || r.url().includes('cdnjs') || r.url().includes('babel'))
    console.log('R', r.status(), r.url().slice(0,120));
});
await page.goto('http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
console.log('scripts', await page.locator('script').count());
console.log('root', await page.locator('#root').innerHTML().catch(e=>e.message));
console.log('body', (await page.locator('body').innerText()).slice(0,200));
await browser.close();
