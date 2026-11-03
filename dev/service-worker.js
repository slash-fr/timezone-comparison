// Disambiguate between multiple PWAs potentially being hosted on the same subdomain
const cachePrefix = "timezone-comparison-";
const currentCacheName = cachePrefix + "2026-11-03_001";

const addResourcesToCache = async (resources) => {
    const cache = await caches.open(currentCacheName);
    await cache.addAll(resources);
};

const putInCache = async (request, response) => {
    const cache = await caches.open(currentCacheName);
    await cache.put(request, response);
};

const cacheFirst = async (request) => {
    // First, try to get the resource from the cache
    const responseFromCache = await caches.match(request);
    if (responseFromCache) {
        return responseFromCache;
    }

    // Next, try to get the resource from the network
    try {
        const responseFromNetwork = await fetch(request.clone());
        
        // The response may be used only once.
        // We need to use `clone()` to put one copy in cache, and serve the second one.
        putInCache(request, responseFromNetwork.clone());
        
        return responseFromNetwork;
    } catch (error) {
        return new Response("Network error happened", {
            status: 408,
            headers: { "Content-Type": "text/plain" },
        });
    }
};

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName.startsWith(cachePrefix) && cacheName !== currentCacheName) {
                        return caches.delete(cacheName); // Clear stale caches
                    }
                    
                    return undefined;
                })
            )
        )
    );
    
    event.waitUntil(clients.claim());
});

self.addEventListener("install", (event) => {
    event.waitUntil(
        addResourcesToCache([
            // Only pre-cache critical assets
            "./",
            "./index.html",
            "./style.css",
            "./main.js",
            ///////////////////////////
            //"./manifest.json",
            //"./apple-touch-icon.png",
            //"./favicon-96x96.png",
            //"./favicon-192x192.png",
            //"./favicon-512x512.png",
            //"./favicon.svg",
            //"./favicon.ico",
        ])
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        cacheFirst(event.request)
    );
});

// See: https://progressier.com/handling-service-worker-updates
self.addEventListener("message", (event) => {
    if (event.data === "SKIP_WAITING") {
        self.skipWaiting();
    }
})
