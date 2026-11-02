import test from "node:test";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const storageKey = "duzelo-demo-v1";
const lightStyle = {
  version: 8,
  sources: {},
  layers: [{ id: "test-background", type: "background", paint: { "background-color": "#e7ecdf" } }],
};
async function contextFor(browser, options = {}) {
  const proxy = process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
  const context = await browser.newContext({
    ...(proxy
      ? {
          proxy: {
            server: proxy.protocol + "//" + proxy.host,
            username: decodeURIComponent(proxy.username),
            password: decodeURIComponent(proxy.password),
            bypass: "localhost,127.0.0.1",
          },
        }
      : {}),
    ...options,
  });
  // Deterministic rendering only: real geographic tiles are checked separately.
  await context.route("https://tiles.openfreemap.org/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(lightStyle),
    }),
  );
  return context;
}
async function noOverflow(page) {
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    "No page-level horizontal overflow",
  );
}
async function sampleState(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
}

test(
  "core demo screens meet contrast and accessibility checks in both themes and sizes",
  { timeout: 180000 },
  async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      for (const width of [390, 1440])
        for (const colorScheme of ["light", "dark"]) {
          const context = await contextFor(browser, {
              viewport: { width, height: width === 390 ? 844 : 900 },
              colorScheme,
              reducedMotion: "reduce",
            }),
            page = await context.newPage();
          for (const path of ["/demo", "/demo/providers/demo-lindi-home-care", "/demo/bookings"]) {
            await page.goto(baseURL + path, { waitUntil: "networkidle" });
            await noOverflow(page);
            const result = await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze();
            assert.deepEqual(
              result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
              [],
              `${width}px ${colorScheme} ${path}`,
            );
          }
          await context.close();
        }
    } finally {
      await browser.close();
    }
  },
);

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
])
  test(
    `populated demo booking journey persists without real mutations at ${viewport.width}px`,
    { timeout: 120000 },
    async () => {
      const browser = await chromium.launch({ headless: true });
      try {
        const context = await contextFor(browser, {
          viewport,
          isMobile: viewport.width < 600,
          hasTouch: viewport.width < 600,
        });
        const page = await context.newPage(),
          errors = [],
          mutations = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("request", (request) => {
          if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET")
            mutations.push(request.url());
        });
        await page.goto(baseURL + "/demo", { waitUntil: "networkidle" });
        await expect(page.locator(".demo-provider-card")).toHaveCount(8);
        assert.equal((await sampleState(page)).bookings.length, 14);
        await noOverflow(page);
        await expect(page.getByRole("link", { name: /About this demo/ })).toBeVisible();
        await page.getByRole("button", { name: "Gardening", exact: true }).click();
        await expect(page.locator(".demo-provider-card")).toHaveCount(2);
        await page.getByLabel("Sort demo providers").selectOption("price");
        await expect(page.locator(".demo-provider-card").first()).toHaveAttribute(
          "data-provider",
          "demo-root-grow",
        );
        await page.getByRole("button", { name: "All services", exact: true }).click();
        await page.getByRole("searchbox", { name: "Search demo services" }).fill("flat-pack");
        await page.getByRole("button", { name: "Find help", exact: true }).click();
        await expect(page.locator(".demo-provider-card")).toHaveCount(1);
        await page.getByRole("button", { name: "Save Made Right Repairs", exact: true }).click();
        await page
          .getByRole("navigation", { name: "Demo navigation" })
          .getByRole("link", { name: /Saved/ })
          .click();
        await expect(page.locator(".demo-provider-card")).toHaveCount(3);
        await page.getByRole("link", { name: "Made Right Repairs", exact: true }).click();
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Made Right Repairs");
        await expect(
          page.getByText(/No identity, qualification or background approval/),
        ).toBeVisible();
        await page.getByRole("radio", { name: /Flat-pack furniture assembly/ }).check();
        await page.getByLabel("Booking day", { exact: true }).selectOption("3");
        await page.getByLabel("Booking time", { exact: true }).selectOption("11:00");
        await page.getByRole("button", { name: "Create demo booking" }).click();
        await page.waitForURL(/\/demo\/bookings\/demo-booking-/);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          "Flat-pack furniture assembly",
        );
        assert.equal((await sampleState(page)).bookings.length, 15);
        const id = new URL(page.url()).pathname.split("/").at(-1);
        await page.reload({ waitUntil: "networkidle" });
        assert.equal((await sampleState(page)).bookings.find((b) => b.id === id).slot, "11:00");
        await page.getByRole("button", { name: "What should I have ready?", exact: true }).click();
        await expect(page.getByText(/just make space around the work area/)).toBeVisible();
        await page.getByText("Change sample date & time", { exact: true }).click();
        await page.getByLabel("New booking day", { exact: true }).selectOption("5");
        await page.getByLabel("New booking time", { exact: true }).selectOption("14:00");
        await page.getByRole("button", { name: "Save demo schedule" }).click();
        await expect(page.getByText(/Your demo visit has been rescheduled/)).toBeVisible();
        assert.equal((await sampleState(page)).bookings.find((b) => b.id === id).slot, "14:00");
        await page.getByRole("button", { name: "Simulate provider arrival" }).click();
        await page.getByRole("button", { name: "Simulate work finished" }).click();
        await page.getByRole("button", { name: "Confirm demo completion" }).click();
        await page.getByLabel("Sample rating", { exact: true }).selectOption("4");
        await page.getByRole("button", { name: "Save sample review" }).click();
        await expect(page.getByText("Your sample review: 4 out of 5 stars.")).toBeVisible();
        assert.equal(
          (await sampleState(page)).bookings.find((b) => b.id === id).status,
          "completed",
        );
        await noOverflow(page);
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          axe.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
          [],
        );
        await page.goto(baseURL + "/demo/bookings/demo-booking-1001", { waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Cancel sample booking", exact: true }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(
          page.getByRole("button", { name: "Cancel sample booking", exact: true }),
        ).toBeFocused();
        await page.getByRole("button", { name: "Cancel sample booking", exact: true }).click();
        await page.getByRole("button", { name: "Confirm demo cancellation", exact: true }).click();
        await expect(page.locator(".demo-booking-detail-heading .demo-status")).toHaveText(
          "Cancelled",
        );
        await page
          .getByRole("navigation", { name: "Demo navigation" })
          .getByRole("link", { name: /Bookings/ })
          .click();
        await page.getByRole("button", { name: /Past visits/ }).click();
        await expect(page.locator(".demo-booking-row")).toHaveCount(12);
        await page.getByRole("button", { name: "Reset demo", exact: true }).click();
        await page.getByRole("button", { name: "Reset sample workspace", exact: true }).click();
        assert.equal((await sampleState(page)).bookings.length, 14);
        assert.deepEqual(mutations, [], "Demo controls must never call real mutation APIs");
        assert.deepEqual(errors, [], "No uncaught browser exceptions");
        await context.close();
      } finally {
        await browser.close();
      }
    },
  );

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
])
  test(
    `map pins retain keyboard focus, selection and filters through theme changes; fallback at ${viewport.width}px`,
    { timeout: 90000 },
    async () => {
      const browser = await chromium.launch({ headless: true });
      try {
        const context = await contextFor(browser, { viewport }),
          page = await context.newPage();
        await page.goto(baseURL + "/demo", { waitUntil: "networkidle" });
        if (viewport.width < 1000)
          await page.getByRole("button", { name: "Map", exact: true }).click();
        await expect(page.locator('.demo-map[data-ready="true"]')).toBeVisible();
        await expect(page.locator(".demo-map-pin")).toHaveCount(8);
        const pin = page.getByRole("button", { name: /Preview Steady Flow Plumbing/ });
        await pin.focus();
        await page.keyboard.press("Enter");
        await expect(pin).toHaveAttribute("aria-pressed", "true");
        await expect(pin).toBeFocused();
        await expect(page.locator(".demo-map-preview")).toContainText("Steady Flow Plumbing");
        const canvas = await page.locator(".demo-map canvas").elementHandle();
        await page.getByRole("button", { name: "Dark theme", exact: true }).click();
        await expect(page.locator("html")).toHaveClass(/dark/);
        assert.ok(
          await page
            .locator(".demo-map canvas")
            .evaluate((node, original) => node === original, canvas),
          "Changing theme retains the map instance",
        );
        await expect(pin).toHaveAttribute("aria-pressed", "true");
        await page.getByRole("button", { name: "Plumbing", exact: true }).click();
        await expect(page.locator(".demo-map-pin")).toHaveCount(1);
        await expect(page.locator(".demo-provider-card")).toHaveCount(1);
        await context.unroute("https://tiles.openfreemap.org/**");
        await context.route("https://tiles.openfreemap.org/**", (route) => route.abort("failed"));
        await page.reload({ waitUntil: "networkidle" });
        if (viewport.width < 1000)
          await page.getByRole("button", { name: "Map", exact: true }).click();
        await expect(page.getByRole("button", { name: "Retry map", exact: true })).toBeVisible();
        await expect(page.locator(".demo-provider-card")).toHaveCount(1);
        if (viewport.width < 1000)
          await page.getByRole("button", { name: "List", exact: true }).click();
        await page.getByRole("link", { name: "Steady Flow Plumbing", exact: true }).click();
        await expect(page.getByRole("button", { name: "Create demo booking" })).toBeEnabled();
        await context.close();
      } finally {
        await browser.close();
      }
    },
  );

test(
  "narrow reduced-motion demo recovers corrupt and unavailable browser storage",
  { timeout: 90000 },
  async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await contextFor(browser, {
          viewport: { width: 320, height: 740 },
          reducedMotion: "reduce",
          colorScheme: "dark",
          isMobile: true,
          hasTouch: true,
        }),
        page = await context.newPage();
      await page.addInitScript(
        (key) => localStorage.setItem(key, '{"version":999,"address":"discard"}'),
        storageKey,
      );
      await page.goto(baseURL + "/demo", { waitUntil: "networkidle" });
      await expect(page.getByText(/saved demo could not be loaded/)).toBeVisible();
      assert.equal((await sampleState(page)).version, 1);
      await noOverflow(page);
      assert.equal(
        await page.locator(".demo-welcome").evaluate((el) => getComputedStyle(el).animationName),
        "none",
      );
      await page.getByRole("searchbox", { name: "Search demo services" }).fill("nothingmatches");
      await page.getByRole("button", { name: "Find help", exact: true }).click();
      await expect(page.getByRole("heading", { name: "No matches just yet." })).toBeVisible();
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.deepEqual(
        axe.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
        [],
      );
      await context.close();
      const blocked = await contextFor(browser, { viewport: { width: 390, height: 844 } }),
        blockedPage = await blocked.newPage();
      await blockedPage.addInitScript(() => {
        Object.defineProperty(Storage.prototype, "setItem", {
          value() {
            throw new DOMException("Blocked", "SecurityError");
          },
        });
      });
      await blockedPage.goto(baseURL + "/demo", { waitUntil: "networkidle" });
      await expect(
        blockedPage.getByText(/Demo changes will last for this visit only/),
      ).toBeVisible();
      await blockedPage
        .getByRole("button", { name: "Save Made Right Repairs", exact: true })
        .click();
      await blockedPage
        .getByRole("navigation", { name: "Demo navigation" })
        .getByRole("link", { name: /Saved/ })
        .click();
      await expect(blockedPage.locator(".demo-provider-card")).toHaveCount(3);
      await blocked.close();
    } finally {
      await browser.close();
    }
  },
);
