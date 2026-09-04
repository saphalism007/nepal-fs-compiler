#!/usr/bin/env python3
"""Rebuild the installable PWA at the repo root from the single-file source.
Run:  python3 src/build-app.py     (after editing src/nepal-fs-compiler.html)"""
import os, re, shutil, hashlib

SRC = os.path.join(os.path.dirname(__file__), "nepal-fs-compiler.html")
OUT = os.path.join(os.path.dirname(__file__), "..")
os.makedirs(OUT, exist_ok=True)
src = open(SRC, encoding="utf-8").read()

# split the source at the end of its stylesheet: everything before is head material
i = src.index("</style>") + len("</style>")
head_src, body_src = src[:i], src[i:]
head_src = head_src.replace('<meta charset="utf-8">\n', "")
head_src = re.sub(r'<meta name="viewport"[^>]*>\n?', "", head_src)

ver = hashlib.sha1(src.encode()).hexdigest()[:8]

HEAD_EXTRA = '''<meta name="description" content="Prepare Nepali financial statements from a trial balance - NFRS, NFRS for SMEs, NAS for MEs and NAS for NPOs - with schedules, income tax computation and a formatted Excel export.">
<meta name="theme-color" content="#123C31" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F1310" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Nepal FS">'''

INSTALL_JS = '''<script>
/* offline shell + an Install button where the browser offers one */
if("serviceWorker" in navigator){
  addEventListener("load", ()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
(function(){
  var deferred=null;
  addEventListener("beforeinstallprompt", function(e){
    e.preventDefault(); deferred=e;
    var bar=document.querySelector(".topbar"), theme=document.getElementById("btnTheme");
    if(!bar||document.getElementById("btnInstall")) return;
    var b=document.createElement("button");
    b.id="btnInstall"; b.className="btn sm pri"; b.textContent="Install app";
    b.onclick=function(){ if(!deferred) return; deferred.prompt();
      deferred.userChoice.finally(function(){ deferred=null; b.remove(); }); };
    bar.insertBefore(b, theme||null);
  });
  addEventListener("appinstalled", function(){
    var b=document.getElementById("btnInstall"); if(b) b.remove();
  });
})();
</script>'''

body_src = body_src.replace("<script>", "<script>window.__BUILD__=\"%s\";</script>\n<script>" % ver, 1)
doc = ("<!doctype html>\n<html lang=\"en\">\n<head>\n"
       "<meta charset=\"utf-8\">\n"
       "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
       + HEAD_EXTRA + "\n" + head_src.strip() + "\n</head>\n<body>\n"
       + body_src.strip() + "\n" + INSTALL_JS + "\n</body>\n</html>\n")
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(doc)

open(os.path.join(OUT, "manifest.webmanifest"), "w", encoding="utf-8").write('''{
  "name": "Nepal FS Compiler",
  "short_name": "Nepal FS",
  "description": "Trial balance to financial statements under NFRS, NFRS for SMEs, NAS for MEs and NAS for NPOs.",
  "start_url": "./",
  "scope": "./",
  "id": "nepal-fs-compiler",
  "display": "standalone",
  "display_override": ["window-controls-overlay", "standalone", "minimal-ui"],
  "orientation": "any",
  "background_color": "#F2F4EF",
  "theme_color": "#123C31",
  "categories": ["business", "finance", "productivity"],
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
''')

open(os.path.join(OUT, "sw.js"), "w", encoding="utf-8").write('''/* Nepal FS Compiler - offline app shell */
const PREFIX = "nepal-fs-";
const CACHE = PREFIX + "%s";
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
  const isFont = /fonts\\.(googleapis|gstatic)\\.com$/.test(url.hostname);
  if (!inScope && !isFont) return;

  /* The app itself is fetched from the network first, so a correction reaches
     people the next time they open it rather than waiting for a cache to expire.
     The cached copy is kept up to date behind that and answers when offline.
     Fonts and icons rarely change and are served from the cache first. */
  const isApp = inScope && (req.mode === "navigate" || /\\/(index\\.html)?$/.test(url.pathname));
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
''' % ver)

print("rebuilt index.html, manifest.webmanifest, sw.js | cache version", ver)
