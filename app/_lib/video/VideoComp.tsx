import { MutableRefObject } from "react"

export interface VideoCompProps {
    htmlVideoElement: MutableRefObject<HTMLVideoElement | null>;
    onCameraTest: () => void;
}

export default function VideoComp(props: VideoCompProps) {
    return (
        <div>
            <video ref={props.htmlVideoElement} autoPlay={true}></video>
            <button onClick={props.onCameraTest}>Camera Test</button>
        </div>
    )
}