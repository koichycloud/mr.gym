
self.addEventListener('install', (event) => {
    console.log('SW: Installing and skipping waiting...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('SW: Activating and claiming clients...');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(function (clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url === '/' && 'focus' in client)
                    return client.focus();
            }
            if (clients.openWindow)
                return clients.openWindow('/');
        })
    );
});
