'use client';

import VideoComp from "../_lib/video/VideoComp";
import useVideo from "../_lib/video/useVideo";

export default function Page() {
    const video = useVideo();

    return (
        <VideoComp htmlVideoElement={video.localHtmlVideoElement} onCameraTest={video.onCameraTest} />
    )
}