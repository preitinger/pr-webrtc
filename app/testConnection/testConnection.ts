import { Connection } from "../Connection";
import FixedAbortController from "../_lib/pr-client-utils/FixedAbortController";
import { WithVideo } from "../_lib/video/DoWebRTCStuff";
import { getEventBus } from "../useEventBus";

function sleep(ms: number) {
    return new Promise<void>(res => {
        setTimeout(() => {
            res();
        }, ms)
    })
}

export async function testInstantiate() {
    const sentVideoUpdated = (stream: MediaStream | null) => {

    }

    const closed = () => {
        console.log('closed');
    }
    const send = (msg: string) => {
        console.log('send', msg);
    }
    const user = 'a';
    const remoteUser = 'b';
    const withVideo: WithVideo = {
        receive: true,
        send: true
    }
    const abortController = new FixedAbortController();
    const signal = abortController.signal;
    const eventBus = getEventBus('testConnection');
    const con = new Connection(sentVideoUpdated, closed, send, eventBus, user, remoteUser, 'callee', signal, withVideo);
    sleep(10);
    con.shutdownAndJoin();
}