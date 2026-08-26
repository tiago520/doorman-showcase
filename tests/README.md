# Showcase UI acceptance matrix

The static GitHub Pages deployment has no server or source build step, so these
tests exercise the exact files that Pages publishes.

- `routes.spec.ts`: every public and demo hash route, including reload and 404 recovery.
- `assets.spec.ts`: local scripts, styles, images, previews, and download artifacts.
- `accessibility.spec.ts`: serious/critical axe debt inventory on every product family; any new rule or material node-count increase fails CI.
- `responsive.spec.ts`: responsive marketing layout, bounded desktop-console canvas, focus visibility, and theme persistence.
- `macos.spec.ts`: the macOS marketing page, anchors, screenshots, downloads, and mobile layout.

Run `npm ci`, `npx playwright install chromium`, then `npm test`.
