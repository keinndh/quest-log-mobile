const CACHE_NAME = 'quest-log-v2'; // Bumped version to force update
const ASSETS = [
  './',
  'index.html',
  'assets/css/pixel.css',
  'assets/js/db.js',
  'assets/js/pixel.js',
  'assets/js/dashboard.js',
  'assets/js/quests.js',
  'assets/js/character.js',
  'assets/js/achievements.js',
  'assets/js/shop.js',
  'assets/js/stats.js',
  'assets/js/leaderboard.js',
  'assets/js/daily-log.js',
  'assets/js/settings.js',
  'assets/js/user_rewards.js',
  'pages/quests.html',
  'pages/character.html',
  'pages/achievements.html',
  'pages/shop.html',
  'pages/stats.html',
  'pages/leaderboard.html',
  'pages/daily-log.html',
  'pages/settings.html',
  'pages/user_rewards.html'
];

// Install Service Worker
self.addEventListener('install', event => {
  self.skipWaiting(); // Force active immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching system assets (v2)');
      return cache.addAll(ASSETS);
    })
  );
});

// Activate & Cleanup Old Caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  return self.clients.claim(); // Take control of pages immediately
});

// Fetch Strategy: Network first, then fallback to cache
// This is safer for development so you see your CSS changes
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
