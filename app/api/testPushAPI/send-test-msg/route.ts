import { SendTestMsgReq, SendTestMsgResp } from "@/app/_lib/testPushAPI";
import { SubscriptionDoc } from "@/app/_lib/testPushAPI-server";
import { apiPOST } from "@/app/_lib/user-management-server/apiRoutesForServer";
import clientPromise from "@/app/_lib/user-management-server/mongodb";
import { ApiResp } from "@/app/_lib/user-management-server/user-management-common/apiRoutesCommon";
import { NextRequest } from "next/server";
import webpush from "web-push";

const vapidKeysStr = process.env.VAPID_KEYS;
if (!vapidKeysStr) {
    throw new Error('Invalid/Missing environment variable: "VAPID_KEYS"');
}

const vapidKeys = JSON.parse(vapidKeysStr);

webpush.setVapidDetails(
    'mailto:peter.reitinger@gmail.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
)

async function executeSendTestMsg(req: SendTestMsgReq): Promise<ApiResp<SendTestMsgResp>> {
    
    const client = await clientPromise;
    const db = client.db('tests');
    const col = db.collection<SubscriptionDoc>('pushSubscriptions');
    const res = await col.findOne({
        _id: 0
    });
    if (res == null) {
        return {
            type: 'error',
            error: 'test db entry (0) not found'
        }
    }
    const subscription = JSON.parse(res.stringifiedSubscription);
    try {
        const sendRes = await webpush.sendNotification(subscription, req.text);
        console.log('sendRes', sendRes);

        return {
            type: 'success'
        }
    
    } catch (reason1) {
        const reason: webpush.SendResult = reason1 as webpush.SendResult;
        return {
            type: 'error',
            error: `received the following SendResult as reason from sendNotification: "${JSON.stringify(reason)}"`
        }
    }

    return {
        type: 'error',
        error: 'nyi'
    }
}

export function POST(req: NextRequest) {
    return apiPOST(req, executeSendTestMsg);
}
