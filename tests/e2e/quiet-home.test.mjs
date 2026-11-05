import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

test("mobile home makes local service search the first clear action", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.goto(baseURL + "/", { waitUntil: "networkidle" });

    assert.match(await page.getByRole("heading", { level: 1 }).innerText(), /Find good help/);
    assert.equal(await page.getByRole("searchbox", { name: "Search for a service" }).count(), 1);
    assert.match(await page.locator(".hero-launch-note").innerText(), /not yet live/i);
    assert.equal(await page.locator(".hero-quick-links").count(), 0);
    assert.equal(await page.locator(".home-demo-cta").count(), 0);

    const geometry = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      searchSize: Number.parseFloat(
        getComputedStyle(document.querySelector(".service-search input")).fontSize,
      ),
    }));
    assert.ok(geometry.scroll <= geometry.viewport, "Homepage must not scroll horizontally");
    assert.ok(geometry.searchSize >= 16, "Search input must not trigger iOS focus zoom");

    await page.getByRole("searchbox", { name: "Search for a service" }).fill("garden");
    await page.getByRole("button", { name: /Find a service/ }).click();
    await page.waitForURL(/\/demo\?q=garden/);
  } finally {
    await browser.close();
  }
});
