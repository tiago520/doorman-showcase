import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { enterDemo, settleRoute, showcasePath } from "./helpers";

// The showcase repository publishes a compiled artifact; its source-side a11y
// remediation is tracked separately. Keep the current debt explicit and
// bounded: a new rule or a material node-count regression breaks CI. Exact
// color-contrast node counts vary slightly with Chromium's font renderer.
const KNOWN_DEBT: Record<string, Record<string, number>> = {
  "/": { "color-contrast": 5 },
  "/overview": { "color-contrast": 50, "link-in-text-block": 2, "svg-img-alt": 2 },
  "/requests": { "color-contrast": 1150, "select-name": 2 },
  "/evals": { "color-contrast": 40 },
  "/spend": { "color-contrast": 70, "select-name": 3 },
  "/budgets": { "color-contrast": 65, label: 4 },
  "/guardrails": { "color-contrast": 20 },
  "/keys": { "color-contrast": 45 },
  "/fleet": { "color-contrast": 100 },
  "/compliance": { "button-name": 1, "color-contrast": 20 },
  "/org/members": { "color-contrast": 55, "select-name": 13 },
  "/ops/health": { "color-contrast": 85 },
  "/account": { "color-contrast": 25 },
  "/desktop/": { "color-contrast": 10 },
};

// Chromium's font metrics can create a focusable-scroll-region finding only
// on hosted Linux. Keep that renderer-dependent debt capped globally instead
// of forcing a resolved historical rule to remain present forever. Form-label
// debt is budgeted on the exact route that owns it above.
const CROSS_ROUTE_DEBT: Record<string, number> = {
  "scrollable-region-focusable": 5,
};

async function blockingA11yCounts(page: import("@playwright/test").Page) {
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page }).analyze();
  return Object.fromEntries(
    results.violations
      .filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))
      .map((violation) => [violation.id, violation.nodes.length]),
  );
}

function expectWithinKnownDebt(actual: Record<string, number>, route: string): void {
  const budget = KNOWN_DEBT[route];
  for (const [rule, count] of Object.entries(actual)) {
    const ceiling = budget[rule] ?? CROSS_ROUTE_DEBT[rule];
    expect(ceiling, `${route}: ${rule} is new, unbudgeted accessibility debt`).toBeDefined();
    expect(count, `${route}: ${rule} exceeded its known-debt budget`).toBeLessThanOrEqual(ceiling!);
  }
}

for (const route of [
  "/", "/overview", "/requests", "/evals", "/spend", "/budgets", "/guardrails", "/keys", "/fleet", "/compliance",
  "/org/members", "/ops/health", "/account",
]) {
  test(`${route} has no serious or critical automated accessibility violations`, async ({ page }) => {
    await enterDemo(page);
    await page.goto(showcasePath(route));
    await settleRoute(page);
    expectWithinKnownDebt(await blockingA11yCounts(page), route);
  });
}

test("macOS marketing page has no serious or critical violations", async ({ page }) => {
  await page.goto("/desktop/");
  expectWithinKnownDebt(await blockingA11yCounts(page), "/desktop/");
});
