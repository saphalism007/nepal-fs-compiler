/* Nepal FS Compiler - offline app shell */
const PREFIX = "nepal-fs-";
const CACHE = PREFIX + "c5ed79d4";
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

  /* Opening the app is answered from the copy saved on this device, at once,
     and a fresh copy is fetched behind it for next time. It used to be fetched
     from GitHub first on every opening, about 360 KB, which on a phone is a
     wait of seconds every time and longer on a weak signal.

     A correction still reaches people promptly: section 30 of the page asks
     the server for the page directly, a few moments after opening, and
     reloads once if a newer build is there. That request is not an opening,
     so it is not answered from here; it goes to the network below, as it
     always did. */
  if (inScope && req.mode === "navigate") {
    const fresh = fetch(req, { cache: "no-store" }).then(resp => {
      if (resp && resp.ok) {
        const copy = resp.clone();
        caches.open(CACHE).then(c => { c.put("./index.html", copy.clone()); c.put("./", copy); }).catch(() => {});
      }
      return resp;
    });
    e.respondWith(
      caches.match("./index.html").then(hit => hit || caches.match("./")).then(saved => {
        if (saved) { e.waitUntil(fresh.catch(() => {})); return saved; }
        return fresh.catch(() => Response.error());
      })
    );
    return;
  }

  /* The page asked for by its own correction check, and anything else that is
     the app itself, comes from the network first and falls back to the saved
     copy offline. Fonts and icons rarely change and are served from the cache
     first. */
  const isApp = inScope && /\/(index\.html)?$/.test(url.pathname);
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
