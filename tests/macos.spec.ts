import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { assertNoDocumentOverflow, monitorRuntime } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/desktop/");
});

test("macOS product page exposes all promised sections and working local media", async ({ page }) => {
  const runtime = monitorRuntime(page);
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
  for (const [name, hash] of [["Routing", "#routing"], ["Connection", "#connection"], ["Trust", "#trust"]] as const) {
    await page.getByRole("navigation").getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
    await expect(page.locator(hash)).toBeInViewport();
  }
});

test("download calls to action resolve to a non-empty target", async ({ page, request }) => {
  const links = await page.getByRole("link", { name: /Download for macOS/i }).evaluateAll((anchors) =>
    [...new Set(anchors.map((anchor) => (anchor as HTMLAnchorElement).href))],
  );
  expect(links.length).toBeGreaterThan(0);
  for (const href of links) {
    if (href.includes("#download")) continue;
    const response = await request.get(href);
    expect(response.ok(), `${href} returned ${response.status()}`).toBe(true);
    expect((await response.body()).length).toBeGreaterThan(0);
  }
});

test("mobile macOS page remains readable and accessible", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "mobile-only acceptance");
  await assertNoDocumentOverflow(page);
  await expect(page.getByRole("heading", { name: /Your Mac, quietly governed/i })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page }).analyze();
  const rules = results.violations
    .filter((v) => ["serious", "critical"].includes(v.impact ?? ""))
    .map((v) => v.id)
    .sort();
  expect(rules).toEqual(["color-contrast"]);
});
