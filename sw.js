// ============================================================
//  PAEM — Service Worker  (Cache-First Stratejisi)
// ============================================================
//
//  Cache versiyonu: Bu ismi her güncellediğinde eski önbellek
//  silinir ve yenisi indirilir. Yeni veri ekleyince v2, v3 yap.
//
const CACHE_NAME = 'paem-v6';

//  Önbelleğe alınacak tüm dosyalar:
const FILES_TO_CACHE = [
  './paem-app_3.html',
  './manifest.json',
  './data-questions.js',
  './data-cikmis.js',
  './data-flashcards.js',
  './data-bilgicards.js',
  './data-dycards.js',
  './data-lessons.js',
  './data-lawdata.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ─────────────────────────────────────────────────────────────
//  INSTALL olayı — Uygulama ilk kez yüklendiğinde tetiklenir.
//  Tüm dosyaları önbelleğe alır.
// ─────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Kurulum başladı — önbellek dolduruluyor...');

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Dosyalar önbelleğe alınıyor');
      return cache.addAll(FILES_TO_CACHE);
    }).then(() => {
      console.log('[SW] Tüm dosyalar önbelleğe alındı');
      // Eski SW beklemeden hemen devreye gir
      return self.skipWaiting();
    })
  );
});

// ─────────────────────────────────────────────────────────────
//  ACTIVATE olayı — Yeni SW devreye girdiğinde tetiklenir.
//  Eski versiyon önbelleklerini siler.
// ─────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Aktif oldu — eski önbellekler temizleniyor...');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)   // mevcut versiyon değilse
          .map(name => {
            console.log('[SW] Siliniyor:', name);
            return caches.delete(name);           // sil
          })
      );
    }).then(() => {
      // Açık sekmelerde yeni SW'yi hemen kullan
      return self.clients.claim();
    })
  );
});

// ─────────────────────────────────────────────────────────────
//  FETCH olayı — Her ağ isteğinde tetiklenir.
//  Cache-First: Önce önbellekten, yoksa internetten al.
// ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {

      // Önbellekte var → direkt önbellekten döndür (offline da çalışır)
      if (cachedResponse) {
        return cachedResponse;
      }

      // Önbellekte yok → internetten al ve önbelleğe kaydet
      return fetch(event.request).then(networkResponse => {
        // Geçerli bir yanıt mı kontrol et
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Yanıtı klonla (stream bir kez okunabilir, biri cache'e biri tarayıcıya)
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // İnternet yok ve önbellekte de yok → ana sayfayı dön (fallback)
        return caches.match('./paem-app_3.html');
      });
    })
  );
});

// ─────────────────────────────────────────────────────────────
//  MESSAGE olayı — Ana sayfadan güncelleme mesajı gelirse
//  önbelleği temizle ve yenile (manuel güncelleme için)
// ─────────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
