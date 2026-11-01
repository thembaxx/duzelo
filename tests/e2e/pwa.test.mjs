import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

test(
  "manifest and offline-safe service worker never save private routes",
  { timeout: 60000 },
  async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      const manifestResponse = await page.request.get(baseURL + "/manifest.webmanifest");
      assert.equal(manifestResponse.status(), 200);
      const manifest = await manifestResponse.json();
      assert.equal(manifest.display, "standalone");
      assert.equal(manifest.start_url, "/");
      assert.ok(
        manifest.icons.some((icon) => icon.purpose === "maskable" && icon.sizes === "512x512"),
      );
      for (const icon of manifest.icons.filter((icon) => icon.type === "image/png")) {
        const response = await page.request.get(baseURL + icon.src);
        assert.equal(response.status(), 200, icon.src);
        assert.match(response.headers()["content-type"] || "", /image\/png/);
      }

      await page.goto(baseURL + "/", { waitUntil: "networkidle" });
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller)
          await new Promise((resolve) => {
            navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
          });
      });
      await page.goto(baseURL + "/auth/sign-in", { waitUntil: "domcontentloaded" });
      await page.goto(baseURL + "/explore", { waitUntil: "domcontentloaded" });
      const cachedPrivateRoutes = await page.evaluate(async () => {
        const names = await caches.keys();
        const urls = (
          await Promise.all(
            names.map(async (name) => {
              const cache = await caches.open(name);
              return (await cache.keys()).map((request) => new URL(request.url).pathname);
            }),
          )
        ).flat();
        return urls.filter((path) =>
          /^\/(?:auth|app|admin|onboarding|api|workers|explore)(?:\/|$)/.test(path),
        );
      });
      assert.deepEqual(cachedPrivateRoutes, [], "No private route may enter public CacheStorage");

      await context.setOffline(true);
      await page.goto(baseURL + "/services", { waitUntil: "domcontentloaded" });
      assert.match(await page.locator("h1").innerText(), /Your home/);
      await context.setOffline(false);
      await context.close();
    } finally {
      await browser.close();
    }
  },
);

test("explicit dark and light themes sync the browser UI", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(baseURL + "/settings", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Dark theme" }).first().click();
    await page.waitForFunction(() =>
      [...document.querySelectorAll('meta[name="theme-color"]')].every(
        (el) => el.getAttribute("content") === "#101C17",
      ),
    );
    await page.getByRole("button", { name: "Light theme" }).first().click();
    await page.waitForFunction(() =>
      [...document.querySelectorAll('meta[name="theme-color"]')].every(
        (el) => el.getAttribute("content") === "#F9F7F0",
      ),
    );
  } finally {
    await browser.close();
  }
});
