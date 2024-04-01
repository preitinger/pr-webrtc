import assert from "assert";
import * as rt from "runtypes"
import EventBus, { waitForGuard } from "./_lib/EventBus";
import chainedAbortController from "./_lib/pr-client-utils/chainedAbortController";
import { MsgClient } from "./_lib/pr-msg-client/pr-msg-client";
import { MsgReq, MsgResp } from "./_lib/pr-msg-common/pr-msg-common";
import { AuthenticatedVideoReq, PushNotifyReq, PushNotifyResp } from "./_lib/video/video-common";
import { FetchError, LogoutClicked, AuthFailed, WaitForPushClicked, CallClicked, ChatAddErrorLine, RemoteMsgReceived, VideoDataSettingsClicked, DecideIfWithVideoDlg, VideoDecisionDictionary, DecideIfWithVideoProps, ReceiveVideoChanged, SendVideoChanged, OkClicked, CancelClicked, ConfigSendVideoChanged, ConfigReceiveVideoChanged, RegularFunctionsShutdown, VideoSenderCountUpdate, CallsInterruptResult, CallsInterrupt, CallsCont, ReceivedCallDlg, AddToSend, SetCameraTestButton, CameraTestClicked, LocalMediaStream, ModalDlg, SetCallActive, EnqueueCall, VideoDecision, HangUpClicked, HangUpDlg, HangUp, ConnectionProps, SetConnectionComp } from "./busEvents";
import { AccumulatedFetching } from "./_lib/user-management-client/AccumulatedFetching";
import { ApiResp } from "./_lib/user-management-client/user-management-common/apiRoutesCommon";
import { RemoteMsg } from "./busEvents";
import { Connection, defaultWithVideo } from "./Connection";
import { calculateOverrideValues } from "next/dist/server/font-utils";
import { WithVideo } from "./_lib/video/DoWebRTCStuff";
import { getEventBus } from "./useEventBus";
import timeout from "./_lib/pr-timeout/pr-timeout";
import { time } from "console";
import * as localStorageAccess from "./localStorageAccess";

/**
 * @deprecated
 */
function nyi(): void {
    try {
        throw new Error("nyi");
    } catch (reason) {
        console.error(reason);
    }
}

export default async function regularFunctions(eventBusKey: string, accumulatedFetching: AccumulatedFetching, user: string, token: string, outerSignal: AbortSignal): Promise<LogoutClicked | AuthFailed> {

    async function manageVideoConfig(signal: AbortSignal) {
        const subscr = eventBus.subscribe();

        try {
            while (true) {
                signal.throwIfAborted();

                const e = await waitForGuard({ subscr: subscr }, rt.Union(ConfigSendVideoChanged, ConfigReceiveVideoChanged, RegularFunctionsShutdown), signal);
                switch (e.type) {
                    case 'ConfigSendVideoChanged':
                        localStorageAccess.videoConfig.send.set(user, e.sendVideo);
                        break;

                    case 'ConfigReceiveVideoChanged':
                        localStorageAccess.videoConfig.receive.set(user, e.receiveVideo);
                        break;

                    case 'RegularFunctionsShutdown':
                        return;
                }

            }

        } finally {
            subscr.unsubscribe();
        }
    }

    /**
     * @returns connected remote users after shutdown
     * @param signal 
     * @param sendMs 
     * @param receiveMs 
     * @param msgClient 
     */
    async function manageCalls(signal: AbortSignal, sendMs: number, receiveMs: number, msgClient: MsgClient): Promise<string[]> {

        function onClosedConnection(remoteUser: string) {
            delete connections[remoteUser];
            fireEvent<SetConnectionComp>({
                type: 'SetConnectionComp',
                remoteUser: remoteUser,
                props: null
            });
            if (Object.keys(connections).length === 0) {
                fireEvent<SetCallActive>({
                    type: 'SetCallActive',
                    active: false
                });
            }
        }

        /**
         * implements WebRTC Demo.vpp://diagram/3S8LonGD.AACAQsu (Transport Messages State Machine Diagram)
         * @param signal 
         * @returns 
         */
        function transportMessages(outerSignal: AbortSignal): Promise<void> {

            return new Promise<void>(resolveBehavior => {




                /**
                 * states of WebRTC Demo.vpp://diagram/3S8LonGD.AACAQsu (Transport Messages State Machine Diagram)
                 */
                type State = 'receiveTimer' | 'sendTimer' | 'fetching' | 'interruptAfterFetching' | 'fetchingBeforeInterrupt' | 'interrupted' | 'final';

                //
                // entry behaviors
                //

                function receiveTimerEnter() {
                    timeout = setTimeout(onTimeout, receiveMs);
                    st = 'receiveTimer';
                }

                function sendTimerEnter() {
                    timeout = setTimeout(onTimeout, sendMs);
                    st = 'sendTimer';
                }

                function fetchingEnter() {
                    accumulatedFetching.push<AuthenticatedVideoReq<MsgReq>, ApiResp<MsgResp>>(authenticate(msgClient.createReq()),
                        abortController.signal).then(resp => {
                            handleResp(resp);
                        }).catch(onError)
                    st = 'fetching';
                }

                //
                // transitions
                //

                function onTimeout() {
                    try {
                        timeout = null;
                        switch (st) {
                            case 'receiveTimer':
                            // no break
                            case 'sendTimer':
                                fetchingEnter();
                                break;
                        }

                    } catch (reason) {
                        console.error('caught in onTimeout', reason);
                    }
                }

                function handleResp(resp: ApiResp<MsgResp>) {
                    switch (st) {

                        case 'fetching': {

                            forwardToConnections(resp)
                            receiveTimerEnter();
                            break;

                        }
                        case 'interruptAfterFetching':

                            forwardToConnections(resp);
                            accumulatedFetching.push<AuthenticatedVideoReq<MsgReq>, ApiResp<MsgResp>>(authenticate(msgClient.createReq()),
                                abortController.signal).then(resp => {
                                    handleResp(resp);
                                }).catch(onError)
                            st = 'fetchingBeforeInterrupt';
                            break;

                        case 'fetchingBeforeInterrupt':

                            forwardToConnections(resp);
                            fireEvent<CallsInterruptResult>({
                                type: 'CallsInterruptResult',
                                success: Object.keys(connections).length === 0
                            })
                            st = 'interrupted';
                            break;
                        default:
                            console.error('nyi', st);
                    }
                }

                function onCallsInterrupt() {
                    switch (st) {

                        case 'receiveTimer':

                        // no break

                        case 'sendTimer':

                            clearMyTimeout();
                            accumulatedFetching.push<AuthenticatedVideoReq<MsgReq>, ApiResp<MsgResp>>(authenticate(msgClient.createReq()),
                                abortController.signal
                            ).then(resp => {
                                handleResp(resp);
                            }).catch(onError)
                            st = 'fetchingBeforeInterrupt';
                            break;


                        case 'fetching':

                            st = 'interruptAfterFetching';
                            break;

                    }
                }

                function onCallsCont() {
                    receiveTimerEnter();
                }

                function onRegularFunctionsShutdown() {
                    switch (st) {
                        case 'receiveTimer':
                        // no break
                        case 'sendTimer':
                        // no break
                        case 'fetching':
                        // no break
                        case 'interruptAfterFetching':
                        // no break
                        case 'fetchingBeforeInterrupt':
                        // no break
                        case 'interrupted':
                            abortAndRelease();
                            resolveBehavior();
                            st = 'final';
                            break;
                    }
                }

                //
                // helping functions
                //

                // function authenticate(req: MsgReq): AuthenticatedVideoReq<MsgReq> {
                //     return {
                //         type: 'authenticatedVideoReq',
                //         ownUser: user,
                //         sessionToken: token,
                //         req: req
                //     }
                // }

                function forwardToConnections(resp: ApiResp<MsgResp>) {
                    if (resp.type === 'error') throw new Error(resp.error);
                    const receivedMessages = msgClient.processResp(resp);
                    // console.log("forwardToConnections: receivedMessages", receivedMessages);
                    for (const remoteUser of Object.keys(receivedMessages)) {
                        let messages = receivedMessages[remoteUser].msg;
                        if (messages.length === 0) continue;
                        if (!(remoteUser in connections)) {
                            // ignore messages until 'prepareCall'; only then open a new connection
                            const firstPrepareCallIdx = messages.findIndex(stringifiedMsg => {
                                const msg = RemoteMsg.check(JSON.parse(stringifiedMsg));
                                return msg.type === 'prepareCall';
                            })
                            if (firstPrepareCallIdx === -1) return;
                            messages = messages.slice(firstPrepareCallIdx);
                            const sentVideoUpdated = (stream: MediaStream | null) => {
                                fireEvent<VideoSenderCountUpdate>({
                                    type: 'VideoSenderCountUpdate',
                                    stream: stream
                                })
                            }
                            const closed = () => {
                                onClosedConnection(remoteUser);
                            }
                            const send = (msg: string) => {
                                addToSend(remoteUser, [msg]);
                            }

                            if (Object.keys(connections).length === 0) {
                                fireEvent<SetCallActive>({
                                    type: 'SetCallActive',
                                    active: true
                                });
                            }
                            connections[remoteUser] = new Connection(
                                sentVideoUpdated,
                                closed,
                                send,
                                eventBus,
                                user, remoteUser, 'caller', signal
                            )
                        }
                        if (remoteUser in connections) {
                            connections[remoteUser].addMessages(messages);
                        }
                    }
                }

                function addToSend(receivingUser: string, messages: string[]) {
                    switch (st) {

                        case 'receiveTimer':
                        // no break
                        case 'sendTimer':
                            clearMyTimeout();
                            msgClient.addToSend(receivingUser, messages)
                            sendTimerEnter();
                            st = 'sendTimer';
                            break;

                        default:
                            msgClient.addToSend(receivingUser, messages)
                        // stay in the same state
                    }

                }

                function clearMyTimeout() {
                    if (timeout != null) clearTimeout(timeout);
                }

                function createAbortController() {
                    const abortController = chainedAbortController(outerSignal)
                    abortController[0].signal.addEventListener('abort', (ev: Event) => {
                        // console.error('no error: gonna clearMyTimeout on abort event');
                        clearMyTimeout();
                        abortController[1]();
                    }, {
                        signal: abortController[0].signal
                    })
                    return abortController;
                }

                function abortAndRelease() {
                    // console.warn('abortAndRelease of transportMessage');
                    abortController.abort();
                    releaseAbortController();
                }

                async function processEventsUntilAborted() {
                    const subscr = eventBus.subscribe();
                    try {
                        while (true) {
                            abortController.signal.throwIfAborted();
                            const e = await waitForGuard({ subscr: subscr }, rt.Union(AddToSend, CallsInterrupt, CallsCont, RegularFunctionsShutdown), abortController.signal);
                            switch (e.type) {
                                case 'AddToSend': addToSend(e.receiver, e.messages); break;
                                case 'CallsInterrupt': onCallsInterrupt(); break;
                                case 'CallsCont': onCallsCont(); break;
                                case 'RegularFunctionsShutdown': onRegularFunctionsShutdown(); break;
                            }
                        }
                    } finally {
                        subscr.unsubscribe();
                    }
                }

                function onError(reason: any) {
                    if (reason.name !== 'AbortError') {
                        console.error(reason);
                    } else {
                        // console.log('ignore', reason);
                    }

                }

                let st: State;
                let timeout: NodeJS.Timeout | null;

                //
                // init node
                //

                const [abortController, releaseAbortController] = createAbortController();
                receiveTimerEnter();
                processEventsUntilAborted().catch(onError);


            })

        }

        async function queuedInteractions(signal: AbortSignal) {
            async function runInteractions() {
                for (let i = 0; i < queue.length; ++i) {
                    const e = queue[i];
                    switch (e.type) {

                        case 'CallClicked':
                            const withVideo = await handleCallClick(e.callees, signal);
                            if (withVideo != null) {
                                addOrUpdateConnections(withVideo);
                            }
                            break;

                        case 'EnqueueCall':
                            await connections[e.remoteUser].onDequeueCall();
                            break;

                        case 'VideoDataSettingsClicked': {
                            let props = {
                                eventBusKey: eventBusKey,
                                decisions: Object.fromEntries(Object.keys(connections).map((remoteUser: string) => {
                                    return [remoteUser, {
                                        remoteUser: remoteUser,
                                        withVideo: defaultWithVideo(user, remoteUser)
                                    }]
                                }))
                            }
                            fireEvent<DecideIfWithVideoDlg>({
                                type: 'DecideIfWithVideoDlg',
                                props: props
                            });
                            const subscr = eventBus.subscribe();
                            try {
                                const MyEvent = rt.Union(SendVideoChanged, ReceiveVideoChanged, OkClicked, CancelClicked, RegularFunctionsShutdown)
                                let loop = true;

                                while (loop) {
                                    const e = await waitForGuard({ subscr: subscr }, MyEvent, signal);
                                    switch (e.type) {
                                        case 'SendVideoChanged':
                                            fireEvent<DecideIfWithVideoDlg>({
                                                type: 'DecideIfWithVideoDlg',
                                                props: (props = {
                                                    ...props,
                                                    decisions: {
                                                        ...props.decisions,
                                                        [e.remoteUser]: {
                                                            ...props.decisions[e.remoteUser],
                                                            withVideo: {
                                                                ...props.decisions[e.remoteUser].withVideo,
                                                                send: e.send
                                                            }
                                                        }
                                                    }
                                                })
                                            });
                                            break;

                                        case 'ReceiveVideoChanged':
                                            fireEvent<DecideIfWithVideoDlg>({
                                                type: 'DecideIfWithVideoDlg',
                                                props: (props = {
                                                    ...props,
                                                    decisions: {
                                                        ...props.decisions,
                                                        [e.remoteUser]: {
                                                            ...props.decisions[e.remoteUser],
                                                            withVideo: {
                                                                ...props.decisions[e.remoteUser].withVideo,
                                                                receive: e.receive
                                                            }
                                                        }
                                                    }
                                                })
                                            });
                                            break;

                                        case 'OkClicked':
                                            type Entry = [string, VideoDecision];
                                            const values: VideoDecision[] = (Object.values(props.decisions))
                                            values.forEach(vd => {
                                                if (vd.remoteUser in connections) {
                                                    localStorageAccess.lastVideoSettings.send.set(user, vd.remoteUser, vd.withVideo.send)
                                                    localStorageAccess.lastVideoSettings.receive.set(user, vd.remoteUser, vd.withVideo.receive)
                                                    connections[vd.remoteUser]?.setWithVideo(vd.withVideo);
                                                }
                                            })
                                            fireEvent<DecideIfWithVideoDlg>({
                                                type: 'DecideIfWithVideoDlg',
                                                props: null
                                            });
                                            loop = false;
                                            break;

                                        case 'CancelClicked':
                                        // no break
                                        case 'RegularFunctionsShutdown':
                                            fireEvent<DecideIfWithVideoDlg>({
                                                type: 'DecideIfWithVideoDlg',
                                                props: null
                                            });
                                            loop = false;
                                            break;

                                    }

                                }
                            } finally {
                                subscr.unsubscribe();
                            }
                            break;
                        }

                        case 'HangUpClicked':
                            assert(e.remoteUser == null);
                            fireEvent<HangUpDlg>({
                                type: 'HangUpDlg',
                                props: {
                                    remoteUsers: Object.keys(connections)
                                }
                            });
                            {
                                const subscr = eventBus.subscribe();
                                try {
                                    const MyEvent = rt.Union(HangUp, CancelClicked, RegularFunctionsShutdown)
                                    await waitForGuard({ subscr: subscr }, MyEvent, signal);
                                    fireEvent<HangUpDlg>({
                                        type: 'HangUpDlg',
                                        props: null
                                    });
                                } finally {
                                    subscr.unsubscribe();
                                }
                            }
                            break;

                        case 'RegularFunctionsShutdown':
                            // never in this queue
                            throw new Error('RegularFunctionsShutdown in queue');
                    }
                }
                queue.length = 0;
            }
            async function forkInteractions() {
                await runInteractions();
                interactionsRunning = false;
            }

            const MyEvent = rt.Union(CallClicked, EnqueueCall, VideoDataSettingsClicked, HangUpClicked, RegularFunctionsShutdown)
            type MyEvent = rt.Static<typeof MyEvent>



            const queue: MyEvent[] = [];
            let shutdown = false;
            let interactionsRunning = false;
            const subscr = eventBus.subscribe();
            try {

                while (!shutdown) {
                    signal.throwIfAborted();

                    const e = await waitForGuard({ subscr: subscr }, MyEvent, signal);
                    switch (e.type) {
                        case 'RegularFunctionsShutdown':
                            shutdown = true;
                            break;

                        default:
                            if (e.type !== 'HangUpClicked' || e.remoteUser == null) {
                                queue.push(e);
                                if (!interactionsRunning) {
                                    forkInteractions().catch(reason => {
                                        if (reason.name !== 'AbortError') {
                                            console.error(reason);
                                        } else {
                                            // console.log('ignored', reason);
                                        }
                                    });
                                    interactionsRunning = true;
                                }
                            }
                            break;
                    }
                }

            } finally {
                subscr.unsubscribe();
            }
        }

        async function localVideo(signal: AbortSignal) {
            function evtlStopTestStream() {
                if (testStream != null) {
                    testStream.getTracks().forEach(track => {
                        track.stop();
                    })
                    testStream = null;
                }
            }
            let testStream: MediaStream | null = null;
            let senderCount = 0;
            fireEvent<SetCameraTestButton>({
                type: 'SetCameraTestButton',
                label: 'Camera Test'
            })

            let shutdown = false;
            const subscr = eventBus.subscribe();

            try {
                let currentStream: MediaStream | null = null;

                while (!shutdown) {
                    const e = await waitForGuard({ subscr: subscr }, rt.Union(VideoSenderCountUpdate, CameraTestClicked, RegularFunctionsShutdown), signal);

                    switch (e.type) {
                        case 'VideoSenderCountUpdate':
                            // console.log('process VideoSenderCountUpdate: old senderCount', senderCount, 'e.stream', e.stream)
                            if (e.stream != null) {
                                if (senderCount === 0) {
                                    fireEvent<LocalMediaStream>({
                                        type: 'LocalMediaStream',
                                        stream: (currentStream = e.stream as MediaStream)
                                    })
                                    fireEvent<SetCameraTestButton>({
                                        type: 'SetCameraTestButton',
                                        label: null
                                    })
                                    evtlStopTestStream();
                                } else {
                                    const s = e.stream as MediaStream;
                                    s.getTracks().forEach(track => {
                                        track.stop(); // because was cloned
                                    })
                                }

                                ++senderCount
                            } else {
                                --senderCount;
                                if (senderCount === 0) {
                                    fireEvent<LocalMediaStream>({
                                        type: 'LocalMediaStream',
                                        stream: null
                                    })
                                    currentStream?.getTracks().forEach(track => {
                                        track.stop();
                                    })
                                    currentStream = null;
                                    fireEvent<SetCameraTestButton>({
                                        type: 'SetCameraTestButton',
                                        label: 'Camera Test'
                                    });
                                }
                            }
                            // console.log('new senderCount', senderCount);
                            break;

                        case 'CameraTestClicked':
                            if (senderCount === 0) {
                                if (testStream == null) {
                                    try {
                                        testStream = await navigator.mediaDevices.getUserMedia({
                                            video: true,
                                            audio: false
                                        });
                                        fireEvent<LocalMediaStream>({
                                            type: 'LocalMediaStream',
                                            stream: testStream
                                        });
                                        fireEvent<SetCameraTestButton>({
                                            type: 'SetCameraTestButton',
                                            label: 'Stop Camera Test'
                                        });
                                        fireEvent<SetCallActive>({
                                            type: 'SetCallActive',
                                            active: true
                                        });
                                    } catch (reason: any) {
                                        let text: string | null = null;
                                        if (reason.name === 'NotAllowedError') {
                                            text = 'No permission to use the camera. Please change your browser settings.'
                                        } else {
                                            text = 'Trying to switch on the camera resulted in the following error. Please ensure you have a working camera either integrated or plugged in: ' + reason.name + ' (' + reason.message + ')'
                                        }
                                        fireEvent<ModalDlg>({
                                            type: 'ModalDlg',
                                            msg: text
                                        });
                                        evtlStopTestStream();
                                    }

                                } else {
                                    evtlStopTestStream();
                                    assert(testStream == null);
                                    fireEvent<LocalMediaStream>({
                                        type: 'LocalMediaStream',
                                        stream: null
                                    })
                                    fireEvent<SetCameraTestButton>({
                                        type: 'SetCameraTestButton',
                                        label: 'Camera Test'
                                    })
                                    if (Object.keys(connections).length === 0) {
                                        fireEvent<SetCallActive>({
                                            type: 'SetCallActive',
                                            active: false
                                        });
                                    }
                                }
                            }
                            break;

                        case 'RegularFunctionsShutdown':
                            // console.warn('RegularFunctionsShutdown in localVideo')
                            shutdown = true;
                            break;
                    }
                }

                currentStream?.getTracks().forEach(track => {
                    track.stop();
                })
                senderCount = 0;
                evtlStopTestStream();
                fireEvent<LocalMediaStream>({
                    type: 'LocalMediaStream',
                    stream: null
                })
                fireEvent<SetCameraTestButton>({
                    type: 'SetCameraTestButton',
                    label: null
                })

            } finally {
                subscr.unsubscribe();
            }

        }

        async function handleCallClick(callees: string[], signal: AbortSignal): Promise<{ [callee: string]: WithVideo } | null> {
            // console.log('handleCallClick: user', user, 'callees', callees, 'connections', connections);
            const newUsers: string[] = [];
            for (const callee of callees) {
                // console.log('for: user', user, 'callee', callee);
                if (callee === user) {
                    fireEvent<ChatAddErrorLine>({
                        type: 'ChatAddErrorLine',
                        error: "Please, don't call yourself!"
                    })

                } else {
                    newUsers.push(callee);
                }
            }

            newUsers.sort();

            if (newUsers.length === 0) return null;

            const videoConfigSend = localStorageAccess.videoConfig.send.get(user);
            const videoConfigReceive = localStorageAccess.videoConfig.receive.get(user);
            // console.log('videoConfigSend', videoConfigSend, 'videoConfigReceive', videoConfigReceive);

            if (videoConfigSend === 'individually' || videoConfigReceive === 'individually') {
                let decisions: {
                    [remoteUser: string]: {
                        remoteUser: string;
                        withVideo: {
                            send: boolean;
                            receive: boolean;
                        };
                    };
                } = {}
                const res: { [callee: string]: WithVideo } = {}

                for (const remoteUser of newUsers) {
                    decisions[remoteUser] = {
                        remoteUser: remoteUser,
                        withVideo: {
                            send: videoConfigSend === 'always' ? true : videoConfigSend === 'never' ? false : localStorageAccess.lastVideoSettings.send.get(user, remoteUser),
                            receive: videoConfigReceive === 'always' ? true : videoConfigReceive === 'never' ? false : localStorageAccess.lastVideoSettings.receive.get(user, remoteUser)
                        }
                    }
                    res[remoteUser] = {
                        send: videoConfigSend === 'always' ? true : videoConfigSend === 'never' ? false : localStorageAccess.lastVideoSettings.send.get(user, remoteUser),
                        receive: videoConfigReceive === 'always' ? true : videoConfigReceive === 'never' ? false : localStorageAccess.lastVideoSettings.receive.get(user, remoteUser)
                    }
                }

                const subscr = eventBus.subscribe();

                try {
                    fireEvent<DecideIfWithVideoDlg>({
                        type: 'DecideIfWithVideoDlg',
                        props: {
                            eventBusKey: eventBusKey,
                            decisions: decisions
                        }
                    })

                    const ExpectedEvents = rt.Union(OkClicked, CancelClicked, RegularFunctionsShutdown, SendVideoChanged, ReceiveVideoChanged);
                    type ExpectedEvents = rt.Static<typeof ExpectedEvents>

                    let e: ExpectedEvents;

                    do {
                        signal.throwIfAborted();
                        e = await waitForGuard({ subscr: subscr }, ExpectedEvents, signal);
                        switch (e.type) {
                            case 'SendVideoChanged':
                                res[e.remoteUser].send = e.send
                                localStorageAccess.lastVideoSettings.send.set(user, e.remoteUser, e.send);
                                decisions = {
                                    ...decisions,
                                    [e.remoteUser]: {
                                        ...decisions[e.remoteUser],
                                        withVideo: {
                                            ...decisions[e.remoteUser].withVideo,
                                            send: e.send
                                        }
                                    }
                                }
                                // console.log('new decisions after SendVideoChanged', decisions)

                                fireEvent<DecideIfWithVideoDlg>({
                                    type: 'DecideIfWithVideoDlg',
                                    props: {
                                        eventBusKey: eventBusKey,
                                        decisions: decisions
                                    }
                                })
                                break;
                            case 'ReceiveVideoChanged':
                                res[e.remoteUser].receive = e.receive
                                localStorageAccess.lastVideoSettings.receive.set(user, e.remoteUser, e.receive);
                                decisions = {
                                    ...decisions,
                                    [e.remoteUser]: {
                                        ...decisions[e.remoteUser],
                                        withVideo: {
                                            ...decisions[e.remoteUser].withVideo,
                                            receive: e.receive
                                        }
                                    }
                                }
                                // console.log('new decisions after ReceiveVideoChanged', decisions)
                                fireEvent<DecideIfWithVideoDlg>({
                                    type: 'DecideIfWithVideoDlg',
                                    props: {
                                        eventBusKey: eventBusKey,
                                        decisions: decisions
                                    }
                                })
                                break;
                        }

                    } while (e.type !== 'OkClicked' && e.type !== 'CancelClicked' && e.type !== 'RegularFunctionsShutdown')

                    fireEvent<DecideIfWithVideoDlg>({
                        type: 'DecideIfWithVideoDlg',
                        props: null
                    })

                    switch (e.type) {
                        case 'OkClicked':
                            return res;
                        default:
                            return null;
                    }

                } finally {
                    subscr.unsubscribe();
                }
            } else {
                return Object.fromEntries(newUsers.map(remoteUser => ([remoteUser, {
                    send: videoConfigSend === 'always',
                    receive: videoConfigReceive === 'always'
                }])))
            }
        }

        function addOrUpdateConnections(withVideo: {
            [callee: string]: WithVideo;
        }) {
            for (const remoteUser in withVideo) {
                const wv: WithVideo = withVideo[remoteUser]
                if (remoteUser in connections) {
                    connections[remoteUser].setWithVideo(withVideo[remoteUser]);
                } else {
                    const sentVideoUpdated = (stream: MediaStream | null) => {
                        fireEvent<VideoSenderCountUpdate>({
                            type: 'VideoSenderCountUpdate',
                            stream: stream
                        })
                    }
                    const closed = () => {
                        onClosedConnection(remoteUser);
                    }
                    const send = (msg: string) => {
                        fireEvent<AddToSend>({
                            type: 'AddToSend',
                            receiver: remoteUser,
                            messages: [msg]
                        })
                    }

                    if (Object.keys(connections).length === 0) {
                        fireEvent<SetCallActive>({
                            type: 'SetCallActive',
                            active: true
                        });
                    }
                    connections[remoteUser] = new Connection(sentVideoUpdated, closed, send, eventBus, user, remoteUser, 'callee', signal, wv)
                }
            }
        }

        const connections: {
            [remoteUser: string]: Connection
        } = {}

        let regularFunctionsShutdown = false;
        let senderCount = 0;

        //
        // init of manageCalls
        //

        regularFunctionsShutdown = false;
        const transportMessagesProm = transportMessages(signal)
        const queuedInteractionsProm = queuedInteractions(signal);
        const localVideoProm = localVideo(signal);

        // const subscr = eventBus.subscribe();

        // try {
        //     let shutdown = false;
        //     while (!shutdown) {
        //         outerSignal.throwIfAborted();
        //         const e = await waitForGuard({ subscr: subscr }, rt.Union(CallClicked, ReceivedCallDlg, VideoDataSettingsClicked, RegularFunctionsShutdown), signal);
        //         switch (e.type) {
        //             case 'CallClicked':
        //                 const withVideo = await handleCallClick(e.callees, signal);
        //                 if (withVideo != null) {
        //                     addConnections(withVideo);
        //                 }
        //                 break;

        //             case 'ReceivedCallDlg':
        //                 nyi();
        //                 break;

        //             case 'VideoDataSettingsClicked':
        //                 nyi();
        //                 break;

        //             case 'RegularFunctionsShutdown':
        //                 shutdown = true;
        //                 break;

        //             default:
        //                 nyi();
        //         }
        //     }
        // } finally {
        //     subscr.unsubscribe();
        // }
        let consAtShutdown: string[];
        {
            let shutdown = false;
            const subscr = eventBus.subscribe();
            try {
                while (!shutdown) {
                    const e = await waitForGuard({ subscr: subscr }, RegularFunctionsShutdown, signal);
                    if (e.type === 'RegularFunctionsShutdown') {
                        shutdown = true;
                    }
                }
            } finally {
                subscr.unsubscribe();
            }

            consAtShutdown = Object.keys(connections);
            let cons: Connection[] = [];
            let maxTries = 5;
            do {
                cons = Object.values(connections);
                // console.log('shutdownAndJoin for ', cons.length, ' connections ...');
                await Promise.all(cons.map(con => con.shutdownAndJoin()))
            } while (cons.length > 0 && maxTries-- > 0)

        }

        await Promise.all([transportMessagesProm, queuedInteractionsProm, localVideoProm])
        return consAtShutdown;
    }

    async function managePushNotifications(signal: AbortSignal) {
        nyi();
    }


    async function manageLogoutAndAuthFailed(signal: AbortSignal) {
        while (true) {
            signal.throwIfAborted();
            const e = await waitForGuard({ bus: eventBus }, rt.Union(LogoutClicked, AuthFailed), signal);
            switch (e.type) {
                case 'LogoutClicked':
                    fireEvent<RegularFunctionsShutdown>({
                        type: 'RegularFunctionsShutdown',

                    })
                    return e;


                case 'AuthFailed':
                    fireEvent<RegularFunctionsShutdown>({
                        type: 'RegularFunctionsShutdown',
                    })
                    return e;
            }
        }
    }

    // TODO implement
    const eventBus = getEventBus(eventBusKey);
    function fireEvent<T = any>(e: T) {
        eventBus.publish(e);
    }

    function authenticate(req: MsgReq): AuthenticatedVideoReq<MsgReq> {
        return {
            type: 'authenticatedVideoReq',
            ownUser: user,
            sessionToken: token,
            req: req
        }
    }

    let regularFunctionsShutdown = false;
    let pushNotificationsShutdown = false;
    let handlingFetchError = false;

    // fork
    const manageLogoutAndAuthFailedProm = manageLogoutAndAuthFailed(outerSignal);

    const msgClient = new MsgClient(user, 0);

    const result = (await Promise.all([
        manageLogoutAndAuthFailedProm,
        manageVideoConfig(outerSignal),
        manageCalls(outerSignal, 200, 2000, msgClient),
        managePushNotifications(outerSignal),
    ]));
    if (result[0].type === 'LogoutClicked') {
        // send hangup for all open connections
        for (const remoteUser of result[2]) {
            const msg: RemoteMsg = {
                type: 'hangUp'
            }
            msgClient.addToSend(remoteUser, [JSON.stringify(msg)]);
        }
        const req = msgClient.createReq();
        // console.log('req created by msgClient', req);
        const resp = await accumulatedFetching.push<AuthenticatedVideoReq<MsgReq>, ApiResp<MsgResp>>(authenticate(req),
            outerSignal)
        switch (resp.type) {
            case 'success':
                // console.log('rcv', resp.rcv);
                break;
            case 'error':
                console.error(resp);
        }
    }

    return result[0];



    nyi();

    // old outdated implementation:
    // const eventBus = getEventBus(eventBusKey);
    // const abortController = chainedAbortController(outerSignal);
    // const signal = abortController.signal;

    // function authenticatedRequest<Req, Resp>(req: Req, signal: AbortSignal): Promise<ApiResp<Resp>> {
    //     const authReq: AuthenticatedVideoReq<Req> = {
    //         type: 'authenticatedVideoReq',
    //         ownUser: user,
    //         req: req,
    //         sessionToken: token
    //     }
    //     return accumulatedFetching.push<AuthenticatedVideoReq<Req>, Resp>(authReq, signal);
    // }


    // async function handleMsgClientRequest(req: MsgReq) {
    //     const authReq: AuthenticatedVideoReq<MsgReq> = {
    //         type: 'authenticatedVideoReq',
    //         ownUser: user,
    //         req: req,
    //         sessionToken: token
    //     }
    //     const resp = await accumulatedFetching.push<AuthenticatedVideoReq<MsgReq>, MsgResp>(authReq, signal);
    //     switch (resp.type) {
    //         case 'success':
    //             msgClient.handleSerially(resp, async (sender, stringifiedMsg) => {
    //                 const msg = JSON.parse(stringifiedMsg) as RemoteMsg;
    //                 fireEvent<RemoteMsgReceived>({
    //                     type: 'RemoteMsgReceived',
    //                     sender: sender,
    //                     msg: msg
    //                 })
    //             })
    //             break;
    //         case 'error':
    //             console.error(resp);
    //             break;
    //     }
    // }

    // function fireEvent<T = any>(e: T) {
    //     eventBus.publish(e);
    // }


    // // start of the activity

    // const msgClient = new MsgClient(user, 2000, handleMsgClientRequest, 300, signal)
    // let videoSenderCount = 0;
    // const connections: { [remoteUser: string]: Connection } = {}
    // let defaultWithVideo: Readonly<WithVideo> = {
    //     send: true,
    //     receive: true
    // }

    // function connectionsEmpty(): boolean {
    //     return Object.keys(connections).length === 0;
    // }

    // function checkAndFilterCallees(callees: string[]) {
    //     return callees.filter((remoteUser: string) => {
    //         let error: string | null = null;

    //         if (remoteUser === user) {
    //             error = "You can't call yourself!"
    //         } else if (remoteUser in connections) {
    //             error = `You are already connected with ${remoteUser}!`
    //         }

    //         if (error == null) return true;

    //         fireEvent<ChatAddErrorLine>({
    //             type: 'ChatAddErrorLine',
    //             error: error
    //         })

    //         return false;
    //     })
    // }

    // const WithVideoDictionary = rt.Dictionary(WithVideo, rt.String)
    // type WithVideoDictionary = rt.Static<typeof WithVideoDictionary>



    // async function decideIfWithVideo(callees: string[]): Promise<WithVideoDictionary | null> {
    //     console.log('decideIfWithVideo');
    //     if (callees.length === 0) {
    //         return {}
    //     }

    //     let props: Readonly<DecideIfWithVideoProps> = {
    //         eventBusKey: eventBusKey,
    //         decisions: callees.reduce((prev: VideoDecisionDictionary, current: string) => ({
    //             ...prev, [current]: {
    //                 remoteUser: current,
    //                 withVideo: defaultWithVideo
    //             }
    //         }), {})
    //     }
    //     fireEvent<DecideIfWithVideoDlg>({
    //         type: 'DecideIfWithVideoDlg',
    //         props: props
    //     })

    //     while (true) {
    //         const e = await waitForGuard({bus: eventBus}, rt.Union(ReceiveVideoChanged, SendVideoChanged, OkClicked, CancelClicked), signal);
    //         switch (e.type) {
    //             case 'ReceiveVideoChanged':
    //                 props = {
    //                     ...props,
    //                     decisions: {
    //                         ...props.decisions,
    //                         [e.remoteUser]: {
    //                             ...props.decisions[e.remoteUser],
    //                             withVideo: {
    //                                 ...props.decisions[e.remoteUser].withVideo,
    //                                 receive: e.receive
    //                             }
    //                         }
    //                     }
    //                 }
    //                 fireEvent<DecideIfWithVideoDlg>({
    //                     type: 'DecideIfWithVideoDlg',
    //                     props: props
    //                 })

    //                 break;
    //             case 'SendVideoChanged':
    //                 props = {
    //                     ...props,
    //                     decisions: {
    //                         ...props.decisions,
    //                         [e.remoteUser]: {
    //                             ...props.decisions[e.remoteUser],
    //                             withVideo: {
    //                                 ...props.decisions[e.remoteUser].withVideo,
    //                                 send: e.send
    //                             }
    //                         }
    //                     }
    //                 }
    //                 fireEvent<DecideIfWithVideoDlg>({
    //                     type: 'DecideIfWithVideoDlg',
    //                     props: props
    //                 })

    //                 break;

    //             case 'OkClicked':
    //                 fireEvent<DecideIfWithVideoDlg>({
    //                     type: 'DecideIfWithVideoDlg',
    //                     props: null
    //                 })
    //                 return Object.fromEntries(Object.entries(props.decisions).map(([remoteUser, decision]) => ([remoteUser, decision.withVideo])))

    //             case 'CancelClicked':
    //                 fireEvent<DecideIfWithVideoDlg>({
    //                     type: 'DecideIfWithVideoDlg',
    //                     props: null
    //                 })
    //                 return null;
    //         }

    //     }
    // }

    // async function authenticatedVideoReq<Req, Resp>(req: Req, signal: AbortSignal): Promise<ApiResp<Resp>> {
    //     assert(user != null);
    //     assert(token != null);

    //     const authReq: AuthenticatedVideoReq<Req> = {
    //         type: 'authenticatedVideoReq',
    //         ownUser: user,
    //         req: req,
    //         sessionToken: token
    //     }
    //     return await accumulatedFetching.push<AuthenticatedVideoReq<Req>, Resp>(authReq, signal);
    // }

    // function insertNewConnectionsAndSendPushNotifications(callees: string[], decisions: WithVideoDictionary | null) {
    //     if (decisions == null) return;
    //     callees.forEach(callee => {
    //         connections[callee] = new Connection(eventBus, accumulatedFetching, user, token, callee, decisions[callee], null, signal)
    //     })

    //     callees.forEach(callee => {
    //         authenticatedVideoReq<PushNotifyReq, PushNotifyResp>({
    //             type: 'pushNotify',
    //             callee: callee
    //         }, signal)
    //     })
    // }

    // while (true) {
    //     signal.throwIfAborted();
    //     console.log('before waitForGuard')
    //     try {
    //         const e = await waitForGuard({bus: eventBus}, rt.Union(CallClicked, RemoteMsgReceived, VideoDataSettingsClicked, FetchError, LogoutClicked, AuthFailed, WaitForPushClicked), signal);
    //         console.log('after waitForGuard: e', e);

    //         switch (e.type) {

    //             case 'CallClicked': {
    //                 console.log('will filter callees...');
    //                 const filteredCallees = checkAndFilterCallees(e.callees.toSorted((a, b) => a < b ? -1 : a > b ? 1 : 0));
    //                 console.log('filteredCallees', filteredCallees);
    //                 const decisions = await decideIfWithVideo(filteredCallees)
    //                 insertNewConnectionsAndSendPushNotifications(filteredCallees, decisions);
    //                 break;
    //             }

    //             case 'RemoteMsgReceived': {

    //                 nyi();
    //                 break;
    //             }

    //             case 'VideoDataSettingsClicked': {

    //                 nyi();
    //                 break;
    //             }
    //             // case 'FetchError': return e;

    //             case 'LogoutClicked': return e

    //             case 'AuthFailed': return e;

    //             // case 'WaitForPushClicked': return e;

    //         }
    //     } catch (reason) {
    //         console.error(reason);
    //         throw reason
    //     }
    // }
}
