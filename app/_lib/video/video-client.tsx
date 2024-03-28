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
import { Boolean, Literal, Record, Static, String, Union } from "runtypes";
import { getEventBus, useEventBus } from "@/app/useEventBus";
import { ChatAddErrorLine } from "@/app/busEvents";


export interface VideoProps {
    mediaStream: MediaStream | null;
    showConnecting?: boolean
}

export const VideoComp = (props: VideoProps) => {

    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        console.log('effect in VideoComp');
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
    const mediaStreamRef = useRef<MediaStream | null>(null);
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

// export const LoggedOut = Record({
//     type: Literal('loggedOut')
// });
// export const SetupPushNotifications = Record({
//     type: Literal('setupPushNotifications')
// })
// export const OfferCall = Record({
//     type: Literal('offerCall'),
//     remoteUser: String
// })

// export const VideoInEvent = Union(LoggedOut, SetupPushNotifications, OfferCall)
// export type VideoInEvent = Static<typeof VideoInEvent>
// export const VideoOutEvent = Union(ChatAddErrorLine);
// export type VideoOutEvent = Static<typeof VideoOutEvent>;

export const DecideIfWithVideoEvent = Record({
    type: Literal('decideIfWithVideo'),
    withVideo: WithVideo
})
export type DecideIfWithVideoEvent = Static<typeof DecideIfWithVideoEvent>
export const AcceptOrDenyOfferEvent = Record({
    type: Literal('acceptOrDenyOffer'),
    accept: Boolean
})
export type AcceptOrDenyOfferEvent = Static<typeof AcceptOrDenyOfferEvent>



// type VideoEventTypes = VideoEvent['type'];

export interface UseVideoProps {
    eventBusKey: string
}
export type StartVideoCallsActivity = (
    quickCallee: string | null,
    accumulatedFetching: AccumulatedFetching,
    ownUser: string,
    sessionToken: string,
) => void;
export type DecideIfWithVideoState = {
    remoteUser: string;
    defaultSendVideo: boolean;
    defaultReceiveVideo: boolean;
} | null;
export type AcceptOrDenyOfferState = {
    remoteUser: string;
    remoteUserRejectingVideo: boolean;
} | null;
export interface VideoConnectionsProps {
    eventBusKey: string;
    decideIfWithVideo: DecideIfWithVideoState;
    acceptOrDenyOffer: AcceptOrDenyOfferState;
    localMediaStream: MediaStream | null;
    peerConnectionViewProps: { [remoteUser: string]: PeerConnectionViewProps };
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

export function useVideo(props: UseVideoProps): UseVideoResult {
    const [active, setActive] = useState<boolean>(false);
    const [defaultSendVideo, setDefaultSendVideo] = useState<boolean>(true);
    const [defaultReceiveVideo, setDefaultReceiveVideo] = useState<boolean>(true);
    const [remoteUser, setRemoteUser] = useState<string>('')
    const [decideIfWithVideoState, setDecideIfWithVideoState] = useState<DecideIfWithVideoState>(null);
    const [acceptOrDenyOfferState, setAcceptOrDenyOfferState] = useState<AcceptOrDenyOfferState>(null);
    const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(null);
    const [peerConnectionViewProps, setPeerConnectionViewProps] = useState<{[remoteUser: string]: PeerConnectionViewProps}>({});

    const startVideoCallsActivity = useCallback(async (quickCallee: string | null,
        accumulatedFetching: AccumulatedFetching,
        ownUser: string,
        sessionToken: string,
    ) => {
        nyi();
    }, [])

    return {
        videoConnectionsProps: {
            eventBusKey: props.eventBusKey,
            decideIfWithVideo: decideIfWithVideoState,
            acceptOrDenyOffer: acceptOrDenyOfferState,
            localMediaStream,
            peerConnectionViewProps,
        },
        active,
        startVideoCallsActivity

    }

}

// type SignalingMsg = {
//     type: 'offer';
//     sdp: RTCSessionDescription;
// } | {
//     type: 'answer';
//     sdp: RTCSessionDescription;
// }

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
    console.log('render VideoConnectionsComp: pcList.length', props.peerConnectionViewProps.length)
    const [sendVideo, setSendVideo] = useState<boolean>(props.decideIfWithVideo?.defaultSendVideo ?? false);
    const [receiveVideo, setReceiveVideo] = useState<boolean>(props.decideIfWithVideo?.defaultReceiveVideo ?? false);

    const acceptOrDenyOffer = (accept: boolean) => () => {
        const e: AcceptOrDenyOfferEvent = {
            type: 'acceptOrDenyOffer',
            accept: accept
        }
        getEventBus(props.eventBusKey).publish(e);
    }

    return (
        <div className={styles.videoConnectionsComp}>
            <div className='smallComment'>VideoConnectionsComp</div>
            {
                props.decideIfWithVideo != null &&
                <div className='dlg'>
                    <h3>Connection with {props.decideIfWithVideo.remoteUser}   </h3>
                    <label>
                        <input type='checkbox' checked={sendVideo} onClick={() => setSendVideo(!sendVideo)} /> Send video to {props.decideIfWithVideo.remoteUser}
                    </label>
                    <label>
                        <input type='checkbox' checked={receiveVideo} onClick={() => setReceiveVideo(!receiveVideo)} /> Receive video from {props.decideIfWithVideo.remoteUser}
                    </label>
                    <button onClick={() => {
                        const e: DecideIfWithVideoEvent = {
                            type: 'decideIfWithVideo',
                            withVideo: {
                                send: sendVideo,
                                receive: receiveVideo
                            }
                        }
                        getEventBus<unknown>(props.eventBusKey).publish(e)
                    }}>OK</button>
                </div>
            }
            {
                props.acceptOrDenyOffer != null &&
                <div className='dlg'>
                    Call from {props.acceptOrDenyOffer.remoteUser}
                    <button aria-roledescription="Accept call" title="Accept Call" className={styles.accept} onClick={acceptOrDenyOffer(true)}></button>
                    <button aria-roledescription="Reject call" title="Reject Call" className={styles.reject} onClick={acceptOrDenyOffer(false)}></button>
                </div>
            }
            <LocalVideoComp mediaStream={props.localMediaStream} />
            {
                Object.entries(props.peerConnectionViewProps).map(([remoteUser, peerConnectionViewProps]) => {
                    return <PeerConnectionView key={peerConnectionViewProps.remoteUser} {...peerConnectionViewProps} />
                })
            }
        </div>
    )
}