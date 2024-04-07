import * as rt  from "runtypes"


export interface PushSubscribeReq {
    type: 'pushSubscribe';
    subscription: string;
}

export type PushSubscribeResp = {
    type: 'success';
};

export interface PushNotifyReq {
    type: 'pushNotify';
    callee: string;
}

export type PushNotifyResp = {
    type: 'success';
};

export const PushData = rt.Record({
    caller: rt.String,
    callee: rt.String
})
export type PushData = rt.Static<typeof PushData>
