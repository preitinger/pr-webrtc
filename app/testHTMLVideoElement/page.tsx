'use client';

import { useRef } from "react"
import styles from './page.module.css'

export default function Page() {
    const video300Ref = useRef<HTMLVideoElement>(null);
    const video600Ref = useRef<HTMLVideoElement>(null);

    async function start() {
        if (video300Ref.current == null) throw new Error('video300Ref.current null');
        console.log('before getUserMedia')
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 10,
                height: 10
            },
            audio: false
        })
        console.log('after getUserMedia: stream', stream)

        video300Ref.current.srcObject = stream;

        if (video600Ref.current == null) throw new Error("video600Ref.current null");
        video600Ref.current.srcObject = stream;
    }

    function printData() {
        console.log('data for video300:')
        {
            const v = video300Ref.current;
            if (v == null) throw new Error("video300Ref.current null");
            console.log('width', v.width);
            console.log('height', v.height);
            console.log('clientWidth', v.clientWidth);
            console.log('clientHeight', v.clientHeight);
            console.log('videoWidth', v.videoWidth);
            console.log('videoHeight', v.videoHeight);
            console.log('offsetWidth', v.offsetWidth);
            console.log('offsetHeight', v.offsetHeight);
        }
        console.log('data for video600:')
        {
            const v = video600Ref.current;
            if (v == null) throw new Error("video600Ref.current null");
            console.log('width', v.width);
            console.log('height', v.height);
            console.log('clientWidth', v.clientWidth);
            console.log('clientHeight', v.clientHeight);
            console.log('videoWidth', v.videoWidth);
            console.log('videoHeight', v.videoHeight);
            console.log('offsetWidth', v.offsetWidth);
            console.log('offsetHeight', v.offsetHeight);
        }
    }

    return (
        <div>
            <video className={styles.video} width={300} height={300} ref={video300Ref} autoPlay={true} />
            <button onClick={start}>Start</button>
            <button onClick={printData}>Print data</button>
            <video className={styles.video} width={600} height={600} ref={video600Ref} autoPlay={true} />
        </div>
    )
}