/* POS Offline Mode — Service Worker
 *
 * Strategies:
 *  - Cache First:            static assets (js/css/fonts/images under /web/assets, module static dirs)
 *  - Stale-While-Revalidate: /web/image (product/company images)
 *  - Network First:          navigations (/pos/ui) and read-only POS RPCs, falling back to cache offline
 *
 * Write RPCs (order sync, etc.) are NEVER answered from cache: replaying a
 * cached "success" would make the POS mark unsynced orders as synced.
 */
const VERSION = "v1";
const STATIC_CACHE = `sm-pos-offline-static-${VERSION}`;
const PAGE_CACHE = `sm-pos-offline-pages-${VERSION}`;
const DATA_CACHE = `sm-pos-offline-data-${VERSION}`;

const STATIC_RE = [
    /^\/web\/assets\//,
    /^\/web\/static\//,
    /^\/[\w.]+\/static\//,
    /\.(?:js|css|woff2?|ttf|otf|ico)$/,
];

// Never intercept: realtime channels and session mutations.
const SKIP_RE = [/^\/websocket/, /^\/bus\//, /^\/longpolling\//, /^\/web\/session\/(destroy|logout)/];

// ponytail: whitelist of read-only RPC methods safe to replay from cache offline.
// Extend here if the POS load flow gains new read endpoints.
const POST_REPLAY_RE =
    /^\/web\/dataset\/call_kw\/[\w.]+\/(load_data|load_data_params|get_pos_ui_[\w]+|search_read|web_search_read|read|read_group|get_views|load_menus|load_views)$/;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter((k) => k.startsWith("sm-pos-offline-") && !k.endsWith(VERSION))
                    .map((k) => caches.delete(k))
            );
            await self.clients.claim();
        })()
    );
});

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }
    const response = await fetch(request);
    if (response.ok) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, response.clone());
    }
    return response;
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    const network = fetch(request)
        .then((response) => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => cached);
    return cached || network;
}

async function networkFirst(request, cacheName, cacheKey) {
    const cache = await caches.open(cacheName);
    const key = cacheKey || request;
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(key, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await cache.match(key);
        if (cached) {
            return cached;
        }
        throw error;
    }
}

// Cache API only stores GET: build a synthetic GET key from URL + body hash so
// identical RPC payloads (e.g. load_data for the same session) hit the same entry.
async function postCacheKey(request) {
    const body = await request.clone().text();
    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(request.url + body)
    );
    const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return new Request(`${request.url}?sm_sw_key=${hex}`, { method: "GET" });
}

self.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        return;
    }
    if (SKIP_RE.some((re) => re.test(url.pathname))) {
        return;
    }

    if (request.method === "GET") {
        if (request.mode === "navigate") {
            event.respondWith(networkFirst(request, PAGE_CACHE));
        } else if (url.pathname.startsWith("/web/image")) {
            event.respondWith(staleWhileRevalidate(request));
        } else if (STATIC_RE.some((re) => re.test(url.pathname))) {
            event.respondWith(cacheFirst(request));
        } else {
            event.respondWith(networkFirst(request, DATA_CACHE));
        }
    } else if (request.method === "POST" && POST_REPLAY_RE.test(url.pathname)) {
        event.respondWith(
            (async () => {
                const key = await postCacheKey(request);
                return networkFirst(request, DATA_CACHE, key);
            })()
        );
    }
    // Other POSTs (order sync, writes): untouched — the POS's own offline
    // queue keeps unsynced orders and retries when back online.
});
