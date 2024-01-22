import { AccumulatedFetcher } from "../user-management-client/apiRoutesClient";
import { ToolbarData, ToolbarDataPart, VideoToolbarEvent } from "./video-client";
import { AcceptCallReq, AcceptCallResp, AuthenticatedVideoReq, CheckAcceptReq, CheckAcceptResp, CheckCallReq, CheckCallResp, HangUpReq, HangUpResp, OfferCallReq, OfferCallResp, RejectCallReq, RejectCallResp, WebRTCMsgReq, WebRTCMsgResp } from "./video-common";

export interface ReceivedCall {
    caller: string;
}

type State =
    'checkingCall' | 'answeringCall' | 'sendingAccept' | 'sendingReject' | 'sendingOffer' | 'checkingAccept' | 'videoCall' | 'closed' | 'error';


const config = {
    iceServers: [
        { "urls": "stun:stun.relay.metered.ca:80" },
        { "urls": "turn:a.relay.metered.ca:80", "username": "647f1b33cc8ceb338d1e345c", "credential": "5DPbEYO3ZlblPllA" },
        { "urls": "turn:a.relay.metered.ca:80?transport=tcp", "username": "647f1b33cc8ceb338d1e345c", "credential": "5DPbEYO3ZlblPllA" }, { "urls": "turn:a.relay.metered.ca:443", "username": "647f1b33cc8ceb338d1e345c", "credential": "5DPbEYO3ZlblPllA" }, { "urls": "turn:a.relay.metered.ca:443?transport=tcp", "username": "647f1b33cc8ceb338d1e345c", "credential": "5DPbEYO3ZlblPllA" }]
};

export interface VideoHandlers {
    onToolbarData: (data: ToolbarData) => void;
    // onReceivedCall: (receivedCall: ReceivedCall) => void;
    onVideoCall: (videoCall: boolean) => void;
    onLocalStream: (stream: MediaStream | null) => void;
    onRemoteStream: (stream: MediaStream | null) => void;
    onHint: (hint: string, alert?:boolean) => void;
    onError: (error: string) => void;
}

// const mediaConstraints = {
//     audio: true,
//     video: true
// }

export default class VideoManager {
    constructor(ownUser: string,
        sessionToken: string,
        repeatMs: number,
        fetcher: AccumulatedFetcher,
        handlers: VideoHandlers
    ) {
        this.ownUser = ownUser;
        this.sessionToken = sessionToken;
        this.repeatMs = repeatMs;
        this.fetcher = fetcher;
        this.handlers = handlers;

        this.handlers.onToolbarData(this.toolbarData);
        this.sendCheckCall();
    }

    close() {
        if (this.state === 'error') return;
        this.closeVideoCall(false);
        this.clearMyTimeout();

        this.state = 'closed';
        this.handlers.onLocalStream(null);
        this.handlers.onRemoteStream(null);
        this.fireUpdatedToolbarData({ type: 'idle' });
    }

    async onVideoToolbarEvent(e: VideoToolbarEvent) {
        switch (e.type) {
            case 'accept':
                this.onAccept(e.accept);
                break;
            case 'hangUp':
                switch (this.state) {
                    case 'checkingAccept':
                        this.closeVideoCall(true);
                        break;
                    case 'videoCall':
                        this.closeVideoCall(true);
                        break;
                    default:
                        break;
                }
                break;
            case 'camera':
                this.handlers.onToolbarData(this.toolbarData = {
                    ...this.toolbarData,
                    camera: e.checked
                })
                const pc = this.peerConnection;
                if (pc != null) {
                    if (!e.checked) {
                        for (const sender of this.videoSenders) {
                            // sender.track?.stop();
                            pc.removeTrack(sender);
                            this.handlers.onLocalStream(null);
                        }
                        this.videoSenders.length = 0;
                    } else {
                        if (this.localStream != null) {
                            const videoTracks = this.localStream.getVideoTracks();
                            if (videoTracks.length === 0) {
                                this.localStream = await navigator.mediaDevices.getUserMedia({
                                    audio: true, video: true
                                });
                                if (this.state !== 'videoCall') {
                                    this.localStream.getTracks().forEach(t => t.stop());
                                    return;
                                }

                                this.audioSenders.length = 0;
                                this.videoSenders.length = 0;

                                for (const track of this.localStream.getAudioTracks()) {
                                    this.audioSenders.push(pc.addTrack(track, this.localStream));
                                }

                                for (const track of this.localStream.getVideoTracks()) {
                                    this.videoSenders.push(pc.addTrack(track, this.localStream));
                                }

                                this.clonedStreamWithoutAudio = this.localStream.clone();
                                this.clonedStreamWithoutAudio.getAudioTracks().forEach(t => {
                                    t.stop();
                                })

                                this.handlers.onLocalStream(this.clonedStreamWithoutAudio);
                            } else {
                                this.videoSenders.length = 0;
                                for (const track of this.localStream.getVideoTracks()) {
                                    this.videoSenders.push(pc.addTrack(track, this.localStream));
                                }
    
                                const clonedStreamWithoutAudio = this.localStream.clone();
                                clonedStreamWithoutAudio.getAudioTracks().forEach(t => {
                                    t.stop();
                                })
    
                                this.handlers.onLocalStream(null);
                                setTimeout(() => {
                                    if (this.state !== 'videoCall') return;
                                    this.handlers.onLocalStream(clonedStreamWithoutAudio);
                                }, 10)
                            }

                        }
                    }

                    // this.localStream = await navigator.mediaDevices.getUserMedia({
                    //     audio: true,
                    //     video: e.checked
                    // })

                    // if (this.state !== 'videoCall') {
                    //     this.localStream.getTracks().forEach(t => t.stop());
                    //     return;
                    // }

                    // this.senders.length = 0;

                    // for (const track of this.localStream.getTracks()) {
                    //     this.senders.push(pc.addTrack(track, this.localStream));
                    // }

                    // const clonedStreamWithoutAudio = this.localStream.clone();
                    // clonedStreamWithoutAudio.getAudioTracks().forEach(t => {
                    //     t.stop();
                    // })

                    // this.handlers.onLocalStream(clonedStreamWithoutAudio);
                }
                break;
            case 'ringOnCall':
                this.handlers.onToolbarData(this.toolbarData = {
                    ...this.toolbarData,
                    ringOnCall: e.checked
                });
                break;
        }
    }

    private clearMyTimeout() {
        if (this.timeout != null) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

    }

    private closeVideoCall(andCheckCall: boolean) {
        this.clearMyTimeout();

        const pc = this.peerConnection;
        if (pc != null) {
            pc.onicecandidate = null;
            pc.ontrack = null;
            pc.onnegotiationneeded = null;
            pc.close();
        }

        if (this.localStream != null) {
            this.localStream.getTracks().forEach(t => {
                t.stop();
            })
            this.localStream = null;
        }

        if (this.remoteStream != null) {
            this.remoteStream.getTracks().forEach(t => {
                {
                    t.stop();
                }
            })
            this.remoteStream = null;
        }

        if (this.clonedStreamWithoutAudio != null) {
            this.clonedStreamWithoutAudio.getTracks().forEach(t => {
                t.stop();
            })
            this.clonedStreamWithoutAudio = null;
        }

        this.peerConnection = null;

        if (this.caller != null && this.callee != null) {
            if (this.caller == null) throw new Error('caller null before hangUp?!');
            if (this.callee == null) throw new Error('callee null before hangUp?!');
            this.pushReq<HangUpReq, HangUpResp>({
                type: 'hangUp',
                caller: this.caller,
                callee: this.callee
            })
        }
        this.caller = this.callee = null;
        this.handlers.onLocalStream(null);
        this.handlers.onRemoteStream(null);
        this.fireUpdatedToolbarData({ type: 'idle' });
        this.handlers.onVideoCall(false);

        if (andCheckCall) {
            this.state = 'checkingCall';
            this.sendCheckCall();
        }

    }

    private updateToolbarData(part: ToolbarDataPart): ToolbarData {
        return (this.toolbarData = {
            ...part,
            ringOnCall: this.toolbarData.ringOnCall,
            camera: this.toolbarData.camera
        })
    }

    private fireUpdatedToolbarData(part: ToolbarDataPart): void {
        this.handlers.onToolbarData(this.updateToolbarData(part));
    }

    private onAccept(accept: boolean) {
        if (this.state !== 'answeringCall') return;
        if (this.receivedCall == null) throw new Error('receivedCall null?!');

        if (accept) {
            this.state = 'sendingAccept';
            this.fireUpdatedToolbarData({
                type: 'videoCall',
                caller: this.caller ?? '',
                connecting: true
            });
            this.pushReq<AcceptCallReq, AcceptCallResp>({
                type: 'acceptCall',
                caller: this.receivedCall.caller,
                callee: this.ownUser
            }).then(async resp => {
                if (this.state !== 'sendingAccept') return;

                switch (resp.type) {
                    case 'error':
                        this.handlers.onError(resp.error);
                        this.state = 'error';
                        break;
                    case 'authFailed':
                        this.handlers.onError('Authentication failed during acception of the call');
                        this.state = 'error';
                        break;
                    case 'notFound':
                        this.handlers.onHint(`${this.receivedCall?.caller} has hung up.`);
                        this.fireUpdatedToolbarData({ type: 'idle' });
                        this.state = 'checkingCall';
                        this.sendCheckCall();
                        break;
                    case 'success':
                        if (this.receivedCall == null) throw new Error('receivedCall null after sending acceptCall?!');
                        this.caller = this.receivedCall.caller;
                        this.callee = this.ownUser;
                        await this.startVideoCall();
                        break;
                }

            })

        } else {
            this.state = 'sendingReject';
            this.fireUpdatedToolbarData({ type: 'idle' });
            // Earlier deprecated RejectCallReq
            this.pushReq<HangUpReq, HangUpResp>({
                type: 'hangUp',
                caller: this.receivedCall.caller,
                callee: this.ownUser
            }).then(async resp => {
                if (this.state !== 'sendingReject') return;

                switch (resp.type) {
                    case 'error':
                        this.handlers.onError(resp.error);
                        this.state = 'error';
                        break;
                    case 'success':
                        this.state = 'checkingCall';
                        this.sendCheckCall();
                        break;
                }
            })

        }
    }

    private async startVideoCall() {
        // console.log('startVideoCall');
        if (this.caller == null) throw new Error('caller null in startVideoCall?!');
        if (this.callee == null) throw new Error('callee null in startVideoCall?!');

        this.state = 'videoCall';
        this.handlers.onVideoCall(true);
        this.handlers.onToolbarData(this.toolbarData = {
            type: 'videoCall',
            connecting: true,
            caller: this.caller,
            camera: this.toolbarData.camera,
            ringOnCall: this.toolbarData.ringOnCall
        })

        {
            const pc = this.peerConnection = new RTCPeerConnection(config);
            this.makingOffer = false;
            this.ignoreOffer = false;
            pc.onnegotiationneeded = async (e) => {
                if (this.state !== 'videoCall') return;

                try {
                    this.makingOffer = true;
                    await pc.setLocalDescription();
                    if (this.state !== 'videoCall') return;
                    this.sendWebRTCMsg([{
                        type: 'description',
                        description: pc.localDescription
                    }]);
                } catch (err) {
                    console.error(err);
                } finally {
                    this.makingOffer = false;
                }

            };
            pc.ontrack = (e) => {

                if (e.streams.length > 0) {
                    const newStream = e.streams[e.streams.length - 1];
                    this.handlers.onRemoteStream(this.remoteStream = newStream);
                    // console.log('ontrack in state', this.state, ' and toolbarData.type', this.toolbarData.type);
                    if (this.toolbarData.type === 'videoCall' && this.toolbarData.connecting) {
                        this.handlers.onToolbarData(this.toolbarData = {
                            ...this.toolbarData,
                            connecting: false
                        });
                    }
                }
            };
            pc.onicecandidate = ({ candidate }) => {
                if (this.state !== 'videoCall') return;
                this.sendWebRTCMsg([{
                    type: 'candidate',
                    candidate: candidate
                }])
            }
            try {
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: this.toolbarData.camera
                });
                if (this.state !== 'videoCall') {
                    this.localStream.getTracks().forEach(t => t.stop());
                    return;
                }

                this.audioSenders.length = 0;
                this.videoSenders.length = 0;

                for (const track of this.localStream.getAudioTracks()) {
                    this.audioSenders.push(pc.addTrack(track, this.localStream));
                }

                for (const track of this.localStream.getVideoTracks()) {
                    this.videoSenders.push(pc.addTrack(track, this.localStream));
                }

                this.clonedStreamWithoutAudio = this.localStream.clone();
                this.clonedStreamWithoutAudio.getAudioTracks().forEach(t => {
                    t.stop();
                })

                this.handlers.onLocalStream(this.clonedStreamWithoutAudio);
                this.sendWebRTCMsg([]);
            } catch (err) {
                console.error(err);
            }
        }

    }

    onCall(callee: string) {
        if (this.state === 'error') return;
        if (this.state !== 'checkingCall') {
            this.handlers.onHint('Already busy with a call');
            return;
        }
        if (callee === this.ownUser) {
            this.handlers.onHint("Please don't call yourself.", true);
            return;
        }

        this.clearMyTimeout();

        this.state = 'sendingOffer';
        this.caller = this.ownUser;
        this.callee = callee;
        this.fireUpdatedToolbarData({
            type: 'ringing',
            callee: this.callee
        });
        const req: OfferCallReq = {
            type: 'offerCall',
            caller: this.caller,
            callee: this.callee
        }
        this.pushReq<OfferCallReq, OfferCallResp>(req).then(resp => {
            if (this.state !== 'sendingOffer') return;
            switch (resp.type) {
                case 'authFailed':
                    this.handlers.onError('Authentication failed when calling');
                    this.state = 'error';
                    break;
                case 'busy':
                    this.handlers.onHint(`${this.callee} is busy.`)
                    this.fireUpdatedToolbarData({ type: 'idle' });
                    this.state = 'checkingCall';
                    this.sendCheckCall();
                    break;
                case 'error':
                    this.handlers.onError('Error when calling: ' + resp.error);
                    this.state = 'error';
                    break;
                case 'success':
                    this.state = 'checkingAccept';
                    this.sendCheckAccept();
                    break;
            }
        })
    }

    private sendWebRTCMsg(msg: any[]) {
        if (this.state != 'videoCall') return;
        if (this.caller == null || this.callee == null) throw new Error('caller or callee null in sendWebRTCMsg?!');

        this.clearMyTimeout();

        this.pushReq<WebRTCMsgReq, WebRTCMsgResp>(
            {
                type: 'webRTCMsg',
                caller: this.caller,
                callee: this.callee,
                messages: msg.map(o => JSON.stringify(o))
            }
        ).then(async resp => {
            if (this.state !== 'videoCall') return;
            if (this.caller == null) throw new Error('caller null after WebRTCMsg?!');
            if (this.callee == null) throw new Error('callee null after WebRTCMsg?!');
            switch (resp.type) {
                case 'closed':
                    this.handlers.onHint('The call has been closed.');
                    this.closeVideoCall(true);
                    break;
                case 'error':
                    this.handlers.onError(resp.error);
                    this.state = 'error';
                    break;
                case 'success':
                    const otherName = this.ownUser === this.caller ? this.callee : this.caller;
                    const polite = this.ownUser < otherName;
                    for (const msgStr of resp.messages) {
                        const msg = JSON.parse(msgStr);
                        await this.handleWebRTCMsg(msg, polite);
                        if (this.state !== 'videoCall') return;
                    }

                    this.clearMyTimeout();
                    this.timeout = setTimeout(() => {
                        this.sendWebRTCMsg([]);
                    }, this.repeatMs)
                    break;
            }
        })

    }

    // private handleException(reason: any) {
    //     if (reason instanceof Error) {
    //         this.handlers.onError(`Unexpected exception`)
    //     }
    // }

    private async handleWebRTCMsg(data: any, polite: boolean) {
        const { description, candidate } = data;
        const pc = this.peerConnection;
        if (pc == null) return; // possible because asynchronous
        try {
            if (description) {
                const offerCollision =
                    description.type === "offer" &&
                    (this.makingOffer || pc.signalingState !== "stable");

                this.ignoreOffer = !polite && offerCollision;
                if (this.ignoreOffer) {
                    // console.warn('ignoring offer');
                    return;
                }

                await pc.setRemoteDescription(description);
                if (this.state !== 'videoCall') return;
                if (description.type === "offer") {
                    await pc.setLocalDescription();
                    if (this.state !== 'videoCall') return;
                    this.sendWebRTCMsg([{ description: pc.localDescription }])
                }
            } else if (candidate) {
                try {
                    if (pc.signalingState !== 'closed') {
                        await pc.addIceCandidate(candidate);
                    } else {
                        console.warn('ignoring ice candidate');
                    }
                } catch (err) {
                    if (!this.ignoreOffer && pc.remoteDescription != null) {
                        throw err;
                    }
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    private sendCheckCall() {
        const req: CheckCallReq = {
            type: 'checkCall',
            callee: this.ownUser
        };
        this.pushReq<CheckCallReq, CheckCallResp>(req).then(resp => {
            if (this.state !== 'checkingCall') return;

            switch (resp.type) {
                case 'authFailed':
                    this.handlers.onError('Authentication failed on the server when checking for an incoming call');
                    this.state = 'error';
                    break;
                case 'noNewOffer':
                    this.clearMyTimeout();
                    this.timeout = setTimeout(() => {
                        if (this.state !== 'checkingCall') {
                            console.warn('return before sendCheckCall')
                            return;
                        }
                        this.sendCheckCall();
                    }, this.repeatMs);
                    break;
                case 'error':
                    this.handlers.onError(resp.error);
                    this.state = 'error';
                    break;
                case 'newOffer':
                    if (resp.caller === this.ownUser) {
                        // was a dummy entry just existing to prevent a call to the own user while he was calling sb before loging out
                        // so just remove this callee entry by sending a hangUp
                        this.pushReq<HangUpReq, HangUpResp>({
                            type: 'hangUp',
                            caller: this.ownUser,
                            callee: this.ownUser
                        }).then(resp => {
                            if (this.state !== 'checkingCall') return;
                            this.clearMyTimeout();
                            this.timeout = setTimeout(() => {
                                if (this.state !== 'checkingCall') {
                                    console.warn('return before sendCheckCall')
                                    return;
                                }
                                this.sendCheckCall();
                            }, this.repeatMs);
                        });
                        return;
                    }
                    this.receivedCall = {
                        caller: resp.caller
                    };
                    this.state = 'answeringCall';
                    this.fireUpdatedToolbarData({
                        type: 'receivedCall',
                        receivedCall: this.receivedCall
                    })
                    break;
            }

        }).catch(reason => {
            if (this.state !== 'checkingCall') return;
            if (reason instanceof Error) {
                this.handlers.onError(`Unknown server eror(${reason.name}): ${reason.message}`);
            } else {
                this.handlers.onError('Exception during checkCall: ' + JSON.stringify(reason));
            }
            this.state = 'error';
        })

    }

    private sendCheckAccept() {
        if (this.caller == null) throw new Error('caller null?!');
        if (this.callee == null) throw new Error("callee null?!");

        const req: CheckAcceptReq = {
            type: 'checkAccept',
            caller: this.caller,
            callee: this.callee
        }
        this.pushReq<CheckAcceptReq, CheckAcceptResp>(req).then(resp => {
            if (this.state !== 'checkingAccept') return;

            switch (resp.type) {
                case 'ringing':
                    this.clearMyTimeout();
                    this.timeout = setTimeout(() => {
                        this.sendCheckAccept();
                    }, this.repeatMs);
                    break;
                case 'accepted':
                    this.startVideoCall();
                    break;
                case 'rejected':
                    this.handlers.onHint(`${this.callee} rejected the call.`);
                    this.fireUpdatedToolbarData({ type: 'idle' });
                    this.state = 'checkingCall';
                    this.sendCheckCall();
                    break;
            }
        })
    }

    private pushReq<Req extends { type: string }, Resp>(req: Req) {
        return this.fetcher.push<AuthenticatedVideoReq<Req>, Resp>(this.authenticatedReq<Req>(req))
    }

    private authenticatedReq<Req extends { type: string }>(req: Req): AuthenticatedVideoReq<Req> {
        return {
            type: 'authenticatedVideoReq',
            ownUser: this.ownUser,
            sessionToken: this.sessionToken,
            req: req
        }
    }

    private ownUser: string;
    private sessionToken: string;
    private repeatMs: number;
    private fetcher: AccumulatedFetcher;
    private receivedCall: ReceivedCall | null = null;
    private state: State = 'checkingCall';
    private timeout: NodeJS.Timeout | null = null;
    private caller: string | null = null;
    private callee: string | null = null;
    private peerConnection: RTCPeerConnection | null = null;
    private makingOffer = false;
    private ignoreOffer = false;
    private handlers: VideoHandlers;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private clonedStreamWithoutAudio: MediaStream | null = null;
    private toolbarData: ToolbarData = { type: 'idle', ringOnCall: false, camera: true };
    private audioSenders: RTCRtpSender[] = [];
    private videoSenders: RTCRtpSender[] = [];
}
