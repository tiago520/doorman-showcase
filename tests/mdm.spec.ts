import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { assertNoDocumentOverflow, monitorRuntime } from "./helpers";

const sections = [
  "readiness",
  "tiers",
  "prerequisites",
  "artifacts",
  "deployment",
  "vendors",
  "network",
  "validation",
  "daily-use",
  "lifecycle",
  "troubleshooting",
  "security",
  "references",
];

test("MDM operator guide is complete, linked, and runtime-clean", async ({ page, request }) => {
  const runtime = monitorRuntime(page);
  await page.goto("/mdm/");

  await expect(page).toHaveTitle(/Deploy Doorman with MDM/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Deploy Doorman with MDM");
  for (const id of sections) {
    await expect(page.locator(`#${id}`), `missing #${id}`).toHaveCount(1);
    expect(
      await page.locator(`a[href="#${id}"]`).count(),
      `missing navigation link for #${id}`,
    ).toBeGreaterThan(0);
  }

  for (const href of ["../#/docs", "../desktop/", "../#/fleet/mdm"]) {
    const response = await request.get(new URL(href, page.url()).href.split("#")[0]);
    expect(response.ok(), `${href} returned ${response.status()}`).toBe(true);
  }
  runtime.assertClean();
});

test("MDM guide has no serious accessibility violations or horizontal overflow", async ({ page }) => {
  await page.goto("/mdm/");
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
  expect(blocking, blocking.map((violation) => violation.id).join(", ")).toEqual([]);
  await assertNoDocumentOverflow(page);
});

test("Docs keeps the MDM guide discoverable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/docs");
  const guideLink = page.locator('[data-mdm-guide-link="docs-nav"]');
  await expect(guideLink).toBeVisible();
  await expect(guideLink).toHaveAttribute("href", /\/mdm\/$/);
  await assertNoDocumentOverflow(page);
});
