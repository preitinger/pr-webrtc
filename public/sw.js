// /// <reference lib="WebWorker" />

// // export empty type because of tsc --isolatedModules flag
// export type {};
// declare const self: ServiceWorkerGlobalScope;

// TODO remove targetOrigin if really not necessary
// let targetOrigin = null;
// let serviceWorker = null;




console.log('sw.js started [5]');

self.addEventListener("activate", (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('push', e => {
    async function f() {
        // console.log('push message', e);
        const text = e.data.text();

        self.registration.showNotification('Call at pr-webrtc', {
            body: text
        })
        // console.log('before postMessage with stringify');
        // console.log('self.clients', self.clients);
        await self.clients.matchAll().then(clients => {
            // console.log('clients.length', clients.length);
            for (const client of clients) {
                // console.log('client', client);
                client.postMessage(JSON.stringify({
                    title: 'Call at pr-webrtc',
                    body: text
                }));
            }
        })
        // console.log('leave f()');
        // navigator.serviceWorker.postMessage(JSON.stringify({
        //     title: 'test title from sw',
        //     body: text
        // }))
        // serviceWorker.postMessage(JSON.stringify({
        //     title: 'test title',
        //     body: text
        // }))
    }
    e.waitUntil(f());
    // console.log('waitUntil called');

})
