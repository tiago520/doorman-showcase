import { test, expect } from "@playwright/test";
import { enterDemo, mockControlApi, monitorRuntime, settleRoute, showcasePath } from "./helpers";

const PUBLIC_ROUTES = ["/", "/login", "/docs", "/signup", "/forgot", "/sso", "/accept-invite", "/status"];

const DEMO_ROUTES = [
  "/welcome",
  "/overview", "/requests", "/requests/1", "/live", "/tasks", "/tasks/1", "/prs", "/routing", "/route-preview", "/replay", "/models",
  "/evals", "/evals/experiments", "/evals/model-fit", "/evals/annotate",
  "/spend", "/savings", "/chargeback", "/close", "/spend/consolidation", "/spend/commitments",
  "/budgets", "/budgets/controls", "/budgets/reservations",
  "/guardrails", "/guardrails/data", "/guardrails/agents", "/guardrails/adversarial",
  "/keys", "/keys/security", "/keys/vault", "/keys/tokens",
  "/fleet", "/fleet/mac-miles-mbp14", "/fleet/tools", "/fleet/shadow", "/fleet/setup", "/fleet/mdm", "/fleet/devices", "/fleet/devices/1", "/fleet/deploy", "/fleet/trust",
  "/compliance", "/compliance/audit", "/compliance/config", "/compliance/trust", "/compliance/incidents", "/compliance/sustainability",
  "/org/members", "/org/departments", "/org/identity", "/org/integrations", "/org/settings", "/org/billing",
  "/ops/health", "/ops/quality", "/ops/metrics", "/account",
] as const;

test.describe("public hash routes", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} renders without runtime or asset failures`, async ({ page }) => {
      await mockControlApi(page);
      const runtime = monitorRuntime(page);
      const response = await page.goto(showcasePath(route));
      expect(response?.ok()).toBe(true);
      await expect(page.locator("#root")).not.toBeEmpty();
      await expect(page.locator("body")).not.toContainText("No door named");
      await settleRoute(page);
      runtime.assertClean();
    });
  }
});

test.describe("authenticated demo route inventory", () => {
  test.beforeEach(async ({ page }) => enterDemo(page));

  for (const route of DEMO_ROUTES) {
    test(`${route} is reachable and survives reload`, async ({ page }) => {
      const runtime = monitorRuntime(page);
      const response = await page.goto(showcasePath(route));
      expect(response?.ok()).toBe(true);
      await expect(page.locator("#root")).not.toBeEmpty();
      await expect(page.locator("body")).not.toContainText("No door named");
      await page.reload();
      await expect(page.locator("body")).not.toContainText("No door named");
      expect(new URL(page.url()).hash).toBe(`#${route}`);
      await settleRoute(page);
      runtime.assertClean();
    });
  }

  test("unknown route explains the failure and recovers to the Control Room", async ({ page }) => {
    await page.goto(showcasePath("/definitely-missing"));
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("No door named")).toBeVisible();
    await page.getByRole("button", { name: "Back to the Control Room" }).click();
    await expect(page).toHaveURL(/#\/overview$/);
    await expect(page.locator("body")).not.toContainText("No door named");
  });

  test("GitHub Pages 404 shim preserves a clean-path route", async ({ page }) => {
    const response = await page.goto("/close");
    expect(response?.status()).toBe(404);
    await expect(page).toHaveURL(/\/#\/close$/);
    await expect(page.locator("#root")).not.toBeEmpty();
    await expect(page.locator("body")).not.toContainText("No door named");
    await settleRoute(page);
  });
});
