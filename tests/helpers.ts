import { expect, type Page, type TestInfo } from "@playwright/test";

export const showcasePath = (path: string) => `/#${path}`;

export async function enterDemo(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("sy.demo", "1");
    if (localStorage.getItem("sy.theme") == null) localStorage.setItem("sy.theme", "daylight");
  });
}

export async function mockControlApi(page: Page): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown;
    if (url.pathname === "/api/public/status") {
      body = { overall: "operational", checkedAt: new Date().toISOString(), components: [] };
    } else if (url.pathname === "/api/public/status/history") {
      body = { components: [] };
    } else if (url.pathname === "/api/public/status/sla") {
      body = { windows: [], components: [] };
    } else if (url.pathname === "/api/public/status/incidents") {
      body = { incidents: [] };
    } else if (url.pathname.includes("auth/me") || url.pathname.includes("session")) {
      body = { authenticated: false, user: null };
    } else {
      body = { ok: true, data: null };
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

export function monitorRuntime(page: Page) {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    failures.push(`requestfailed: ${request.url()} (${failure})`);
  });
  return {
    assertClean() {
      expect(failures, failures.join("\n")).toEqual([]);
    },
  };
}

export async function assertNoDocumentOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

export async function assertBoundedDesktopCanvas(page: Page, maximumWidth = 1000): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeGreaterThanOrEqual(dimensions.clientWidth);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(maximumWidth);
}

export async function attachScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const body = await page.screenshot({ fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { body, contentType: "image/png" });
}
