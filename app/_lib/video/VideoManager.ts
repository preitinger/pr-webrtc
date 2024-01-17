import { AccumulatedFetcher } from "../user-management-client/apiRoutesClient";
import { AcceptCallReq, AcceptCallResp, AuthenticatedVideoReq, CheckAcceptReq, CheckAcceptResp, CheckCallReq, CheckCallResp, OfferCallReq, OfferCallResp, RejectCallReq, RejectCallResp, WebRTCMsgReq, WebRTCMsgResp } from "./video-common";

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
    onReceivedCall: (receivedCall: ReceivedCall) => void;
    onVideoCall: (caller: string, callee: string) => void;
    onLocalStream: (stream: MediaStream | null) => void;
    onRemoteStream: (stream: MediaStream | null) => void;
    onHint: (hint: string) => void;
    onError: (error: string) => void;
}

const mediaConstraints = {
    audio: true,
    video: true
}

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

        this.sendCheckCall();
    }

    close() {
        if (this.state === 'error') return;
        if (this.timeout != null) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        this.state = 'closed';
    }

    onAccept(accept: boolean) {
        console.log('onAccept', this.state, accept);
        if (this.state !== 'answeringCall') return;
        if (this.receivedCall == null) throw new Error('receivedCall null?!');

        if (accept) {
            this.state = 'sendingAccept';
            this.pushReq<AcceptCallReq, AcceptCallResp>({
                type: 'acceptCall',
                caller: this.receivedCall.caller,
                callee: this.ownUser
            }).then(async resp => {
                console.log('AcceptCallResp', this.state, resp);
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
                        this.handlers.onHint(`${this.caller} has hung up.`);
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
            this.pushReq<RejectCallReq, RejectCallResp>({
                type: 'rejectCall',
                caller: this.receivedCall.caller,
                callee: this.ownUser
            }).then(async resp => {
                console.log('RejectCallResp', this.state, resp);
                if (this.state !== 'sendingReject') return;

                switch (resp.type) {
                    case 'authFailed': throw new Error("authFailed in rejectCall");
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
        if (this.caller == null) throw new Error('caller null in startVideoCall?!');
        if (this.callee == null) throw new Error('callee null in startVideoCall?!');

        this.state = 'videoCall';

        {
            const pc = this.peerConnection = new RTCPeerConnection(config);
            this.makingOffer = false;
            this.ignoreOffer = false;
            pc.onnegotiationneeded = async (e) => {
                console.log('onnegotiationneeded', this.state);
                if (this.state !== 'videoCall') return;

                try {
                    this.makingOffer = true;
                    await pc.setLocalDescription();
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
            pc.ontrack = ({ track, streams }) => {
                track.onunmute = () => {
                    this.handlers.onRemoteStream(streams[0]);
                };
            };
            pc.onicecandidate = ({ candidate }) => {
                this.sendWebRTCMsg([{
                    type: 'candidate',
                    candidate: candidate
                }])
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);

                for (const track of stream.getTracks()) {
                    pc.addTrack(track, stream);
                }

                this.handlers.onLocalStream(stream);
            } catch (err) {
                console.error(err);
            }
        }

        this.handlers.onVideoCall(this.caller, this.callee);
    }

    onCall(callee: string) {
        console.log('onCall', this.state, callee);
        if (this.state === 'error') return;
        if (this.state !== 'checkingCall') {
            this.handlers.onHint('Already busy with a call');
            return;
        }
        if (this.timeout != null) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        this.state = 'sendingOffer';
        this.caller = this.ownUser;
        this.callee = callee;
        const req: OfferCallReq = {
            type: 'offerCall',
            caller: this.caller,
            callee: this.callee
        }
        this.pushReq<OfferCallReq, OfferCallResp>(req).then(resp => {
            console.log('OfferCallResp', this.state, resp);
            if (this.state !== 'sendingOffer') return;
            this.state = 'checkingAccept';
            this.sendCheckAccept();
        })
    }

    private sendWebRTCMsg(msg: any[]) {
        console.log('sendWebRTCMsg', this.state, msg);
        if (this.caller == null || this.callee == null) throw new Error('caller or callee null in sendWebRTCMsg?!');

        if (this.timeout != null) {
            clearTimeout(this.timeout);
        }

        this.pushReq<WebRTCMsgReq, WebRTCMsgResp>(
            {
                type: 'webRTCMsg',
                caller: this.caller,
                callee: this.callee,
                messages: msg.map(o => JSON.stringify(o))
            }
        ).then(resp => {
            console.log('WebRTCMsgResp', this.state, resp);
            if (this.state !== 'videoCall') return;
            if (this.caller == null) throw new Error('caller null after WebRTCMsg?!');
            if (this.callee == null) throw new Error('callee null after WebRTCMsg?!');
            switch (resp.type) {
                case 'closed':
                    this.handlers.onHint('The call has been closed.');
                    this.state = 'checkingCall';
                    this.sendCheckCall();
                    break;
                case 'error':
                    this.handlers.onError(resp.error);
                    this.state = 'error';
                    break;
                case 'success':
                    const otherName = this.ownUser === this.caller ? this.callee : this.caller;
                    const polite = this.ownUser < otherName;
                    resp.messages.forEach(msgStr => {
                        const msg = JSON.parse(msgStr);
                        this.handleWebRTCMsg(msg, polite);
                    })
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
        // console.log('handleWebRTCMsg: data=', data, 'state=', this.state);
        const pc = this.peerConnection;
        if (pc == null) throw new Error('peer connection null in handleWebRTCMsg?!');
        try {
            if (description) {
                console.log('handling description', description);
                const offerCollision =
                    description.type === "offer" &&
                    (this.makingOffer || pc.signalingState !== "stable");
                console.log('offerCollision', offerCollision);

                this.ignoreOffer = !polite && offerCollision;
                if (this.ignoreOffer) {
                    console.log('ignoring offer');
                    return;
                }

                console.log('before setRemoteDescription');
                await pc.setRemoteDescription(description);
                console.log('after setRemoteDescription');
                if (description.type === "offer") {
                    console.log('handling offer');
                    await pc.setLocalDescription();
                    console.log('local description set for offer');
                    this.sendWebRTCMsg([{ description: pc.localDescription }])
                }
            } else if (candidate) {
                console.log('handling candidate', candidate);
                try {
                    await pc.addIceCandidate(candidate);
                } catch (err) {
                    if (!this.ignoreOffer) {
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
        console.log('sendCheckCall', req);
        this.pushReq<CheckCallReq, CheckCallResp>(req).then(resp => {
            console.log('CheckCallResp', this.state, resp);
            if (this.state !== 'checkingCall') return;

            switch (resp.type) {
                case 'authFailed':
                    this.handlers.onError('Authentication failed on the server when checking for an incoming call');
                    this.state = 'error';
                    break;
                case 'noNewOffer':
                    this.timeout = setTimeout(() => {
                        if (this.state !== 'checkingCall') return;
                        this.sendCheckCall();
                    }, this.repeatMs);
                    break;
                case 'error':
                    this.handlers.onError(resp.error);
                    this.state = 'error';
                    break;
                case 'newOffer':
                    this.receivedCall = {
                        caller: resp.caller
                    };
                    this.state = 'answeringCall';
                    this.handlers.onReceivedCall(this.receivedCall);
                    break;
            }
            console.log('new state after CheckCallResp', this.state);

        }).catch(reason => {
            console.log('Exception after checkCall', this.state, reason);
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
            console.log('CheckAcceptResp', this.state, resp);
            if (this.state !== 'checkingAccept') return;

            switch (resp.type) {
                case 'ringing':
                    this.timeout = setTimeout(() => {
                        this.sendCheckAccept();
                    }, this.repeatMs);
                    break;
                case 'accepted':
                    this.startVideoCall();
                    break;
                case 'rejected':
                    this.handlers.onHint(`${this.callee} rejected the call.`);
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

}
