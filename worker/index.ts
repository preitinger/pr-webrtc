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

const version: Version = 11

declare const self: ServiceWorkerGlobalScope;

console.log('Custom service worker functions for pr-webrtc: version=', version);

self.addEventListener('push', (e) => {
    
    console.log('push event: e=', e);
    const pushData = e.data?.json();
    console.log('e.data?.json()', pushData)
    if (!PushData.guard(pushData)) {
        console.error('Unexpected pushData', pushData)
        return;
    }
    self.registration.showNotification('Call in pr-webRTC', {
        body: `${pushData.caller} calling ${pushData.callee}`,
        requireInteraction: true
    })
    self.clients.matchAll().then(clients => {
        console.log('clients.length', clients.length);
        clients.forEach(client => {
            console.log('sending push to', client);
            client.postMessage(e.data?.json());
        })
    })
})