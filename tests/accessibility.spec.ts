import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { enterDemo, showcasePath } from "./helpers";

// The showcase repository publishes a compiled artifact; its source-side a11y
// remediation is tracked separately. Keep the current debt explicit and
// bounded: a new rule or a material node-count regression breaks CI. Exact
// color-contrast node counts vary slightly with Chromium's font renderer.
const KNOWN_DEBT: Record<string, Record<string, number>> = {
  "/": { "color-contrast": 5 },
  "/overview": { "color-contrast": 50, "link-in-text-block": 2, "svg-img-alt": 2 },
  "/requests": { "color-contrast": 20, "select-name": 2 },
  "/evals": { "color-contrast": 30 },
  "/budgets": { "color-contrast": 30 },
  "/guardrails": { "color-contrast": 20 },
  "/fleet": { "color-contrast": 25 },
  "/compliance": { "button-name": 1, "color-contrast": 20 },
  "/account": { "color-contrast": 25 },
  "/desktop/": { "color-contrast": 10 },
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
  expect(Object.keys(actual).sort()).toEqual(Object.keys(budget).sort());
  for (const [rule, count] of Object.entries(actual)) {
    expect(count, `${route}: ${rule} exceeded its known-debt budget`).toBeLessThanOrEqual(budget[rule]);
  }
}

for (const route of ["/", "/overview", "/requests", "/evals", "/budgets", "/guardrails", "/fleet", "/compliance", "/account"]) {
  test(`${route} has no serious or critical automated accessibility violations`, async ({ page }) => {
    await enterDemo(page);
    await page.goto(showcasePath(route));
    expectWithinKnownDebt(await blockingA11yCounts(page), route);
  });
}

test("macOS marketing page has no serious or critical violations", async ({ page }) => {
  await page.goto("/desktop/");
  expectWithinKnownDebt(await blockingA11yCounts(page), "/desktop/");
});
