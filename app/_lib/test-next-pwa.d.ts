export interface SaveSubscriptionReq {
    type: 'saveSubscription';
    stringifiedSubscription: string;
}

export type SaveSubscriptionResp = {
    type: 'success';
}

export interface TriggerPushReq {
    type: 'triggerPush';
}

export type TriggerPushResp = {
    type: 'success';
}
