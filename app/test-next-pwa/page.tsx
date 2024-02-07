'use client';

import { SaveSubscriptionReq, SaveSubscriptionResp, TriggerPushReq, TriggerPushResp } from "../_lib/test-next-pwa";
import { apiFetchPost } from "../_lib/user-management-client/apiRoutesClient";

const subscriptionOptions = {
    userVisibleOnly: true,
    applicationServerKey: "BPz5hyoDeI73Jgu6-rxgQmz2-WMQnDh4vMGszZO8-fBWPo0UV9yJsWYScxJqRMJpxAS1WxnvDoescRPeaPM6VGs"
};

export default function Page() {

    async function registerPush() {
        console.log('before ready...');
        const reg = await navigator.serviceWorker.ready;
        console.log('after ready');
        let subscription = await reg.pushManager.getSubscription();
        if (subscription != null) {
            if (await subscription.unsubscribe()) {
                subscription = null;
            }
        }
        if (subscription == null) {
            console.log('no push subscription');
            const permissionState = (await reg.pushManager.permissionState(subscriptionOptions));
            console.log('permissionState', permissionState);
            if (permissionState !== 'granted') {
                console.log('permission not granted?!');
                return;
            }
            const newSubscription = await reg.pushManager.subscribe(subscriptionOptions);
            console.log('newSubscription', newSubscription);
            const stringifiedSubscription = JSON.stringify(newSubscription);
            console.log('stringifiedSubscription', stringifiedSubscription);
            const req: SaveSubscriptionReq = {
                type: 'saveSubscription',
                stringifiedSubscription: JSON.stringify(newSubscription)
            }

            try {
                const resp = await apiFetchPost<SaveSubscriptionReq, SaveSubscriptionResp>('/api/test-next-pwa/save-subscription', req);
                console.log('resp (SaveSubscriptionResp)', resp);

            } catch (reason) {
                console.error('caught in apiFetchPost', reason);
            }
        } else {
            console.log('already push subscription?!', subscription);
        }
    }

    async function triggerPush() {
        const req: TriggerPushReq = {
            type: 'triggerPush'
        };
        try {
            const resp = await apiFetchPost<TriggerPushReq, TriggerPushResp>('/api/test-next-pwa/trigger-push', req);
            console.log('resp (TriggerPushResp)', resp);

        } catch (reason) {
            console.error('caught in apiFetchPost', reason);
        }
    }

    return (
        <div>
            <div>
                <button onClick={registerPush}>Register push</button>
            </div>
            <div>
                <button onClick={triggerPush}>Trigger push</button>

            </div>
        </div>
    )
}