import { test, expect } from "@playwright/test";
import { enterDemo, showcasePath } from "./helpers";

test("every locally hosted image, stylesheet, script, and download resolves", async ({ page, request }) => {
  await enterDemo(page);
  await page.goto(showcasePath("/overview"));

  const urls = await page.locator("img[src], script[src], link[href], a[href]").evaluateAll((nodes) =>
    nodes
      .map((node) => node.getAttribute("src") ?? node.getAttribute("href"))
      .filter((value): value is string => !!value)
      .map((value) => new URL(value, document.baseURI).href)
      .filter((value) => value.startsWith(location.origin) && !value.includes("/#") && !new URL(value).pathname.startsWith("/api/")),
  );

  for (const url of new Set(urls)) {
    const response = await request.get(url);
    expect(response.ok(), `${url} returned ${response.status()}`).toBe(true);
    expect((await response.body()).length, `${url} was empty`).toBeGreaterThan(0);
  }
});

test("repository-owned static inventory has no broken files", async ({ page, request }) => {
  const images = [
    "/desktop/previews/control-center.png", "/desktop/previews/apps-routing.png", "/desktop/previews/connection-healthy.png",
    "/desktop/previews/preferences.png", "/desktop/previews/setup-welcome.png", "/desktop/previews/setup-ready.png",
    "/shots/control-room-day.png", "/shots/control-room-night.png",
    "/shots/crop-attention-day.png", "/shots/crop-attention.png",
    "/shots/crop-budgets-day.png", "/shots/crop-budgets.png",
    "/shots/crop-savings-day.png", "/shots/crop-savings.png",
    "/shots/crop-team-day.png", "/shots/requests-day.png", "/shots/requests-night.png",
  ];
  for (const path of [
    "/", "/404.html", "/desktop/", "/mdm/", "/mdm-links.js",
    "/downloads/doorman-install.sh", "/downloads/switchyard-install.sh", ...images,
  ]) {
    const response = await request.get(path);
    expect(response.ok(), `${path} returned ${response.status()}`).toBe(true);
    expect((await response.body()).length, `${path} was empty`).toBeGreaterThan(0);
  }

  await page.goto("/");
  for (const path of images) {
    const dimensions = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    }, path);
    expect(dimensions.width, `${path} did not decode to a visible image`).toBeGreaterThan(0);
    expect(dimensions.height, `${path} did not decode to a visible image`).toBeGreaterThan(0);
  }
});

test("external links opened in a new tab are protected from opener access", async ({ page }) => {
  await page.goto("/desktop/");
  const unsafe = await page.locator('a[target="_blank"]').evaluateAll((anchors) =>
    anchors.filter((anchor) => {
      const rel = (anchor as HTMLAnchorElement).rel.split(/\s+/);
      return !rel.includes("noreferrer") && !rel.includes("noopener");
    })
      .map((anchor) => anchor.getAttribute("href")),
  );
  expect(unsafe).toEqual([]);
});
