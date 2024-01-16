'use client';

import { useRef, useState } from "react"
import { VideoComp } from "../_lib/video/video-client";

const config = {
    iceServers: [
        { "urls": "stun:stun.relay.metered.ca:80" },
        { "urls": "turn:a.relay.metered.ca:80", "username": "647f1b33cc8ceb338d1e345c", "credential": "5DPbEYO3ZlblPllA" },
        { "urls": "turn:a.relay.metered.ca:80?transport=tcp", "username": "647f1b33cc8ceb338d1e345c", "credential": "5DPbEYO3ZlblPllA" }, { "urls": "turn:a.relay.metered.ca:443", "username": "647f1b33cc8ceb338d1e345c", "credential": "5DPbEYO3ZlblPllA" }, { "urls": "turn:a.relay.metered.ca:443?transport=tcp", "username": "647f1b33cc8ceb338d1e345c", "credential": "5DPbEYO3ZlblPllA" }]
};

const mediaConstraints = {
    audio: true,
    video: true
}

type WebRTCStuff = {
    pc: RTCPeerConnection | null;
}

function initialWebRTCStuff() {
    return {
        pc: null
    }
}

export default function Page() {
    const [streamSelf, setStreamSelf] = useState<MediaStream | null>(null);
    const [streamRemote, setStreamRemote] = useState<MediaStream | null>(null);
    const [messages, setMessages] = useState<string[]>([]);
    const [msgFromSignalServer, setMsgFromSignalServer] = useState<string>('');

    const rtc = useRef<WebRTCStuff>(initialWebRTCStuff())

    function addMessage(obj: any) {
        // const newMsg = type + ': ' + JSON.stringify(json);
        const newMsg = JSON.stringify(obj);
        console.log('newMsg', newMsg);
        setMessages(d => [...d, newMsg]);
    }

    function openAndTracks() {
        return navigator.mediaDevices.getUserMedia(mediaConstraints).then(mediaStream => {
            const pc = rtc.current.pc = new RTCPeerConnection(config);
            pc.onnegotiationneeded = (async e => {
                await pc.setLocalDescription();
                addMessage({ description: pc.localDescription });
            })
            pc.onicecandidate = (e => {
                console.log('onicecandidate', e.candidate);
                addMessage({ candidate: e.candidate })
            })
            pc.oniceconnectionstatechange = () => {
                if (pc.iceConnectionState === "failed") {
                    pc.restartIce();
                }
            };
            pc.ontrack = ({ track, streams }) => {
                console.log('on track');
                track.onunmute = () => {
                    console.log('onunmute');
                  if (streamRemote != null) {
                    console.log('ignoring stream because streamRemote != null');
                    return;
                  }
                  setStreamRemote(streams[0]);
                };
              };
            for (const track of mediaStream.getTracks()) {
                console.log('before addTrack');
                pc.addTrack(track, mediaStream);
            }

            setStreamSelf(mediaStream)
        }).catch(reason => {
            console.error(reason);
        });

    }

    async function onCall() {
        await openAndTracks();
    }

    async function onReceive() {
        const { description, candidate } = JSON.parse(msgFromSignalServer);
        if (description != null) {
            console.log('handling description')
            let pc = rtc.current.pc;
            if (pc == null) {
                await openAndTracks();
                pc = rtc.current.pc;
                if (pc == null) throw new Error('pc null after openAndTracks');
            }
            await pc.setRemoteDescription(description);
            if (description.type === 'offer') {
                await pc.setLocalDescription();
                addMessage({ description: pc.localDescription });
            }
        }

        if (candidate != null) {
            const pc = rtc.current.pc;
            if (pc == null) throw new Error('pc null when candidate received');
            await pc.addIceCandidate(candidate);
        }
    }

    return (
        <div>
            Messages:
            <ul>
                {
                    messages.map((m, i) => (
                        <li key={i}>{m}</li>
                    ))
                }
            </ul>
            <VideoComp mediaStream={streamSelf} />
            <VideoComp mediaStream={streamRemote} />
            <button onClick={onCall}>Call</button>
            <textarea value={msgFromSignalServer} onChange={(e) => {
                setMsgFromSignalServer(e.target.value);
            }} />
            <button onClick={onReceive}>Receive</button>
        </div>
    )
}