import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test('service category tabs filter real taxonomy and work with arrow keys', async () => {
  const browser = await chromium.launch({ headless:true });
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    await page.goto(baseURL + '/services', {waitUntil:'networkidle'});
    assert.equal(await page.locator('.category-card').count(),6);
    await page.getByRole('tab',{name:'Outside & garden'}).click();
    assert.equal(await page.locator('.category-card').count(),3);
    assert.equal(await page.getByRole('tab',{name:'Outside & garden'}).getAttribute('aria-selected'),'true');
    assert.ok(await page.getByRole('link',{name:/Gardening/i}).count());
    await page.getByRole('tab',{name:'All services'}).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab',{name:'Around the home'}).getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('.category-card').count(),5);
    const width = await page.evaluate(()=>document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(width <= 1,'Filtered mobile view must not overflow viewport');
  } finally { await browser.close(); }
});

test('reduced-motion users never have pending-hidden cards', async () => {
  const browser = await chromium.launch({ headless:true });
  try {
    const page = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    await page.goto(baseURL + '/services',{waitUntil:'networkidle'});
    assert.equal(await page.locator('.reveal-pending').count(),0);
    assert.ok(await page.getByRole('heading',{level:1}).isVisible());
    const noAnim = await page.locator('.category-card').first().evaluate(el =>
      getComputedStyle(el).animationDuration);
    assert.ok(noAnim === '1e-05s' || noAnim === '0.00001s' || noAnim === '0s',
      'Reduced motion must not animate category cards: ' + noAnim);
  } finally { await browser.close(); }
});
