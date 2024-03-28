'use client';

import { useRef, useState } from "react"
import styles from './page.module.css'

export default function Page() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaStream = useRef<MediaStream | null>(null);
    const videoTrack = useRef<MediaStreamTrack | null>(null);
    const [mirrored, setMirrored] = useState<boolean>(false);

    function startLocalVideo() {
        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        }).then(mediaStream1 => {
            if (!(mediaStream1.getVideoTracks().length === 1 && mediaStream1.getAudioTracks().length === 0)) throw new Error('unexpected mediaStream');
            if (videoRef.current == null) return;
            mediaStream.current = videoRef.current.srcObject = mediaStream1;
            videoTrack.current = mediaStream1.getVideoTracks()[0];
        })
    }
    const enableVideoTrack = (enabled: boolean) => () => {
        if (videoTrack.current == null) return;
        videoTrack.current.enabled = enabled;
    }
    function stopVideoTrack() {
        if (videoTrack.current == null) return;
        videoTrack.current.stop();
    }
    function resetVideoSrcObject() {
        if (videoRef.current == null) return;
        videoRef.current.srcObject = null;
    }
    function removeVideoTrackFromStream() {
        if (mediaStream.current == null) return;
        const vs = mediaStream.current.getVideoTracks();
        if (vs.length === 0) return;
        mediaStream.current.removeTrack(vs[0]);
    }
    function addVideoTrackToStream() {
        if (mediaStream.current == null) return;
        if (videoTrack.current == null) return;
        mediaStream.current.addTrack(videoTrack.current);
    }
    return (
        <div>
            <button onClick={startLocalVideo}>Start local video</button>
            <button onClick={enableVideoTrack(false)}>Disable video track</button>
            <button onClick={enableVideoTrack(true)}>Enable video track</button>
            <button onClick={stopVideoTrack}>Stop video track</button>
            <button onClick={resetVideoSrcObject}>Reset video srcObject</button>
            <button onClick={removeVideoTrackFromStream}>Remove video track from stream</button>
            <button onClick={addVideoTrackToStream}>Add video track to stream</button>
            <video className={mirrored ? styles.mirrored : ''} ref={videoRef} autoPlay={true} />
            <input type='checkbox' checked={mirrored} onChange={e => {setMirrored(!mirrored)}}/> mirrored
            <p>mirrored: {mirrored ? '1' : '0'}</p>
        </div>
    )

}