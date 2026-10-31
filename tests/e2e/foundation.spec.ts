import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("home, real navigation, accessibility and reference viewport screenshot", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hello, neighbour." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Good help, close to home." })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: `docs/evidence/screenshots/home-${testInfo.project.name}.png`,
    fullPage: false,
  });
  await page.getByRole("link", { name: "Explore services", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Help for your kind of home." })).toBeVisible();
  await page.getByRole("link", { name: /Plumbing Taps/ }).click();
  await expect(page.getByRole("heading", { name: "Listings aren’t open yet." })).toBeVisible();
  expect(errors).toEqual([]);
});

test("public pages, absence of overflow and no broken internal links", async ({
  page,
  request,
}) => {
  for (const path of [
    "/",
    "/services",
    "/explore",
    "/how-it-works",
    "/trust",
    "/help",
    "/legal/privacy",
    "/legal/terms",
    "/auth/sign-in",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toHaveCount(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const links = await page
      .locator('a[href^="/"]')
      .evaluateAll((elements) => [
        ...new Set(elements.map((element) => element.getAttribute("href")!.split("#")[0]!)),
      ]);
    for (const href of links) expect((await request.get(href)).status(), href).toBeLessThan(400);
  }
  expect((await request.get("/services/not-a-category")).status()).toBe(404);
});

test("protected workspaces reject forged identity and disable caching", async ({ request }) => {
  for (const workspace of ["client", "worker", "admin"]) {
    const path = workspace === "admin" ? "/admin" : `/app/${workspace}`;
    const response = await request.get(path + "?role=admin&verified=true", {
      maxRedirects: 0,
      headers: {
        cookie: "sb-access-token=forged; role=admin",
        "x-user-id": "forged",
        "x-role": "admin",
      },
    });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe(`/auth/sign-in?workspace=${workspace}`);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("PWA manifest and offline cache never store protected pages", async ({
  page,
  context,
  request,
}) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.goto("/auth/sign-in");
  await page.goto("/trust");
  expect(
    await page.evaluate(async () => {
      const keys = await caches.keys();
      return (
        await Promise.all(
          keys.map(async (key) =>
            (await (await caches.open(key)).keys()).map((req) => new URL(req.url).pathname),
          ),
        )
      ).flat();
    }),
  ).toEqual(["/offline.html"]);
  await context.setOffline(true);
  await page.goto("/services");
  await expect(page.getByRole("heading", { name: "A little pause." })).toBeVisible();
  const protectedPage = await context.newPage();
  await expect(protectedPage.goto("/auth/sign-in")).rejects.toThrow();
  await protectedPage.close();
  await context.setOffline(false);
  await page.getByRole("link", { name: "Try home again" }).click();
  await expect(page.getByRole("heading", { name: "Hello, neighbour." })).toBeVisible();
});

test("mobile menu is keyboard operable and languages are honestly described", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    const menu = page.getByLabel("Open navigation menu");
    await menu.focus();
    await page.keyboard.press("Enter");
    await page
      .getByRole("navigation", { name: "More navigation" })
      .getByRole("link", { name: "Trust & safety" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Trust needs more than a badge." }),
    ).toBeVisible();
  }
  await page.getByRole("link", { name: "Language: English" }).click();
  await expect(
    page.getByRole("heading", { name: "English first. More languages to follow." }),
  ).toBeVisible();
});

test("public shell also fits 320px, tablet and small desktop", async ({ page }) => {
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});
