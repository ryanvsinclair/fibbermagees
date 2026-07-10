const PAGE_LOADER_CRITICAL = `<style id="page-loader-critical">
html.is-page-loading{background:#081f16}
html.is-page-loading body>*:not(.page-loader){
  opacity:0;pointer-events:none;
}
html.is-page-revisit .page-loader{display:none!important}
html.is-page-loading .hero-enter .hero-kicker,
html.is-page-loading .hero-enter h1,
html.is-page-loading .hero-enter p,
html.is-page-loading .hero-enter .hero-ctas,
html.is-page-loading .hero-enter .hero-scroll{
  animation:none!important;opacity:0!important;transform:none!important;
}
.page-loader{
  position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;
  background:#081f16;transition:opacity .35s cubic-bezier(.22,.9,.3,1),visibility .35s;
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
<script>
(function(){
  var path=location.pathname.replace(/\\/$/,"")||"/";
  try{
    if(sessionStorage.getItem("fibber:visited:"+path)==="1"){
      document.documentElement.classList.add("is-page-revisit");
      return;
    }
  }catch(e){}
  document.documentElement.classList.add("is-page-loading");
})();
</script>`;

const PAGE_LOADER_MARKUP = `<div class="page-loader" id="pageLoader" role="status" aria-live="polite" aria-busy="true" aria-label="Loading">
  <div class="page-loader-inner">
    <div class="page-loader-ring" aria-hidden="true"></div>
  </div>
</div>`;

const PAGE_LOADER_SCRIPT = `<script>
(() => {
  const path = location.pathname.replace(/\\/$/, "") || "/";
  const loader = document.getElementById("pageLoader");
  const started = performance.now();
  let revealed = false;

  const storageGet = key => {
    try { return sessionStorage.getItem(key); } catch { return null; }
  };

  const storageSet = (key, value) => {
    try { sessionStorage.setItem(key, value); } catch {}
  };

  const finish = () => {
    if (revealed) return;
    revealed = true;
    document.documentElement.classList.remove("is-page-loading");
    document.documentElement.classList.remove("is-page-revisit");
    loader?.classList.add("is-done");
    loader?.setAttribute("aria-busy", "false");
    storageSet("fibber:visited:" + path, "1");
    document.dispatchEvent(new CustomEvent("fibber:page-ready"));
  };

  window.addEventListener("pageshow", event => {
    if (event.persisted || document.documentElement.classList.contains("is-page-loading")) {
      finish();
    }
  });

  if (!document.documentElement.classList.contains("is-page-loading")) {
    finish();
    return;
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister());
    }).catch(() => {});
  }

  const isWarm = () => storageGet("fibber:warm") === "1";
  const maxWait = isWarm() ? 2000 : 5000;
  const minShow = isWarm() ? 0 : 350;

  const preloadImage = src => new Promise(resolve => {
    if (!src) return resolve();
    const img = new Image();
    img.decoding = "async";
    img.onload = img.onerror = () => resolve();
    img.src = src;
    setTimeout(resolve, maxWait);
  });

  const extractUrls = value => {
    if (!value || value === "none") return [];
    return [...String(value).matchAll(/url\\(["']?([^"')]+)/g)].map(match => match[1]);
  };

  // Reveal on the hero poster/background image only — never gate on video
  // readiness. Videos fade in over their identical poster frame when they
  // can play, so the page is visually complete as soon as the poster paints.
  const waitHeroMedia = async () => {
    const hero = document.querySelector(".site-hero");
    if (!hero) return;

    const tasks = [];
    const urls = new Set();
    const bg = hero.querySelector(".deal-hero-bg");
    extractUrls(bg ? getComputedStyle(bg).backgroundImage : "").forEach(url => urls.add(url));
    extractUrls(getComputedStyle(hero).backgroundImage).forEach(url => urls.add(url));
    hero.querySelectorAll("video[poster]").forEach(video => urls.add(video.poster));
    urls.forEach(url => tasks.push(preloadImage(url)));

    await Promise.all(tasks);
  };

  const waitFonts = () => Promise.race([
    document.fonts?.ready ?? Promise.resolve(),
    new Promise(resolve => setTimeout(resolve, 1500)),
  ]);

  const reveal = () => {
    const elapsed = performance.now() - started;
    const wait = Math.max(0, minShow - elapsed);
    if (wait === 0) finish();
    else setTimeout(finish, wait);
  };

  Promise.race([
    Promise.all([waitHeroMedia(), waitFonts()]),
    new Promise(resolve => setTimeout(resolve, maxWait)),
  ]).then(reveal).catch(reveal);

  setTimeout(finish, maxWait + minShow + 250);
})();
</script>`;

export function injectPageLoader(html: string): string {
  return html
    .replace("<head>", `<head>\n${PAGE_LOADER_CRITICAL}`)
    .replace("<body>", `<body>\n${PAGE_LOADER_MARKUP}`)
    .replace("</body>", `${PAGE_LOADER_SCRIPT}\n</body>`);
}
