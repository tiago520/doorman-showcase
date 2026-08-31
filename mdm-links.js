(() => {
  const scriptUrl = document.currentScript?.src ?? document.baseURI;
  const guideUrl = new URL("./mdm/", scriptUrl).href;
  const managedRoutes = new Set([
    "/fleet/mdm",
    "/fleet/deploy",
    "/fleet/trust",
  ]);

  const currentRoute = () => {
    const hashRoute = window.location.hash.replace(/^#/, "").split("?")[0];
    return hashRoute || window.location.pathname;
  };

  const makeLink = (label, surface) => {
    const link = document.createElement("a");
    link.href = guideUrl;
    link.textContent = label;
    link.dataset.mdmGuideLink = surface;
    link.setAttribute(
      "aria-label",
      `${label} — opens the macOS MDM operator guide`,
    );
    return link;
  };

  const installDocsLinks = () => {
    const nav = document.querySelector(".lpl-nav-links");
    if (nav && !nav.querySelector('[data-mdm-guide-link="docs-nav"]')) {
      const link = makeLink("MDM for IT", "docs-nav");
      link.className = "lpl-ghostlink";
      nav.insertBefore(link, nav.lastElementChild);
    }
  };

  const installFleetLink = () => {
    const page = document.querySelector(".page");
    if (!page || page.querySelector('[data-mdm-guide-slot="fleet"]')) return;

    const slot = document.createElement("div");
    slot.dataset.mdmGuideSlot = "fleet";
    const link = makeLink("Read the MDM setup guide ↗", "fleet");
    link.className = "btn btn-secondary";
    slot.append(link);
    page.prepend(slot);
  };

  const sync = () => {
    const route = currentRoute();
    const isManagedRoute =
      managedRoutes.has(route) || route.startsWith("/fleet/devices");
    if (!isManagedRoute) {
      document
        .querySelectorAll('[data-mdm-guide-slot="fleet"]')
        .forEach((slot) => slot.remove());
    }
    if (route === "/docs") installDocsLinks();
    if (isManagedRoute) installFleetLink();
  };

  const style = document.createElement("style");
  style.textContent = `
    a[data-mdm-guide-link] { text-decoration: none; }
    [data-mdm-guide-slot="fleet"] {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 10px;
    }
    @media (max-width: 640px) {
      .lpl-nav-links a[data-mdm-guide-link="docs-nav"] {
        display: inline-flex;
      }
    }
  `;
  document.head.append(style);

  window.addEventListener("hashchange", sync);
  window.addEventListener("popstate", sync);
  new MutationObserver(sync).observe(
    document.getElementById("root") ?? document.body,
    {
      childList: true,
      subtree: true,
    },
  );
  sync();
})();
