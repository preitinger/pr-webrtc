import clientPromise from "../mongodb";
import { sendPushMessage } from "../pr-push-api-server/pr-push-api-server";
import { ApiResp } from "../user-management-server/user-management-common/apiRoutesCommon";
import { checkToken } from "../user-management-server/userManagementServer";
import { AcceptCallReq, AcceptCallResp, AuthenticatedVideoReq, CheckAcceptReq, CheckAcceptResp, CheckCallReq, CheckCallResp, DeletePushSubscriptionReq, DeletePushSubscriptionResp, HangUpReq, HangUpResp, OfferCallReq, OfferCallResp, RejectCallReq, RejectCallResp, SavePushSubscriptionReq, SavePushSubscriptionResp, WebRTCMsgReq, WebRTCMsgResp } from "./video-common";

const dbName = 'video';

/**
 * scheme for MongoDB entries in collection callees.
 * If an entry exists for user <_id>, there are the following cases.
 * a) The user <_id> has set up push notifications. Then, the subscription is stored stringified in <stringifiedSubscription>.
 *    Otherwise, <stringifiedSubscription> is null.
 * b) User <caller> has offered a call to user <_id>. Then caller is not null. Otherwise, if nobody has offered a call,
 *    <caller> is null.
 * c) a) + b) that means a call has been offered almost at the same time as user <_id>, the callee, has subscribed
 *    for push notifications.
 */
export interface Callee {
    _id: string;
    /**
     * if not null, <caller> has offered a call to <_id>
     * 
     */
    caller: string | null;
    accepted: boolean;
    messagesForCallee: string[];
    messagesForCaller: string[];
    stringifiedSubscription: string | null;
}

export async function offerCall(validatedUser: string, o: OfferCallReq): Promise<ApiResp<OfferCallResp>> {
    if (validatedUser !== o.caller) {
        return {
            type: 'authFailed'
        }
    }
    const client = await clientPromise;
    const db = client.db(dbName);
    const calleesCol = db.collection<Callee>('callees');

    try {
        const res = await calleesCol.findOneAndUpdate({
            _id: o.callee,
            caller: null
        }, {
            $set: {
                caller: o.caller,
                accepted: false,
                messagesForCallee: [],
                messagesForCaller: []
            }, $setOnInsert: {
                stringifiedSubscription: null
            }
        }, {
            upsert: true
        });

        if (res != null && res.stringifiedSubscription != null) {
            const subscription = JSON.parse(res.stringifiedSubscription);
            try {
                const sendRes = await sendPushMessage(subscription, `Call from ${o.caller}`);
            } catch (reason) {
                console.warn('sendPushMessage failed: ', reason);
            }
        }

    } catch (reason: any) {
        if (reason.code === 11000) {
            return {
                type: 'busy'
            }
        } else {
            return {
                type: 'error',
                error: JSON.stringify(reason)
            }
        }
    }

    try {
        const res = await calleesCol.updateOne({
            _id: o.caller,
        }, {
            $set: {
                caller: o.caller,
                accepted: false,
                messagesForCallee: [],
                messagesForCaller: [],
                stringifiedSubscription: null
            }
        }, {
            upsert: true
        })
        if (!res.acknowledged) {
            return {
                type: 'error',
                error: 'setting callers dummy callee not acknowledged'
            }
        }

        return {
            type: 'success'
        }
    } catch (reason) {
        return {
            type: 'error',
            error: JSON.stringify(reason)
        }

    }
}

export async function checkCall(validatedUser: string, r: CheckCallReq): Promise<ApiResp<CheckCallResp>> {
    if (validatedUser !== r.callee) {
        return ({
            type: 'authFailed'
        })
    }

    const client = await clientPromise;
    const db = client.db(dbName);
    const calleesCol = db.collection<Callee>('callees');
    const res = await calleesCol.findOne({
        _id: r.callee
    }, {
        projection: {
            caller: 1,
            accepted: 1
        }
    });

    if (res == null || res.caller == null) {
        return ({
            type: 'noNewOffer'
        })
    }

    if (res.accepted) {
        console.warn('Callee.accepted already true when call checked?!');
    }
    return ({
        type: 'newOffer',
        caller: res.caller,
    })
}

export async function acceptCall(validatedUser: string, o: AcceptCallReq): Promise<ApiResp<AcceptCallResp>> {
    if (validatedUser !== o.callee) {
        return {
            type: 'authFailed'
        }
    }
    const client = await clientPromise;
    const db = client.db(dbName);
    const calleesCol = db.collection<Callee>('callees');

    // const updateRes = await calleesCol.findOneAndUpdate({
    const updateRes = await calleesCol.updateOne({
        _id: o.callee,
        caller: o.caller
    }, {
        $set: {
            accepted: true,
        },
    });

    if (!updateRes.acknowledged) {
        const msg = 'update for acceptCall not acknowledged?!'
        console.error(msg);
        return {
            type: 'error',
            error: msg
        }
    }

    if (updateRes.matchedCount !== 1) {
        return {
            type: 'notFound'
        }
    }

    if (updateRes.modifiedCount !== 1) {
        console.warn('Callee.accepted was true before acceptCall()?!');
    }

    return {
        type: 'success',
    }
}

/**
 * @deprecated because replaced by hangUp because also the dummy entry at the caller must be deleted
 * @param validatedUser 
 * @param req 
 * @returns 
 */
export async function rejectCall(validatedUser: string, req: RejectCallReq): Promise<ApiResp<RejectCallResp>> {
    if (validatedUser !== req.callee) {
        return ({
            type: 'authFailed'
        })
    }
    const client = await clientPromise;
    const db = client.db(dbName);
    const calleesCol = db.collection<Callee>('callees');

    const res = await calleesCol.deleteOne({
        _id: req.callee,
        caller: req.caller
    })
    return ({
        type: 'success'
    });
}

export async function checkAccept(validatedUser: string, req: CheckAcceptReq): Promise<ApiResp<CheckAcceptResp>> {
    if (validatedUser !== req.caller) {
        return ({
            type: 'error',
            error: 'Authentication for checkAccept failed'
        })
    }

    const client = await clientPromise;
    const db = client.db(dbName);
    const calleesCol = db.collection<Callee>('callees');

    const res = await calleesCol.findOne({
        _id: req.callee,
        caller: req.caller
    }, {
        projection: {
            accepted: 1
        }
    })

    if (res == null) {
        return {
            type: 'rejected'
        }
    }
    if (res.accepted) {
        return {
            type: 'accepted'
        }
    } else {
        return {
            type: 'ringing'
        }
    }
}

export async function hangUp(validatedUser: string, req: HangUpReq): Promise<ApiResp<HangUpResp>> {
    if (validatedUser !== req.caller && validatedUser !== req.callee) {
        return {
            type: 'error',
            error: 'Error in hangUp: authFailed'
        }
    }


    const client = await clientPromise;
    const db = client.db(dbName);
    const calleesCol = db.collection<Callee>('callees');

    try {
        const res = await calleesCol.deleteOne({
            _id: req.callee,
            caller: req.caller
        })

        if (!res.acknowledged) {
            console.error('deleteOne for callee in hangUp not acknowledged');
        }

    } catch (reason) {
        console.error('Exception in 1. delete in hangUp', reason);
    }

    try {
        const res = await calleesCol.deleteOne({
            _id: req.caller,
            caller: req.caller
        })
        if (!res.acknowledged) {
            console.error('deleteOne for caller\'s dummy in hangUp not acknowledged');
        }
    } catch (reason) {
        console.error('Exception in 2. delete in hangUp', reason);
    }



    // Rueckgabe immer success weil es sonst kein sinnvolles Verhalten im Client gibt.
    return {
        type: 'success'
    }
}



export async function webRTCMsg(validatedUser: string, req: WebRTCMsgReq): Promise<ApiResp<WebRTCMsgResp>> {
    const client = await clientPromise;
    const db = client.db(dbName);
    const calleesCol = db.collection<Callee>('callees');

    if (validatedUser === req.caller) {
        // sent from the caller to the callee
        const res = await calleesCol.findOneAndUpdate({
            _id: req.callee,
            caller: req.caller
        }, {
            $push: {
                messagesForCallee: { $each: req.messages }
            },
            $set: {
                messagesForCaller: []
            }
        }, {
            projection: {
                messagesForCaller: 1
            }
        });
        if (res == null) {
            return {
                type: 'closed'
            }
        }
        // There is actually a gap here because the http request could fail somehow and then the messages are lost.
        // But hey, it's just a video call ;-)
        return {
            type: 'success',
            messages: res.messagesForCaller
        }

    } else if (validatedUser === req.callee) {
        // sent from the callee to the caller
        const res = await calleesCol.findOneAndUpdate({
            _id: req.callee,
            caller: req.caller
        }, {
            $push: {
                messagesForCaller: { $each: req.messages }
            },
            $set: {
                messagesForCallee: []
            }
        }, {
            projection: {
                messagesForCallee: 1
            }
        });
        if (res == null) {
            return {
                type: 'closed'
            }
        }
        // There is actually a gap here because the http request could fail somehow and then the messages are lost.
        // But hey, it's just a video call ;-)
        return {
            type: 'success',
            messages: res.messagesForCallee
        }
    } else {
        // error
        return {
            type: 'error',
            error: 'Illegal user/caller/callee'
        }
    }
}

export async function savePushSubscription(validatedUser: string, req: SavePushSubscriptionReq): Promise<ApiResp<SavePushSubscriptionResp>> {
    const client = await clientPromise;
    const db = client.db(dbName);
    const calleesCol = db.collection<Callee>('callees');

    const res = await calleesCol.updateOne({
        _id: validatedUser
    }, {
        $set: {
            stringifiedSubscription: req.stringifiedPushSubscription
        },
        $setOnInsert: {
            accepted: false,
            caller: null,
            messagesForCallee: [],
            messagesForCaller: [],
        }
    }, {
        upsert: true
    });

    if (!res.acknowledged) return {
        type: 'error',
        error: 'update not acknowledged'
    }

    return {
        type: 'success'
    };

}

export async function deletePushSubscription(validatedUser: string, req: DeletePushSubscriptionReq): Promise<ApiResp<DeletePushSubscriptionResp>> {
    const client = await clientPromise;
    const db = client.db(dbName);
    const calleesCol = db.collection<Callee>('callees');

    const res = await calleesCol.updateOne({
        _id: validatedUser
    }, {
        $set: {
            stringifiedSubscription: null
        }
    })
    if (!res.acknowledged) return {
        type: 'error',
        error: 'update not acknowledged'
    }

    return {
        type: 'success'
    }
}

export async function executeAuthenticatedVideoReq(req: AuthenticatedVideoReq<CheckCallReq | AcceptCallReq | OfferCallReq | CheckAcceptReq | HangUpReq | WebRTCMsgReq | SavePushSubscriptionReq | DeletePushSubscriptionReq>): Promise<ApiResp<CheckCallResp | AcceptCallResp | OfferCallResp | CheckAcceptResp | HangUpResp | WebRTCMsgResp | SavePushSubscriptionResp | DeletePushSubscriptionResp>> {
    if (!checkToken(req.ownUser, req.sessionToken)) {
        return {
            type: 'error',
            error: 'Authentication failed'
        }
    }
    switch (req.req.type) {
        case 'checkCall':
            return checkCall(req.ownUser, req.req);
        case 'acceptCall':
            return acceptCall(req.ownUser, req.req);
        // case 'rejectCall':
        //     return rejectCall(req.ownUser, req.req);
        case 'offerCall':
            return offerCall(req.ownUser, req.req);
        case 'checkAccept':
            return checkAccept(req.ownUser, req.req);
        case 'hangUp':
            return hangUp(req.ownUser, req.req);
        case 'webRTCMsg':
            return webRTCMsg(req.ownUser, req.req);
        case 'savePushSubscription':
            return savePushSubscription(req.ownUser, req.req);
        case 'deletePushSubscription':
            return deletePushSubscription(req.ownUser, req.req);
            break;
        // default: throw new Error(`Not yet implemented: ${req.req.type}`);
    }
}
