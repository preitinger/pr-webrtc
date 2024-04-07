// NOTE: We must export or import at least one thing so we are not in
// the "global" scope, but in a module scope which is re-declarable.
//
// The error from tsserver is: 2451: Cannot redeclare block-scoped
// variable 'self'.
//
// Even tho this is not really a module and cannot be: ServiceWorkers
// cannot be modules.

import { PushData } from "@/app/_lib/video/video-common";

export type Version = number

const version: Version = 20

declare const self: ServiceWorkerGlobalScope;

console.log('Custom service worker functions for pr-webrtc: version=', version);

self.addEventListener('notificationclick', e => {
    console.log('notificationclick with action', e.action);
    e.notification.data
    const pushData: any = JSON.parse(e.action);

    if ('url' in e.notification.data) {
        console.log('url', e.notification.data.url);
    }
    if (PushData.guard(pushData)) {
        e.notification.close();
        console.log('self.origin', self.origin);
        const p = self.clients.matchAll().then(c => {
            let couldFocus = false;
            c.forEach(client => {
                if ('focus' in client && typeof client.focus === 'function') {
                    client.focus();
                    couldFocus = true;
                } else {
                    console.warn('no focus method in client');
                }
            })

            if (!couldFocus || true) {
                console.log('open window for url', e.notification.data.url)
                return self.clients.openWindow(e.notification.data.url);
            }
        })

        e.waitUntil(p)
    }

})

self.addEventListener('push', (e) => {

    console.log('push event: e=', e);
    const pushData = e.data?.json();
    console.log('e.data?.json()', pushData)
    if (!PushData.guard(pushData)) {
        console.error('Unexpected pushData', pushData)
        return;
    }
    const notificationOptions: NotificationOptions = {
        body: `${pushData.caller} calling ${pushData.callee} (self.origin: ${self.origin})`,
        data: { url: `${self.location.origin}/accept/${encodeURIComponent(pushData.caller)}/${encodeURIComponent(pushData.callee)}` },
        tag: 'pr-webRTC call'
    }
    const promise1 = self.registration.showNotification(`Call in pr-webRTC[${version}]`, notificationOptions);
    const promise2 = self.clients.matchAll().then(clients => {
        console.log('clients.length', clients.length);
        clients.forEach(client => {
            console.log('sending push to', client);
            client.postMessage(e.data?.json());
        })
    })
    e.waitUntil(Promise.all([promise1, promise2]))
})