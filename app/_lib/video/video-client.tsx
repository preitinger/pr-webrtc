import { ForwardedRef, PropsWithRef, Ref, forwardRef, useEffect, useRef, useState } from "react";

import styles from './video-client.module.css'
import { AccumulatedFetcher } from "../user-management-client/apiRoutesClient";
import { AuthenticatedVideoReq, CheckCallReq, CheckCallResp } from "./video-common";
import { ReceivedCall } from "./VideoManager";

export interface VideoProps {
    mediaStream: MediaStream | null;
}

export const VideoComp = (props: VideoProps) => {

    const ref = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        console.log('stream effect');
        if (ref.current == null) return;
        console.log('updating srcObject to ', props.mediaStream);
        ref.current.srcObject = props.mediaStream;

    }, [props.mediaStream])

    return (
        <video className={styles.video} ref={ref} autoPlay={true} />
    )
}

export interface VideoToolbarProps {
    receivedCall: ReceivedCall | null;
    onAccept: (accept: boolean) => void;
}


export function VideoToolbarComp({ receivedCall, onAccept }: VideoToolbarProps) {


    return (
        <div>
            {
                receivedCall != null &&
                <>
                    <span>Call from {receivedCall.caller}</span>
                    <button onClick={() => onAccept(true)}>Accept</button>
                    <button onClick={() => onAccept(false)}>Reject</button>
                </>
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