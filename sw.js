// Quest Log Service Worker
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

const CACHE_NAME = 'quest-log-v5';
const OFFLINE_URL = 'index.html';

// Cache all pages and assets on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './dashboard.html',
        './quests.html',
        './character.html',
        './achievements.html',
        './shop.html',
        './stats.html',
        './leaderboard.html',
        './daily-log.html',
        './settings.html',
        './user_rewards.html',
        './manifest.json',
        './assets/css/pixel.css',
        './assets/js/pixel.js',
        './assets/js/db.js',
        './assets/js/dashboard.js',
        './assets/js/quests.js',
        './assets/js/login.js',
        './assets/js/firebase.js',
        './assets/img/bg.gif'
      ]);
    })
  );
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Cache-first strategy for assets, Network-first for HTML
workbox.routing.registerRoute(
  ({request}) => request.destination === 'script' || request.destination === 'style' || request.request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'assets-cache',
  })
);

// Fonts caching
workbox.routing.registerRoute(
  ({url}) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new workbox.strategies.CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new workbox.expiration.ExpirationPlugin({maxEntries: 20}),
    ],
  })
);

// Fallback to index.html for navigation errors (offline)
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
  }
});
