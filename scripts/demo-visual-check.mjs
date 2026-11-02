// Optional network check against real public OpenFreeMap tiles. CI uses deterministic styles.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const output = "docs/evidence/screenshots";
mkdirSync(output, { recursive: true });
const transport = process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
const browser = await chromium.launch({ headless: true });
const checks = [],
  errors = [],
  tileStatuses = [];
try {
  for (const width of [1440, 390, 768, 1024, 320]) {
    const height = width === 390 ? 844 : width === 320 ? 740 : 900;
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: width < 600,
      hasTouch: width < 600,
      ...(transport
        ? {
            proxy: {
              server: transport.protocol + "//" + transport.host,
              username: decodeURIComponent(transport.username),
              password: decodeURIComponent(transport.password),
              bypass: "127.0.0.1,localhost",
            },
          }
        : {}),
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (new URL(response.url()).hostname === "tiles.openfreemap.org")
        tileStatuses.push(response.status());
    });
    for (const path of [
      "/",
      "/demo",
      "/demo/providers/demo-lindi-home-care",
      "/demo/bookings",
      "/demo/bookings/demo-booking-1003",
    ]) {
      await page.goto(base + path, { waitUntil: "networkidle" });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images]
            .filter((image) => image.loading !== "lazy")
            .map((image) => image.decode().catch(() => {})),
        );
      });
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `${width}px ${path}: overflow`,
      );
      assert.ok(await page.getByRole("heading", { level: 1 }).isVisible());
      checks.push({ width, height, path, overflow: false });
      if (width === 1440 || width === 390) {
        await page.waitForTimeout(1400);
        const name =
          path === "/"
            ? "home"
            : path === "/demo"
              ? "discover"
              : path.includes("/providers/")
                ? "profile"
                : path === "/demo/bookings"
                  ? "bookings"
                  : "booking-detail";
        await page.screenshot({
          path: `${output}/demo-${name}-${width === 390 ? "mobile" : "desktop"}.png`,
        });
      }
    }
    if (width === 1440 || width === 390) {
      await page.goto(base + "/demo", { waitUntil: "networkidle" });
      if (width === 390) await page.getByRole("button", { name: "Map", exact: true }).click();
      await expect(page.locator('.demo-map[data-ready="true"]')).toBeVisible({ timeout: 25000 });
      await expect(page.locator(".demo-map-pin")).toHaveCount(8);
      await page.evaluate(() => {
        const top =
          document.querySelector(".demo-discovery-layout").getBoundingClientRect().top + scrollY;
        window.scrollTo({ top: top - (innerWidth < 600 ? 142 : 96), behavior: "instant" });
      });
      const clipped = await page.locator(".demo-map").evaluate((map) => {
        const bounds = map.getBoundingClientRect();
        return [...map.querySelectorAll(".demo-map-pin")].filter((pin) => {
          const rect = pin.getBoundingClientRect();
          return (
            rect.left < bounds.left ||
            rect.right > bounds.right ||
            rect.top < bounds.top ||
            rect.bottom > bounds.bottom
          );
        }).length;
      });
      assert.equal(clipped, 0, "Initial sample pins fit inside the map");
      await page.getByRole("button", { name: /Preview Steady Flow Plumbing/ }).click();
      await expect(page.locator(".demo-map-preview")).toContainText("Steady Flow Plumbing");
      await page.screenshot({
        path: `${output}/demo-map-${width === 390 ? "mobile" : "desktop"}.png`,
      });
      await expect(page.locator(".demo-map")).not.toHaveAttribute("data-style-background", "");
      const lightBackground = await page.locator(".demo-map").getAttribute("data-style-background");
      const changed = page.waitForResponse(
        (response) =>
          response.url() === "https://tiles.openfreemap.org/styles/fiord" && response.ok(),
      );
      await page.getByRole("button", { name: "Dark theme", exact: true }).click();
      const styleResponse = await changed;
      const darkStyle = await styleResponse.json();
      const darkBackground = JSON.stringify(
        darkStyle.layers.find((l) => l.type === "background")?.paint?.["background-color"] ?? null,
      );
      assert.notEqual(
        darkBackground,
        lightBackground,
        "The published dark palette differs from light",
      );
      await expect(page.locator(".demo-map")).toHaveAttribute(
        "data-style-background",
        darkBackground,
        { timeout: 25000 },
      );
      await expect(page.locator(".demo-map-error")).toHaveCount(0);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(400);
      // Theme controls can scroll the header into view; restore the map framing.
      await page.evaluate(() => {
        const top =
          document.querySelector(".demo-discovery-layout").getBoundingClientRect().top + scrollY;
        window.scrollTo({ top: top - (innerWidth < 600 ? 142 : 96), behavior: "instant" });
      });
      await page.screenshot({
        path: `${output}/demo-map-dark-${width === 390 ? "mobile" : "desktop"}.png`,
      });
      checks.push({
        width,
        height,
        map: "real OpenFreeMap",
        pins: 8,
        clipped: 0,
        themes: ["light", "dark"],
        appliedBackgrounds: { light: lightBackground, dark: darkBackground },
      });
    }
    await context.close();
  }
  assert.deepEqual(errors, [], "No browser exceptions");
  assert.ok(
    tileStatuses.length > 0 && tileStatuses.every((status) => status < 400),
    "Real basemap requests succeeded",
  );
  const report = {
    checkedAt: new Date().toISOString(),
    base,
    checks,
    browserErrors: errors.length,
    realMapRequests: tileStatuses.length,
    failedMapRequests: tileStatuses.filter((s) => s >= 400).length,
  };
  writeFileSync(
    "docs/evidence/production-demo/visual-check.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
