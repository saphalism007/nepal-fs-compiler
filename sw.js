/* Nepal FS Compiler - offline app shell */
const PREFIX = "nepal-fs-";
const CACHE = PREFIX + "b55d111d";
const SCOPE = new URL("./", self.location).pathname;
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png",
  "./apple-touch-icon.png", "./favicon-32.png"];

/* Precache file by file. addAll() is atomic, so a single slow or momentarily
   unavailable asset would throw away the whole offline shell. */
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(new Request(u, {cache: "reload"})))))
      .then(() => self.skipWaiting())
  );
});
/* A GitHub Pages user site shares one origin across every project, and the Cache
   Storage API is origin-wide. Only ever touch caches belonging to this app -
   deleting anything else would wipe a sibling project's offline data. */
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks
      .filter(k => k.startsWith(PREFIX) && k !== CACHE)
      .map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const inScope = url.origin === location.origin && url.pathname.startsWith(SCOPE);
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!inScope && !isFont) return;

  /* The app itself is fetched from the network first, so a correction reaches
     people the next time they open it rather than waiting for a cache to expire.
     The cached copy is kept up to date behind that and answers when offline.
     Fonts and icons rarely change and are served from the cache first. */
  const isApp = inScope && (req.mode === "navigate" || /\/(index\.html)?$/.test(url.pathname));
  if (isApp) {
    e.respondWith(
      fetch(req, { cache: "no-store" })
        .then(resp => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then(c => { c.put("./index.html", copy.clone()); c.put("./", copy); }).catch(() => {});
          }
          return resp;
        })
        .catch(() => caches.match("./index.html").then(hit => hit || caches.match("./")))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(resp => {
      if (resp && (resp.ok || resp.type === "opaque")) {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return resp;
    }).catch(() => inScope ? caches.match("./index.html") : Response.error()))
  );
});
