// TODO sth like this when callee accepts a call:
//     db.collection('callers').updateOne({_id: "User 1", callees: {$elemMatch: {callee: "User 2"}}}, { $set: { "callees.$.status": "accepted"}})

import clientPromise from "../mongodb";
import { ApiResp } from "../user-management-server/user-management-common/apiRoutesCommon";
import { checkToken } from "../user-management-server/userManagementServer";
import { AcceptCallReq, AcceptCallResp, AuthenticatedVideoReq, CheckAcceptReq, CheckAcceptResp, CheckCallReq, CheckCallResp, HangUpReq, HangUpResp, OfferCallReq, OfferCallResp, RejectCallReq, RejectCallResp, WebRTCMsgReq, WebRTCMsgResp } from "./video-common";

const dbName = 'video';

export interface Callee {
    _id: string;
    caller: string;
    accepted: boolean;
    messagesForCallee: string[];
    messagesForCaller: string[];
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
        await calleesCol.updateOne({
            _id: o.callee,
            caller: o.caller
        }, {
            $set: {
                accepted: false,
                messagesForCallee: [],
                messagesForCaller: []
            }
        }, {
            upsert: true
        })

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
                caller: o.caller
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

    if (res == null) {
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
    console.log('delete res', res);
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

    {
        const res = await calleesCol.deleteOne({
            _id: req.callee,
            caller: req.caller
        })
    
        if (!res.acknowledged) {
            console.error('deleteOne for callee in hangUp not acknowledged');
        }
    
    }

    {
        const res = await calleesCol.deleteOne({
            _id: req.caller,
            caller: req.caller
        })
        if (!res.acknowledged) {
            console.error('deleteOne for caller\'s dummy in hangUp not acknowledged');
        }
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


export async function executeAuthenticatedVideoReq(req: AuthenticatedVideoReq<CheckCallReq | AcceptCallReq | RejectCallReq | OfferCallReq | CheckAcceptReq | HangUpReq | WebRTCMsgReq>): Promise<ApiResp<CheckCallResp | AcceptCallResp | RejectCallResp | OfferCallResp | CheckAcceptResp | HangUpResp | WebRTCMsgResp>> {
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
        case 'rejectCall':
            return rejectCall(req.ownUser, req.req);
        case 'offerCall':
            return offerCall(req.ownUser, req.req);
        case 'checkAccept':
            return checkAccept(req.ownUser, req.req);
        case 'hangUp':
            return hangUp(req.ownUser, req.req);
        case 'webRTCMsg':
            return webRTCMsg(req.ownUser, req.req);
        // default: throw new Error(`Not yet implemented: ${req.req.type}`);
    }
}
