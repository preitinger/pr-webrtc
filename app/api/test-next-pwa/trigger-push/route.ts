// import { sendPushMessage } from "@/app/_lib/pr-push-api-server/pr-push-api-server";
import { TriggerPushReq, TriggerPushResp } from "@/app/_lib/test-next-pwa";
import { SubscriptionDoc } from "@/app/_lib/test-next-pwa-server";
import { apiPOST } from "@/app/_lib/user-management-server/apiRoutesForServer";
import clientPromise from "@/app/_lib/user-management-server/mongodb";
import { ApiResp } from "@/app/_lib/user-management-server/user-management-common/apiRoutesCommon";
import { NextRequest } from "next/server";

async function executeTriggerPush(req: TriggerPushReq): Promise<ApiResp<TriggerPushResp>> {
    const client = await clientPromise;
    const db = client.db('tests');
    const col = db.collection<SubscriptionDoc>('testNextPwa');
    const res = await col.findOne({
        _id: 0
    })
    if (res == null) {
        return {
            type: 'error',
            error: 'Subscription not found'
        }
    }

    // sendPushMessage(JSON.parse(res.stringifiedSubscription), {
    //     test: 1
    // })

    return {
        type: 'success'
    };
}

export function POST(req: NextRequest) {
    return apiPOST<TriggerPushReq, TriggerPushResp>(req, executeTriggerPush);
}