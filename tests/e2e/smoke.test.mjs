import test from "node:test";
import assert from "node:assert/strict";
import { chromium, devices } from "playwright";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

test("desktop navigation, category search and colour preference persistence", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(baseURL + "/", { waitUntil: "networkidle" });
    assert.match(await page.title(), /Duzelo/);
    const fontStyles = await page.evaluate(async () => {
      await document.fonts.ready;
      const root = getComputedStyle(document.documentElement);
      const heading = document.querySelector("h1 em");
      return {
        sans: root.getPropertyValue("--font-geist-sans").trim(),
        serif: root.getPropertyValue("--font-geist-serif-regular").trim(),
        bodyFamily: getComputedStyle(document.body).fontFamily,
        accentFamily: heading ? getComputedStyle(heading).fontFamily : "",
      };
    });
    assert.ok(fontStyles.sans.length > 0, "Geist Sans must be registered");
    assert.ok(fontStyles.serif.length > 0, "Geist Serif must be registered");
    assert.match(fontStyles.bodyFamily, /Geist/i);
    assert.match(fontStyles.accentFamily, /Geist/i);

    await page.getByRole("button", { name: "Dark theme" }).first().click();
    assert.equal(
      await page
        .locator("html")
        .getAttribute("class")
        .then((value) => value?.includes("dark")),
      true,
    );
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(
      await page
        .locator("html")
        .getAttribute("class")
        .then((value) => value?.includes("dark")),
      true,
    );
    await page.getByRole("searchbox", { name: "Search for a service" }).fill("plumbing");
    await page.getByRole("button", { name: /Find a service/ }).click();
    await page.waitForURL(/explore\?q=plumbing/);
    assert.ok(await page.getByRole("link", { name: /Plumbing/ }).count());
    await page.screenshot({ path: "test-results/duzelo-desktop-dark.png", fullPage: true });
  } finally {
    await browser.close();
  }
});

test("mobile menu, system preference and protected-route fallback", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
      reducedMotion: "reduce",
      colorScheme: "dark",
    });
    const page = await context.newPage();
    await page.goto(baseURL + "/", { waitUntil: "networkidle" });
    assert.ok((await page.locator("html").getAttribute("class"))?.includes("dark"));
    await page.getByRole("button", { name: "Open menu" }).click();
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Services" })
      .click();
    await page.waitForURL(/\/services$/);
    const servicesHeading = page.getByRole("heading", { level: 1 });
    await servicesHeading.waitFor({ state: "visible", timeout: 10000 });
    assert.match(await servicesHeading.innerText(), /Your home|Our starting point/i);
    await page.goto(baseURL + "/admin");
    await page.waitForURL(/\/auth\/sign-in$/);
    await page.screenshot({ path: "test-results/duzelo-mobile-dark.png", fullPage: true });
    await context.close();
  } finally {
    await browser.close();
  }
});
