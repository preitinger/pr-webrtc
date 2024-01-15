'use client'

import Image from 'next/image'
import styles from './page.module.css'
import { ForwardedRef, KeyboardEvent, KeyboardEventHandler, forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ModalDialog from '@/components/ModalDialog';
import EscapableFlexComp from '@/components/EscapableFlexComp';
import { LoginReq, LoginResp } from './_lib/chat/login-common';
import { ChatEvent, ChatReq, ChatResp } from './_lib/chat/chat-common';
import { apiFetchPost } from './_lib/user-management-client/apiRoutesClient';
import { ApiResp } from './_lib/user-management-client/user-management-common/apiRoutesCommon';
import { LogoutReq, LogoutResp } from './_lib/chat/logout-common';
import { userRegisterFetch } from './_lib/user-management-client/userManagementClient';
import { ChatLine, ChatPanelComp, ChatUserListComp } from './_lib/chat/chat-client';
import { VideoComp } from './_lib/video/video-client';

const timeoutMs = 2000;
// const timeoutMs = 200000;
const chatId = 'pr-webrtc';

interface LoginState {
    ownUser: string | null;
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

type RTCRef = {
    peerConnection: RTCPeerConnection | null;
}

export default function Home() {
    const [loginState, setLoginState] = useState<LoginState>({
        ownUser: null
    })

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

    const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(null);

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
        console.log('onUserKey key', e.key);
    }

    function onCall() {
        if (userList.selected === -1) {
            alert('Please select a user in the list, first.')
        }
    }

    function onDlgCancel() {
        alert('dlg canceled')
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
            chatId: chatId,
            user: ownUserRef.current,
            token: sessionTokenRef.current,
            msg: lineToSendRef.current,
            lastEventId: lastEventIdRef.current,
        }
        console.log('vor myFetchPost: req', req);
        apiFetchPost<ChatReq, ChatResp>('/api/chat', req).then(resp => {
            if (resp.type === 'error') {
                console.error('Error on server', resp.error);
                pushErrorLine('Error on server: ' + resp.error);
                requestStateRef.current = 'waiting on error';
                setChatInputFrozen(true);
                setConnectionError(true);
                setConnectionErrorConfirmed(false);
                return;
            } else if (resp.type === 'success') {
                console.log('chat resp', resp);
                processChatLines(resp.events, resp.lastEventId);
                lastEventIdRef.current = resp.lastEventId;
                console.log('last eventId', lastEventIdRef.current);

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
                        console.log('unfrozen chat input');
                        break;
                    case 'logging in':
                        return;
                        break;
                    default:
                        throw new Error('Unexpected state on fetch response' + requestStateRef.current);
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
        console.log('waehrend myFetchPost', requestStateRef.current);
    }

    function onLogin() {
        apiFetchPost<LoginReq, LoginResp>('/api/login', {
            user: loginName,
            passwd: loginPasswd,
            chatId: chatId
        }).then((loginRes: ApiResp<LoginResp>) => {
            console.log('loginRes', loginRes);
            if (loginRes.type === 'error') {
                alert('Error on login: ' + loginRes.error);
                return;
            } else if (loginRes.type === 'authenticationFailed') {
                alert('Wrong user name or password!');
                return;
            } else if (loginRes.type === 'success') {
                setLoginState({
                    ownUser: loginName
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
                console.log('vor executeRequest', requestStateRef.current);
                executeRequest();
                console.log('nach executeRequest', requestStateRef.current);
                setChatInputFrozen(false);
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
        })
    }

    function onRegister() {
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
                    break;
            }
        })
    }

    useEffect(() => {
        if (loginState.ownUser == null) {
            loginInputRef.current?.focus();
        } else {
            chatInputRef.current?.focus();
        }
    }, [loginState.ownUser]);

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

        console.log('state nach onChatSend', requestStateRef.current);

        // myFetchPost<ChatReq, ChatResp>('/api/chat', {
        //     chatId: 'pr-webrtc',
        //     user: ownUserRef.current,
        //     passwd: '',
        //     msg: chatInput,
        //     lastMsgId: lastMsgIdRef.current
        // }).then((resp: MyResp<ChatResp>) => {
        //     console.log('onChatSend: response', resp);
        //     if (resp.type === 'success') {
        //         pushChatLines(resp.messages);
        //         lastMsgIdRef.current = resp.lastMsgId;
        //     } else {
        //         console.error('Unexpected server error', resp.error);
        //         alert('Unexpected server error: ' + resp.error)
        //     }
        // }).catch(reason => {
        //     console.error('Unexpected server exception', reason);
        //     alert('Unexpected server error: ' + JSON.stringify(reason));
        // });
    }

    const onChatKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === 'Enter') {
            onChatSend();
        }
    }

    function onScroll() {
        const div = chatLinesRef.current;
        if (div == null) return;
        console.log('scrollTop', div.scrollTop);
        console.log('offsetHeight', div.offsetHeight);
        console.log('div.scrollHeight', div.scrollHeight);
        if (div.scrollTop + div.offsetHeight + 10 > div.scrollHeight) {
            setScrollDown(true);
        } else {
            setScrollDown(false);
        }
    }

    function afterLogoutOrLostSession() {
        ownUserRef.current = null;
        sessionTokenRef.current = null;
        setLoginState({
            ownUser: null
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

    }

    function onLogout() {
        if (ownUserRef.current == null) return;
        if (sessionTokenRef.current == null) return;
        apiFetchPost<LogoutReq, LogoutResp>('/api/logout', {
            user: ownUserRef.current,
            token: sessionTokenRef.current,
            chatId: chatId
        }).then((logOutRes: ApiResp<LogoutResp>) => {
            console.log('logoutResp', logOutRes);
            afterLogoutOrLostSession();
        }).catch(reason => {
            console.log('reason', reason);
        })
    }

    function onRetryConnect() {
        if (requestStateRef.current === 'waiting on error') {
            console.log('vor executeRequest', requestStateRef.current);
            executeRequest();
            setConnectionError(false);
            setChatInputFrozen(false);
        }
    }

    // video effect:
    useEffect(() => {
        // const mediaConstraints = {
        //     audio: true,
        //     video: true
        // }

        // navigator.mediaDevices.getUserMedia(mediaConstraints).then(mediaStream => {
        //     console.log('before setLocalMediaStream');
        //     setLocalMediaStream(mediaStream);
        // })

    }, [])

    function onTestMedia() {
        const mediaConstraints = {
            audio: true,
            video: true
        }

        navigator.mediaDevices.getUserMedia(mediaConstraints).then(mediaStream => {
            console.log('before setLocalMediaStream');
            setLocalMediaStream(mediaStream);
        })

    }

    return (
        <>
            <header className={styles.header}>pr-webRTC - a demonstration of video/audio calls by Peter Reitinger inspired by the documention on WebRTC on MDN</header>
            <main className={styles.main}>
                <div className={styles.left}>
                    {/* <UserList userListState={userList} onClick={onUserClick} onKey={onUserKey} /> */}
                    <ChatUserListComp userListState={userList} onClick={onUserClick} onKey={onUserKey} />
                    <button className={styles.call} onClick={onCall}>Call {userList.selected === -1 ? '(nobody selected)' : userList.users[userList.selected].name}</button>
                    <button onClick={onLogout}>Logout</button>
                </div>
                <div className={styles.right}>
                    <ChatPanelComp ref={chatLinesRef} lines={chatLines} onScroll={onScroll} />
                    <input readOnly={chatInputFrozen} contentEditable={!chatInputFrozen} ref={chatInputRef} className={chatInputFrozen ? styles.frozen : ''} value={chatInput} onChange={(e) => { setChatInput(e.target.value); }} onKeyDown={onChatKeyDown} />
                    {
                        !(connectionError && connectionErrorConfirmed) &&
                        <button onClick={onChatSend} disabled={chatInputFrozen}>Send</button>
                    }
                    {
                        (connectionError && connectionErrorConfirmed) &&
                        <button onClick={onRetryConnect}>Try again</button>
                    }
                    <div>
                        VideoComp for testing:
                        <VideoComp mediaStream={localMediaStream} />
                        <button onClick={onTestMedia}>Test Media</button>
                    </div>
                </div>
            </main>
            {
                loginState.ownUser == null &&
                <ModalDialog>
                    <EscapableFlexComp onCancel={onDlgCancel}>
                        <label>User</label>
                        <input ref={loginInputRef} value={loginName} onChange={(e) => {
                            setLoginName(e.target.value)
                        }} onKeyDown={(e) => onLoginKeyDown(e)} />
                        <label>Password</label>
                        <input type='password' value={loginPasswd} onChange={(e) => {
                            setLoginPasswd(e.target.value);
                        }} onKeyDown={(e) => onLoginKeyDown(e)} />
                        <button onClick={onLogin}>Login (when already registered)</button>
                        <button onClick={onRegister}>Register (when new user)</button>
                    </EscapableFlexComp>
                </ModalDialog>

            }
            {
                connectionError && !connectionErrorConfirmed &&
                <ModalDialog>
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
