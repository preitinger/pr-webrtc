import * as rt from "runtypes"
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
function videoConfigOthersKey(user: string, name: string) {
    return `${user}.videoConfig.others.${name}`;
}
const videoConfigOthers = {
    get: (user: string, name: string, defaultChecked: boolean): boolean => {
        const s = localStorage.getItem(videoConfigOthersKey(user, name))
        if (s == null) return defaultChecked;
        try {
            return rt.Boolean.check(JSON.parse(s));
        } catch (reason) {
            console.error(`Error when parsing ${s} as JSON with a boolean`, reason, `Returning the default value ${defaultChecked}`)
            return defaultChecked;
        }
    },
    set: (user: string, name: string, checked: boolean): void => {
        localStorage.setItem(videoConfigOthersKey(user, name), JSON.stringify(checked));
    }
}
export const videoConfig = {
    send: videoConfigSetGet('send'),
    receive: videoConfigSetGet('receive'),
    others: videoConfigOthers
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

function fitToDisplayKey(user: string) {
    return `${user}.fitToDisplay`;
}

export const fitToDisplay = {
    set: (user: string, value: boolean) => {
        localStorage[fitToDisplayKey(user)] = JSON.stringify(value)
    },
    get: (user: string): boolean => localStorage[fitToDisplayKey(user)] ?? false
}