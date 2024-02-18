'use client';

import { MutableRefObject, useRef } from "react"

export type VideoResult = {
    localHtmlVideoElement: MutableRefObject<HTMLVideoElement | null>;
    remoteHtmlVideoElement: MutableRefObject<HTMLVideoElement | null>;
    onCameraTest: () => void;
    onCall: (user: string) => void;
}

export default function useVideo(): VideoResult {
    const localHtmlVideoElement = useRef<HTMLVideoElement | null>(null);
    const remoteHtmlVideoElement = useRef<HTMLVideoElement | null>(null);

    function onCameraTest() {
        async function startLocalCamera() {
            const localStream = await navigator.mediaDevices.getUserMedia({
                audio: true, video: true
            });

            const videoEl = localHtmlVideoElement.current;
            if (videoEl != null) {
                videoEl.srcObject = localStream;
            }
        }

        startLocalCamera();
    }

    function onCall(user: string) {
        
    }

    return {
        localHtmlVideoElement: localHtmlVideoElement,
        remoteHtmlVideoElement: remoteHtmlVideoElement,
        onCameraTest,
        onCall
    }
}
