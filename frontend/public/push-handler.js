self.addEventListener('push', (event) => {
  const payload = event.data && event.data.json();
  event.waitUntil(self.registration.showNotification((payload && payload.title) || 'FinTrack', {
    body: (payload && payload.body) || 'You have a financial update.',
    icon: '/favicon.svg',
    data: (payload && payload.data) || {},
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => clients[0] ? clients[0].focus() : self.clients.openWindow('/')));
});
