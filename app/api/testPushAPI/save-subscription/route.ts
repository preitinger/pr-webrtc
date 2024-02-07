import { SaveSubscriptionReq, SaveSubscriptionResp } from "@/app/_lib/testPushAPI";
import { SubscriptionDoc } from "@/app/_lib/testPushAPI-server";
import { apiPOST } from "@/app/_lib/user-management-server/apiRoutesForServer";
import clientPromise from "@/app/_lib/user-management-server/mongodb";
import { ApiResp } from "@/app/_lib/user-management-server/user-management-common/apiRoutesCommon";
import { NextRequest } from "next/server";
import { json } from "stream/consumers";

async function executeSaveSubscription(req: SaveSubscriptionReq): Promise<ApiResp<SaveSubscriptionResp>> {
    const client = await clientPromise;
    const db = client.db('tests');
    const doc: SubscriptionDoc = {
        _id: 0,
        stringifiedSubscription: req.stringifiedSubscription
    }
    try {
        const res = await db.collection<SubscriptionDoc>('pushSubscriptions').updateOne(
            {
                _id: 0
            }, {
                $set: doc
            }, {
                upsert: true
            });
        if (!res.acknowledged) {
            console.error('insert not acknowledged');
            return {
                type: 'error',
                error: 'not acknowledged'
            }
        }

        return {
            type: 'success'
        }

    } catch (reason) {
        console.error(reason);
        return {
            type: 'error',
            error: JSON.stringify(reason)
        }
    }
}

export function POST(req: NextRequest) {
    return apiPOST(req, executeSaveSubscription);
}
