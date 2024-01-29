export interface SaveSubscriptionReq {
    stringifiedSubscription: string;
}

export type SaveSubscriptionResp = {
    type: 'success';
}

export interface SendTestMsgReq {
    text: string;
}

export type SendTestMsgResp = {
    type: 'success'
}
