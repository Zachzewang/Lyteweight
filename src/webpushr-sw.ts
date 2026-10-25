import { UrlUtils_build } from "./utils/url";

declare let __COMMIT_HASH__: string;
const cacheName = `lyteweight-sw-${__COMMIT_HASH__}`;

// The app shell: the HTML page plus everything it needs to render before any lazy chunk is requested. The
// JS/CSS bundles themselves (including lazily loaded chunks) come from precache-manifest.json, generated at
// build time, so this list never goes stale when bundles get renamed.
const appShell = [
  "/app/",
  "/manifest.webmanifest",
  "/images/back-muscles.svg",
  "/images/front-muscles.svg",
  "/images/svgs/muscles-combined.svg",
  "/images/svgs/musclegroups-combined.svg",
  "/images/logo.svg",
  "/icons/icon192.png",
  "/icons/icon512.png",
  "/icons/apple-touch-icon.png",
  "/notification.m4r",
  "/set-timer-end.m4r",
  "/get-ready-end.m4r",
  `/programdata/index.json?v=${__COMMIT_HASH__}`,
];

// Same-origin paths that are safe to keep in the cache once fetched. Bundles are versioned via ?version= or
// a content hash, and everything else here changes rarely.
const runtimeCacheable = [
  /^\/(app|vendors)\.(js|css)\?(version|vendor)=/,
  /^\/chunks\//,
  /^\/[\w-]+\.css$/,
  /^\/fonts\//,
  /^\/images\//,
  /^\/icons\//,
  /^\/programdata\//,
  /^\/externalimages\//,
  /\.m4r$/,
];

function isAppPage(pathname: string): boolean {
  return pathname === "/" || pathname === "/app" || pathname === "/app/" || pathname === "/app/index.html";
}

async function precache(): Promise<void> {
  const cache = await caches.open(cacheName);
  await cache.addAll(appShell);
  const response = await fetch(`/precache-manifest.json?v=${__COMMIT_HASH__}`, { cache: "no-store" });
  const manifest: { files: string[] } = await response.json();
  await cache.addAll(manifest.files);
}

function initialize(service: ServiceWorkerGlobalScope): void {
  service.addEventListener("install", (event) => {
    event.waitUntil(precache().then(() => service.skipWaiting()));
  });

  service.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        const keys = (await caches.keys()).filter((k) => k !== cacheName);
        for (const key of keys) {
          await caches.delete(key);
        }
        await service.clients.claim();
      })()
    );
  });

  service.addEventListener("fetch", (e) => {
    if (e.request.method !== "GET") {
      return;
    }
    const url = UrlUtils_build(e.request.url);
    if (url.origin !== service.location.origin) {
      return;
    }

    if (e.request.mode === "navigate" && isAppPage(url.pathname)) {
      // Network first, so a new deploy shows up as soon as you're online; fall back to the cached app page
      // (ignoring query params like ?source=homescreen) when offline.
      e.respondWith(
        (async () => {
          const cache = await caches.open(cacheName);
          try {
            const response = await fetch(e.request);
            if (response.ok) {
              await cache.put("/app/", response.clone());
            }
            return response;
          } catch (error) {
            const cached = await cache.match("/app/");
            if (cached != null) {
              return cached;
            }
            throw error;
          }
        })()
      );
      return;
    }

    const pathWithSearch = `${url.pathname}${url.search}`;
    e.respondWith(
      (async () => {
        const cached = await caches.match(e.request);
        if (cached != null) {
          return cached;
        }
        const response = await fetch(e.request);
        if (response.ok && runtimeCacheable.some((r) => r.test(pathWithSearch))) {
          const cache = await caches.open(cacheName);
          await cache.put(e.request, response.clone());
        }
        return response;
      })()
    );
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
initialize(self as any);
