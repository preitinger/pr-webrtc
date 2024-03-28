import { Boolean, Record, Static } from "runtypes";

export type Msg = {
    type: 'sdp';
    sdp: RTCSessionDescription;
    videoAccepted: boolean; // gleicher Wert wie bei videoAcceptionChanged
} | {
    type: 'candidate';
    candidate: RTCIceCandidate;
} | {
    type: 'videoAcceptionChanged';
    accepted: boolean;
}

export const WithVideo = Record({
    send: Boolean,
    receive: Boolean
})

export type WithVideo = Static<typeof WithVideo>

const config = {
    iceServers: [
        { "urls": "stun:stun.relay.metered.ca:80" },
        { "urls": "turn:a.relay.metered.ca:80", "username": "647f1b33cc8ceb338d1e345c", "credential": "5DPbEYO3ZlblPllA" },
        { "urls": "turn:a.relay.metered.ca:80?transport=tcp", "username": "647f1b33cc8ceb338d1e345c", "credential": "5DPbEYO3ZlblPllA" }, { "urls": "turn:a.relay.metered.ca:443", "username": "647f1b33cc8ceb338d1e345c", "credential": "5DPbEYO3ZlblPllA" }, { "urls": "turn:a.relay.metered.ca:443?transport=tcp", "username": "647f1b33cc8ceb338d1e345c", "credential": "5DPbEYO3ZlblPllA" }]
};

export default class DoWebRTCStuff {
    /*
    01234567890123456789012345678901234567890123456789012345678901234567890123456789
    */
    constructor(remoteUser: string,
        remoteOffer: RTCSessionDescription | null,
        remoteAcceptingVideo: boolean,
        withVideo: WithVideo,
        sendMsg: (msg: Msg) => void,
        onClose: () => void,
        signal: AbortSignal,
        incVideoSenders: () => void,
        decVideoSenders: () => void,
        mediaSetSrcObject: (mediaStream: MediaStream) => void
    ) {
        this.remoteAcceptingVideo = remoteAcceptingVideo;
        this.withVideo = {
            ...withVideo
        };
        this.sendMsg = sendMsg;
        this.onClose = onClose;
        this.signal = signal;
        this.incVideoSenders = incVideoSenders;
        this.decVideoSenders = decVideoSenders;
        this.mediaSetSrcObject = mediaSetSrcObject;
        this.pc = new RTCPeerConnection(config);
        this.openConnection(remoteOffer, sendMsg);
    }

    private async openConnection(remoteOffer: RTCSessionDescription | null,
        sendMsg: (msg: Msg) => void
    ) {
        if (this.pc == null) return;
        this.pc.onnegotiationneeded = async () => {
            if (this.pc == null) return;
            await this.pc.setLocalDescription();
            if (this.pc == null) return;
            const localDescription = this.pc.localDescription;
            if (localDescription == null) throw new Error('localDescription null after setLocalDescription()');
            if ((remoteOffer == null && localDescription.type === 'offer') || (remoteOffer != null && (localDescription.type === 'pranswer' || localDescription.type === 'answer'))) {
                // ok
            } else {
                console.error('Unexpected localDescription', localDescription);
            }
            sendMsg({
                type: 'sdp',
                sdp: localDescription,
                videoAccepted: this.withVideo.receive
            })
        }

        this.pc.onconnectionstatechange = (e) => {
            if (this.pc == null) return;
            if (this.pc.connectionState === 'closed') {
                this.onClose();
                if (this.remoteAcceptingVideo && this.withVideo.send) {
                    this.decVideoSenders();
                }
            }
        }

        this.pc.onicecandidate = (e) => {
            if (this.pc == null) return;
            if (e.candidate != null) {
                sendMsg({
                    type: 'candidate',
                    candidate: e.candidate
                })
            }
        }

        this.pc.ontrack = (e) => {
            if (this.pc == null) return;
            if (e.track.kind === 'audio') {
                this.remoteStream.getAudioTracks().forEach(t => {
                    t.stop();
                })
                this.remoteStream.addTrack(e.track);
            } else if (e.track.kind !== 'video') throw new Error('unexpected track kind: ' + e.track.kind); else {
                if (this.withVideo.receive) {
                    this.remoteStream.getVideoTracks().forEach(t => {
                        t.stop();
                    })
                    this.remoteStream.addTrack(e.track);
                    this.mediaSetSrcObject(this.remoteStream);
                }
            }
        }

        // TODO other events

        if (remoteOffer != null) {
            await this.pc.setRemoteDescription(remoteOffer);
        }

        if (this.pc == null) return;
        const streamWithVideo = this.withVideo.send && this.remoteAcceptingVideo;
        const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: streamWithVideo,
            audio: true
        });
        if (this.pc == null) return;
        mediaStream.getTracks().forEach(track => {
            if (this.pc == null) return;
            this.pc.addTrack(track, mediaStream);
        })

        if (streamWithVideo) {
            this.incVideoSenders();
        }

    }

    // events

    async close() {
        if (this.pc == null) return;
        this.pc.close();
    }

    async signalingMsgReceived(msg: Msg) {
        if (this.pc == null) return;
        switch (msg.type) {
            case 'sdp': {
                if (msg.sdp.type === 'offer') throw new Error('unexpected sdp offer');
                await this.pc.setRemoteDescription(msg.sdp);
                break;
            }
            case 'candidate': {
                await this.pc.addIceCandidate(msg.candidate);
                break;
            }
            case 'videoAcceptionChanged': {
                this.remoteAcceptingVideo = msg.accepted;
                break;
            }
        }
    }

    sendVideoActivated() {
        if (this.pc == null) return;
        if (this.withVideo.send) return;
        this.withVideo.send = true;
        this.evtlAddVideoOutput();
    }

    sendVideoDeactivated() {
        if (this.pc == null) return;
        if (!this.withVideo.send) return;
        this.withVideo.send = false;
        this.evtlRemoveVideoOutput();
    }

    private async evtlAddVideoOutput() {
        if (this.remoteAcceptingVideo && this.withVideo.send) {
            const s = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            })

            if (this.pc == null) return;
            const oldSenders = this.pc.getSenders();
            if (oldSenders.length !== 1) throw new Error('unexpected length of old senders. Must be 1 because so far only audio must have been sent');
            const oldTrack = oldSenders[0].track;
            if (oldTrack == null) throw new Error('unexpected old track null - must be one audio track');
            if (oldTrack.kind !== 'audio') throw new Error('old track should be audio track, but kind is ' + oldTrack.kind);
            oldSenders[0].replaceTrack(s.getAudioTracks()[0]);
            this.pc.addTrack(s.getVideoTracks()[0]);
            this.incVideoSenders();
        }
    }

    private async evtlRemoveVideoOutput() {
        if (this.pc == null) return;

        if (!(this.remoteAcceptingVideo && this.withVideo.send)) {
            this.pc.getSenders().forEach(sender => {
                const track = sender.track;
                if (track != null && track.kind === 'video') {
                    track.enabled = false;
                    track.stop();
                    this.decVideoSenders();
                }
            })
        }
    }

    receiveVideoActivated() {
        if (this.pc == null) return;
        if (this.withVideo.receive) return;
        this.sendMsg({
            type: 'videoAcceptionChanged',
            accepted: (this.withVideo.receive = true)
        })
    }

    receiveVideoDeactivated() {
        if (this.pc == null) return;
        if (!this.withVideo.receive) return;
        this.sendMsg({
            type: 'videoAcceptionChanged',
            accepted: (this.withVideo.receive = false)
        })
    }

    private remoteAcceptingVideo: boolean;
    private withVideo: WithVideo;
    private signal: AbortSignal;
    private sendMsg: (msg: Msg) => void;
    private onClose: () => void;
    private incVideoSenders: () => void;
    private decVideoSenders: () => void;
    private pc: RTCPeerConnection | null;
    private remoteStream: MediaStream = new MediaStream();
    private mediaSetSrcObject: (mediaStream: MediaStream) => void;
}
