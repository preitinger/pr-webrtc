import { deprecate } from "util";
import { StandardMsgDoc, executeMsgReq } from "../pr-msg-server/pr-msg-server";
// import { sendPushMessage } from "../pr-push-api-server/pr-push-api-server";
import clientPromise from "../user-management-server/mongodb";
import { ApiResp } from "../user-management-server/user-management-common/apiRoutesCommon";
import { checkToken } from "../user-management-server/userManagementServer";
import { AcceptCallReq, AcceptCallResp, AuthenticatedVideoReq, CheckAcceptReq, CheckAcceptResp, CheckCallReq, CheckCallResp, DeletePushSubscriptionReq, DeletePushSubscriptionResp, HangUpReq, HangUpResp, OfferCallReq, OfferCallResp, RejectCallReq, RejectCallResp, SavePushSubscriptionReq, SavePushSubscriptionResp, StoreMsgReq, StoreMsgResp, WebRTCMsgReq, WebRTCMsgResp } from "./video-common-old";
import { PushData, PushNotifyReq, PushNotifyResp, PushSubscribeReq, PushSubscribeResp } from "./video-common";
import { Document } from "mongodb";

const dbName = 'video';


interface PushDoc extends Document {
    /**
     * subscribing user
     */
    _id: string;
    subscription: string;
}

async function pushSubscribe(authUser: string, req: PushSubscribeReq): Promise<ApiResp<PushSubscribeResp>> {
    const client = await clientPromise;
    const db = client.db(dbName);
    const col = db.collection<PushDoc>('push');
    const res = await col.updateOne({
        _id: authUser
    }, {
        $set: {
            subscription: req.subscription
        }
    }, {
        upsert: true
    })
    if (!res.acknowledged) {
        return {
            type: 'error',
            error: 'MongoDB update was not acknowledged.'
        }
    }

    return {
        type: 'success'
    }
}

async function pushNotify(authUser: string, req: PushNotifyReq): Promise<ApiResp<PushNotifyResp>> {
    const client = await clientPromise;
    const db = client.db(dbName);
    const col = db.collection<PushDoc>('push');

    const doc = await col.findOne({
        _id: req.callee
    })

    if (doc != null) {
        const subscription = JSON.parse(doc.subscription);
        try {
            const pushData: PushData = {
                caller: authUser, callee: req.callee
            }
            // const sendRes = await sendPushMessage(subscription, pushData);
            console.warn('web-push removed for testing');
        } catch (reason) {
            console.error('sendPushMessage failed: ', reason);
        }

    } // else: no push subscription; nothing to do

    return {
        type: 'success'
    }
}

const actions: { [key: string]: (authenticatedUser: string, req: any) => Promise<ApiResp<any>> } = {
    ['pr-msg']: async (validatedUser: string, req: any): Promise<any> => {
        const client = await clientPromise;
        const db = client.db(dbName);
        const col = db.collection<StandardMsgDoc>('videoStandardMsg');
        return await executeMsgReq(validatedUser, req, col, 'msg');
    },
    pushSubscribe,
    pushNotify

}


export async function executeAuthenticatedVideoReq(req: AuthenticatedVideoReq<{ type: string }>): Promise<ApiResp<any>> {
    if (!checkToken(req.ownUser, req.sessionToken)) {
        return {
            type: 'error',
            error: 'Authentication failed'
        }
    }
    if (req.req.type in actions) {
        const action = actions[req.req.type];
        // console.log('found action for ', req.req.type, action);
        return action(req.ownUser, req.req);
    }
    console.log('alternative path');
    switch (req.req.type) {
        // case 'checkCall':
        //     return checkCall(req.ownUser, req.req);
        // case 'acceptCall':
        //     return acceptCall(req.ownUser, req.req);
        // // case 'rejectCall':
        // //     return rejectCall(req.ownUser, req.req);
        // case 'offerCall':
        //     return offerCall(req.ownUser, req.req);
        // case 'checkAccept':
        //     return checkAccept(req.ownUser, req.req);
        // case 'hangUp':
        //     return hangUp(req.ownUser, req.req);
        // case 'webRTCMsg':
        //     return webRTCMsg(req.ownUser, req.req);
        // case 'savePushSubscription':
        //     return savePushSubscription(req.ownUser, req.req);
        // case 'deletePushSubscription':
        //     return deletePushSubscription(req.ownUser, req.req);
        //     break;
        default: throw new Error(`Not yet implemented: ${req.req.type}`);
    }
}
