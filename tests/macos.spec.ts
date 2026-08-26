import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { assertNoDocumentOverflow, monitorRuntime, settleRoute } from "./helpers";

async function openMacPage(page: import("@playwright/test").Page) {
  const runtime = monitorRuntime(page);
  await page.goto("/desktop/");
  await settleRoute(page);
  return runtime;
}

test("macOS product page exposes all promised sections and working local media", async ({ page }) => {
  const runtime = await openMacPage(page);
  await expect(page.getByRole("heading", { name: /Your Mac, quietly governed/i })).toBeVisible();
  for (const id of ["routing", "connection", "trust", "download"]) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }
  const images = page.locator("img");
  for (let index = 0; index < await images.count(); index += 1) {
    await images.nth(index).scrollIntoViewIfNeeded();
  }
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  const brokenImages = await images.evaluateAll((loadedImages) =>
    loadedImages.filter((image) => (image as HTMLImageElement).naturalWidth === 0)
      .map((image) => image.getAttribute("src")),
  );
  expect(brokenImages).toEqual([]);
  await assertNoDocumentOverflow(page);
  runtime.assertClean();
});

test("anchor navigation reaches each macOS section", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "compact navigation intentionally hides section links");
  const runtime = await openMacPage(page);
  for (const [name, hash] of [["Routing", "#routing"], ["Connection", "#connection"], ["Trust", "#trust"]] as const) {
    await page.getByRole("navigation").getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
    await expect(page.locator(hash)).toBeInViewport();
  }
  runtime.assertClean();
});

test("download calls to action resolve to a non-empty target", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "shared installer target is verified once");
  const runtime = await openMacPage(page);
  const download = page.locator("#download a[download]");
  await expect(download).toHaveCount(1);
  const href = await download.getAttribute("href");
  expect(href).toBeTruthy();
  const response = await request.get(new URL(href!, page.url()).href);
  expect(response.ok(), `${href} returned ${response.status()}`).toBe(true);
  expect((await response.body()).length, `${href} was empty`).toBeGreaterThan(0);
  runtime.assertClean();
});

test("mobile macOS page remains readable and accessible", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "mobile-only acceptance");
  const runtime = await openMacPage(page);
  await assertNoDocumentOverflow(page);
  await expect(page.getByRole("heading", { name: /Your Mac, quietly governed/i })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
  const unexpected = blocking.filter((violation) => violation.id !== "color-contrast");
  expect(unexpected.map((violation) => violation.id), "mobile introduced a new serious/critical rule").toEqual([]);
  const contrastNodes = blocking.find((violation) => violation.id === "color-contrast")?.nodes.length ?? 0;
  expect(contrastNodes, "mobile contrast debt exceeded its bounded baseline").toBeLessThanOrEqual(10);
  runtime.assertClean();
});
