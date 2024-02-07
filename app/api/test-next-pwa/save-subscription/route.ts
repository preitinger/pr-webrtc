import { SaveSubscriptionReq, SaveSubscriptionResp } from "@/app/_lib/test-next-pwa";
import { SubscriptionDoc } from "@/app/_lib/test-next-pwa-server";
import { apiPOST } from "@/app/_lib/user-management-server/apiRoutesForServer";
import clientPromise from "@/app/_lib/user-management-server/mongodb";
import { ApiResp } from "@/app/_lib/user-management-server/user-management-common/apiRoutesCommon";
import { NextRequest } from "next/server";

async function executeSaveSubscription(req: SaveSubscriptionReq): Promise<ApiResp<SaveSubscriptionResp>> {
    console.log('req', req);
    const client = await clientPromise;
    const db = client.db('tests');
    const col = db.collection<SubscriptionDoc>('testNextPwa');
    const res = await col.updateOne({
        _id: 0
    }, {
        $set: {
            stringifiedSubscription: req.stringifiedSubscription
        }
    }, {
        upsert: true
    });
    if (!res.acknowledged) throw new Error('update not acknowledged');
    if (res.matchedCount !== 1 && res.upsertedCount !== 1) {
        throw new Error(`Unexpected matchedCount, upsertedCount: ${res.matchedCount}, ${res.upsertedCount} (expected: one of them 1)`);
    }

    return {
        type: 'success'
    };
}

export function POST(req: NextRequest) {
    console.log('POST in /test-next-pwa');
    return apiPOST(req, executeSaveSubscription);
}
