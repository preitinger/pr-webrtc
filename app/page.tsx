'use client';

import { KeyboardEvent, KeyboardEventHandler, useEffect, useLayoutEffect, useRef, useState } from "react"
import { AccumulatedFetching } from "./_lib/user-management-client/AccumulatedFetching"
import ContactingServerManagedDlg from "@/components/ContactingServerManagedDlg";
import ContactingServerEvent, { CONTACTING_SERVER_EVENT_BUS_KEY } from "./_lib/ContactingServerEvent";
import { getEventBus, useEventBus } from "./useEventBus";
import { LoginReq, LoginResp } from "./_lib/chat/login-common";
import styles from './page.module.css';
import Image from "next/image";
import { RegisterReq } from "./_lib/user-management-client/user-management-common/register";
import { userRegisterFetch } from "./_lib/user-management-client/userManagementClient";
import { ChatLine, ChatPanelComp, ChatUserListComp, LoginResultData, UseChatResult, UserListState, useChat } from "./_lib/chat/chat-client";
import { ApiResp } from "./_lib/user-management-client/user-management-common/apiRoutesCommon";
import { LogoutReq, LogoutResp } from "./_lib/chat/logout-common";
import EventBus from "./_lib/EventBus";
import FixedAbortController from "./_lib/user-management-client/FixedAbortController";
import useTestHook from "./_lib/useTestHook";
import ModalDialog from "@/components/ModalDialog";

const chatId = 'pr-webrtc';

type StartPageResult = 'registerClicked' | 'loginClicked';

interface LoginData {
    user: string;
    passwd: string;
}

type MainEvent = {
    type: 'loggedOut';
} | {
    type: 'userEntered';
    name: string;
} | {
    type: 'userLeft';
    name: string;
} | {
    type: StartPageResult;
} | {
    type: 'cancelClicked';
} | {
    type: 'loginData';
    loginData: LoginData | null;
}

export default function Page() {
    const accumulatedFetching = useRef<AccumulatedFetching | null>(null);
    // const startPageResolve = useRef<((res: StartPageResult) => void) | null>(null);
    // const loginDataResolve = useRef<((res: LoginData | null) => void) | null>(null);
    const loginInputRef = useRef<HTMLInputElement | null>(null);
    // const chatLinesRef = useRef<HTMLDivElement | null>(null);
    const chatInputRef = useRef<HTMLInputElement | null>(null);
    const onLogoutRef = useRef<(() => void) | null>(null);
    const mainEventBus = useRef<EventBus<MainEvent> | null>(null)
    function getMainEventBus() {
        if (mainEventBus.current == null) {
            mainEventBus.current = new EventBus<MainEvent>('main');
        }
        return mainEventBus.current;
    }
    const contactingServerBus = useRef<EventBus<ContactingServerEvent> | null>(null);
    function getContactingServerBus() {
        if (contactingServerBus.current == null) {
            contactingServerBus.current = getEventBus<ContactingServerEvent>(CONTACTING_SERVER_EVENT_BUS_KEY);
        }
        return contactingServerBus.current;
    }
    const [error, setError] = useState<string>('');
    const [startPage, setStartPage] = useState<boolean>(false);
    const [inputRegisterData, setInputRegisterData] = useState<boolean>(false);
    const [inputLoginData, setInputLoginData] = useState<boolean>(false);
    const [loginName, setLoginName] = useState<string>('');
    const [loginPasswd, setLoginPasswd] = useState<string>('');
    const [regularViews, setRegularViews] = useState<boolean>(false);
    // const [userListState, setUserListState] = useState<UserListState>({
    //     users: [],
    //     selected: -1
    // });
    const [videoCallActive, setVideoCallActive] = useState<boolean>(false);
    // const [chatLines, setChatLines] = useState<ChatLine[]>([]);
    const [chatInputFrozen, setChatInputFrozen] = useState<boolean>(true);
    const [connectionError, setConnectionError] = useState<boolean>(false);
    const [connectionErrorConfirmed, setConnectionErrorConfirmed] = useState<boolean>(false);
    const [loginResultData, setLoginResultData] = useState<LoginResultData | null>(null);

    const chat = useChat({ chatId: chatId, timeoutMs: 2000 })


    // const setContactingServer = (contactingServer: boolean) => () => {
    //     contactingServerBus.publish({
    //         contactingServer: contactingServer
    //     })

    //     if (contactingServer) {
    //         const to = setTimeout(() => {
    //             contactingServerBus.publish({
    //                 contactingServer: false
    //             })
    //         }, 2000);

    //         return () => {
    //             clearTimeout(to);
    //         }
    //     }
    // }

    useEffect(() => {
        const abortController = new FixedAbortController();
        accumulatedFetching.current = new AccumulatedFetching(
            '/api/webRTC',
            {
                fetchError: (error) => {
                    setChatInputFrozen(true);
                    chat.addErrorLine(error);
                    setConnectionError(true);
                    setConnectionErrorConfirmed(false);
                }
            },
            abortController
        )

        const subscription = getMainEventBus().subscribe();

        let user: string | null = null;
        let passwd: string | null = null;
        let token: string | null = null;
        // async function loginReq(): Promise<boolean> {
        //     console.log('loginReq');
        //     if (accumulatedFetching.current == null) throw new Error('accumulatedFetching cannot be null here?!');
        //     if (user == null || passwd == null) throw new Error('user or passwd null');
        //     const req: LoginReq = {
        //         type: 'login',
        //         chatId: chatId,
        //         user: user,
        //         passwd: passwd
        //     }
        //     if (accumulatedFetching.current == null) throw new Error('accumulatedFetching cannot be null here?!');

        //     try {
        //         const resp = await accumulatedFetching.current.push<LoginReq, LoginResp>(req);
        //         switch (resp.type) {
        //             case 'success':
        //                 return true;
        //             case 'authenticationFailed':
        //                 setError('Wrong user or password!');
        //                 return false;
        //             case 'error':
        //                 setError(`Unexpected server error during login: "${resp.error}"`);
        //                 return false;
        //         }
        //     } finally {
        //         contactingServerBus.publish({
        //             contactingServer: false
        //         })

        //     }
        // }


        async function videoCalls() {
            console.warn('nyi');
            // throw new Error('nyi');
        }

        async function logout() {
            return new Promise<void>(resolve => {
                onLogoutRef.current = async () => {
                    if (user == null) throw new Error('user null?!');
                    if (token == null) throw new Error('token null?!');
                    const req: LogoutReq = {
                        type: 'logout',
                        chatId: chatId,
                        user: user,
                        token: token
                    }
                    let resp: ApiResp<LogoutResp>;

                    try {
                        getContactingServerBus().publish({
                            contactingServer: true
                        })
                        if (accumulatedFetching.current == null) throw new Error('accumulatedFetching.current null?!');
                        resp = await accumulatedFetching.current.push<LogoutReq, LogoutResp>(req);

                    } finally {
                        getContactingServerBus().publish({
                            contactingServer: false
                        })
                    }
                    switch (resp.type) {
                        case 'success':
                            getMainEventBus().publish({
                                type: 'loggedOut'
                            });
                            finish();
                            break;
                        case 'error':
                            setError(resp.error);
                            break;
                    }
                }

                function finish() {
                    abortController.signal.removeEventListener('abort', finish);
                    resolve();
                }

                abortController.signal.addEventListener('abort', finish);
            })
        }

        async function mergeLoginReq(): Promise<void> {

            {
                if (accumulatedFetching.current == null) throw new Error('accumulatedFetching cannot be null here?!');
                if (user == null || passwd == null) throw new Error('user or passwd null');
                const req: LoginReq = {
                    type: 'login',
                    chatId: chatId,
                    user: user,
                    passwd: passwd
                }
                getContactingServerBus().publish({
                    contactingServer: true
                })
                let resp: ApiResp<LoginResp>;
                try {
                    if (accumulatedFetching.current == null) throw new Error('accumulatedFetching cannot be null here?!');
                    resp = await accumulatedFetching.current.push<LoginReq, LoginResp>(req);
                } finally {
                    getContactingServerBus().publish({
                        contactingServer: false
                    })

                }
                switch (resp.type) {
                    case 'success':
                        localStorage.setItem('user', user);
                        localStorage.setItem('passwd', passwd);
                        token = resp.token;
                        setRegularViews(true);
                        setChatInputFrozen(false);
                        chat.onStart(accumulatedFetching.current, {
                            user: user,
                            sessionKey: resp.token,
                            initialUsers: resp.users,
                            eventIdForUsers: resp.eventIdForUsers,
                        }, function () {
                            {
                                alert('You have been logged out. Probably, you or sb else who knows your password have logged in on another device or browser tab?');
                                getMainEventBus().publish({
                                    type: 'loggedOut'
                                });

                            }
                        });
                        // actions "present user list" and "chatting" happen in the custom hook "useChat".
                        const videoCallsProm = videoCalls();
                        const logoutProm = logout();

                        await logoutProm;
                        chat.onStop();
                        setRegularViews(false);
                        mergeStartPage();
                        break;
                    case 'authenticationFailed':
                        setError('Wrong user or password!');
                        mergeInputLoginData();
                        break;
                    case 'error':
                        setError(`Unexpected server error during login: "${resp.error}"`);
                        mergeInputLoginData();
                        break;
                }

            }
        }

        async function registerNewUser(): Promise<boolean> {
            setInputRegisterData(true);
            try {
                while (true) {
                    const e = await subscription.nextEventWith(e => e.type === 'loginData')
                    if (e.type !== 'loginData') throw new Error('Bug in nextEventWith: e=' + JSON.stringify(e));
                    const loginData = e.loginData;
                    if (loginData == null) {
                        return false;
                    }
                    const req: RegisterReq = {
                        user: loginData.user,
                        passwd: loginData.passwd
                    }
                    try {
                        const resp = await userRegisterFetch(req);
                        switch (resp.type) {
                            case 'error':
                                setError(resp.error);
                                break;
                            case 'nameNotAvailable':
                                setError(`User name ${loginData.user} not available.`);
                                break;
                            case 'success':
                                alert('Registration successful.')
                                user = loginData.user;
                                passwd = loginData.passwd;
                                localStorage.setItem('user', user);
                                localStorage.setItem('passwd', passwd);
                                return true;
                            default:
                                // never
                                throw new Error('Never here?!');
                        }
                    } catch (reason) {
                        if (reason instanceof Error) {
                            if (reason.message === 'Failed to fetch') {
                                setError('No connection to the server.');
                            } else {
                                setError(`Unknown server error(${reason.name}): ${reason.message}`);
                            }
                        } else {
                            console.warn('Caught unknown in apiFetchPost', reason);
                            setError('Caught unknown in apiFetchPost: ' + JSON.stringify(reason));
                        }
                    }
    
                }

            } catch (reason) {
                console.warn('caught', reason);
                throw reason;
            } finally {
                setInputRegisterData(false);
            }
        }

        async function mergeStartPage(): Promise<void> {
            setStartPage(true);
            const e = await subscription.nextEventWith(e => e.type === 'registerClicked' || e.type === 'loginClicked');
            if (e.type !== 'registerClicked' && e.type !== 'loginClicked') throw new Error('Bug in nextEventWith: e=' + JSON.stringify(e));

            switch (e.type) {
                case 'registerClicked':
                    setStartPage(false);
                    if (await registerNewUser()) {
                        mergeInputLoginData();
                    } else {
                        mergeStartPage();
                    }
                    break;
                case 'loginClicked':
                    setStartPage(false);
                    mergeInputLoginData();
                    break;
            }
        }

        async function mergeInputLoginData(): Promise<void> {
            setInputLoginData(true);
            try {
                do {
                    const e = await subscription.nextEvent();
                    switch (e.type) {
                        case 'loginData':
                            setInputLoginData(false);
                            const loginData = e.loginData;
                            if (loginData == null) {
                                // login canceled
                                sessionStorage.removeItem('callee');
                                return mergeStartPage();
                            } else {
                                user = loginData.user;
                                passwd = loginData.passwd;
                                return mergeLoginReq();
                            }
                        default:
                            break;
                    }
                } while (true);
            } finally {
            }
        }

        /**
         * For the following code, see activity diagram:
         * WebRTC Demo.vpp://diagram/hJKGxrGD.AACAQod
         */
        async function onStart(): Promise<void> {
            try {
                const callee = sessionStorage.getItem('callee');
                user = localStorage.getItem('user');
                passwd = localStorage.getItem('passwd');
                if (callee != null) {

                    if (user != null && passwd != null) {
                        await mergeLoginReq();
                    } else {
                    }
                } else {
                    await mergeStartPage();
                }

            } catch (reason) {
                if (abortController.signal.aborted) return;
                console.warn('caught in onStart', reason);
            }
        }

        onStart();

        return () => {
            subscription.unsubscribe();
            abortController.abort();
            if (accumulatedFetching.current == null) {
                throw new Error('Unexpected: accumulatedFetching.current null');
            }
            // accumulatedFetching.current.close(); // because abortController aborted
            accumulatedFetching.current = null;
        }
        // eslint-disable-next-line
    }, [])

    function fireEvent(e: MainEvent) {
        getMainEventBus().publish(e);
    }

    useEffect(() => {
        if (inputRegisterData || inputLoginData) {
            loginInputRef.current?.focus();
        }
    }, [inputRegisterData, inputLoginData])

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

    function onRegisterKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            onLoginDataOk();
        }
    }

    function onLoginDataOk() {
        fireEvent({
            type: 'loginData',
            loginData: {
                user: loginName,
                passwd: loginPasswd
            }
        })
    }

    function onLoginDataCancel() {
        fireEvent({
            type: 'loginData',
            loginData: null
        });
    }

    function onUserClick(idx: number) {
        chat.onUserClick(idx);
        // if (userListState.selected === idx) {
        //     setUserListState({
        //         ...userListState,
        //         selected: -1
        //     })
        // } else {
        //     setUserListState({
        //         ...userListState,
        //         selected: idx
        //     })
        // }
    }

    const onChatKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === 'Enter') {
            chat.onSend();
        }
    }

    // TODO small if currently video call ongoing
    const small = false;

    return (
        <>
            <div className={styles.top}>
                {
                    regularViews &&
                    <div>
                        <button className={`${styles.redButton} ${styles.logout}`} onClick={() => {
                            if (onLogoutRef.current != null) {
                                onLogoutRef.current();
                            }
                        }}>Logout</button>
                    </div>
                }

                <div className={styles.header}>
                    <h4>pr-webRTC</h4><h5>a demonstration of video/audio calls by Peter Reitinger inspired by the documention on WebRTC on MDN</h5>
                </div>
            </div>
            <div className={styles.main}>
                {
                    startPage &&
                    <div className={styles.startPage}>
                        <Image className={styles.img} src='/Dekobildchen.svg' alt='Image for video calls as decoration' width={imgWidth} height={imgWidth * 500 / 750} priority /><br />
                        <div className={styles.imgAttribute}><a href="https://www.freepik.com/free-vector/video-conferencing-concept-landing-page_5155828.htm#query=video%20call&position=13&from_view=search&track=ais&uuid=d88bd399-7c39-4f67-8c62-d2715f65f654">Image by pikisuperstar</a> on Freepik</div>

                        <p>
                            This is mainly for demonstration and my personal usage. So, registration is without the necessity
                            to provide any personal data. Not even an email address is required.
                            Just, choose a user name and a password. {'That\'s'} it. (At least as long as the usage is within
                            reasonable borders... ;-)
                        </p>
                        <div className={styles.buttonRow}>
                            {/* <Link className={styles.register} href='/register'>Register now</Link>
                    <div>and then</div>
                    <Link className={styles.login} href='/login'>Login</Link> */}
                            <button onClick={() => fireEvent({ type: 'registerClicked' })} className={styles.redButton}>Register now</button>
                            <p>and then</p>
                            <button className={styles.greenButton} onClick={() => fireEvent({ type: 'loginClicked' })}>Login</button>
                        </div>
                    </div>

                }
                {
                    inputRegisterData &&
                    <div className={styles.flexColumn}>
                        <h2>Register as a new user</h2>
                        <label>User</label>
                        <input ref={loginInputRef} value={loginName} onChange={(e) => {
                            setLoginName(e.target.value)
                        }} onKeyDown={(e) => onRegisterKeyDown(e)} />
                        <label>Password</label>
                        <input type='password' value={loginPasswd} onChange={(e) => {
                            setLoginPasswd(e.target.value);
                        }} onKeyDown={(e) => onRegisterKeyDown(e)} />
                        <button className={styles.greenButton} onClick={onLoginDataOk}>Register</button>
                        <button className={styles.redButton} onClick={onLoginDataCancel}>Cancel</button>
                    </div>
                }
                {
                    inputLoginData &&
                    <div className={styles.flexColumn}>
                        <h2>Login (as existing user)</h2>
                        <label>User</label>
                        <input ref={loginInputRef} value={loginName} onChange={(e) => {
                            setLoginName(e.target.value)
                        }} onKeyDown={(e) => onRegisterKeyDown(e)} />
                        <label>Password</label>
                        <input type='password' value={loginPasswd} onChange={(e) => {
                            setLoginPasswd(e.target.value);
                        }} onKeyDown={(e) => onRegisterKeyDown(e)} />
                        <button className={styles.greenButton} onClick={onLoginDataOk}>Login</button>
                        <button className={styles.redButton} onClick={onLoginDataCancel}>Cancel</button>
                    </div>
                }
                {
                    regularViews &&
                    <>
                        <div className={styles.left}>
                            <ChatUserListComp
                                userListState={chat.userList}
                                small={videoCallActive}
                                onKey={(e) => {
                                    throw new Error('nyi');
                                }}
                                onClick={onUserClick} />
                        </div>
                        <div className={styles.right}>
                            <ChatPanelComp /* ref={chatLinesRef} */ events={chat.chatEvents} linesBeingSent={chat.linesBeingSent} /* lines={chatLines} */ /* onScroll={onScroll} */ small={small} />
                            <input key='chatInput' readOnly={chatInputFrozen} contentEditable={!chatInputFrozen} ref={chatInputRef} className={chatInputFrozen ? styles.frozen : ''} value={chat.chatInput} onChange={chat.onInputChange} onKeyDown={onChatKeyDown} />
                            {
                                !(connectionError && connectionErrorConfirmed) &&
                                <button key='send' onClick={chat.onSend} disabled={chatInputFrozen}>Send</button>
                            }
                            {
                                (connectionError && connectionErrorConfirmed) &&
                                <button key='tryAgain' onClick={() => {
                                    setChatInputFrozen(false);
                                    accumulatedFetching.current?.setInterrupted(false);
                                    setConnectionError(false);
                                    setConnectionErrorConfirmed(false);
                                }}>Try again</button>
                            }
                        </div>
                    </>
                }
            </div>
            {
                error !== '' &&
                <div className={styles.error}>
                    <span className={styles.errorLine}>{error}</span>&nbsp;
                    <a className={styles.dismiss} onClick={() => { setError('') }}>[Dismiss]</a>
                </div>
            }
            <ContactingServerManagedDlg eventBusKey={CONTACTING_SERVER_EVENT_BUS_KEY} />
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