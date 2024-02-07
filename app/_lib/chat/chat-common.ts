
/**
 * request to optionally add a message and fetch all messages or the messages with an id greater than lastMsgId.
 */
export type ChatReq = {
    type: 'chat';
    chatId: string;
    user: string;
    token: string;
    msg: string | null;
    lastEventId: number;
}

export type ChatEvent = {
    type: 'ChatMsg';
    user: string;
    text: string;
} | {
    type: 'UserEntered';
    user: string;
} | {
    type: 'UserLeft';
    user: string;
}

export type ChatResp = {
    type: 'success';
    events: ChatEvent[];
    lastEventId: number;
} | {
    type: 'authenticationFailed';
}

