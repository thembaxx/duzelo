import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import postgres from "postgres";
import sharp from "sharp";
import { discoveryFixtures } from "./helpers/discovery-fixtures";
import { signIn, origin, area, cleaning } from "./helpers/worker-fixtures";
const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
const baseline = {
  location: null,
  categoryId: null,
  radiusKm: 30,
  available: false,
  tradeReviewed: false,
  sort: "name",
  cursor: null,
};
test.afterAll(async () => sql.end());
test.afterEach(async () => {
  await sql`delete from public.worker_cards where public_name like 'Fictional discovery %'`;
});
test("coarse discovery, real map, fallback, theme, pagination and saved-address privacy", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(240000);
  await sql`delete from private.auth_rate_limits`;
  const ids = await discoveryFixtures(sql, info.project.name);
  const post = (action: string, data: unknown, key = crypto.randomUUID()) =>
    page.request.post("/api/v1/discovery/" + action, {
      data,
      headers: { origin, "Idempotency-Key": key },
    });
  await page.goto("/explore");
  await expect(
    page.getByRole("heading", { name: "20 reviewed profiles on this page", exact: true }),
  ).toBeVisible();
  const response = await post("search", baseline);
  expect(response.status()).toBe(200);
  const first = await response.json();
  expect(first.workers).toHaveLength(20);
  expect(
    first.workers.every(
      (w: { point: { longitude: number; latitude: number } }) =>
        w.point.longitude === 30 && w.point.latitude === -27,
    ),
  ).toBe(true);
  const publicText = JSON.stringify(first) + (await (await page.request.get("/explore")).text());
  for (const hidden of ["-27.123456", "30.654321", "base_point", "storage_path"])
    expect(publicText).not.toContain(hidden);
  const available = await (await post("search", { ...baseline, available: true })).json();
  expect(available.workers).toHaveLength(11);
  const next = await (await post("search", { ...baseline, cursor: first.nextCursor })).json();
  expect(next.workers).toHaveLength(1);
  expect(first.workers.map((w: { slug: string }) => w.slug)).not.toContain(next.workers[0].slug);
  expect(
    (await post("search", { ...baseline, available: true, cursor: first.nextCursor })).status(),
  ).toBe(422);
  expect(
    (
      await post("search", {
        ...baseline,
        location: { kind: "coordinates", point: { latitude: 90, longitude: 180 } },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await post("search", {
        ...baseline,
        location: { kind: "saved", id: "90000000-0000-0000-0000-000000000001" },
      })
    ).status(),
  ).toBe(401);
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "1 reviewed profiles on this page", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Previous page", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "20 reviewed profiles on this page", exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Town", exact: true }).selectOption(area);
  await page
    .getByRole("combobox", { name: "Service category", exact: true })
    .selectOption(cleaning);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("heading", { name: "20 reviewed profiles on this page", exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Trade credential reviewed for this category" }).check();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("heading", { name: "No reviewed profiles match this search." }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Trade credential reviewed for this category" })
    .uncheck();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("heading", { name: "20 reviewed profiles on this page", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use my location", exact: true }).click();
  await expect(page.getByText(/Location was not shared/)).toBeVisible();
  await page.getByText("Enter a point manually", { exact: true }).click();
  await page.getByLabel("Search latitude").fill("-27.001234");
  await page.getByLabel("Search longitude").fill("30.001234");
  await page.getByRole("button", { name: "Use manual point" }).click();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("heading", { name: "20 reviewed profiles on this page", exact: true }),
  ).toBeVisible();
  expect(page.url()).not.toContain("-27.001234");
  const before = (await (await page.request.get("http://127.0.0.1:54329/counts")).json()).requests;
  for (let i = 0; i < 2; i++) {
    await page.getByLabel("Town or address search").fill("Fictional rural farm");
    await page.getByRole("button", { name: "Search places", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Fictional rural farm, synthetic test area" }),
    ).toBeVisible();
  }
  const after = (await (await page.request.get("http://127.0.0.1:54329/counts")).json()).requests;
  expect(after - before).toBe(1);
  await page.getByRole("button", { name: "Fictional rural farm, synthetic test area" }).click();
  await expect(page.getByText("Selected search point: -27.04, 30.07")).toBeVisible();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("heading", { name: "20 reviewed profiles on this page", exact: true }),
  ).toBeVisible();
  let mapException = "";
  const captureMapError = (error: Error) => {
    mapException =
      error.name + ": " + error.message.replace(/https?:\/\/\S+/g, "[URL]").slice(0, 240);
  };
  page.on("pageerror", captureMapError);
  await page.getByRole("button", { name: "Map view", exact: true }).click();
  try {
    await expect(page.locator(".discovery-map")).toHaveAttribute("data-ready", "true");
  } catch (error) {
    console.info("Initial map exception (URLs redacted):", mapException);
    throw error;
  } finally {
    page.off("pageerror", captureMapError);
  }

  const marker = page.getByRole("button", { name: /20 reviewed workers in Synthetic test area/ });
  await marker.click();
  await expect(marker).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(marker).toBeFocused();
  await expect(page.locator(".discovery-card.selected")).toHaveCount(1);
  const box = () =>
    page.evaluate(() => {
      const a = document.querySelector(".discovery-marker")!.getBoundingClientRect(),
        b = document.querySelector(".discovery-map")!.getBoundingClientRect();
      return { x: a.x - b.x, y: a.y - b.y };
    });
  const beforeTheme = await box();
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Open menu" }).click();
  const dark = page.waitForResponse((r) => r.url().includes("test-style-dark"));
  await page.getByRole("button", { name: "Dark theme" }).first().click();
  await dark;
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Close menu" }).click();
  // Wait for the synthetic dark background to be painted, not just fetched.
  await expect
    .poll(async () => {
      const { data, info } = await sharp(await page.locator(".discovery-map").screenshot())
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const pixel =
        (Math.floor(info.height * 0.25) * info.width + Math.floor(info.width * 0.8)) * 3;
      return [...data.subarray(pixel, pixel + 3)];
    })
    .toEqual([21, 44, 38]);
  await expect(page.locator(".discovery-card.selected")).toHaveCount(1);
  const afterTheme = await box();
  expect(Math.abs(afterTheme.x - beforeTheme.x)).toBeLessThan(3);
  expect(Math.abs(afterTheme.y - beforeTheme.y)).toBeLessThan(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.locator(".discovery-layout").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `docs/evidence/screenshots/discovery-map-${info.project.name}.png`,
  });
  await page.getByRole("button", { name: "List view", exact: true }).click();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.locator("#worker-results").evaluate((node) => {
    node.scrollTop = 0;
    node.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await page.screenshot({
    path: `docs/evidence/screenshots/discovery-list-${info.project.name}.png`,
  });
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Map view", exact: true }).click();
    const handle = page.locator(".discovery-sheet-handle");
    await expect(handle).toHaveAttribute("aria-expanded", "true");
    await handle.click();
    await expect(handle).toHaveAttribute("aria-expanded", "false");
    await handle.press("Enter");
    await expect(handle).toHaveAttribute("aria-expanded", "true");
    await handle.click();
    const bounds = await handle.boundingBox();
    const x = bounds!.x + bounds!.width / 2,
      y = bounds!.y + bounds!.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 80, { steps: 8 });
    await page.mouse.up();
    await expect(handle).toHaveAttribute("aria-expanded", "true");
  }
  const priorPoint = await page.getByText(/^Selected search point:/).innerText();
  await page.getByRole("button", { name: "Place a point on the map", exact: true }).click();
  const mapBox = await page.locator(".discovery-map").boundingBox();
  await page
    .locator(".discovery-map")
    .click({ position: { x: mapBox!.width * 0.8, y: mapBox!.height * 0.22 } });
  await expect(page.getByText(/^Selected search point:/)).not.toHaveText(priorPoint);
  await page
    .getByRole("combobox", { name: "Approximate distance", exact: true })
    .selectOption("150");
  const [placed] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/discovery/search")),
    page.getByRole("button", { name: "Apply filters" }).click(),
  ]);
  expect(placed.status()).toBe(200);
  // Isolate the tile outage from service-worker interception. A 404 can be a
  // legitimate empty tile; 503 is an actual provider failure.
  const outageContext = await browser.newContext({
    baseURL: origin,
    viewport: info.project.use.viewport,
    colorScheme: "light",
    serviceWorkers: "block",
  });
  await outageContext.route("**/test-style-light", (route) =>
    route.fulfill({
      json: {
        version: 8,
        sources: {
          broken: {
            type: "raster",
            tiles: [origin + "/api/v1/discovery/unavailable-tile?z={z}&x={x}&y={y}"],
            tileSize: 256,
            attribution: "Synthetic tile-failure fixture · CC0",
          },
        },
        layers: [{ id: "broken", type: "raster", source: "broken" }],
      },
    }),
  );
  await outageContext.route("**/unavailable-tile?*", (route) =>
    route.fulfill({ status: 503, body: "Synthetic unavailable tile" }),
  );
  const outage = await outageContext.newPage();
  await outage.goto("/explore");
  const tileFailure = outage.waitForResponse(
    (response) => response.url().includes("/unavailable-tile?") && response.status() === 503,
  );
  await outage.getByRole("button", { name: "Map view", exact: true }).click();
  await tileFailure;
  await expect(
    outage.getByText("Map content could not load. The worker list remains available."),
  ).toBeVisible();
  await outage.locator(".discovery-layout").scrollIntoViewIfNeeded();
  await outage.screenshot({
    path: `docs/evidence/screenshots/discovery-fallback-${info.project.name}.png`,
  });
  await outage.getByRole("button", { name: "List view", exact: true }).click();
  await expect(
    outage.getByRole("heading", { name: "20 reviewed profiles on this page", exact: true }),
  ).toBeVisible();
  await outageContext.close();
  await page.getByLabel("Town or address search").fill("Unavailable provider");
  await page.getByRole("button", { name: "Search places", exact: true }).click();
  await expect(
    page.getByText("Address search is unavailable. Choose a town or place a point manually."),
  ).toBeVisible();
  for (let attempt = 0; attempt < 20; attempt++)
    await post("geocode", { query: "No matching fixture" });
  const limited = await post("geocode", { query: "No matching fixture" });
  expect(limited.status()).toBe(429);
  expect(limited.headers()["retry-after"]).toBe("60");
  const cached = await page.evaluate(async () => {
    const paths = (
      await Promise.all(
        (await caches.keys()).map(async (key) =>
          (await (await caches.open(key)).keys()).map((r) => new URL(r.url).pathname),
        ),
      )
    ).flat();
    return paths.filter((p) => p === "/explore" || p.startsWith("/api/v1/discovery"));
  });
  expect(cached).toEqual([]);
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Connection unavailable" })).toBeVisible();
  await page.context().setOffline(false);
  // A browser without WebGL/GPS retains the complete list and manual fallback.
  const unsupportedContext = await browser.newContext({
    baseURL: origin,
    viewport: info.project.use.viewport,
  });
  await unsupportedContext.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", { value: undefined });
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: function (type: string, ...args: unknown[]) {
        if (type.includes("webgl")) return null;
        return Reflect.apply(original, this, [type, ...args]);
      },
    });
  });
  const unsupported = await unsupportedContext.newPage();
  await unsupported.goto("/explore");
  await unsupported.getByRole("button", { name: "Use my location", exact: true }).click();
  await expect(
    unsupported.getByText("Location is unsupported. Choose a town or enter a point manually."),
  ).toBeVisible();
  await unsupported.getByRole("button", { name: "Map view", exact: true }).click();
  await expect(
    unsupported.getByText(
      "This browser cannot display the map. Use the worker list and manual coordinates.",
    ),
  ).toBeVisible();
  await unsupportedContext.close();
  // Real native identity + transactionally saved private address, never a public DTO.
  await signIn(page, "0820000006", "client");
  await page.goto("/explore");
  const accountContent = page.locator("#main-content");
  await accountContent.getByText("Save a private address", { exact: true }).click();
  await accountContent.getByLabel("Address label", { exact: true }).fill("Fictional saved farm");
  await accountContent
    .getByLabel("Private street or rural directions")
    .fill("PRIVATE-RURAL-DIRECTIONS-42");
  await accountContent.getByLabel("Address town", { exact: true }).fill("Fictional town");
  await accountContent
    .getByRole("combobox", { name: "Address province", exact: true })
    .selectOption("Mpumalanga");
  await accountContent.getByLabel("Private address latitude").fill("-27.001234");
  await accountContent.getByLabel("Private address longitude").fill("30.001234");
  await accountContent
    .getByRole("checkbox", { name: "I choose to save this private address for my account." })
    .check();
  const [saved] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/discovery/address")),
    page.getByRole("button", { name: "Save private address", exact: true }).click(),
  ]);
  expect(saved.status()).toBe(200);
  const address = await saved.json();
  await page.getByRole("combobox", { name: "Saved address", exact: true }).selectOption(address.id);
  const [foundSaved] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/discovery/search")),
    page.getByRole("button", { name: "Apply filters" }).click(),
  ]);
  expect(foundSaved.status()).toBe(200);
  expect(JSON.stringify(await foundSaved.json())).not.toContain("PRIVATE-RURAL-DIRECTIONS-42");
  expect(
    (
      await post("search", {
        ...baseline,
        location: { kind: "saved", id: "90000000-0000-0000-0000-000000000001" },
      })
    ).status(),
  ).toBe(403);
  expect(await (await page.request.get("/explore")).text()).not.toContain(
    "PRIVATE-RURAL-DIRECTIONS-42",
  );
  const duplicateInput = {
    label: "Fictional duplicate location",
    street: "PRIVATE-DUPLICATE-DIRECTIONS",
    town: "Fictional town",
    province: "Mpumalanga",
    point: { latitude: -27.001234, longitude: 30.001234 },
    consent: true,
  };
  const duplicateKey = crypto.randomUUID();
  const duplicates = await Promise.all([
    post("address", duplicateInput, duplicateKey),
    post("address", duplicateInput, duplicateKey),
  ]);
  expect(duplicates.map((r) => r.status())).toEqual([200, 200]);
  const duplicateRows = await Promise.all(duplicates.map((r) => r.json()));
  expect(duplicateRows[0].id).toBe(duplicateRows[1].id);
  expect(
    (
      await sql`select count(*)::int as count from private.audit_events where action='discovery.address-saved' and resource_id=${duplicateRows[0].id}::uuid`
    )[0]!.count,
  ).toBe(1);
  expect(
    (await post("address", { ...duplicateInput, ownerId: crypto.randomUUID() })).status(),
  ).toBe(422);
  expect(
    (
      await page.request.post("/api/v1/discovery/address", {
        data: duplicateInput,
        headers: { origin: "https://attacker.invalid", "Idempotency-Key": crypto.randomUUID() },
      })
    ).status(),
  ).toBe(403);
  const [actor] = await sql`select id from auth.users where phone='27820000006'`;
  await sql`update auth.sessions set not_after=now()-interval '1 second' where user_id=${actor!.id}::uuid`;
  expect(
    (await post("search", { ...baseline, location: { kind: "saved", id: address.id } })).status(),
  ).toBe(401);
  expect((await post("address", duplicateInput, duplicateKey)).status()).toBe(401);
  await sql`delete from public.worker_cards where worker_id=any(${ids}::uuid[])`;
});
