import * as rt from "runtypes"
import assert from "assert";
import EventBus, { Subscription, waitForGuard } from "./_lib/EventBus";
import chainedAbortController from "./_lib/pr-client-utils/chainedAbortController";
import { AccumulatedFetching } from "./_lib/user-management-client/AccumulatedFetching";
import { WithVideo } from "./_lib/video/DoWebRTCStuff";
import { AcceptClicked, ChatAddHintLine, EnqueueCall, ReceiveVideoChanged, ReceivedCallDlg, ReceivedCallProps, RegularFunctionsShutdown, HangUpClicked, RemoteMediaStream, RemoteMsg, SendVideoChanged, SetConnectionComp, HangUp, RemoteHangUp, ModalDlg } from "./busEvents";

import * as localStorageAccess from './localStorageAccess'

export type RemoteRole = 'caller' | 'callee';


const config = {
    iceServers: [
        { "urls": "stun:stun.relay.metered.ca:80" },
        { "urls": "turn:a.relay.metered.ca:80", "username": "647f1b33cc8ceb338d1e345c", "credential": "5DPbEYO3ZlblPllA" },
        { "urls": "turn:a.relay.metered.ca:80?transport=tcp", "username": "647f1b33cc8ceb338d1e345c", "credential": "5DPbEYO3ZlblPllA" }, { "urls": "turn:a.relay.metered.ca:443", "username": "647f1b33cc8ceb338d1e345c", "credential": "5DPbEYO3ZlblPllA" }, { "urls": "turn:a.relay.metered.ca:443?transport=tcp", "username": "647f1b33cc8ceb338d1e345c", "credential": "5DPbEYO3ZlblPllA" }]
};

export function defaultWithVideo(user: string, remoteUser: string): WithVideo {
    const configSend = localStorageAccess.videoConfig.send.get(user)
    const configReceive = localStorageAccess.videoConfig.receive.get(user)
    return {
        send: configSend === 'always' ? true : configSend === 'never' ? false : localStorageAccess.lastVideoSettings.send.get(user, remoteUser),
        receive: configReceive === 'always' ? true : configReceive === 'never' ? false : localStorageAccess.lastVideoSettings.receive.get(user, remoteUser)
    }
}

function nyi() {
    try {
        throw new Error('nyi');
    } catch (reason) {
        console.error(reason);
    }
}

// type StateOld =
//     'sending offer' |
//     'decide if video' |
//     'receiving sdp' |
//     'setting remote offer' |
//     'creating media' |
//     'setting local description' |
//     'sending local description' |
//     'setting remote answer' |
//     'handle outgoing and incoming candidates' |
//     'rest' |
//     'final';

// export class ConnectionOld {
//     constructor(sentVideoUpdated: (stream: MediaStream | null) => void,
//         closed: () => void,
//         send: (msg: string) => void,
//         eventBus: EventBus<unknown>,
//         user: string, remoteUser: string, remoteRole: RemoteRole,
//         outerSignal: AbortSignal,
//         withVideo?: WithVideo
//     ) {
//         console.log('construct Connection for ', remoteUser);
//         if ((withVideo == null) !== (remoteRole === 'caller')) throw new Error('withVideo must be provided iff remoteRole is callee');
//         [this.abortController, this.releaseAbortController] = chainedAbortController(outerSignal)
//         this.eventBus = eventBus;
//         this.remoteRole = remoteRole;
//         this.withVideo = withVideo;
//         this.outerSignal = outerSignal;
//         this.user = user;
//         this.remoteUser = remoteUser;
//         this.send = send;


//         if (remoteRole === 'caller') {
//             this.fireEvent<EnqueueCall>({
//                 type: 'EnqueueCall',
//                 remoteUser: remoteUser,
//             })
//             this.st1 = 'decide if video';

//         } else {
//             if (withVideo == null) throw new Error('withVideo null and remoteRole callee');
//             this.st1 = 'sending offer';
//             const msg: RemoteMsg = {
//                 type: 'prepareCall',
//                 videoAccepted: withVideo.receive

//             }
//             this.sendRemoteMsg(msg);
//             this.fireEvent<SetConnectionComp>({
//                 type: 'SetConnectionComp',
//                 remoteUser: this.remoteUser,
//                 props: {
//                     remoteUser: this.remoteUser,
//                     msg: `Calling ${this.remoteUser}`,
//                     stream: null,
//                 }
//             });
//         }
//     }

//     sendRemoteMsg(msg: RemoteMsg) {
//         this.send(JSON.stringify(msg));
//     }

//     private fireEvent<T>(t: T) {
//         this.eventBus.publish(t);
//     }

//     async onDequeueCall() {

//         function withVideoFromProps(props: ReceivedCallProps | null): WithVideo | null {
//             return props?.withVideo ?? null;
//         }

//         if (this.withVideo == null) {
//             const updateAndFireProps = (newProps: ReceivedCallProps | null): ReceivedCallProps | null => {
//                 this.fireEvent<ReceivedCallDlg>({
//                     type: 'ReceivedCallDlg',
//                     props: props
//                 });

//                 return newProps;
//             }
//             let props: ReceivedCallProps | null = null;
//             props = updateAndFireProps({
//                 remoteUser: this.remoteUser,
//                 withVideo: defaultWithVideo(this.user, this.remoteUser)
//             })
//             assert(props != null);
//             const subscr = this.eventBus.subscribe();
//             try {
//                 let loop = true;

//                 while (loop) {
//                     const e = await waitForGuard({ subscr: subscr }, rt.Union(SendVideoChanged, ReceiveVideoChanged, AcceptClicked, HangUpClicked, RegularFunctionsShutdown), this.abortController.signal);
//                     switch (e.type) {
//                         case 'SendVideoChanged':
//                             if (e.remoteUser === this.remoteUser) {
//                                 localStorageAccess.lastVideoSettings.send.set(this.user, e.remoteUser, e.send)
//                                 assert(props != null);
//                                 props = updateAndFireProps({
//                                     ...props,
//                                     withVideo: {
//                                         ...props.withVideo,
//                                         send: e.send
//                                     }
//                                 })
//                             }
//                             break;

//                         case 'ReceiveVideoChanged':
//                             if (e.remoteUser === this.remoteUser) {
//                                 localStorageAccess.lastVideoSettings.receive.set(this.user, e.remoteUser, e.receive)
//                                 assert(props != null)
//                                 props = updateAndFireProps({
//                                     ...props,
//                                     withVideo: {
//                                         ...props.withVideo,
//                                         receive: e.receive
//                                     }
//                                 })
//                             }
//                             break;

//                         case 'AcceptClicked':
//                             this.fireEvent<ReceivedCallDlg>({
//                                 type: 'ReceivedCallDlg',
//                                 props: null
//                             });
//                             this.setWithVideo(withVideoFromProps(props));
//                             loop = false;
//                             break;


//                         case 'RejectClicked':
//                             this.fireEvent<ReceivedCallDlg>({
//                                 type: 'ReceivedCallDlg',
//                                 props: null
//                             });
//                             this.setWithVideo(null);
//                             loop = false;
//                             break;

//                         case 'RegularFunctionsShutdown':
//                             return;
//                     }
//                 }
//             } finally {
//                 subscr.unsubscribe();
//             }
//         }
//     }

//     private async doProcessMessages(): Promise<void> {
//         for (let i = 0; i < this.messages.length; ++i) {
//             this.abortController.signal.throwIfAborted();
//             const msg = RemoteMsg.check(JSON.parse(this.messages[i]))
//             await this.onRemoteMsg(msg);
//         }
//         this.messages.splice(0, this.messages.length);
//         this.processMessages = null;
//     }

//     private getUserMedia(): void {
//         assert(this.withVideo != null);
//         navigator.mediaDevices.getUserMedia({
//             audio: true,
//             video: this.withVideo.send && this.remoteAcceptingVideo,
//         }).then(stream => {
//             this.outerSignal.throwIfAborted();
//             if (this.st1 === 'creating media') {
//                 this.onUserMedia(stream);
//             }
//         }).catch(reason => {
//             if (reason.name === 'NotAllowedError') {
//                 this.outerSignal.throwIfAborted();
//                 if (this.st1 === 'creating media') {
//                     this.onNotAllowedError();
//                 }
//             }
//             console.log('reason.name', reason.name);
//             console.error('caught in getUserMedia', reason);
//         })
//     }

//     private createPc(): RTCPeerConnection {
//         const pc = new RTCPeerConnection();
//         pc.onnegotiationneeded = async () => {
//             console.log('negotiationneeded', this.st);
//             this.outerSignal.throwIfAborted();
//             await pc.setLocalDescription();
//             const sdp = pc.localDescription;
//             if (sdp == null) throw new Error('local description null');
//             assert(this.withVideo != null);
//             const msg: RemoteMsg = {
//                 type: 'sdp',
//                 jsonSdp: JSON.stringify(sdp),
//                 videoAccepted: this.withVideo.receive
//             }
//             this.sendRemoteMsg(msg);
//         }
//         pc.onicecandidate = (e) => {
//             console.log('icecandidate', this.st);
//             this.dbg(`icecandidate`)
//             this.outerSignal.throwIfAborted();
//             if (e.candidate == null) return;
//             const msg: RemoteMsg = {
//                 type: 'candidate',
//                 jsonCandidate: JSON.stringify(e.candidate)
//             }
//             this.sendRemoteMsg(msg);
//         }
//         pc.ontrack = (e) => {
//             console.log('track', this.st);
//             this.dbg('track');
//             if (e.streams.length !== 1) {
//                 console.error('unexpected length of streams', e.streams);
//                 return;
//             }
//             this.fireEvent<RemoteMediaStream>({
//                 type: 'RemoteMediaStream',
//                 remoteUser: this.remoteUser,
//                 stream: e.streams[0]
//             });
//         }
//         pc.onsignalingstatechange = (e) => {
//             console.log('signalingState', pc.signalingState);
//             this.dbg(`signalingState ${pc.signalingState}`)
//         }
//         pc.oniceconnectionstatechange = (e) => {
//             console.log('iceConnectionState', pc.iceConnectionState);
//             this.dbg(`iceConnectionState ${pc.iceConnectionState}`)
//         }


//         return pc;
//     }

//     private dbg(msg: string) {
//         this.fireEvent<ChatAddHintLine>({
//             type: 'ChatAddHintLine',
//             hint: `${this.remoteUser}: [${this.st}] ${msg}`
//         });
//     }

//     private async onRemoteMsg(msg: RemoteMsg): Promise<void> {
//         console.log('onRemoteMsg', msg, 'at', this.st);
//         this.dbg(`onRemoteMsg ${msg.type}`);

//         switch (msg.type) {
//             case 'prepareCall':
//                 switch (this.st1) {
//                     case 'sending offer':
//                         if (this.user < this.remoteUser) {
//                             // stay in 'sending offer'
//                         } else {
//                             this.remoteRole = 'caller';
//                             if (this.pc == null) throw new Error('pc null');
//                             if (this.withVideo == null) throw new Error('withVideo null');
//                             this.pc.close();
//                             this.pc = this.createPc();
//                             this.sendRemoteMsg({
//                                 type: 'prepareAnswer',
//                                 callAccepted: true,
//                                 videoAccepted: this.withVideo.receive
//                             })
//                             this.st('receiving sdp');
//                         }
//                         break;
//                 }
//                 break;

//             case 'prepareAnswer':
//                 switch (this.st1) {
//                     case 'sending offer':
//                         if (msg.callAccepted) {
//                             this.pc = this.createPc();
//                             nyi();
//                             this.getUserMedia();
//                             this.st('rest');
//                         }
//                         break;
//                 }
//                 break;

//             case 'sdp':
//                 switch (this.st1) {
//                     case 'receiving sdp':
//                         assert(this.withVideo != null);
//                         this.pc = this.createPc();
//                         this.st('setting remote offer');
//                         const sdp = JSON.parse(msg.jsonSdp) as RTCSessionDescription;
//                         assert(sdp.type === 'offer');
//                         await this.pc.setRemoteDescription(JSON.parse(msg.jsonSdp))
//                         this.st('creating media');
//                         this.getUserMedia()
//                         const stream = await navigator.mediaDevices.getUserMedia({
//                             video: this.withVideo.send && this.remoteAcceptingVideo,
//                             audio: true
//                         })

//                         break;
//                 }
//                 break;

//             case 'candidate':
//                 nyi();
//                 break;

//             case 'videoAcception':
//                 nyi();
//                 break;
//         }
//     }

//     private onnegotationneeded() {
//         console.log('onnegotationneeded');
//         this.dbg('negotiationneeded');
//         nyi();
//     }

//     addMessages(messages: string[]) {
//         this.messages.push(...messages);
//         if (this.processMessages == null) {
//             this.processMessages = this.doProcessMessages();
//         }
//     }

//     /**
//      * withVideo = null means reject of the call
//      * @param withVideo 
//      */
//     setWithVideo(withVideo: WithVideo | null) {
//         this.withVideo = withVideo ?? undefined;

//         switch (this.st1) {
//             case 'decide if video':
//                 if (withVideo == null) {
//                     this.sendRemoteMsg({
//                         type: 'prepareAnswer',
//                         callAccepted: false,
//                         videoAccepted: false
//                     })
//                     this.fireEvent<SetConnectionComp>({
//                         type: 'SetConnectionComp',
//                         remoteUser: this.remoteUser,
//                         props: null
//                     });
//                     this.st('final');
//                 } else {
//                     this.sendRemoteMsg({
//                         type: 'prepareAnswer',
//                         callAccepted: true,
//                         videoAccepted: withVideo.receive
//                     })
//                     this.withVideo = withVideo;
//                     this.st('receiving sdp');
//                 }
//                 break;
//         }
//     }

//     release() {
//         this.releaseAbortController();
//     }

//     //
//     // transitions
//     //

//     onUserMedia(stream: MediaStream) {

//     }

//     onNotAllowedError() {
//         nyi();
//     }

//     st(s: StateOld) {
//         this.st1 = s;
//         this.dbg(`new state`);
//     }

//     private abortController: AbortController
//     private releaseAbortController: () => void
//     private eventBus: EventBus<unknown>;
//     private st1: StateOld;
//     private remoteRole: RemoteRole
//     /**
//      * immutable
//      */
//     private withVideo?: WithVideo;
//     private remoteAcceptingVideo = true;
//     private mediaProm: Promise<MediaStream> | null = null;
//     private outerSignal: AbortSignal;
//     private user: string;
//     private remoteUser: string;
//     private messages: string[] = [];
//     private processMessages: Promise<void> | null = null;
//     private pc: RTCPeerConnection | null = null;
//     private send: (msg: string) => void;
// }

const ManagePeerConnectionState = rt.Union(
    rt.Literal('before offer user media'),
    rt.Literal('setting remote offer description')
)

// // BEGIN bringt so auch nix...
// const State = rt.Union(rt.Literal('sending prepare call'), rt.Record({
//     main: rt.Literal('manage peer connection'),
//     sub: ManagePeerConnectionState
// }))

// type St1 = rt.Static<typeof State>
// // END bringt so auch nix...

type State = 'sending prepareCall'
    | 'receiving prepareCall'
    | 'deciding video'
    | 'receiving offer sdp'
    | {
        main: 'manage peer connection',
        sub: ManagePeerConnectionState
    }

    | 'final';

type ManagePeerConnectionState = 'before offer user media'
    | 'before offer negotiation'
    | 'setting local offer description'
    | 'receiving answer sdp'
    | 'setting remote answer description'
    | 'setting remote offer description'
    | 'before answer user media'
    | 'setting local answer description'
    | 'awaiting candidates'
    | 'adding candidate'


function cloneVideoOnly(mediaStream: MediaStream | null) {
    if (mediaStream == null) return null;
    const videoTracks = mediaStream.getVideoTracks();
    if (videoTracks.length > 0) {
        const clone = mediaStream.clone();
        clone.getAudioTracks().forEach(audioTrack => {
            audioTrack.stop();
        })
        return clone;
    }

    return null;
}
/**
 * see WebRTC Demo.vpp://diagram/I6aLkXGD.AACASGE (Connection Activity Diagram3)
 */
export class Connection {
    constructor(sentVideoUpdated: (stream: MediaStream | null) => void,
        closed: () => void,
        send: (msg: string) => void,
        eventBus: EventBus<unknown>,
        user: string, remoteUser: string, remoteRole: RemoteRole,
        outerSignal: AbortSignal,
        withVideo?: WithVideo
    ) {
        [this.abortController, this.releaseAbortController] = chainedAbortController(outerSignal);
        this.sentVideoUpdated = sentVideoUpdated;
        this.closed = closed;
        this.send = send;
        this.eventBus = eventBus;
        this.user = user;
        this.remoteUser = remoteUser;
        this.remoteRole = remoteRole;
        this.withVideo = withVideo ?? null;
        this.outerSignal = outerSignal;

        switch (remoteRole) {
            case 'callee':
                assert(this.withVideo != null);
                this.preparingCall = true;
                this.sendRemoteMsg({
                    type: 'prepareCall',
                    videoAccepted: this.withVideo.receive
                })
                this.forwardMessages();
                break;

            case 'caller':
                this.nextRemoteMsg()/* 
                this.waitForPrepareCall() */.then(msg => {
                    this.abortController.signal.throwIfAborted();
                    if (msg.type !== 'prepareCall') {
                        console.error('unexpected msg (expected prepareCall)', msg);
                    }
                    assert(msg.type === 'prepareCall')
                    this.remoteAcceptingVideo = msg.videoAccepted;
                    this.fireEvent<EnqueueCall>({
                        type: 'EnqueueCall',
                        remoteUser: this.remoteUser
                    });
                    this.forwardMessages();
                })
                break;
        }

        this.pc.ontrack = (e => {
            this.dbg('ontrack: e.streams.length=' + e.streams[0])
            // console.log("pc.ontrack: e=", e);
            this.abortController.signal.throwIfAborted();
            this.fireEvent<SetConnectionComp>({
                type: 'SetConnectionComp',
                remoteUser: remoteUser,
                props: {
                    remoteUser: remoteUser,
                    msg: null,
                    stream: e.streams[0]
                }
            });
        })

        this.pc.onnegotiationneeded = () => {
            this.dbg('negotiationneeded')
            this.abortController.signal.throwIfAborted();
            this.makingOffer = true;
            this.pc.setLocalDescription().then(() => {
                this.abortController.signal.throwIfAborted();
                assert(this.withVideo != null);
                this.sendRemoteMsg({
                    type: 'sdp',
                    jsonSdp: JSON.stringify(this.pc.localDescription),
                    videoAccepted: this.withVideo.receive
                })

            }).finally(() => {
                this.makingOffer = false;
            })
        }

        this.pc.onicecandidate = (e => {
            this.dbg('icecandidate')
            this.abortController.signal.throwIfAborted();
            if (e.candidate != null) {
                this.sendRemoteMsg({
                    type: 'candidate',
                    jsonCandidate: JSON.stringify(e.candidate)
                })
            }
        })

        this.pc.oniceconnectionstatechange = () => {
            this.dbg('iceconnectionstatechange: ' + JSON.stringify(this.pc.iceConnectionState));
            this.abortController.signal.throwIfAborted();
            if (this.pc.iceConnectionState === 'failed') {
                this.pc.restartIce();
            }
        }
    }

    private async waitForPrepareCall(): Promise<RemoteMsg> {
        let msg;
        do {
            msg = await this.nextRemoteMsg()
            if (msg.type === 'prepareCall') return msg;
        } while (true);
    }

    private async forwardMessages() {
        this.abortController.signal.throwIfAborted();
        try {
            await Promise.all([this.forwardRemoteMessages(), this.forwardEvents()])

        } catch (reason: any) {
            if (reason.name !== 'AbortError') {
                console.error(reason);
            } else {
                // console.log('ignoring: ', reason);
            }
        }
    }

    private async forwardRemoteMessages() {
        while (true) {
            this.abortController.signal.throwIfAborted();
            const msg = await this.nextRemoteMsg();
            await this.handleRemoteMsg(msg);
        }
    }

    private async forwardEvents() {
        this.abortController.signal.throwIfAborted();
        const subscr = this.eventBus.subscribe();

        try {
            const MyEvents = rt.Union(HangUp)
            while (true) {
                const e = await waitForGuard({ subscr: subscr }, MyEvents, this.abortController.signal);
                this.abortController.signal.throwIfAborted();
                switch (e.type) {
                    case 'HangUp':
                        this.sendRemoteMsg({
                            type: 'hangUp',
                        })
                        this.rawHangUp();
                        break;
                }
            }

        } finally {
            subscr.unsubscribe();
        }
    }

    private async handleRemoteMsg(msg: RemoteMsg): Promise<void> {
        this.dbg('handleRemoteMsg: ' + JSON.stringify(msg))
        switch (msg.type) {
            case 'sdp':
                this.remoteAcceptingVideo = msg.videoAccepted;
                this.preparingCall = false;
                const description = JSON.parse(msg.jsonSdp) as RTCSessionDescription;
                this.ignoreOffer = !this.polite() && description.type === 'offer' && (this.makingOffer || this.pc.signalingState !== 'stable')
                if (this.ignoreOffer) return;
                await this.pc.setRemoteDescription(description);
                this.abortController.signal.throwIfAborted();
                if (description.type === 'offer') {
                    await this.updateMedia();
                    await this.pc.setLocalDescription();
                    this.abortController.signal.throwIfAborted();
                    assert(this.withVideo != null); // otherwise concept is completely wrong ;-)
                    this.sendRemoteMsg({
                        type: 'sdp',
                        jsonSdp: JSON.stringify(this.pc.localDescription),
                        videoAccepted: this.withVideo?.receive
                    })
                }
                break;

            case 'candidate':
                if (!this.ignoreOffer) {
                    const candidate = JSON.parse(msg.jsonCandidate);
                    // console.log('before addIceCandidate: candidate', candidate)
                    try {
                        await this.pc.addIceCandidate(candidate);
                    } catch (reason: any) {
                        console.error(reason);
                    }
                }
                break;

            case 'prepareCall':
                this.remoteAcceptingVideo = msg.videoAccepted;
                await this.updateMedia();
                this.abortController.signal.throwIfAborted();
                break;

            case 'hangUp':
                this.fireEvent<ChatAddHintLine>({
                    type: 'ChatAddHintLine',
                    hint: `${this.remoteUser} has hung up.`
                });
                this.rawHangUp();
                break;

            case 'videoAcception':
                this.remoteAcceptingVideo = msg.accepted;
                await this.updateMedia();
                break;
        }

    }

    private rawHangUp() {
        // console.log('rawHangUp for ', this.remoteUser)
        this.abortController.signal.throwIfAborted();
        this.abortController.abort();
        if (this.sendingVideo) {
            this.sentVideoUpdated(null);
        }
        this.fireEvent<SetConnectionComp>({
            type: 'SetConnectionComp',
            remoteUser: this.remoteUser,
            props: null
        });
        if (this.videoSender?.track != null) {
            this.videoSender?.track.stop();
        }
        if (this.audioSender?.track != null) {
            this.audioSender?.track.stop();
        }
        this.pc.close();
        this.closed();
    }

    private async updateMedia() {
        this.dbg('updateMedia: (outStream == null)=' + JSON.stringify(this.outStream == null) + ', sendingVideo=' + JSON.stringify(this.sendingVideo) + ', withVideo.send=' + JSON.stringify(this.withVideo?.send) + ', remoteAcceptingVideo=' + this.remoteAcceptingVideo);
        if (this.withVideo == null) return;

        while (!this.updatingMedia && (this.outStream == null || (this.sendingVideo !== (this.withVideo.send && this.remoteAcceptingVideo)))) {
            this.updatingMedia = true;
            const oldSendingVideo = this.sendingVideo;
            this.sendingVideo = this.withVideo.send && this.remoteAcceptingVideo;
            this.dbg('new value sendingVideo: ' + JSON.stringify(this.sendingVideo));
            this.outStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: this.sendingVideo ? {
                    width: 1024,
                    height: 768
                } : false
            })
            this.abortController.signal.throwIfAborted();
            const senders = this.pc.getSenders();
            // console.log('senders.length', senders.length);
            // for (const sender of senders) {
            // console.log('track of sender', sender.track);
            // }
            // if (senders.length === 0) {
            //     // just add all tracks to the peer connection
            //     const newTracks = this.outStream.getTracks();
            //     console.log('tracks of new outStream', newTracks)
            //     for (const track of newTracks) {
            //         this.dbg('adding track (' + track.kind + ') to pc');
            //         this.pc.addTrack(track, this.outStream);
            //     }
            // } else {
            //     const audioTracks = this.outStream.getAudioTracks();
            //     const audioTrack = audioTracks.length > 0 ? audioTracks[0] : null;
            //     const videoTracks = this.outStream.getVideoTracks();
            //     const videoTrack = videoTracks.length > 0 ? videoTracks[0] : null;
            //     console.log('audioTrack', audioTrack, 'videoTrack', videoTrack)
            //     // replace tracks
            //     let replacedVideo = false;
            //     for (const sender of senders) {
            //         if (sender.track?.kind === 'audio') {
            //             console.log('replace audio track in pc by', audioTrack)
            //             await sender.replaceTrack(audioTrack)
            //             this.abortController.signal.throwIfAborted();
            //         } else if (sender.track?.kind === 'video') {
            //             console.log('replacing video track in pc by', videoTrack)
            //             await sender.replaceTrack(videoTrack)
            //             this.abortController.signal.throwIfAborted();
            //             replacedVideo = true;
            //         }

            //         if (videoTrack != null && !replacedVideo) {
            //             try {
            //                 this.pc.addTrack(videoTrack, this.outStream)
            //             } catch (reason) {
            //                 console.error(reason);
            //             }
            //         }
            //     }
            // }
            // {
            //     // new
            //     const audioTracks = this.outStream.getAudioTracks();
            //     const audioTrack = audioTracks.length > 0 ? audioTracks[0] : null;
            //     const videoTracks = this.outStream.getVideoTracks();
            //     const videoTrack = videoTracks.length > 0 ? videoTracks[0] : null;
            //     if (this.audioSender != null) {
            //         if (this.audioSender.track != null) this.audioSender.track.stop();
            //         await this.audioSender.replaceTrack(audioTrack);
            //     } else if (audioTrack != null) {
            //         this.audioSender = this.pc.addTrack(audioTrack, this.outStream);
            //     }
            //     if (this.videoSender != null) {
            //         if (this.videoSender.track != null) this.videoSender.track.stop();
            //         await this.videoSender.replaceTrack(videoTrack);
            //     } else if (videoTrack != null) {
            //         this.videoSender = this.pc.addTrack(videoTrack, this.outStream);
            //     }

            // }
            {
                // oder doch "plump und einfach"
                if (this.videoSender != null) {
                    this.videoSender.track?.stop();
                    this.pc.removeTrack(this.videoSender);
                    this.videoSender = null;
                }
                if (this.audioSender != null) {
                    this.audioSender.track?.stop();
                    this.pc.removeTrack(this.audioSender);
                    this.audioSender = null;
                }

                this.outStream.getTracks().forEach(track => {
                    assert(this.outStream != null);
                    if (track.kind === 'audio') {
                        this.audioSender = this.pc.addTrack(track, this.outStream);
                    } else {
                        this.videoSender = this.pc.addTrack(track, this.outStream);
                    }
                })
            }

            this.updatingMedia = false;
            if (this.sendingVideo !== oldSendingVideo) {
                const cloned = cloneVideoOnly(this.outStream);
                // console.log('before sentVideoUpdated: cloned', cloned, 'this.outStream', this.outStream);
                assert((cloned != null) === this.sendingVideo);
                this.sentVideoUpdated(cloned);

            }
        }
    }

    private polite() {
        return this.remoteUser < this.user;
    }

    private nextRemoteMsg(): Promise<RemoteMsg> {
        this.abortController.signal.throwIfAborted();
        if (this.messages.length === 0) {
            return new Promise<RemoteMsg>((res, rej) => {
                this.resolveNextRemoteMsg = res;
                const onAbort = () => {
                    rej(this.abortController.signal.reason);
                    this.abortController.signal.removeEventListener('abort', onAbort);
                }
                this.abortController.signal.addEventListener('abort', onAbort);
            })
        } else {
            return Promise.resolve(this.parseRemoteMsg(this.messages.splice(0, 1)[0]))
        }
    }

    async onDequeueCall() {
        function withVideoFromProps(props: ReceivedCallProps | null): WithVideo | null {
            return props?.withVideo ?? null;
        }

        this.dbg('onDequeueCall')

        if (this.withVideo == null) {
            const updateAndFireProps = (newProps: ReceivedCallProps | null): ReceivedCallProps | null => {
                this.fireEvent<ReceivedCallDlg>({
                    type: 'ReceivedCallDlg',
                    props: newProps
                });

                return newProps;
            }
            let props: ReceivedCallProps | null = null;
            props = updateAndFireProps({
                remoteUser: this.remoteUser,
                withVideo: defaultWithVideo(this.user, this.remoteUser)
            })
            assert(props != null);
            const subscr = this.eventBus.subscribe();
            try {
                let loop = true;

                while (loop) {
                    const e = await waitForGuard({ subscr: subscr }, rt.Union(SendVideoChanged, ReceiveVideoChanged, AcceptClicked, HangUpClicked, RemoteHangUp, RegularFunctionsShutdown), this.abortController.signal);
                    switch (e.type) {
                        case 'SendVideoChanged':
                            if (e.remoteUser === this.remoteUser) {
                                localStorageAccess.lastVideoSettings.send.set(this.user, e.remoteUser, e.send)
                                assert(props != null);
                                props = updateAndFireProps({
                                    ...props,
                                    withVideo: {
                                        ...props.withVideo,
                                        send: e.send
                                    }
                                })
                            }
                            break;

                        case 'ReceiveVideoChanged':
                            if (e.remoteUser === this.remoteUser) {
                                localStorageAccess.lastVideoSettings.receive.set(this.user, e.remoteUser, e.receive)
                                assert(props != null)
                                props = updateAndFireProps({
                                    ...props,
                                    withVideo: {
                                        ...props.withVideo,
                                        receive: e.receive
                                    }
                                })
                            }
                            break;

                        case 'AcceptClicked':
                            this.setWithVideo(withVideoFromProps(props));
                            loop = false;
                            break;


                        case 'HangUpClicked':
                            if (e.remoteUser === this.remoteUser) {
                                this.setWithVideo(null);
                                loop = false;
                            } else {
                                // console.log('ignored "wrong" HangUpClicked')
                            }
                            break;

                        case 'RemoteHangUp':
                            if (e.remoteUser === this.remoteUser) {
                                loop = false;
                            }
                            break;

                        case 'RegularFunctionsShutdown':
                            loop = false;
                            break;
                    }
                }
            } catch (reason: any) {
                if (reason.name !== 'AbortError') {
                    throw reason;
                }
            } finally {
                this.fireEvent<ReceivedCallDlg>({
                    type: 'ReceivedCallDlg',
                    props: null
                });
                subscr.unsubscribe();
            }
        }
    }

    /**
     * withVideo = null means reject of the call
     * @param withVideo 
     */
    setWithVideo(wv: WithVideo | null) {
        this.abortController.signal.throwIfAborted();
        this.dbg('setWithVideo: ' + JSON.stringify(wv));
        if (wv != null) {
            if (this.withVideo == null || this.withVideo.receive !== wv.receive) {
                this.sendRemoteMsg({
                    type: 'videoAcception',
                    accepted: wv.receive
                })
            }
            this.withVideo = wv;

            if (!this.preparingCall) {
                this.updateMedia();
            }
        } else {
            this.sendRemoteMsg({
                type: 'hangUp'
            })
            this.rawHangUp();
        }
    }

    addMessages(messages: string[]) {
        if (this.abortController.signal.aborted) console.error('aborted?!');
        this.abortController.signal.throwIfAborted();
        if (messages.length === 0) return;
        this.dbg('addMessages: ' + JSON.stringify(messages));

        if (this.resolveNextRemoteMsg != null) {
            this.resolveNextRemoteMsg(this.parseRemoteMsg(messages[0]))
            this.messages.push(...messages.splice(1));
        } else {
            this.messages.push(...messages);
        }
    }

    private parseRemoteMsg(stringifiedMsg: string) {
        return RemoteMsg.check(JSON.parse(stringifiedMsg));
    }

    async shutdownAndJoin(): Promise<void> {
        this.abortController.signal.throwIfAborted();
        // this.sendRemoteMsg({
        //     type: 'hangUp'
        // })
        // console.log('connection sent hangUp')
        this.rawHangUp();
        // doch nix zu "joinen"
    }

    private fireEvent<T>(t: T) {
        this.eventBus.publish(t);
    }

    private sendRemoteMsg(msg: RemoteMsg) {
        this.send(JSON.stringify(msg));
    }

    private dbg(msg: string) {
        this.fireEvent<ChatAddHintLine>({
            type: 'ChatAddHintLine',
            hint: `${this.remoteUser}\n${msg}`
        })
    }

    private sentVideoUpdated: (stream: MediaStream | null) => void;
    private closed: () => void;
    private send: (stringifiedMsg: string) => void;
    private abortController: AbortController;
    private releaseAbortController: () => void;
    private eventBus: EventBus<unknown>;
    private user: string;
    private remoteUser: string;
    private remoteRole: 'callee' | 'caller';
    private withVideo: WithVideo | null;
    private pc: RTCPeerConnection = new RTCPeerConnection(config);
    private videoSender: RTCRtpSender | null = null;
    private audioSender: RTCRtpSender | null = null;
    private makingOffer = false;
    private ignoreOffer = false;
    private remoteAcceptingVideo = false;
    private sendingVideo = false;
    private updatingMedia = false;
    private outStream: MediaStream | null = null;
    private resolveNextRemoteMsg: ((msg: RemoteMsg) => void) | null = null;
    private messages: string[] = [];
    private outerSignal: AbortSignal;
    private preparingCall = false;
}

export class ConnectionOld {
    constructor(sentVideoUpdated: (stream: MediaStream | null) => void,
        closed: () => void,
        send: (msg: string) => void,
        eventBus: EventBus<unknown>,
        user: string, remoteUser: string, remoteRole: RemoteRole,
        outerSignal: AbortSignal,
        withVideo?: WithVideo
    ) {
        assert((withVideo != null) === (remoteRole === 'callee'));
        [this.abortController, this.releaseAbortController] = chainedAbortController(outerSignal)
        this.eventBus = eventBus;
        this.user = user;
        this.remoteUser = remoteUser;
        this.remoteRole = remoteRole;
        this.withVideo = withVideo ?? null;
        this.closed = closed;
        this.send = send;


        if (remoteRole === 'callee') {
            assert(this.withVideo === withVideo)
            this.sendRemoteMsg({
                type: 'prepareCall',
                videoAccepted: this.withVideo.receive
            })
            this.fireEvent<SetConnectionComp>({
                type: 'SetConnectionComp',
                remoteUser: this.remoteUser,
                props: {
                    remoteUser: this.remoteUser,
                    msg: `Calling ${this.remoteUser}`,
                    stream: null,
                }
            });
            this.st1 = ('sending prepareCall')
            this.dbg('constructed for callee')
        } else {
            assert(remoteRole === 'caller');
            assert(this.remoteRole === 'caller')
            this.st1 = ('receiving prepareCall');
            this.dbg('constructed for caller')
        }

        this.handleEventBus(this.abortController.signal);
    }

    async onDequeueCall() {

        function withVideoFromProps(props: ReceivedCallProps | null): WithVideo | null {
            return props?.withVideo ?? null;
        }

        this.dbg('onDequeueCall')

        if (this.withVideo == null) {
            const updateAndFireProps = (newProps: ReceivedCallProps | null): ReceivedCallProps | null => {
                this.fireEvent<ReceivedCallDlg>({
                    type: 'ReceivedCallDlg',
                    props: newProps
                });

                return newProps;
            }
            let props: ReceivedCallProps | null = null;
            props = updateAndFireProps({
                remoteUser: this.remoteUser,
                withVideo: defaultWithVideo(this.user, this.remoteUser)
            })
            assert(props != null);
            const subscr = this.eventBus.subscribe();
            try {
                let loop = true;

                while (loop) {
                    const e = await waitForGuard({ subscr: subscr }, rt.Union(SendVideoChanged, ReceiveVideoChanged, AcceptClicked, HangUpClicked, RemoteHangUp, RegularFunctionsShutdown), this.abortController.signal);
                    switch (e.type) {
                        case 'SendVideoChanged':
                            if (e.remoteUser === this.remoteUser) {
                                localStorageAccess.lastVideoSettings.send.set(this.user, e.remoteUser, e.send)
                                assert(props != null);
                                props = updateAndFireProps({
                                    ...props,
                                    withVideo: {
                                        ...props.withVideo,
                                        send: e.send
                                    }
                                })
                            }
                            break;

                        case 'ReceiveVideoChanged':
                            if (e.remoteUser === this.remoteUser) {
                                localStorageAccess.lastVideoSettings.receive.set(this.user, e.remoteUser, e.receive)
                                assert(props != null)
                                props = updateAndFireProps({
                                    ...props,
                                    withVideo: {
                                        ...props.withVideo,
                                        receive: e.receive
                                    }
                                })
                            }
                            break;

                        case 'AcceptClicked':
                            this.setWithVideo(withVideoFromProps(props));
                            loop = false;
                            break;


                        case 'HangUpClicked':
                            if (e.remoteUser === this.remoteUser) {
                                this.setWithVideo(null);
                                loop = false;
                            } else {
                                // console.log('ignored "wrong" HangUpClicked')
                            }
                            break;

                        case 'RemoteHangUp':
                            if (e.remoteUser === this.remoteUser) {
                                loop = false;
                            }
                            break;

                        case 'RegularFunctionsShutdown':
                            loop = false;
                            break;
                    }
                }
            } finally {
                this.fireEvent<ReceivedCallDlg>({
                    type: 'ReceivedCallDlg',
                    props: null
                });
                subscr.unsubscribe();
            }
        }
    }

    /**
     * withVideo = null means reject of the call
     * @param withVideo 
     */
    setWithVideo(withVideo: WithVideo | null) {
        switch (this.st1) {
            case 'deciding video':
                this.withVideo = withVideo;
                if (this.withVideo == null) {
                    this.sendRemoteMsg({
                        type: 'hangUp'
                    })
                    this.st('final');
                    this.exitStm();
                } else {
                    this.pc = this.createPc();
                    this.sendingVideo = this.withVideo.send && this.remoteAcceptingVideo;
                    navigator.mediaDevices.getUserMedia({
                        video: this.sendingVideo,
                        audio: true
                    }).then(stream => {
                        this.gotUserMedia(stream)
                    }, (reason: any) => {
                        this.userMediaError(reason);
                    })
                    this.st({
                        main: 'manage peer connection', sub: 'before offer user media'
                    })
                }
                break;

            default:
                if (typeof this.st1 === 'object') {
                    switch (this.st1.main) {
                        case 'manage peer connection':
                            switch (this.st1.sub) {
                                case 'before offer user media':
                                    this.withVideo = withVideo;
                                    break;

                                case 'awaiting candidates':
                                    // TODO begin testing
                                    console.warn('begin test');
                                    assert(this.withVideo != null);
                                    assert(this.pc != null);
                                    if (withVideo != null && this.withVideo.send && !withVideo.send && this.remoteAcceptingVideo) {
                                        this.pc.getSenders().forEach(sender => {
                                            if (sender.track?.kind === 'video') {
                                                if (false) {
                                                    sender.track?.stop();
                                                    // console.log('stopped track');
                                                    this.dbg('stopped track on withVideo.send = false')
                                                    this.dbg('before sender.replaceTrack');
                                                    this.replacedSender = sender;
                                                    sender.replaceTrack(null).then(() => {
                                                        this.dbg('after sender.replaceTrack');
                                                    });

                                                } else {
                                                    assert(this.pc != null);
                                                    this.pc.removeTrack(sender)
                                                }
                                            }
                                        })
                                    } else if (withVideo != null && !this.withVideo.send && withVideo.send && this.remoteAcceptingVideo) {
                                        navigator.mediaDevices.getUserMedia({
                                            video: true,
                                            audio: true
                                        }).then(stream => {
                                            assert(this.pc != null);
                                            if (false) {
                                                if (this.replacedSender != null) {
                                                    assert(stream.getVideoTracks().length === 1)
                                                    assert(this.replacedSender != null);
                                                    // @ts-ignore
                                                    this.replacedSender.replaceTrack(stream.getVideoTracks()[0])
                                                    this.dbg('replaced track on replacedSender');
                                                }
                                            } else {
                                                this.pc.addTrack(stream.getVideoTracks()[0], stream);
                                            }
                                        })
                                    }
                                    this.withVideo = withVideo;
                                    if (withVideo != null) {
                                        localStorageAccess.lastVideoSettings.send.set(this.user, this.remoteUser, withVideo.send);
                                        localStorageAccess.lastVideoSettings.receive.set(this.user, this.remoteUser, withVideo.receive);
                                    }
                                    console.warn('end test');
                                    // TODO end testing
                                    break;

                                default:
                                    this.withVideo = withVideo;
                                    break;
                            }
                            break;

                        default:
                            this.withVideo = withVideo;
                            break;

                    }
                } else {
                    this.withVideo = withVideo;
                    break;
                }
                break;
        }
    }


    addMessages(messages: string[]) {
        this.dbg('addMessages: ' + JSON.stringify(messages))
        this.messages.push(...messages);

        if (messages.findIndex(stringifiedMsg => {
            const msg = RemoteMsg.check(JSON.parse(stringifiedMsg));
            return msg.type === 'hangUp'
        }) !== -1) {
            this.fireEvent<RemoteHangUp>({
                type: 'RemoteHangUp',
                remoteUser: this.remoteUser
            });
            return;
        }

        switch (this.st1) {
            case 'sending prepareCall':
            // no break
            case 'receiving prepareCall':
                this.evtlProcessFirstRemoteMsg();
                break;

            default:
                if (typeof this.st1 === 'object') {
                    switch (this.st1.main) {
                        case 'manage peer connection':
                            switch (this.st1.sub) {
                                case 'receiving answer sdp':
                                    this.evtlProcessFirstRemoteMsg();
                                    break;
                                case 'awaiting candidates':
                                    this.evtlProcessFirstRemoteMsg();
                                    break;
                            }
                            break;
                    }
                }
        }
    }

    private evtlProcessFirstRemoteMsg() {
        if (this.messages.length > 0) {
            const stringifiedMsg = this.messages[0];
            const lenBefore = this.messages.length;
            this.messages.splice(0, 1);
            assert(this.messages.length === lenBefore - 1);
            this.parseAndProcessMsg(stringifiedMsg);
        }
    }

    private parseAndProcessMsg(stringifiedMsg: string) {
        this.dbg('parseAndProcessMsg: ' + stringifiedMsg)
        const msg = RemoteMsg.check(JSON.parse(stringifiedMsg));
        this.onRemoteMsg(msg);
    }

    private async handleEventBus(signal: AbortSignal) {
        const subscr = this.eventBus.subscribe();
        try {
            const MyEvents = rt.Union(HangUp, RemoteHangUp)
            const e = await waitForGuard({ subscr: subscr }, MyEvents, signal);
            this.dbg('handle event ' + JSON.stringify(e));
            switch (e.type) {
                case 'HangUp':

                    if (e.remoteUsers.includes(this.remoteUser)) {
                        this.hangUp();
                    }
                    break;
                case 'RemoteHangUp':
                    if (e.remoteUser === this.remoteUser) {
                        this.remoteHangUp();
                    }
                    break;
                default:
                    nyi();
            }
        } catch (reason) {
            this.onError(reason);
        } finally {
            subscr.unsubscribe();
        }
    }

    private onError(reason: any) {
        if (reason.name !== 'AbortError') {
            console.error(reason);
        } else {
            // console.log('ignore', reason);
        }

    }

    private enterAwaitingCandidates() {
        this.st(
            {
                main: 'manage peer connection',
                sub: 'awaiting candidates'
            }
        )
        assert(this.withVideo != null);
        if (this.sendingVideo !== (this.withVideo.send && this.remoteAcceptingVideo)) {
            navigator.mediaDevices.getUserMedia({
                video: (this.sendingVideo = (this.withVideo.send && this.remoteAcceptingVideo)),
                audio: true
            }).then(stream => {
                this.gotUserMedia(stream);
            }, (reason) => {
                this.userMediaError(reason);
            })
            this.st({
                main: 'manage peer connection',
                sub: 'before offer user media'
            })
        }

    }

    // BEGIN events as in WebRTC Demo.vpp://diagram/XBuqVnGD.AACAQ_o

    private onRemoteMsg(m: RemoteMsg) {
        this.dbg(`onRemoteMsg ${m.type}`)

        if (m.type === 'videoAcception') {
            this.remoteAcceptingVideo = m.accepted;
            if (typeof this.st1 === 'object' && this.st1.main === 'manage peer connection' && this.st1.sub === 'awaiting candidates') {
                // enterAwaitingCandidates();
            }
            this.evtlProcessFirstRemoteMsg();
            return;
        }

        switch (this.st1) {
            case 'sending prepareCall':
                switch (m.type) {
                    case 'hangUp':
                        this.st('final');
                        this.exitStm();
                        break;
                    case 'sdp':
                        this.remoteAcceptingVideo = m.videoAccepted;
                        this.pc = this.createPc();
                        this.pc.setRemoteDescription(JSON.parse(m.jsonSdp)).then(() => {
                            this.abortController.signal.throwIfAborted();
                            this.remoteOfferDescriptionSet();
                        })
                        this.st({ main: 'manage peer connection', sub: 'setting remote offer description' });
                        break;
                    case 'prepareCall':
                        this.remoteAcceptingVideo = m.videoAccepted

                        if (this.user < this.remoteUser) {
                            assert(this.withVideo != null);
                            this.pc = this.createPc();
                            this.sendingVideo = this.withVideo.send && this.remoteAcceptingVideo;
                            navigator.mediaDevices.getUserMedia({
                                video: this.sendingVideo,
                                audio: true
                            }).then((stream) => {
                                this.abortController.signal.throwIfAborted();
                                this.gotUserMedia(stream)
                            }).catch(reason => {
                                this.userMediaError(reason);
                            })
                            this.st({ main: 'manage peer connection', sub: 'before offer user media' })

                        } else {
                            assert(this.remoteUser < this.user);
                            this.st('receiving offer sdp');
                        }
                        break;
                }
                break;

            case 'receiving prepareCall':
                switch (m.type) {
                    case 'prepareCall':
                        this.remoteAcceptingVideo = m.videoAccepted;
                        this.fireEvent<EnqueueCall>({
                            type: 'EnqueueCall',
                            remoteUser: this.remoteUser
                        });
                        this.st('deciding video')
                        break;
                }
                break;

            default:
                if (typeof this.st1 === 'object') {
                    switch (this.st1.main) {
                        case 'manage peer connection':
                            switch (this.st1.sub) {
                                case 'receiving answer sdp':
                                    switch (m.type) {
                                        case 'sdp':
                                            assert(this.pc != null);
                                            this.pc.setRemoteDescription(JSON.parse(m.jsonSdp)).then(() => {
                                                this.abortController.signal.throwIfAborted();
                                                this.remoteAnswerDescriptionSet();
                                            })
                                            this.st({ main: 'manage peer connection', sub: 'setting remote answer description' });
                                            break;

                                        default:
                                            nyi();
                                            break;
                                    }
                                    break;

                                case 'awaiting candidates':
                                    switch (m.type) {
                                        case 'candidate':

                                            assert(this.pc != null);
                                            // console.log('HIER before pc.addIceCandidate');
                                            this.pc.addIceCandidate(JSON.parse(m.jsonCandidate)).then(() => {
                                                // console.log('HIER then');
                                                this.candidateAdded();
                                            });
                                            // console.log('HIER after');
                                            this.st({ main: 'manage peer connection', sub: 'adding candidate' })
                                            break;

                                        default:
                                            nyi();
                                            break;
                                    }
                                    break;


                                default:
                                    nyi();
                            }
                            break;

                        default:
                            nyi();
                    }
                }
                break;
        }

    }

    private remoteHangUp() {
        switch (this.st1) {
            case 'sending prepareCall':
            // no break
            case 'deciding video':
                this.st('final');
                this.exitStm();
                this.fireEvent<ChatAddHintLine>({
                    type: 'ChatAddHintLine',
                    hint: `${this.remoteUser} has hung up.`
                });
                break;
            default:
                if (typeof this.st1 === 'object') {
                    switch (this.st1.main) {
                        case 'manage peer connection':
                            this.exitManagePeerConnection();
                            this.st('final');
                            this.exitStm();
                            break;
                    }
                }
                break;
        }
    }

    private hangUp() {
        switch (this.st1) {
            case 'sending prepareCall':
            // no break
            case 'receiving offer sdp':
                this.sendRemoteMsg({
                    type: 'hangUp'
                })
                this.st('final');
                this.exitStm();
                break;

            default:
                if (typeof this.st1 === 'object') {
                    switch (this.st1.main) {
                        case 'manage peer connection':
                            this.sendRemoteMsg({
                                type: 'hangUp'
                            })
                            this.exitManagePeerConnection();
                            this.st('final');
                            this.exitStm();
                            break;
                    }
                }
                break;
        }
    }

    private remoteOfferDescriptionSet() {
        if (typeof (this.st1) === 'object' && this.st1.main === 'manage peer connection' && this.st1.sub === 'setting remote offer description') {
            assert(this.withVideo != null);
            navigator.mediaDevices.getUserMedia({
                video: (this.sendingVideo = (this.withVideo?.send && this.remoteAcceptingVideo)),
                audio: true
            }).then(stream => {
                this.abortController.signal.throwIfAborted();
                this.gotUserMedia(stream);
            }).catch(reason => {
                this.abortController.signal.throwIfAborted();
                this.userMediaError(reason);
            })
            this.st({ main: 'manage peer connection', sub: 'before answer user media' });
        }
    }

    private remoteAnswerDescriptionSet() {
        if (typeof (this.st1) === 'object') {
            switch (this.st1.main) {
                case 'manage peer connection':
                    switch (this.st1.sub) {
                        case 'setting remote answer description':
                            this.enterAwaitingCandidates();
                            this.evtlProcessFirstRemoteMsg();
                            break;

                        default:
                            nyi();
                            break;
                    }
                    break;

                default:
                    nyi();
                    break;
            }
        }
    }

    private gotUserMedia(stream: MediaStream) {
        this.dbg('gotUserMedia');
        switch (this.st1) {
            default:
                if (typeof this.st1 === 'object') {
                    switch (this.st1.main) {
                        case 'manage peer connection':
                            switch (this.st1.sub) {
                                case 'before offer user media':
                                    this.dbg('gonna add each track to pc');
                                    const fittingToWithVideo = (this.sendingVideo) === (this.withVideo?.send && this.remoteAcceptingVideo)
                                    // console.log('fittingToWithVideo', fittingToWithVideo);
                                    if (fittingToWithVideo) {
                                        stream.getTracks().forEach(track => {
                                            assert(this.pc != null);
                                            this.pc.addTrack(track, stream);
                                        })
                                        this.st({ main: 'manage peer connection', sub: 'before offer negotiation' });
                                        this.dbg('after set state to before offer negotiation');
                                    } else {
                                        assert(this.withVideo != null);
                                        navigator.mediaDevices.getUserMedia({
                                            video: (this.sendingVideo = (this.withVideo.send && this.remoteAcceptingVideo)),
                                            audio: true
                                        }).then(stream => {
                                            this.gotUserMedia(stream)
                                        }, (reason: any) => {
                                            this.userMediaError(reason);
                                        })
                                    }
                                    break;

                                case 'before answer user media':
                                    this.dbg('gonna add each track to pc - number of tracks=' + stream.getTracks().length);
                                    stream.getTracks().forEach(track => {
                                        assert(this.pc != null);
                                        this.pc.addTrack(track, stream);
                                    })
                                    this.dbg('added each track ')
                                    assert(this.pc != null);
                                    this.pc.setLocalDescription().then(() => {
                                        this.abortController.signal.throwIfAborted();
                                        this.localAnswerDescriptionSet();
                                    })
                                    this.st({ main: 'manage peer connection', sub: 'setting local answer description' });
                                    break;
                                default:
                                    nyi();
                            }
                            break;
                    }
                }
        }
    }

    private userMediaError(reason: any) {
        console.error('userMediaError', reason);
        nyi();
    }

    private onNegotiationNeeded() {
        this.dbg('onNegotiationNeeded');
        switch (this.st1) {
            default:
                if (typeof this.st1 === 'object') {
                    switch (this.st1.main) {
                        case 'manage peer connection':
                            switch (this.st1.sub) {
                                case 'before offer negotiation':
                                    assert(this.pc != null);
                                    this.pc.setLocalDescription().then(() => {
                                        this.abortController.signal.throwIfAborted();
                                        this.localOfferDescriptionSet();
                                    })
                                    this.st({ main: 'manage peer connection', sub: 'setting local offer description' })
                                    break;

                                case 'awaiting candidates':
                                    // TODO begin test
                                    // console.log('awaiting candidate: onNegotiationNeeded');
                                    assert(this.pc != null);
                                    this.pc.setLocalDescription().then(() => {
                                        this.dbg('test local description set after test change of withVideo.send: ' + JSON.stringify(this.pc?.localDescription))
                                    })
                                    // TODO end test
                                    break;

                                // case 'before answer negotiation':
                                //     assert(this.pc != null);
                                //     this.pc.setLocalDescription().then(() => {
                                //         this.abortController.signal.throwIfAborted();
                                //         this.localAnswerDescriptionSet();
                                //     })
                                //     this.st({ main: 'manage peer connection', sub: 'setting local answer description' })
                                //     break;

                                default:
                                    nyi();
                                    break;
                            }
                            break;

                        default:
                            nyi();
                            break;
                    }
                }
        }
    }

    private onIceCandidate(candidate: RTCIceCandidate | null) {
        this.dbg('onIceCandidate');
        switch (this.st1) {
            default:
                if (typeof this.st1 === 'object') {
                    switch (this.st1.main) {
                        case 'manage peer connection':
                            switch (this.st1.sub) {
                                case 'receiving answer sdp':
                                // no break
                                case 'awaiting candidates':
                                // no break
                                case 'adding candidate':
                                    if (candidate != null) {
                                        this.sendRemoteMsg({
                                            type: 'candidate',
                                            jsonCandidate: JSON.stringify(candidate)
                                        })
                                        // keep this state
                                    } else {
                                        // console.log('last candidate because null');
                                    }
                                    break;

                                default:
                                    nyi();
                                    break;
                            }
                            break;

                        default:
                            nyi();
                            break;
                    }
                }
        }
    }

    private localOfferDescriptionSet() {
        switch (this.st1) {
            default:
                if (typeof this.st1 === 'object') {
                    switch (this.st1.main) {
                        case 'manage peer connection':
                            switch (this.st1.sub) {
                                case 'setting local offer description':
                                    assert(this.pc != null);
                                    assert(this.withVideo != null);
                                    this.sendRemoteMsg({
                                        type: 'sdp',
                                        jsonSdp: JSON.stringify(this.pc.localDescription),
                                        videoAccepted: this.withVideo.receive
                                    })
                                    this.st({ main: 'manage peer connection', sub: 'receiving answer sdp' });
                                    break;

                                default:
                                    nyi();
                                    break;
                            }
                            break;

                        default:
                            nyi();
                            break;
                    }
                } else {
                    nyi();
                }
        }
    }

    private localAnswerDescriptionSet() {
        switch (this.st1) {
            default:
                if (typeof this.st1 === 'object') {
                    switch (this.st1.main) {
                        case 'manage peer connection':
                            switch (this.st1.sub) {
                                case 'setting local answer description':
                                    assert(this.pc != null);
                                    assert(this.withVideo != null);
                                    this.sendRemoteMsg({
                                        type: 'sdp',
                                        jsonSdp: JSON.stringify(this.pc.localDescription),
                                        videoAccepted: this.withVideo.receive
                                    })
                                    this.enterAwaitingCandidates();
                                    this.evtlProcessFirstRemoteMsg();
                                    break;

                                default:
                                    nyi();
                                    break;
                            }
                            break;

                        default:
                            nyi();
                            break;
                    }
                } else {
                    nyi();
                }
        }
    }
    private candidateAdded() {
        this.dbg('candidateAdded');
        if (typeof this.st1 === 'object') {
            switch (this.st1.main) {
                case 'manage peer connection':
                    switch (this.st1.sub) {
                        case 'adding candidate':
                            this.enterAwaitingCandidates();
                            this.evtlProcessFirstRemoteMsg();
                            break;
                    }
                    break;

                default:
                    nyi();
                    break;
            }
        }
    }
    // END events as in WebRTC Demo.vpp://diagram/XBuqVnGD.AACAQ_o

    private createPc(): RTCPeerConnection {
        const pc = new RTCPeerConnection();
        pc.onnegotiationneeded = () => {
            this.dbg('pc.onnegotiationneeded');
            this.abortController.signal.throwIfAborted();
            this.onNegotiationNeeded();
        }
        pc.onicecandidate = (e) => {
            this.abortController.signal.throwIfAborted();
            this.onIceCandidate(e.candidate);
        }
        pc.ontrack = (e) => {
            // console.log('track', this.st1, e);
            this.dbg('track');
            if (e.streams.length !== 1) {
                console.error('unexpected length of streams', e.streams);
                return;
            }
            this.fireEvent<SetConnectionComp>({
                type: 'SetConnectionComp',
                remoteUser: this.remoteUser,
                props: {
                    remoteUser: this.remoteUser,
                    msg: null,
                    stream: e.streams[0]
                }
            });
            // this.fireEvent<RemoteMediaStream>({
            //     type: 'RemoteMediaStream',
            //     remoteUser: this.remoteUser,
            //     stream: e.streams[0]
            // });
        }
        pc.onconnectionstatechange = (e) => {
            // console.log('connectionState', pc.connectionState);
            this.dbg(`connectionState ${pc.connectionState}`);
        }
        pc.onsignalingstatechange = (e) => {
            // console.log('signalingState', pc.signalingState);
            this.dbg(`signalingState ${pc.signalingState}`)
        }
        pc.oniceconnectionstatechange = (e) => {
            // console.log('iceConnectionState', pc.iceConnectionState);
            this.dbg(`iceConnectionState ${pc.iceConnectionState}`)
        }
        // TODO add event listeners
        return pc;
    }

    private fireEvent<T>(t: T) {
        this.eventBus.publish(t);
    }

    private sendRemoteMsg(msg: RemoteMsg) {
        this.send(JSON.stringify(msg));
    }

    private st(s: State) {
        this.fireEvent<ChatAddHintLine>({
            type: 'ChatAddHintLine',
            hint: `${this.remoteUser}: ${JSON.stringify(this.st1)} -> ${JSON.stringify(s)}`
        });
        this.st1 = s;
    }

    private exitManagePeerConnection() {
        assert(this.pc != null);
        this.pc.getSenders().forEach(sender => {
            sender.track?.stop();
        })
        this.pc.close();
        this.dbg('after pc.close')
    }

    private exitStm() {
        this.abortController.abort();
        this.releaseAbortController();
        this.closed();
    }

    private dbg(msg: string) {
        this.fireEvent<ChatAddHintLine>({
            type: 'ChatAddHintLine',
            hint: `${this.remoteUser}\n[${JSON.stringify(this.st1)}]\n${msg}`
        })
    }

    private abortController: AbortController;
    private releaseAbortController: () => void
    private closed: () => void;
    private send: (msg: string) => void;
    /**
     * immutable
     */
    private withVideo: WithVideo | null;
    private eventBus: EventBus<unknown>;
    private user: string;
    private remoteUser: string;
    private remoteRole: 'caller' | 'callee';
    private messages: string[] = [];
    private st1: State;
    private pc: RTCPeerConnection | null = null;
    private remoteAcceptingVideo: boolean = true;
    private replacedSender: RTCRtpSender | null = null;
    private sendingVideo: boolean = false;
}