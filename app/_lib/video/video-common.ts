
// TODO sth like this when caller checks if call was accepted and updates it to status "active"
// callers.updateOne({_id: "User 1", callees: {$elemMatch: {callee: "User 2", status: "accepted"}}}, { $set: { "callees.$.status": "active"}})
// Time pressing, so limitation that every user can only be involved in one call at most.
// So just a collection callees with caller and status.

export interface OfferCallReq {
    type: 'offerCall';
    caller: string;
    callee: string;
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
}

export type AcceptCallResp = {
    type: 'success';
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

export interface CheckAcceptReq {
    type: 'checkAccept';
    caller: string;
    callee: string;
}

export type CheckAcceptResp = {
    type: 'ringing';
} | {
    type: 'accepted';
} | {
    type: 'rejected';
}

export interface HangUpReq {
    type: 'hangUp';
    caller: string;
    callee: string;
}

export type HangUpResp = {
    type: 'success';
}

/**
 * direction of the msg will be derived with help of the validatedUser also given to webRTCMsg() in video-server.ts
 */
export interface WebRTCMsgReq {
    type: 'webRTCMsg';
    caller: string;
    callee: string;
    messages: string[];
}

export type WebRTCMsgResp = {
    type: 'success';
    messages: string[];
} | {
    type: 'closed';
}

export type AuthenticatedVideoReq<Req> = {
    type: 'authenticatedVideoReq';
    ownUser: string;
    sessionToken: string;
    req: Req;
}
