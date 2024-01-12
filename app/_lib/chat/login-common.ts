export type LoginReq = {
    user: string;
    passwd: string;
    chatId: string;
}

export type LoginResp =  {
    type: 'success';
    token: string;
    users: string[];
    eventIdForUsers: number;
} | {
    type: 'authenticationFailed'
}
