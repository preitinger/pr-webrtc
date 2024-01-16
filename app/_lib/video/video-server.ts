// TODO sth like this when callee accepts a call:
//     db.collection('callers').updateOne({_id: "User 1", callees: {$elemMatch: {callee: "User 2"}}}, { $set: { "callees.$.status": "accepted"}})

import clientPromise from "../mongodb";
import { ApiResp } from "../user-management-server/user-management-common/apiRoutesCommon";
import { AcceptCallReq, AcceptCallResp, CheckCallReq, CheckCallResp, OfferCallReq, OfferCallResp, RejectCallReq, RejectCallResp } from "./video-common";

const dbName = 'video';

export interface Callee {
    _id: string;
    caller: string;
    accepted: boolean;
    descriptionCaller: string;
    descriptionCallee: string | null;
    candidatesCaller: string[];
    candidatesCallee: string[];
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
        const updateRes = await calleesCol.updateOne({
            _id: o.callee,
            caller: o.caller
        }, {
            $set: {
                accepted: false,
                descriptionCaller: JSON.stringify(o.description),
                descriptionCallee: null,
                candidatesCaller: o.candidates.map(o => JSON.stringify(o)),
                candidatesCallee: []
            }
        }, {
            upsert: true
        })
        console.log('updateRes', updateRes);

        // const insRes = await calleesCol.insertOne({
        //     _id: o.callee,
        //     caller: o.caller,
        //     accepted: false
        // })
        // console.log('insRes', insRes);
        return {
            type: 'success'
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

    const updateRes = await calleesCol.findOneAndUpdate({
        _id: o.callee,
        caller: o.caller
    }, {
        $set: {
            accepted: true,
            descriptionCallee: JSON.stringify(o.description),
            candidatesCallee: o.candidates.map(candidate => JSON.stringify(candidate))
        },
    }, {
        projection: {
            descriptionCaller: 1,
            candidatesCaller: 1
        }
    });

    if (updateRes == null) {
        return {
            type: 'notFound'
        }
    }

    return {
        type: 'success',
        description: JSON.parse(updateRes.descriptionCaller),
        candidates: updateRes.candidatesCaller.map(s => JSON.parse(s))
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