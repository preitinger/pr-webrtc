import { ForwardedRef, PropsWithRef, Ref, forwardRef, useEffect, useRef } from "react";

import styles from './video-client.module.css'

export interface VideoProps {
    mediaStream: MediaStream | null;
}

// export const VideoComp = forwardRef(function VideoComp1(props: PropsWithRef<VideoProps>, ref: ForwardedRef<HTMLVideoElement>) {
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
// )