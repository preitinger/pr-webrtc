'use client';
import { useRef, useState } from "react";

export default function Page() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const video2Ref = useRef<HTMLVideoElement | null>(null);
    const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
    const streamRef = useRef<MediaStream|null>(null);

    function dumpStream(name: string, s: MediaStream) {
        console.log(name, 'stream id', s.id);
        console.log('tracks:');
        s.getTracks().forEach(t => {
            console.log('id', t.id, 'kind', t.kind, 'label', t.label, 'contentHint', t.contentHint)
        })
    }


    async function getMedia() {
        setPermissionDenied(false);
        if (videoRef.current == null) return;
        if (video2Ref.current == null) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            })
            videoRef.current.srcObject = stream;
            streamRef.current = stream;

            dumpStream('stream', stream);

            const stream2 = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });
            video2Ref.current.srcObject = stream2;
            dumpStream('stream2', stream2);
            const streamAudioOnly = await navigator.mediaDevices.getUserMedia({
                audio: true,
            })
            dumpStream('audioOnly', streamAudioOnly);
        } catch (reason) {
            console.error('caught', reason);
            setPermissionDenied(true);
        }
    }

    function stopMedia() {
        if (streamRef.current != null) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
            })
        }
    }

    return (
        <div>
            stream
            <video autoPlay={true} width={300} height={300} ref={videoRef} /><br/>
            stream2
            <video autoPlay={true} width={300} height={300} ref={video2Ref} /><br/>
            <button onClick={getMedia}>Get media</button>
            <button onClick={stopMedia}>Stop media</button>
            {
                permissionDenied &&
                <div>
                    Permission for media has been denied. Please re-activate it at least for this site in the browser settings.
                </div>
            }
        </div>
    )
}