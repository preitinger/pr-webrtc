//                         localStorage.setItem(`${user}.videoConfigSend`, e.sendVideo);

import { VideoConfigValue } from "./busEvents";

function videoConfigKey(user: string, sendOrReceive: 'send' | 'receive') {
    return `${user}.videoConfig.${sendOrReceive}`
}
function videoConfigSetGet(sendOrReceive: 'send' | 'receive') {
    return {
        set: (user: string, value: VideoConfigValue) => {
            localStorage.setItem(videoConfigKey(user, sendOrReceive), value)
        },
        get: (user: string): VideoConfigValue => {
            const v = localStorage.getItem(videoConfigKey(user, sendOrReceive))
            const isVideoConfigValue = VideoConfigValue.guard(v);
            return isVideoConfigValue ? v : 'individually';
        }
    }
}
export const videoConfig = {
    send: videoConfigSetGet('send'),
    receive: videoConfigSetGet('receive')
}

function lastVideoSettingsKey(user: string, remoteUser: string, sendOrReceive: 'send' | 'receive') {
    return `${user}.${remoteUser}.${sendOrReceive}`;
}

function lastVideoSettingsSetGet(sendOrReceive: 'send' | 'receive') {
    return {
        set: (user: string, remoteUser: string, value: boolean) => {
            localStorage[lastVideoSettingsKey(user, remoteUser, sendOrReceive)] = value ? '1' : '0'
        },
        get: (user: string, remoteUser: string): boolean => {
            return localStorage[lastVideoSettingsKey(user, remoteUser, sendOrReceive)] === '0' ? false : true // because true is the default value
        }
    }
}

export const lastVideoSettings = {
    send: lastVideoSettingsSetGet('send'),
    receive: lastVideoSettingsSetGet('receive')
}