export type LogoutReq = {
    type: 'logout';
    user: string;
    token: string;
    chatId: string;
}

export type LogoutResp = {
    type: 'success';
}
