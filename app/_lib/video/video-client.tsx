import { ForwardedRef, PropsWithRef, Ref, forwardRef, useEffect, useRef, useState } from "react";

import styles from './video-client.module.css'
import { AccumulatedFetcher } from "../user-management-client/apiRoutesClient";
import { AuthenticatedVideoReq, CheckCallReq, CheckCallResp } from "./video-common";
import { ReceivedCall } from "./VideoManager";

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
}

export interface VideoToolbarProps {
    data: ToolbarData;
    onEvent: (e: VideoToolbarEvent) => void;
}


export function VideoToolbarComp({ data, onEvent }: VideoToolbarProps) {

    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (data.type === 'receivedCall' && data.ringOnCall) {
            audioRef.current?.play();
        }
    }, [data.type, data.ringOnCall])


    return (
        <div className={styles.toolbar}>
            {
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