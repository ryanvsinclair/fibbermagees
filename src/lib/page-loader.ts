const PAGE_LOADER_CRITICAL = `<style id="page-loader-critical">
html.is-page-loading{background:#081f16}
html.is-page-loading body>*:not(.page-loader){visibility:hidden}
html.is-page-loading .hero-enter .hero-kicker,
html.is-page-loading .hero-enter h1,
html.is-page-loading .hero-enter p,
html.is-page-loading .hero-enter .hero-ctas,
html.is-page-loading .hero-enter .hero-scroll{
  animation:none!important;opacity:0!important;transform:none!important;
}
.page-loader{
  position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;
  background:#081f16;transition:opacity .45s cubic-bezier(.22,.9,.3,1),visibility .45s;
}
.page-loader.is-done{opacity:0;visibility:hidden;pointer-events:none}
.page-loader-inner{position:relative;width:44px;height:44px}
.page-loader-ring{
  position:absolute;inset:0;border:2px solid rgba(201,162,75,.18);border-top-color:#c9a24b;
  border-radius:50%;animation:pageLoaderSpin .85s linear infinite;
}
@keyframes pageLoaderSpin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){
  .page-loader-ring{animation:none}
}
</style>
<script>document.documentElement.classList.add("is-page-loading");</script>`;

const PAGE_LOADER_MARKUP = `<div class="page-loader" id="pageLoader" role="status" aria-live="polite" aria-busy="true" aria-label="Loading">
  <div class="page-loader-inner">
    <div class="page-loader-ring" aria-hidden="true"></div>
  </div>
</div>`;

const PAGE_LOADER_SCRIPT = `<script>
(() => {
  const MAX_WAIT = 12000;
  const MIN_SHOW = (() => {
    try {
      return sessionStorage.getItem("fibber:warm") === "1" ? 0 : 500;
    } catch {
      return 500;
    }
  })();
  const started = performance.now();
  const loader = document.getElementById("pageLoader");

  const preloadImage = src => new Promise(resolve => {
    if (!src) return resolve();
    const img = new Image();
    img.decoding = "async";
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });

  const extractUrl = value => {
    if (!value || value === "none") return "";
    const match = String(value).match(/url\\(["']?([^"')]+)/);
    return match ? match[1] : "";
  };

  const waitVideo = video => new Promise(resolve => {
    if (!video) return resolve();
    const done = () => resolve();
    if (video.readyState >= 2) return done();
    video.addEventListener("canplaythrough", done, { once: true });
    video.addEventListener("loadeddata", done, { once: true });
    video.addEventListener("error", done, { once: true });
    setTimeout(done, MAX_WAIT);
  });

  const waitHeroMedia = () => {
    const hero = document.querySelector(".site-hero");
    if (!hero) return Promise.resolve();

    const tasks = [];
    const bg = hero.querySelector(".deal-hero-bg");
    if (bg) tasks.push(preloadImage(extractUrl(getComputedStyle(bg).backgroundImage)));
    tasks.push(preloadImage(extractUrl(getComputedStyle(hero).backgroundImage)));

    const primary =
      hero.querySelector("#heroIntro, #deliveryVideoA, #dealHeroVideo, video.is-active, video[autoplay]") ||
      hero.querySelector("video");

    if (primary) {
      tasks.push(new Promise(resolve => {
        const finish = () => resolve();
        const start = () => waitVideo(primary).then(finish);
        if (primary.currentSrc || primary.src || primary.querySelector("source[src]")) start();
        else {
          primary.addEventListener("loadeddata", start, { once: true });
          primary.addEventListener("error", finish, { once: true });
          setTimeout(finish, MAX_WAIT);
        }
      }));
    }

    return Promise.all(tasks);
  };

  const reveal = () => {
    const elapsed = performance.now() - started;
    const warm = (() => {
      try {
        return sessionStorage.getItem("fibber:warm") === "1";
      } catch {
        return false;
      }
    })();
    const instant = warm && elapsed < 150;
    const wait = instant ? 0 : Math.max(0, MIN_SHOW - elapsed);
    const finish = () => {
      document.documentElement.classList.remove("is-page-loading");
      loader?.classList.add("is-done");
      loader?.setAttribute("aria-busy", "false");
      document.dispatchEvent(new CustomEvent("fibber:page-ready"));
    };
    if (wait === 0) finish();
    else setTimeout(finish, wait);
  };

  Promise.all([
    waitHeroMedia(),
    document.fonts?.ready ?? Promise.resolve(),
  ]).then(reveal).catch(reveal);
  setTimeout(reveal, MAX_WAIT);
})();
</script>`;

export function injectPageLoader(html: string): string {
  return html
    .replace("<head>", `<head>\n${PAGE_LOADER_CRITICAL}`)
    .replace("<body>", `<body>\n${PAGE_LOADER_MARKUP}`)
    .replace("</body>", `${PAGE_LOADER_SCRIPT}\n</body>`);
}
