/* Handlers de Web Push — se importa desde /sw.js (Workbox importScripts). */
self.addEventListener('push', function (event) {
  var data = { title: 'Club Fútbol Manager', body: '', url: '/', tag: undefined };
  try {
    if (event.data) {
      var parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        data.title = parsed.title || data.title;
        data.body = parsed.body || '';
        data.url = parsed.url || '/';
        data.tag = parsed.tag;
      }
    }
  } catch (e) {
    if (event.data) {
      try {
        data.body = event.data.text();
      } catch (e2) {
        /* sin contenido */
      }
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag,
      data: { url: data.url }
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var client = list[i];
        if (!('focus' in client)) continue;
        // App abierta: enfoca y navega al deep-link (?tab=...&partido=...)
        if ('navigate' in client) {
          return client.focus().then(function (focused) {
            return focused.navigate ? focused.navigate(url) : focused;
          });
        }
        return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
