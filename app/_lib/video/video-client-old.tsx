import { ForwardedRef, PropsWithRef, Ref, forwardRef, useCallback, useEffect, useRef, useState } from "react";

import styles from './video-client.module.css'
import { AccumulatedFetcher } from "../user-management-client/apiRoutesClient";
import { AuthenticatedVideoReq, CheckCallReq, CheckCallResp, StoreMsgReq, StoreMsgResp } from "./video-common";
import { ReceivedCall } from "./VideoManager";
import Image from "next/image";
import ModalDialog from "@/components/ModalDialog";
import EscapableFlexComp from "@/components/EscapableFlexComp";
import { AccumulatedFetching } from "../user-management-client/AccumulatedFetching";
import { UserListState } from "../chat/chat-client";
import { ApiResp } from "../user-management-client/user-management-common/apiRoutesCommon";
import { MsgClient } from "../pr-msg-client/pr-msg-client";
import { MsgReq, MsgResp } from "../pr-msg-common/pr-msg-common";
import DoWebRTCStuff, { Msg, WithVideo } from "./DoWebRTCStuff";
import FixedAbortController from "../pr-client-utils/FixedAbortController";
import { abort } from "process";
import EventBus from "../EventBus";
import { Literal, Record, Static, String, Union } from "runtypes";


export interface VideoProps {
    mediaStream: MediaStream | null;
    showConnecting?: boolean
}

export const VideoComp = (props: VideoProps) => {

    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (videoRef.current == null) return;
        videoRef.current.srcObject = props.mediaStream;
        if (props.mediaStream != null) {
            videoRef.current.scrollIntoView();
        }

    }, [props.mediaStream])

    return (
        props.mediaStream == null && props.showConnecting ?
            <p>Connecting ...</p> :
            <video className={styles.video} ref={videoRef} autoPlay={true} />

    )
}

export type ToolbarDataPart = {
    type: 'idle';
} | {
    type: 'receivedCall';
    receivedCall: ReceivedCall
} | {
    type: 'ringing';
    callee: string;
} | {
    type: 'videoCall'
    caller: string;
    connecting: boolean;
}

export type ToolbarData = {
    camera: boolean;
    ringOnCall: boolean;
} & ToolbarDataPart

export type VideoToolbarEvent = {
    type: 'accept';
    accept: boolean;
} | {
    type: 'hangUp';
} | {
    type: 'camera';
    checked: boolean;
} | {
    type: 'ringOnCall';
    checked: boolean
} | {
    type: 'pushOnCall';
}

export interface VideoToolbarProps {
    data: ToolbarData;
    onEvent: (e: VideoToolbarEvent) => void;
}


export function VideoToolbarComp({ data, onEvent }: VideoToolbarProps) {

    const [pushDlg, setPushDlg] = useState<boolean>(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (data.type === 'receivedCall' && data.ringOnCall) {
            audioRef.current?.play();
        }
    }, [data.type, data.ringOnCall])

    function onPushDlgCancel() {
        setPushDlg(false);
        // TODO ?
    }

    function onPushDlgOk() {
        setPushDlg(false);
        onEvent({
            type: 'pushOnCall'
        })
    }


    return (
        <div className={styles.toolbar}>
            {
                <>
                    <table>
                        <tbody>
                            <tr>
                                <td><label htmlFor='camera'>Use camera</label></td>
                                <td>
                                    <input id='camera' type='checkbox' checked={data.camera} onChange={(e) => onEvent({
                                        type: 'camera',
                                        checked: e.target.checked
                                    })} />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <label htmlFor='ringOnCall'>Ring on incoming call</label>
                                </td>
                                <td>
                                    <input id='ringOnCall' type='checkbox' checked={data.ringOnCall} onChange={(e) => onEvent({
                                        type: 'ringOnCall',
                                        checked: e.target.checked
                                    })} />
                                </td>

                            </tr>
                        </tbody>
                    </table>
                    {data.type === 'idle' && <button onClick={() => {
                        setPushDlg(true);
                    }}>Push me on call ...</button>}
                    {/* <button type="button" className={styles.ellipsis} onClick={() => {
                        alert('Later here more options ;-)')
                    }}><Image src={'/ellipsis-vertical.svg'} alt='More options ...' width={64} height={64} /></button> */}
                </>
            }
            {
                data.type === 'receivedCall' && data.receivedCall != null &&
                <>
                    <p className={styles.offer}>Offered video call from {data.receivedCall.caller}!</p>
                    <button aria-roledescription="Accept call" title="Accept Call" className={styles.accept} onClick={() => onEvent({
                        type: 'accept',
                        accept: true
                    })}></button>
                    <button aria-roledescription="Reject call" title="Reject Call" className={styles.reject} onClick={() => onEvent({
                        type: 'accept',
                        accept: false
                    })}></button>
                </>
            }
            {
                data.type === 'ringing' &&
                <>
                    <p>Calling {data.callee} ...</p>
                    <button aria-roledescription="Hang up" className={styles.reject} title="Hang up" onClick={() => onEvent({
                        type: 'hangUp'
                    })}></button>
                </>
            }
            {
                data.type === 'videoCall' &&
                <>
                    {data.connecting &&
                        <p className={styles.connecting}>Connecting ...</p>}
                    <button aria-roledescription="Hang up" className={styles.reject} title="Hang up" onClick={() => onEvent({
                        type: 'hangUp'
                    })}></button>
                </>
            }
            <audio ref={audioRef} preload="auto" controls={false} src="/ring.mp3" typeof="audio/mpeg" onEnded={() => {
                if (data.type === 'receivedCall' && data.ringOnCall) {
                    audioRef.current?.play();
                }
            }} />

            {pushDlg &&
                <ModalDialog>
                    <EscapableFlexComp onCancel={onPushDlgCancel}>
                        <p>
                            Shall this site pause and send you a push notification on an incoming call?
                        </p>
                        <button onClick={onPushDlgOk}>OK</button>
                        <button onClick={onPushDlgCancel}>Cancel</button>
                    </EscapableFlexComp>
                </ModalDialog>
            }
        </div>
    )
}



// export interface VideoSelfProps {
//     ownUser: string;
//     sessionToken: string;
//     caller: string;
//     callee: string;
// }

// export function VideoSelfComp(props: VideoSelfProps) {
//     const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

//     return (
//         <VideoComp mediaStream={mediaStream} />
//     )
// }

// export function VideoRemoteComp(props: VideoRemoteProps) {
//     c
// }

// old:

// export interface UseVideoProps {
//     eventBusKey: string;
//     userList: UserListState;
// }

// export type UseVideoState = {
//     callButtonDisabled: boolean;
// }

// export type UseVideoResult = [
//     state: UseVideoState,
//     start: (accumulatedFetching: AccumulatedFetching, usersFromLogin: string[]) => void,
//     toolbarProps: VideoToolbarProps,
// ]

// export function useVideo(props: UseVideoProps): UseVideoResult {
//     const [toolbarData, setToolbarData] = useState<ToolbarData>({ type: 'idle', ringOnCall: false, camera: true });
//     const accumulatedFetchingRef = useRef<AccumulatedFetching | null>(null);
//     const state = {}
//     const userList = props.userList;
//     const start = useCallback(async (accumulatedFetching: AccumulatedFetching): Promise<void> => {
//         async function mergeCheckForCall() {

//         }

//         accumulatedFetchingRef.current = accumulatedFetching;
//         const callee = sessionStorage.getItem('callee');

//         if (callee == null) {
//             await mergeCheckForCall();
//         } else {
//             const calleeIdx = userList.users.findIndex(u => u.name === callee);
//             if (calleeIdx === -1) {
//                 // callee not found in user list
//                 await mergeCheckForCall();
//             } else {
//                 setUserSelected(calleeIdx);
//             }
//         }
//     }, [userList, setUserSelected])

//     const onEvent = useCallback((e: VideoToolbarEvent) => {

//     }, [])



//     return [
//         state,
//         start,
//         {
//             data: toolbarData,
//             onEvent
//         }
//     ]
// }

// new:


type LocalMediaStreamResult = [MediaStream | null, () => void, () => void];

function useLocalMediaStream(): LocalMediaStreamResult {
    const [localVideoOnly, setLocalVideoOnly] = useState<MediaStream | null>(null);
    const videoSenders = useRef<number>(0);
    const mediaStreamRef = useRef<MediaStream|null>(null);
    /**
     * At beginning, contains null. When a non-video call is started, a stream without video is created as fullStream.
     * When a video call is started, the stream is replaced by a new one with video. And videoSenders is set to 1.
     * When new video streams are required videoSenders is incremented.
     * When video is muted temporarily in a connection, videoSenders is decremented.
     * When videoSenders becomes 0, the video track in the fullStream is removed to make the camera switch off (if not needed by other apps).
     */
    const fullStream = useRef<MediaStream | null>(null);

    const incVideoSenders = useCallback(async () => {
        if (videoSenders.current++ === 0) {
            // the first video sender
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: true
            })
            mediaStreamRef.current = stream;
            setLocalVideoOnly(stream);
        }
    }, [])

    const decVideoSenders = useCallback(() => {
        if (--videoSenders.current === 0) {
            // the last video sender
            mediaStreamRef.current?.getVideoTracks().forEach(track => {
                track.stop();
            })
            setLocalVideoOnly(null);
        }
    }, [])

    return [
        localVideoOnly,
        incVideoSenders,
        decVideoSenders
    ]
    return [localVideoOnly, incVideoSenders, decVideoSenders];
}

export const LoggedOut = Record({
    type: Literal('loggedOut')
});
export const SetupPushNotifications = Record({
    type: Literal('setupPushNotifications')
})
export const OfferCall = Record({
    type: Literal('offerCall'),
    remoteUser: String
})
export const AddErrorLine = Record({
    type: Literal('addErrorLine'),
    error: String
})
export type AddErrorLine = Static<typeof AddErrorLine>

export const VideoInEvent = Union(LoggedOut, SetupPushNotifications, OfferCall)
export type VideoInEvent = Static<typeof VideoInEvent>
export const VideoOutEvent = Union(AddErrorLine);
export type VideoOutEvent = Static<typeof VideoOutEvent>;



// type VideoEventTypes = VideoEvent['type'];

export interface UseVideoProps {
}
export type StartVideoCallsActivity = (
    quickCallee: string | null,
    accumulatedFetching: AccumulatedFetching,
    eventBus: EventBus<any>,
    ownUser: string,
    sessionToken: string,
) => void;
export interface VideoConnectionsProps {
    decideIfWithVideo: {
        visible: boolean;
        remoteUser: string;
        sendVideo: boolean;
        receiveVideo: boolean;
        onSendVideoChange: (sendVideo: boolean) => void;
        onReceiveVideoChange: (sendVideo: boolean) => void;
        resolve: () => void;
    }
    localMediaStream: MediaStream | null;
    peerConnectionViewPropsList: PeerConnectionViewProps[];
    acceptOrDenyOffer: {
        visible: boolean;
        remoteUser: string;
        remoteUserRejectingVideo: boolean;
        onAccept: () => void;
        onDeny: () => void;
    }
}

export interface PeerConnectionViewProps {
    remoteUser: string;
    withVideo: WithVideo;
    remoteMediaStream: MediaStream | null;
    debug: {
        signalingState: string;
    }
}

export type UseVideoResult = {
    videoConnectionsProps: VideoConnectionsProps;
    active: boolean;
    startVideoCallsActivity: StartVideoCallsActivity;
}
/**
 * @deprecated
 */
function nyi() {
    alert('nyi');
    console.warn('nyi');
}

type ResolveDecideIfWithVideo = (result: WithVideo) => void;

interface PeerConnectionDebugData {
    signalingState: string;
}

interface PeerConnectionState {
    remoteUser: string;
    withVideo: WithVideo;
    remoteStream: MediaStream | null;
    debug: PeerConnectionDebugData;
}

// type SignalingMsg = {
//     type: 'offer';
//     sdp: RTCSessionDescription;
// } | {
//     type: 'answer';
//     sdp: RTCSessionDescription;
// }

export function useVideo(/* props: UseVideoProps */): UseVideoResult {
    const [decideIfWithVideoVisible, setDecideIfWithVideoVisible] = useState<boolean>(false);
    const [sendVideo, setSendVideo] = useState<boolean>(false);
    const [receiveVideo, setReceiveVideo] = useState<boolean>(false);
    const resolveDecideIfWithVideo = useRef<ResolveDecideIfWithVideo | null>(null);
    const resolveAcceptOrDenyOffer = useRef<((accept: boolean) => void) | null>(null);
    const [remoteUser, setRemoteUser] = useState<string>('');
    const [peerConnectionStates, setPeerConnectionStates] = useState<{ [remoteUser: string]: PeerConnectionState }>({});
    const [localMediaStream, incVideoSenders, decVideoSenders] = useLocalMediaStream();
    const doWebRTCStuff = useRef<{ [remoteUser: string]: DoWebRTCStuff }>({});
    // const peerConnections = useRef<{ [remoteUser: string]: RTCPeerConnection }>({});
    const accumulatedFetching = useRef<AccumulatedFetching | null>(null);
    const eventBus = useRef<EventBus<any> | null>(null);
    const ownUser = useRef<string>('');
    const sessionToken = useRef<string>('');
    const msgClient = useRef<MsgClient | null>(null);
    const [acceptOrDenyOfferVisible, setAcceptOrDenyOfferVisible] = useState<boolean>(false);
    const [remoteUserRejectingVideo, setRemoteUserRejectingVideo] = useState<boolean>(false);
    const abortController = useRef<AbortController | null>(null);
    const [active, setActive] = useState<boolean>(false);
    const activeCount = useRef<number>(0);

    function getMsgClient(): MsgClient {
        const c = msgClient.current;
        if (c == null) throw new Error('msgClient not yet set');
        return c;
    }

    console.log('useVideo function');

    function getAccumulatedFetching(): AccumulatedFetching {
        const a = accumulatedFetching.current;
        if (a == null) throw new Error('accumulatedFetching not yet set');
        return a;
    }

    function getEventBus(): EventBus<any> {
        const b = eventBus.current;
        if (b == null) throw new Error('eventBus not yet set');
        return b;
    }

    const incActive = useCallback(() => {
        if (activeCount.current++ === 0) {
            setActive(true);
        }
    }, [])

    const decActive = useCallback(() => {
        if (--activeCount.current === 0) {
            setActive(false);
        }
    }, [])

    const decideIfWithVideo = useCallback(async (remoteUser: string): Promise<WithVideo> => {
        incActive();
        try {
            setDecideIfWithVideoVisible(true);
            try {

                setRemoteUser(remoteUser);
                return await new Promise<WithVideo>((res, rej) => {
                    function onAbort() {
                        abortController.current?.signal.removeEventListener('abort', onAbort);
                        rej(new DOMException("AbortError"));
                    }
                    resolveDecideIfWithVideo.current = res;
                    abortController.current?.signal.addEventListener('abort', onAbort);
                })
            } finally {
                setDecideIfWithVideoVisible(false);
            }

        } finally {
            decActive();
        }
    }, [incActive, decActive])

    const sendMsg = useCallback((remoteUser: string, msg: Msg): void => {
        abortController.current?.signal.throwIfAborted();
        getMsgClient().addToSend(remoteUser, [JSON.stringify(msg)]);
    }, [])

    // const sendSdp = useCallback((remoteUser: string, sdp: RTCSessionDescription): void => {
    //     console.log('sendSdp', remoteUser, sdp);
    //     const msg: Msg = {
    //         type: 'sdp',
    //         sdp: sdp
    //     }
    //     sendMsg(remoteUser, msg);
    // }, [sendMsg])

    const sendCandidate = useCallback((remoteUser: string, candidate: RTCIceCandidate) => {
        const msg: Msg = {
            type: 'candidate',
            candidate: candidate
        }
        sendMsg(remoteUser, msg);
    }, [sendMsg])

    const addPeer = useCallback(async (remoteUser: string, remoteOffer: RTCSessionDescription | null, remoteAcceptingVideo: boolean) => {
        console.log('addPeer');
        const withVideo = await decideIfWithVideo(remoteUser);
        console.log('withVideo', withVideo);
        if (abortController.current == null) throw new Error("abortController.current null");
        incActive();
        doWebRTCStuff.current[remoteUser] = new DoWebRTCStuff(remoteUser,
            remoteOffer,
            remoteAcceptingVideo,
            withVideo,
            (msg: Msg) => sendMsg(remoteUser, msg),
             () => {
                // onClose
                decActive();
                delete doWebRTCStuff.current[remoteUser];
                console.warn('nyi: removing connection from state')
            },
            abortController.current.signal,
            incVideoSenders,
            decVideoSenders,
            (mediaStream: MediaStream) => {
                setPeerConnectionStates(d => ({
                    ...d,
                    [remoteUser]: {
                        ...d[remoteUser],
                        remoteStream: mediaStream
                    }
                }))
            }
        );
        setPeerConnectionStates(d => {
            const newVal: { [remoteUser: string]: PeerConnectionState } = {
                ...d,
                [remoteUser]: {
                    remoteUser: remoteUser,
                    withVideo: withVideo,
                    remoteStream: null,
                    debug: {
                        signalingState: ''
                    }
                }
            }
            console.log('new peerConnectionStates', newVal)
            return newVal;
        });
        // move the following to constructor of DoWebRTCStuff:
        // TODO if remoteOffer != null, decide if call shall be accepted at all
        // if (withVideo.send) {
        //     incVideoSenders();
        // }

        // const pc = new RTCPeerConnection();
        // setPeerConnectionStates(d => {
        //     const newVal: { [remoteUser: string]: PeerConnectionState } = {
        //         ...d,
        //         [remoteUser]: {
        //             remoteUser: remoteUser,
        //             withVideo: withVideo,
        //             remoteStream: null,
        //             debug: {
        //                 signalingState: pc.signalingState
        //             }
        //         }
        //     }
        //     console.log('new peerConnectionStates', newVal)
        //     return newVal;
        // });

        // pc.onnegotiationneeded = async (e) => {
        //     console.log('onnegotiationneeded');
        //     await pc.setLocalDescription();
        //     const localDescription = pc.localDescription;
        //     if (localDescription == null) throw new Error('localDescription null after setLocalDescription()');
        //     if ((remoteOffer == null && localDescription.type === 'offer') || (remoteOffer != null && (localDescription.type === 'pranswer' || localDescription.type === 'answer'))) {
        //         // ok
        //     } else {
        //         console.error('Unexpected localDescription', localDescription);
        //     }
        //     sendSdp(remoteUser, localDescription);
        // }
        // pc.onicecandidate = (e) => {
        //     console.log('onicecandidate');
        //     const candidate = e.candidate;
        //     if (candidate != null) {
        //         sendCandidate(remoteUser, candidate);
        //     }
        // }
        // pc.ontrack = (e) => {
        //     console.log('ontrack: e.streams', e.streams);
        //     setPeerConnectionStates(d => {
        //         console.log('old d[remoteUser]', d[remoteUser]);
        //         return ({
        //         ...d,
        //         [remoteUser]: {
        //             ...d[remoteUser],
        //             remoteStream: e.streams[0]
        //         }
        //     })})
        // }
        // pc.onsignalingstatechange = () => {
        //     console.log('onsignalingstatechange: new state: ', pc.signalingState);
        //     // console.log('onsignalingstate')
        //     // const i = peerConnections.current.findIndex((pc1) => pc === pc1)
        //     // console.log('onsignalingstate: i', i, pc.signalingState);
        //     // if (i === -1) {
        //     //     console.warn('pc not found');
        //     // } else {
        //     //     setPeerConnectionStates(d => ({
        //     //         ...d,
        //     //         remoteUser: {
        //     //             ...d[remoteUser],
        //     //             debug: {
        //     //                 ...d[remoteUser].debug,
        //     //                 signalingState: pc.signalingState
        //     //             }
        //     //         }
        //     //     }))
        //     // }
        // }
        // if (remoteOffer != null) {
        //     console.log('before setRemoteDescription')
        //     await pc.setRemoteDescription(remoteOffer);
        //     console.log('after setRemoteDescription')

        // }
        // // TODO better activity for managing the local stream
        // // kind of a promise that is awaited here
        // // If no video track is available up to now, a new media stream must be requested via
        // // navigator.mediaDevices.getUserMedia()
        // // localMediaStream?.getTracks().forEach(track => {
        // //     pc.addTrack(track, localMediaStream)
        // // })
        // // TODO begin test - just create a new local stream and add its tracks to pc to have some action for testing
        // {
        //     const m = await navigator.mediaDevices.getUserMedia({
        //         audio: true,
        //         video: true
        //     })
        //     m.getTracks().forEach(t => {
        //         console.log('before pc.addTrack');
        //         pc.addTrack(t, m);
        //         console.log('after pc.addTrack');
        //     })
        // }

        // if (remoteOffer != null) {
        //     await pc.setLocalDescription();
        //     const localDescription = pc.localDescription;
        //     if (localDescription != null) {
        //         sendSdp(remoteUser, localDescription);
        //     } else {
        //         console.error('localDescription null')
        //     }
        // }
        // TODO end test - just create a new local stream and add its tracks to pc to have some action for testing
    }, [decideIfWithVideo, sendMsg, incActive, decActive, incVideoSenders, decVideoSenders]);

    const acceptOrDenyOffer = useCallback(async (videoAccepted: boolean): Promise<boolean> => {
        incActive();
        try {
            setAcceptOrDenyOfferVisible(true);
            setRemoteUserRejectingVideo(!videoAccepted);
            return await new Promise<boolean>((res, rej) => {
                function onAbort() {
                    abortController.current?.signal.removeEventListener('abort', onAbort);
                    rej(new DOMException("AbortError"));
                }
                resolveAcceptOrDenyOffer.current = res;
                abortController.current?.signal.addEventListener('abort', onAbort);
            })
        } finally {
            resolveAcceptOrDenyOffer.current = null;
            decActive();
            setAcceptOrDenyOfferVisible(false);
        }
    }, [incActive, decActive]);

    const onAcceptOffer = useCallback(() => {
        if (resolveAcceptOrDenyOffer.current != null) {
            resolveAcceptOrDenyOffer.current(true)
        }
    }, [])

    const onDenyOffer = useCallback(() => {
        if (resolveAcceptOrDenyOffer.current != null) {
            resolveAcceptOrDenyOffer.current(false);
        }
    }, []);

    const handleMsg = useCallback(async (sender: string, stringifiedMsg: string) => {
        console.log('handleMsg', sender, stringifiedMsg);
        const msg = JSON.parse(stringifiedMsg) as Msg;
        switch (msg.type) {
            case 'sdp': {
                if (msg.sdp.type === 'offer') {
                    let accept = false;
                    if (sender in doWebRTCStuff.current) {
                        if (sender < ownUser.current) {
                            // we are polite and drop our own offer, and then receive the sender's offer
                            await doWebRTCStuff.current[sender].close();
                            accept = true;
                        } else {
                            // we are impolite and keep our connection
                            // and ignore this offer
                            return;
                        }
                    } // else no conflict, just continue
                    // let user decide if the offer shall be accepted
                    if (!accept) {
                        setRemoteUser(sender);

                        accept = await acceptOrDenyOffer(msg.videoAccepted);
                    }
                    if (accept) {
                        await addPeer(sender, msg.sdp, msg.videoAccepted);
                    }
                    return;
                } else {
                    console.log('nyi: forward sdp to doWebRTCStuff');
                    // const pc = peerConnections.current[sender];
                    // await pc.setRemoteDescription(msg.sdp);

                }
                break;
            }
            case 'candidate': {
                console.log('nyi: forward candidate to doWebRTCStuff');
                // const pc = peerConnections.current[sender];
                // if (pc != null) {
                //     await pc.addIceCandidate(msg.candidate);
                // } else {
                //     console.error('pc not found for ', sender);
                // }
                break;
            }
        }
        await doWebRTCStuff.current[sender].signalingMsgReceived(msg);
    }, [addPeer, acceptOrDenyOffer])

    const startVideoCallsActivity = useCallback(async (
        quickCallee: string | null,
        accumulatedFetching1: AccumulatedFetching,
        eventBus1: EventBus<any>,
        ownUser1: string,
        sessionToken1: string
    ): Promise<void> => {
        // TODO check if not yet started or the like
        accumulatedFetching.current = accumulatedFetching1;
        eventBus.current = eventBus1;
        ownUser.current = ownUser1;
        sessionToken.current = sessionToken1;
        abortController.current = new FixedAbortController();
        msgClient.current = new MsgClient(ownUser1, 2000, async req => {
            const authReq: AuthenticatedVideoReq<MsgReq> = {
                type: 'authenticatedVideoReq',
                ownUser: ownUser1,
                req: req,
                sessionToken: sessionToken1
            }
            const resp = await getAccumulatedFetching().pushRaw<AuthenticatedVideoReq<MsgReq>, MsgResp>(authReq);
            console.log('resp', resp);
            if (resp.type === 'error') {
                console.error(resp);
            } else {
                getMsgClient().handleSerially(resp, handleMsg);
            }
        }, 100, abortController.current.signal);
        if (quickCallee != null) {
            await addPeer(quickCallee, null, true);
        }

        const subscription = getEventBus().subscribe();
        try {
            while (true) {
                abortController.current.signal.throwIfAborted();
                const e = await subscription.nextEvent();
                if (OfferCall.guard(e)) {
                    if (e.remoteUser === ownUser.current) {
                        const e: AddErrorLine = {
                            type: 'addErrorLine',
                            error: "You can't call yourself!"
                        }
                        getEventBus().publish(e)
                        return;
                    }
                    try {
                        await addPeer(e.remoteUser, null, true)
                    } catch (reason: any) {
                        if (abortController.current?.signal.aborted) return;
                        console.error('addPeer threw', reason);
                    }
                }
                if (LoggedOut.guard(e)) {
                    abortController.current?.abort();
                }
            }
    
        } finally {
            subscription.unsubscribe();
        }

    }, [addPeer, handleMsg])

    const onSendVideoChange = useCallback((checked: boolean) => {
        setSendVideo(checked);
    }, [])

    const onReceiveVideoChange = useCallback((checked: boolean) => {
        setReceiveVideo(checked);
    }, [])

    const videoConnectionsProps: VideoConnectionsProps = {
        decideIfWithVideo: {
            visible: decideIfWithVideoVisible,
            remoteUser: remoteUser,
            sendVideo: sendVideo,
            receiveVideo: receiveVideo,
            onSendVideoChange: onSendVideoChange,
            onReceiveVideoChange: onReceiveVideoChange,
            resolve() {
                if (resolveDecideIfWithVideo.current != null) {
                    resolveDecideIfWithVideo.current({
                        send: sendVideo,
                        receive: receiveVideo
                    })
                }
            }
        },
        localMediaStream: localMediaStream,
        peerConnectionViewPropsList: Object.keys(peerConnectionStates).map(user => {
            console.log('in map: peerConnectionStates[user]', peerConnectionStates[user]);
            return ({
                remoteUser: peerConnectionStates[user].remoteUser,
                withVideo: peerConnectionStates[user].withVideo,
                remoteMediaStream: peerConnectionStates[user].remoteStream,
                debug: {
                    signalingState: peerConnectionStates[user].debug.signalingState
                }
            })
        })
        // peerConnectionViewPropsList: peerConnectionStates.map(s => ({
        //     remoteUser: s.remoteUser,
        //     withVideo: s.withVideo,
        //     incVideoSenders: incVideoSenders,
        //     decVideoSenders: decVideoSenders,
        //     debug: {
        //         signalingState: s.debug.signalingState
        //     }
        // }))
        , acceptOrDenyOffer: {
            visible: acceptOrDenyOfferVisible,
            remoteUser: remoteUser,
            remoteUserRejectingVideo: remoteUserRejectingVideo,
            onAccept: onAcceptOffer,
            onDeny: onDenyOffer,
        }
    }

    const onLogout = useCallback(() => {
        console.log('useVideo.onLogout');
        abortController.current?.abort();
    }, [])

    return {
        videoConnectionsProps,
        active,
        startVideoCallsActivity,
    }
}

function PeerConnectionView(props: PeerConnectionViewProps) {
    console.log('render PeerConnectionView for props', props);

    return (
        <div>
            <h3>PeerConnectionView for {props.remoteUser}</h3>
            <p>signalingState: {props.debug.signalingState}</p>
            {
                props.remoteMediaStream != null &&
                <VideoComp mediaStream={props.remoteMediaStream} showConnecting={false} />
            }
            <p>
                nyi
            </p>
        </div>
    )
}

interface LocalVideoProps {
    mediaStream: MediaStream | null
}

const LocalVideoComp = forwardRef<HTMLVideoElement, LocalVideoProps>(function LocalVideoComp(props, ref) {
    return (
        <div>
            <div className='smallComment'>nyi LocalVideoComp</div>
            <VideoComp mediaStream={props.mediaStream} showConnecting={false} />
        </div>
    )
});

// TODO evtl. aufteilen in linke und rechte Haelfte. Ggf. links nur die kleinen Entscheidungen und rechts die großen LocalVideoComp und PeerConnectionViews und 
export function VideoConnectionsComp(props: VideoConnectionsProps) {
    console.log('render VideoConnectionsComp: pcList.length', props.peerConnectionViewPropsList.length)
    return (
        <div className={styles.videoConnectionsComp}>
            <div className='smallComment'>VideoConnectionsComp</div>
            {
                props.decideIfWithVideo.visible &&
                <div className='dlg'>
                    <h3>Connection with {props.decideIfWithVideo.remoteUser}   </h3>
                    <label>
                        <input type='checkbox' checked={props.decideIfWithVideo.sendVideo} onChange={(e) => {
                            props.decideIfWithVideo.onSendVideoChange(!props.decideIfWithVideo.sendVideo);
                        }} /> Send video to {props.decideIfWithVideo.remoteUser}
                    </label>
                    <label>
                        <input type='checkbox' checked={props.decideIfWithVideo.receiveVideo} onChange={(e) => {
                            props.decideIfWithVideo.onReceiveVideoChange(!props.decideIfWithVideo.receiveVideo);
                        }} /> Receive video from {props.decideIfWithVideo.remoteUser}
                    </label>
                    <button onClick={props.decideIfWithVideo.resolve}>OK</button>
                </div>
            }
            {
                props.acceptOrDenyOffer.visible &&
                <div className='dlg'>
                    Call from {props.acceptOrDenyOffer.remoteUser}
                    <button aria-roledescription="Accept call" title="Accept Call" className={styles.accept} onClick={props.acceptOrDenyOffer.onAccept}></button>
                    <button aria-roledescription="Reject call" title="Reject Call" className={styles.reject} onClick={props.acceptOrDenyOffer.onDeny}></button>
                </div>
            }
            <LocalVideoComp mediaStream={props.localMediaStream} />
            {
                props.peerConnectionViewPropsList.map((peerConnectionViewProps, i) => (
                    <PeerConnectionView key={peerConnectionViewProps.remoteUser} {...peerConnectionViewProps} />
                ))
            }
        </div>
    )
}