'use client'

import Image from 'next/image'
import styles from './page.module.css'
import { ForwardedRef, KeyboardEvent, KeyboardEventHandler, forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ModalDialog from '@/components/ModalDialog';
import EscapableFlexComp from '@/components/EscapableFlexComp';
import { LoginReq, LoginResp } from './_lib/chat/login-common';
import { ChatEvent, ChatReq, ChatResp } from './_lib/chat/chat-common';
import { AccumulatedFetcher, ConnectionHandler, apiFetchPost } from './_lib/user-management-client/apiRoutesClient';
import { ApiResp } from './_lib/user-management-client/user-management-common/apiRoutesCommon';
import { LogoutReq, LogoutResp } from './_lib/chat/logout-common';
import { userRegisterFetch } from './_lib/user-management-client/userManagementClient';
import { ChatLine, ChatPanelComp, ChatUserListComp } from './_lib/chat/chat-client';
// import { VideoComp } from './_lib/video/video-client';
import { RTCRef, openPeerConnection } from './_lib/myWebRTC/myWebRTC-client';
import { CheckCallReq, OfferCallReq, OfferCallResp, RejectCallReq } from "./_lib/video/video-common";
import { TestReq as TestReq, TestResp as TestResp } from './api/tests/testOfferCall/types';
import { ToolbarData, VideoComp, VideoToolbarComp } from './_lib/video/video-client';
import VideoManager, { ReceivedCall, VideoHandlers } from './_lib/video/VideoManager';
import Link from 'next/link';

const timeoutMs = 2000;
// const timeoutMs = 200000;
const chatId = 'pr-webrtc';

type LoginState = {
    type: 'welcome';
} | {
    type: 'registering';
} | {
    type: 'loggingIn';
} | {
    type: 'done';
    ownUser: string | null;
    sessionToken: string | null;
}

interface User {
    name: string;
}

interface UserListState {
    users: User[];
    /**
     * -1 for none
     */
    selected: number;

}

/**
 * see diagram WebRTC Demo.vpp://diagram/ZxwrFzGD.AACAQpi
 */
type RequestState =
    'logging in' |
    'fetching' |
    'pending' |
    'sending' |
    'waiting for timeout' |
    'waiting on error'

function exampleLines() {
    const lines: ChatLine[] = [];
    for (let i = 0; i < 100; ++i) {
        lines.push({
            className: styles.hintLine,
            text: `Testzeile ${i}`
        })
    }

    lines.push({
        className: styles.errorLine,
        text: 'Beispielfehler!'
    })

    return lines;
}

export default function Home() {
    const [loginState, setLoginState] = useState<LoginState>({
        type: 'welcome'
    })
    const [serverHint, setServerHint] = useState<boolean>(false);

    const [loginName, setLoginName] = useState<string>('');
    const [loginPasswd, setLoginPasswd] = useState<string>('');

    const [userList, setUserList] = useState<UserListState>({
        users: [],
        selected: -1
    });

    const [chatInput, setChatInput] = useState<string>('');

    const [chatLines, setChatLines] = useState<ChatLine[]>([]);
    const [scrollDown, setScrollDown] = useState<boolean>(true);
    const [chatInputFrozen, setChatInputFrozen] = useState<boolean>(true);
    const [connectionError, setConnectionError] = useState<boolean>(false);
    const [connectionErrorConfirmed, setConnectionErrorConfirmed] = useState<boolean>(false);

    const [videoCall, setVideoCall] = useState<boolean>(false);
    const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(null);
    const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream | null>(null);
    const [testCaller, setTestCaller] = useState<string>('');
    const [testCallee, setTestCallee] = useState<string>('');

    const loginInputRef = useRef<HTMLInputElement | null>(null);
    const chatLinesRef = useRef<HTMLDivElement | null>(null);
    const chatInputRef = useRef<HTMLInputElement | null>(null);
    const lastEventIdRef = useRef<number | null>(-1);
    const timeout = useRef<NodeJS.Timeout | null>(null);
    const lineToSendRef = useRef<string | null>(null);
    const requestStateRef = useRef<RequestState>('logging in');
    const ownUserRef = useRef<string | null>(null);
    const sessionTokenRef = useRef<string | null>(null);
    const eventIdForUsers = useRef<number>(-1);
    const rtcRef = useRef<RTCRef>({
        peerConnection: null
    })
    const accumulatedFetcher = useRef<AccumulatedFetcher | null>(null);

    useEffect(() => {
        if (typeof (window) !== undefined) {
            const connectionHandler: ConnectionHandler = (error: string) => {
                pushErrorLine(error);
                // requestStateRef.current = 'waiting on error';
                setChatInputFrozen(true);
                setConnectionError(true);
                setConnectionErrorConfirmed(false);
            }
            accumulatedFetcher.current = new AccumulatedFetcher('/api/webRTC', connectionHandler);
        }
    }, [])

    function processChatLines(m: ChatEvent[], lastEventId: number | null) {
        // Voraussetzung: { m.length > 0 ==> lastEventId != null }
        setChatLines(d => [...d, ...(
            m.map(msg => (msg.type === 'ChatMsg' ? {
                className: '',
                text: `${msg.user}: ${msg.text}`
            } : msg.type === 'UserEntered' ? {
                className: styles.hintLine,
                text: `[${msg.user} has entered.]`
            } : {
                className: styles.hintLine,
                text: `[${msg.user} has left.]`
            }))
        )])

        const firstEventId = (lastEventId ?? -1) - m.length + 1;

        m.forEach((d, i) => {
            if (d.type === 'UserEntered' && firstEventId + i >= eventIdForUsers.current) {
                setUserList(l => {
                    const foundUser = l.users.find(u => u.name === d.user);
                    if (foundUser == null) {
                        const newL = {
                            ...l,
                            users: [...l.users, {
                                name: d.user
                            }]
                        }
                        return newL;
                    }
                    return l;
                });
            } else if (d.type === 'UserLeft' && firstEventId + i >= eventIdForUsers.current) {
                setUserList(l => {
                    const removedIdx = l.users.findIndex(u => u.name === d.user);
                    if (removedIdx === -1) {
                        return l;
                    }
                    const newL = {
                        ...l,
                        users: [...l.users.filter((v, i) => i !== removedIdx)],
                        selected: removedIdx < l.selected ? l.selected - 1 : removedIdx === l.selected ? -1 : l.selected
                    }
                    return newL;
                });
            }
        })
    }

    function pushHintLine(line: string) {
        setChatLines(d => [...d, {
            className: styles.hintLine,
            text: line
        }]);
    }

    function pushErrorLine(line: string) {
        setChatLines(d => [...d, {
            className: styles.errorLine,
            text: line
        }]);
    }

    function onUserClick(idx: number) {
        if (userList.selected === idx) {
            setUserList({
                ...userList,
                selected: -1
            })
        } else {
            setUserList({
                ...userList,
                selected: idx
            })
        }
    }

    function onUserKey(e: KeyboardEvent<HTMLElement>) {
        // TODO call user on enter?
        // But if user is called on enter, current behavior to toggle selection on enter (as well as on space) must be changed in chat-client.tsx
        // console.log('onUserKey key', e.key);
    }


    function onCall() {
        if (userList.selected === -1) {
            alert('Please select a user in the list, first.')
            return;
        }

        videoManagerRef.current?.onCall(userList.users[userList.selected].name);
    }

    function onDlgCancel() {
        switch (loginState.type) {
            case 'loggingIn':
                // no break
            case 'registering':
                setLoginState({
                    type: 'welcome'
                });
                break;
        }
    }

    function onTimeout() {
        if (ownUserRef.current == null) throw new Error('ownUser null in onTimeout');
        switch (requestStateRef.current) {
            case 'waiting for timeout':
                executeRequest();
                break;
            case 'waiting on error':
                if (lineToSendRef.current == null) {
                    setChatInputFrozen(false);
                    executeRequest();
                } else {
                    executeRequest();
                }
                break;
            default:
                throw new Error('Illegal state onTimeout: ' + requestStateRef.current);
        }
    }

    function executeRequest() {
        if (ownUserRef.current == null) throw new Error('own user null');
        if (sessionTokenRef.current == null) throw new Error('session token null');
        const req: ChatReq = {
            type: 'chat',
            chatId: chatId,
            user: ownUserRef.current,
            token: sessionTokenRef.current,
            msg: lineToSendRef.current,
            lastEventId: lastEventIdRef.current,
        }
        console.debug('vor myFetchPost: req', req);
        if (accumulatedFetcher.current == null) throw new Error('accumulatedFetcher null');
        accumulatedFetcher.current.push<ChatReq, ChatResp>(req).
        /* apiFetchPost<ChatReq, ChatResp>('/api/chat', req). */then(resp => {
            if (resp.type === 'error') {
                console.error('Error on server', resp.error);
                pushErrorLine('Error on server: ' + resp.error);
                requestStateRef.current = 'waiting on error';
                setChatInputFrozen(true);
                setConnectionError(true);
                setConnectionErrorConfirmed(false);
                return;
            } else if (resp.type === 'success') {
                console.debug('chat resp', resp);
                processChatLines(resp.events, resp.lastEventId);
                lastEventIdRef.current = resp.lastEventId;
                console.debug('last eventId', lastEventIdRef.current);

                switch (requestStateRef.current) {
                    case 'fetching':
                        requestStateRef.current = 'waiting for timeout';
                        timeout.current = setTimeout(onTimeout, timeoutMs);
                        break;
                    case 'pending':
                        if (ownUserRef.current == null) throw new Error('ownUser null on chat resp in state pending');
                        executeRequest();
                        break;
                    case 'sending':
                        lineToSendRef.current = null;
                        setChatInput('');
                        requestStateRef.current = 'waiting for timeout';
                        timeout.current = setTimeout(onTimeout, timeoutMs);
                        setChatInputFrozen(false);
                        console.debug('unfrozen chat input');
                        break;
                    case 'logging in':
                        return;
                        break;
                    default:
                        throw new Error('Unexpected state on fetch response: ' + requestStateRef.current);
                }
            } else if (resp.type === 'authenticationFailed') {
                alert('Die Session ist abgelaufen. Evtl. hast du dich inzwischen an anderer Stelle eingeloggt?');
                afterLogoutOrLostSession();
            } else {
                throw new Error('impossible state?!');
            }

        }).catch(reason => {
            if (reason instanceof Error) {
                if (reason.message === 'Failed to fetch') {
                    pushErrorLine('No connection to the server.')
                } else {
                    pushErrorLine(`Unknown server error (${reason.name}): ${reason.message}`)
                }
            } else {
                console.error('Caught in apiFetchPost: Error', reason);
                pushErrorLine('Caught unknown in apiFetchPost: ' + JSON.stringify(reason));
            }
            // alert('Error (on server?)' + JSON.stringify(reason));
            requestStateRef.current = 'waiting on error';
            setChatInputFrozen(true);
            setConnectionError(true);
            setConnectionErrorConfirmed(false);
        });
        if (lineToSendRef.current == null) {
            requestStateRef.current = 'fetching';
        } else {
            requestStateRef.current = 'sending';
            setChatInputFrozen(true);
        }
        console.debug('waehrend myFetchPost', requestStateRef.current);
    }

    const videoManagerRef = useRef<VideoManager | null>(null);
    const [toolbarData, setToolbarData] = useState<ToolbarData | null>(null);

    function onLogin() {
        const fetcher = accumulatedFetcher.current;
        if (fetcher == null) return;
        const req: LoginReq = {
            type: 'login',
            user: loginName,
            passwd: loginPasswd,
            chatId: chatId

        }
        // apiFetchPost<LoginReq, LoginResp>('/api/login', req)

        setServerHint(true);
        fetcher.push<LoginReq, LoginResp>(req)
            .then((loginRes: ApiResp<LoginResp>) => {
                console.debug('loginRes', loginRes);
                if (loginRes.type === 'error') {
                    alert('Error on login: ' + loginRes.error);
                    return;
                } else if (loginRes.type === 'authenticationFailed') {
                    alert('Wrong user name or password!');
                    return;
                } else if (loginRes.type === 'success') {
                    setLoginState({
                        type: 'done',
                        ownUser: loginName,
                        sessionToken: loginRes.token
                    })
                    ownUserRef.current = loginName;
                    sessionTokenRef.current = loginRes.token;
                    eventIdForUsers.current = loginRes.eventIdForUsers;

                    setChatLines(d => [
                        ...d,
                        {
                            className: styles.hintLine,
                            text: `Welcome, ${loginName}!`
                        }
                    ])
                    setScrollDown(true);
                    console.debug('vor executeRequest', requestStateRef.current);
                    executeRequest();
                    console.debug('nach executeRequest', requestStateRef.current);
                    setChatInputFrozen(false);
                    {
                        const handlers: VideoHandlers = {
                            onToolbarData: (data: ToolbarData | null) => {
                                setToolbarData(data);
                            },
                            onVideoCall: (active: boolean) => {
                                setVideoCall(active);
                            },
                            onLocalStream: (s) => {
                                setLocalMediaStream(s);
                            },
                            onRemoteStream: (s) => {
                                setRemoteMediaStream(s);
                            },
                            onHint: (hint: string, alert?: boolean) => {
                                pushHintLine(hint);
                                if (alert) {
                                    window.alert(hint);
                                }
                            },
                            onError: (error: string) => {
                                pushErrorLine(error);
                            }
                        };

                        if (videoManagerRef.current != null) {
                            videoManagerRef.current.close();
                        }
                        videoManagerRef.current = new VideoManager(loginName, loginRes.token, timeoutMs, fetcher, handlers);
                    }
                }

                setUserList({
                    users: loginRes.users.map(userName => ({
                        name: userName
                    })),
                    selected: -1
                })
            }).catch(reason => {
                console.error(reason);
                alert('Server problem');
            }).finally(() => {
                setServerHint(false);
            })
    }

    function onRegister() {
        setServerHint(true);
        userRegisterFetch({
            user: loginName,
            passwd: loginPasswd
        }).then(resp => {
            switch (resp.type) {
                case 'error':
                    alert('Registration of new user failed because of error: ' + resp.error);
                    break;
                case 'nameNotAvailable':
                    alert('This name is no longer available because another user (or you ;-) has registered with this name!');
                    break;
                case 'success':
                    alert('Registration successful! You can now login with this user and password.')
                    setLoginState({
                        type: 'loggingIn'
                    })
                    break;
            }
        }).finally(() => {
            setServerHint(false);
        })
    }

    // useEffect(() => {
    //     if (loginState.ownUser == null) {
    //         loginInputRef.current?.focus();
    //     } else {
    //         chatInputRef.current?.focus();
    //     }
    // }, [loginState.ownUser]);

    useLayoutEffect(() => {
        if (scrollDown) {
            const div = chatLinesRef.current;
            if (div == null) return;
            div.scroll({
                top: div.scrollHeight
            })
        }
    }, [scrollDown, chatLines])

    function onLoginKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            onLogin();
        }
    }

    function onRegisterKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            onRegister();
        }
    }

    function onChatSend() {
        if (ownUserRef.current == null) return;
        if (chatInputFrozen) return;


        switch (requestStateRef.current) {
            case 'waiting for timeout':
                if (timeout.current == null) throw new Error('timeout null');
                clearTimeout(timeout.current);
                lineToSendRef.current = chatInput;
                executeRequest();
                break;
            case 'fetching':
                requestStateRef.current = 'pending';
                setChatInputFrozen(true);
                lineToSendRef.current = chatInput
                break;
            default:
                throw new Error('illegal state in onChatSend' + requestStateRef.current);
        }

        console.debug('state nach onChatSend', requestStateRef.current);
    }

    const onChatKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === 'Enter') {
            onChatSend();
        }
    }

    function onScroll() {
        const div = chatLinesRef.current;
        if (div == null) return;
        console.debug('scrollTop', div.scrollTop);
        console.debug('offsetHeight', div.offsetHeight);
        console.debug('div.scrollHeight', div.scrollHeight);
        if (div.scrollTop + div.offsetHeight + 10 > div.scrollHeight) {
            setScrollDown(true);
        } else {
            setScrollDown(false);
        }
    }

    function afterLogoutOrLostSession() {
        videoManagerRef.current?.close();
        videoManagerRef.current = null;
        ownUserRef.current = null;
        sessionTokenRef.current = null;
        setLoginState({
            type: 'welcome',
        })
        requestStateRef.current = 'logging in';
        if (timeout.current != null) {
            clearTimeout(timeout.current);
            timeout.current = null;
        }
        setUserList({
            users: [],
            selected: -1
        });
        setVideoCall(false);
        setLocalMediaStream(null);
        setRemoteMediaStream(null);

    }

    function onLogout() {
        if (ownUserRef.current == null) return;
        if (sessionTokenRef.current == null) return;
        if (accumulatedFetcher.current == null) return;

        if (videoManagerRef.current != null) {
            videoManagerRef.current.close();
        }

        const req: LogoutReq = {
            type: 'logout',
            user: ownUserRef.current,
            token: sessionTokenRef.current,
            chatId: chatId
        }
        // apiFetchPost<LogoutReq, LogoutResp>('/api/logout', req)
        accumulatedFetcher.current.push<LogoutReq, LogoutResp>(req)
            .then((logOutRes: ApiResp<LogoutResp>) => {
                console.debug('logoutResp', logOutRes);
                afterLogoutOrLostSession();
            }).catch(reason => {
                console.error('reason', reason);
            })
    }

    function onRetryConnect() {
        if (requestStateRef.current === 'waiting on error') {
            console.debug('vor executeRequest', requestStateRef.current);
            executeRequest();
        }

        if (accumulatedFetcher.current != null) {
            accumulatedFetcher.current.retryAfterError();
        }
        setConnectionError(false);
        setChatInputFrozen(false);
    }

    // TODO remove onTestMedia:
    function onTestMedia() {
        const mediaConstraints = {
            audio: true,
            video: true
        }

        navigator.mediaDevices.getUserMedia(mediaConstraints).then(mediaStream => {
            setLocalMediaStream(mediaStream);
        })

    }

    const [imgWidth, setImgWidth] = useState<number>(300);

    function onResize() {
        const width800 = window.matchMedia('(min-width: 800px)');

        if (width800.matches) {
            setImgWidth(750);
        } else {
            setImgWidth(300);
        }
    }

    useEffect(() => {
        onResize();
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
        }
    }, [])

    function enterRegister() {
        setLoginState({
            type: 'registering'
        })
    }

    function enterLogin() {
        setLoginState({
            type: 'loggingIn'
        })
    }

    return (
        <>
            <div className={styles.top}>
                {
                    loginState.type === 'done' &&
                    <div>
                    <button className={`${styles.redButton} ${styles.logout}`} onClick={onLogout}>Logout</button>
                    </div>
                }

                <div className={styles.header}>
                    <h4>pr-webRTC</h4><h5>a demonstration of video/audio calls by Peter Reitinger inspired by the documention on WebRTC on MDN</h5>
                    {
                        loginState.type === 'welcome' &&
                        <div>
                            <Image className={styles.img} src='/Dekobildchen.svg' alt='Image for video calls as decoration' width={imgWidth} height={imgWidth * 500 / 750} priority /><br />
                            <div className={styles.imgAttribute}><a href="https://www.freepik.com/free-vector/video-conferencing-concept-landing-page_5155828.htm#query=video%20call&position=13&from_view=search&track=ais&uuid=d88bd399-7c39-4f67-8c62-d2715f65f654">Image by pikisuperstar</a> on Freepik</div>

                            <p>
                                {"This is mainly for demonstration and my personal usage. So, registration is without the necessity to provide any personal data. Not even an email address is required. Just, choose a user name and a password. That's it. (At least as long as the usage is within reasonable borders... ;-)"}
                            </p>
                            <div className={styles.buttonRow}>
                                {/* <Link className={styles.register} href='/register'>Register now</Link>
                                <div>and then</div>
                                <Link className={styles.login} href='/login'>Login</Link> */}
                                <button onClick={enterRegister} className={styles.redButton}>Register now</button>
                                <p>and then</p>
                                <button className={styles.greenButton} onClick={enterLogin}>Login</button>
                            </div>
                        </div>
                    }
                </div>
            </div>
            {
                loginState.type === 'done' &&
                <div className={styles.main}>
                    <div className={styles.left}>
                        {/* <UserList userListState={userList} onClick={onUserClick} onKey={onUserKey} /> */}
                        <ChatUserListComp key='userList' userListState={userList} small={videoCall} onClick={onUserClick} onKey={onUserKey} />
                        {
                            !videoCall &&
                            <button className={styles.call} onClick={onCall}>Call {userList.selected === -1 ? '(nobody selected)' : userList.users[userList.selected].name}</button>
                        }
                        {
                            toolbarData != null &&
                            <VideoToolbarComp data={toolbarData} onEvent={(e) => {
                                videoManagerRef.current?.onVideoToolbarEvent(e);
                            }} />
                        }
                        {
                            videoCall &&
                            <>
                                <ChatPanelComp ref={chatLinesRef} lines={chatLines} onScroll={onScroll} small={videoCall} />
                                <input key='chatInput' readOnly={chatInputFrozen} contentEditable={!chatInputFrozen} ref={chatInputRef} className={chatInputFrozen ? styles.frozen : ''} value={chatInput} onChange={(e) => { setChatInput(e.target.value); }} onKeyDown={onChatKeyDown} />
                                {
                                    !(connectionError && connectionErrorConfirmed) &&
                                    <button key='send' onClick={onChatSend} disabled={chatInputFrozen}>Send</button>
                                }
                                {
                                    (connectionError && connectionErrorConfirmed) &&
                                    <button key='tryAgain' onClick={onRetryConnect}>Try again</button>
                                }
                            </>
                        }
                    </div>
                    <div className={styles.right}>
                        {/* <button onClick={() => {
                            window.open('/api/webRTC/mini', 'webRTC-mini', "directories=0,titlebar=0,toolbar=0,location=0,status=0,menubar=0,scrollbars=no,resizable=no,width=400,height=350");
                        }}>Test window</button> */}
                        {/* <div>
                        <h1>Tests</h1>
                        <p>Empty string interpreted as bool is {'' ? 'true' : 'false'}</p>
                        <p>String {"'.'"} is interpreted as bool {'.' ? 'true' : 'false'}</p>
                        <label>Caller <input key='testCaller' value={testCaller} onChange={(e) => { setTestCaller(e.target.value) }} /></label>
                        <label>Callee <input key='testCallee' value={testCallee} onChange={(e) => { setTestCallee(e.target.value) }} /></label>
                        <button onClick={async () => {
                            const ownUser = ownUserRef.current;
                            if (ownUser == null) return;
                            const ownToken = sessionTokenRef.current;
                            if (ownToken == null) return;
                            const req: TestReq = {
                                user: ownUser,
                                token: ownToken,
                                req: {
                                    type: 'offerCall',
                                    caller: testCaller,
                                    callee: testCallee,
                                    description: { bla: 'bla' },
                                    candidates: [{ 'candidate-of-caller': 'bla' }]
                                }
                            }
                            const resp = await apiFetchPost<TestReq, TestResp>('/api/tests/testOfferCall', req);
                            alert('resp: ' + JSON.stringify(resp));

                        }}>offerCall</button>
                        <button onClick={async () => {
                            const ownUser = ownUserRef.current;
                            if (ownUser == null) return;
                            const ownToken = sessionTokenRef.current;
                            if (ownToken == null) return;

                            const checkCallReq: CheckCallReq = {
                                type: 'checkCall',
                                callee: testCallee,
                            };
                            const req: TestReq = {
                                user: ownUser,
                                token: ownToken,
                                req: checkCallReq
                            }
                            const resp = await apiFetchPost<TestReq, TestResp>('/api/tests/testOfferCall', req);
                            alert('resp: ' + JSON.stringify(resp));
                        }}>checkCall
                        </button>
                        <button onClick={async () => {
                            const ownUser = ownUserRef.current;
                            if (ownUser == null) return;
                            const ownToken = sessionTokenRef.current;
                            if (ownToken == null) return;
                            const req: TestReq = {
                                user: ownUser,
                                token: ownToken,
                                req: {
                                    type: 'acceptCall',
                                    caller: testCaller,
                                    callee: testCallee,
                                    description: { bla: 'blubb' },
                                    candidates: [{ 'test-candidate': 1 }, { 'test-candidate': 2 }]
                                }
                            }
                            const resp = await apiFetchPost<TestReq, TestResp>('/api/tests/testOfferCall', req);
                            alert('resp: ' + JSON.stringify(resp));

                        }}>acceptCall</button>
                        <button onClick={async () => {
                            const ownUser = ownUserRef.current;
                            if (ownUser == null) return;
                            const ownToken = sessionTokenRef.current;
                            if (ownToken == null) return;

                            const rejectCallReq: RejectCallReq = {
                                type: 'rejectCall',
                                caller: testCaller,
                                callee: testCallee
                            };
                            const req: TestReq = {
                                user: ownUser,
                                token: ownToken,
                                req: rejectCallReq
                            }
                            const resp = await apiFetchPost<TestReq, TestResp>('/api/tests/testOfferCall', req);
                            alert('resp: ' + JSON.stringify(resp));

                        }}>rejectCall</button>
                    </div> */}
                        {
                            !videoCall &&
                            <>
                                <ChatPanelComp ref={chatLinesRef} lines={chatLines} onScroll={onScroll} small={videoCall} />
                                <input key='chatInput' readOnly={chatInputFrozen} contentEditable={!chatInputFrozen} ref={chatInputRef} className={chatInputFrozen ? styles.frozen : ''} value={chatInput} onChange={(e) => { setChatInput(e.target.value); }} onKeyDown={onChatKeyDown} />
                                {
                                    !(connectionError && connectionErrorConfirmed) &&
                                    <button key='send' onClick={onChatSend} disabled={chatInputFrozen}>Send</button>
                                }
                                {
                                    (connectionError && connectionErrorConfirmed) &&
                                    <button key='tryAgain' onClick={onRetryConnect}>Try again</button>
                                }
                            </>
                        }
                        {
                            videoCall &&
                            <div>
                            <VideoComp showConnecting={false} key='localMedia' mediaStream={localMediaStream} />
                            <VideoComp showConnecting={true} key='remoteMedia' mediaStream={remoteMediaStream} />
                        </div>
                        }
                    </div>
                </div>
            }
            {
                serverHint &&
                <ModalDialog key='loginDlg'>
                    <p>Concacting server ...</p>
                </ModalDialog>
            }
            {
                loginState.type === 'loggingIn' && !serverHint &&
                <ModalDialog key='loginDlg'>
                    <EscapableFlexComp onCancel={onDlgCancel}>
                        <h2>Login (already registered)</h2>
                        <label>User</label>
                        <input ref={loginInputRef} value={loginName} onChange={(e) => {
                            setLoginName(e.target.value)
                        }} onKeyDown={(e) => onLoginKeyDown(e)} />
                        <label>Password</label>
                        <input type='password' value={loginPasswd} onChange={(e) => {
                            setLoginPasswd(e.target.value);
                        }} onKeyDown={(e) => onLoginKeyDown(e)} />
                        <button className={styles.greenButton} onClick={onLogin}>Login</button>
                        <button className={styles.redButton} onClick={onDlgCancel}>Cancel</button>
                    </EscapableFlexComp>
                </ModalDialog>
            }
            {
                loginState.type === 'registering' && !serverHint &&
                <ModalDialog key='loginDlg'>
                    <EscapableFlexComp onCancel={onDlgCancel}>
                        <h2>Register as a new user</h2>
                        <label>User</label>
                        <input ref={loginInputRef} value={loginName} onChange={(e) => {
                            setLoginName(e.target.value)
                        }} onKeyDown={(e) => onRegisterKeyDown(e)} />
                        <label>Password</label>
                        <input type='password' value={loginPasswd} onChange={(e) => {
                            setLoginPasswd(e.target.value);
                        }} onKeyDown={(e) => onRegisterKeyDown(e)} />
                        <button className={styles.greenButton} onClick={onRegister}>Register</button>
                        <button className={styles.redButton} onClick={onDlgCancel}>Cancel</button>
                    </EscapableFlexComp>
                </ModalDialog>

            }
            {
                connectionError && !connectionErrorConfirmed &&
                <ModalDialog key='conDlg'>
                    <h2>No connection to the server</h2>
                    <p>{'Please ensure you are connected to the internet and then click on "Try again"'}</p>
                    <button onClick={() => {
                        setConnectionErrorConfirmed(true);
                    }}>OK</button>
                </ModalDialog>
            }
        </>
    )
}
