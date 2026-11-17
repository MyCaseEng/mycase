// Minimal service worker: caches the app shell so MyCase opens fast and is installable.
// Case data always comes from the network (never cached here).
const CACHE = "mycase-shell-v3";
// Pages are never cached (they hold case data); only static assets are.
const SHELL = ["/icons/icon-192.png", "/icons/icon-512.png"];
const OFFLINE = '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Tahoma,sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#fbf8f3;color:#8a1538"><div style="text-align:center"><h2>MyCase</h2><p>لا يوجد اتصال بالإنترنت. أعد المحاولة بعد عودة الاتصال.</p></div></body></html>';

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase and other APIs: network only
  if (req.mode === "navigate") {
    // pages: always network; a small offline notice when there is no connection
    e.respondWith(fetch(req).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
  }
});
