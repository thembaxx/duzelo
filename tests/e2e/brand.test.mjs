import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

test("editorial demo is clearly labelled and navigation reaches real category pages", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(baseURL + "/", { waitUntil: "networkidle" });
    assert.match(await page.locator("h1").innerText(), /A little help/);
    assert.equal(await page.locator(".category-card").count(), 6);
    assert.equal(await page.locator(".demo-scenario-card").count(), 3);
    assert.match(await page.getByText("INTERACTIVE PRODUCT DEMO").innerText(), /DEMO/);
    assert.ok(await page.getByText(/NO LIVE BOOKINGS OR PROVIDERS/).isVisible());
    await page.locator(".category-card").first().click();
    await page.waitForURL(/\/services\/home-repairs$/);
    assert.match(await page.locator("h1").innerText(), /Home repairs/);
    await page.screenshot({ path: "test-results/duzelo-editorial-desktop.png", fullPage: true });
  } finally {
    await browser.close();
  }
});

test("320px mobile, dark mode and reduced motion avoid overflow and illegible content", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 320, height: 740 },
      reducedMotion: "reduce",
      colorScheme: "dark",
      isMobile: true,
      hasTouch: true,
    });
    await page.goto(baseURL + "/", { waitUntil: "networkidle" });
    const result = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      cardWidth: document.querySelector(".category-card")?.getBoundingClientRect().width || 0,
    }));
    assert.ok(
      result.documentWidth <= result.viewportWidth + 1,
      "No horizontal overflow at narrow width: " + JSON.stringify(result),
    );
    assert.ok(result.cardWidth > 200);
    assert.ok(await page.getByRole("heading", { level: 1 }).isVisible());
    await page.screenshot({ path: "test-results/duzelo-editorial-mobile.png", fullPage: true });
  } finally {
    await browser.close();
  }
});
