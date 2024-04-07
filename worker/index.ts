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

const version: Version = 15

declare const self: ServiceWorkerGlobalScope;

console.log('Custom service worker functions for pr-webrtc: version=', version);

self.addEventListener('notificationclick', e => {
    console.log('notificationclick with action', e.action);
    const pushData: any = JSON.parse(e.action);
    if (PushData.guard(pushData)) {
        console.log('self.origin', self.origin);
        self.clients.openWindow(self.origin)
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
        // requireInteraction: true,
        actions: [
            {
                title: 'Accept call',
                action: JSON.stringify(pushData)
            }
        ]

    }
    const promiseChain = self.registration.showNotification('Call in pr-webRTC', notificationOptions);
    self.clients.matchAll().then(clients => {
        console.log('clients.length', clients.length);
        clients.forEach(client => {
            console.log('sending push to', client);
            client.postMessage(e.data?.json());
        })
    })
    e.waitUntil(promiseChain);
})