const PAGE_PREFETCH_SCRIPT = `<script>
(() => {
  const ROUTES = ["/", "/menu", "/delivery", "/franchise"];
  const FRANCHISE_HERO =
    "https://i0.wp.com/fibbersdubai.com/wp-content/uploads/2026/03/fibbers-magee-inside.jpg?fit=800%2C600&ssl=1";

  const DEAL_MEDIA = {
    0: { image: "/deal-sunday.png" },
    1: { image: "/deal-monday.png" },
    2: { image: "/deal-tuesday.png", video: "/deal-tuesday.mp4", loopVideo: "/deal-tuesday-loop.mp4" },
    3: { image: "/deal-wednesday.png" },
    4: { image: "/deal-thursday.png" },
    5: { image: "/deal-friday.png" },
    6: { image: "/deal-saturday.png" },
  };

  const PAGE_ASSETS = {
    "/": ["/hero.mp4"],
    "/delivery": ["/food_delivery_driver_riding_do_Kling_30__37082.mp4"],
    "/franchise": [FRANCHISE_HERO],
  };

  const prefetched = new Set();

  const shouldPrefetch = () => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn?.saveData) return false;
    if (conn?.effectiveType === "2g") return false;
    return true;
  };

  const markDone = key => {
    try { sessionStorage.setItem(key, "1"); } catch {}
  };

  const wasDone = key => {
    try { return sessionStorage.getItem(key) === "1"; } catch { return false; }
  };

  const prefetchAsset = url => {
    if (!url || prefetched.has(url)) return Promise.resolve();
    prefetched.add(url);

    if (/\\.(mp4|webm)(\\?|$)/i.test(url)) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "video";
      link.href = url;
      document.head.appendChild(link);
      return Promise.resolve();
    }

    return new Promise(resolve => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = url;
      link.as = /\\.(png|jpe?g|webp|gif|svg)(\\?|$)/i.test(url) ? "image" : "fetch";
      link.onload = link.onerror = () => resolve();
      document.head.appendChild(link);
      setTimeout(resolve, 4000);
    });
  };

  const prefetchRoute = route => {
    if (wasDone("fibber:route:" + route)) return Promise.resolve();
    return fetch(route, { credentials: "same-origin", priority: "low" })
      .then(res => { if (res.ok) markDone("fibber:route:" + route); })
      .catch(() => {});
  };

  const assetsForRoute = route => {
    if (route === "/menu") {
      const today = new Date().getDay();
      const deal = DEAL_MEDIA[today] || DEAL_MEDIA[0];
      const assets = [deal.image];
      if (deal.video) assets.push(deal.video);
      if (deal.loopVideo) assets.push(deal.loopVideo);
      return assets;
    }
    return PAGE_ASSETS[route] || [];
  };

  const prefetchOtherPages = async () => {
    if (!shouldPrefetch() || wasDone("fibber:prefetch-complete")) return;

    const current = location.pathname.replace(/\\/$/, "") || "/";
    const others = ROUTES.filter(route => route !== current);
    const tasks = [];

    others.forEach(route => {
      tasks.push(prefetchRoute(route));
      assetsForRoute(route).forEach(url => tasks.push(prefetchAsset(url)));
    });

    await Promise.allSettled(tasks);
    markDone("fibber:warm");
    markDone("fibber:prefetch-complete");
  };

  const startPrefetch = () => {
    const run = () => { prefetchOtherPages().catch(() => {}); };
    if ("requestIdleCallback" in window) {
      requestIdleCallback(run, { timeout: 4000 });
    } else {
      setTimeout(run, 1000);
    }
  };

  if (document.documentElement.classList.contains("is-page-loading")) {
    document.addEventListener("fibber:page-ready", startPrefetch, { once: true });
  } else {
    startPrefetch();
  }
})();
</script>`;

export function injectPagePrefetch(html: string): string {
  return html.replace("</body>", `${PAGE_PREFETCH_SCRIPT}\n</body>`);
}
