import { test, expect } from "@playwright/test";
import { assertBoundedDesktopCanvas, assertNoDocumentOverflow, enterDemo, showcasePath } from "./helpers";

for (const route of ["/", "/overview", "/requests", "/evals", "/budgets", "/fleet", "/account"]) {
  test(`${route} stays within its documented viewport contract`, async ({ page }, testInfo) => {
    await enterDemo(page);
    await page.goto(showcasePath(route));
    await expect(page.locator("#root")).not.toBeEmpty();
    if (testInfo.project.name.includes("mobile") && route !== "/") {
      // The authenticated console is desktop-first and intentionally retains
      // a horizontally scrollable canvas on narrow phone viewports.
      await assertBoundedDesktopCanvas(page);
    } else {
      await assertNoDocumentOverflow(page);
    }
  });
}

test("theme preference persists across navigation and reload", async ({ page }) => {
  await enterDemo(page);
  await page.goto(showcasePath("/overview"));
  const themeControl = page.getByRole("button", { name: "Night Shift theme" }).first();
  await expect(themeControl).toBeVisible();
  await themeControl.click();
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem("sy.theme"))).toBe("night");
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("night");
  await expect(page.getByRole("button", { name: "Daylight theme" }).first()).toBeVisible();
});

test("keyboard focus is visible on the first interactive control", async ({ page }) => {
  await page.goto(showcasePath("/"));
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toBeVisible();
  const outline = await focused.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow };
  });
  expect(outline.outlineStyle !== "none" || outline.outlineWidth !== "0px" || outline.boxShadow !== "none").toBe(true);
});
