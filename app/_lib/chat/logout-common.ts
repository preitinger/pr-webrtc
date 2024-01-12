export type LogoutReq = {
    user: string;
    token: string;
    chatId: string;
}

export type LogoutResp = {
    type: 'success';
}
