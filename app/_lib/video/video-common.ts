
// TODO sth like this when caller checks if call was accepted and updates it to status "active"
// callers.updateOne({_id: "User 1", callees: {$elemMatch: {callee: "User 2", status: "accepted"}}}, { $set: { "callees.$.status": "active"}})
// Time pressing, so limitation that every user can only be involved in one call at most.
// So just a collection callees with caller and status.

export interface OfferCallReq {
    type: 'offerCall';
    caller: string;
    callee: string;
    description: any;
    candidates: any[];
}

export type OfferCallResp = {
    type: 'success';
} | {
    type: 'authFailed';
} | {
    type: 'busy';
};

export interface CheckCallReq {
    type: 'checkCall';
    callee: string;
}

export type CheckCallResp = {
    type: 'newOffer';
    caller: string;
} | {
    type: 'noNewOffer';
} | {
    type: 'authFailed';
}

export interface AcceptCallReq {
    type: 'acceptCall';
    caller: string;
    callee: string;
    description: any;
    candidates: any[];
}

export type AcceptCallResp = {
    type: 'success';
    description: any;
    candidates: any[];
} | {
    type: 'authFailed';
} | {
    type: 'notFound' // if call has meanwhile been removed after the caller had hang up
}

export interface RejectCallReq {
    type: 'rejectCall';
    caller: string;
    callee: string;
}

export type RejectCallResp = {
    type: 'success'; // also if not found
} | {
    type: 'authFailed';
}
