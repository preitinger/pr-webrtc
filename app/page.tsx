'use client'

import { ChangeEvent, KeyboardEvent, KeyboardEventHandler, PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";
import routeActivity from "./routeActivity";
import FixedAbortController from "./_lib/pr-client-utils/FixedAbortController";
import * as rt from "runtypes";
import { getEventBus, useEventBus } from "./useEventBus";
import styles from './page.module.css'
import Image from "next/image";
import { AccumulatedFetching } from "./_lib/user-management-client/AccumulatedFetching";
import { StartPageProps, RegisterClicked, LoginClicked, LoginOrRegisterDlgProps, LoginOrRegisterOk, CancelClicked, StartPage, LoginDlg, Busy, FetchError, TryAgainClicked, RegisterDlg, RegularPage, RegularPageProps, CallClicked/* , SetCallButtonText */, SetFetchErrorState, ChatStart, ChatStop, AuthFailed, AuthFailedDlg, EmptyPropsOrNull, CloseClicked, UseHereClicked, ChatAddErrorLine, FetchingSetInterrupted, LogoutClicked, WaitForPushClicked, SetupPushDlg, OkClicked, SetupPushProps, AwaitPushDlg, DecideIfWithVideoDlg, DecideIfWithVideoProps, SendVideoChanged, ReceiveVideoChanged, VideoConfigValue, ConfigSendVideoChanged, ConfigReceiveVideoChanged, SetCallActive, ModalDlg, VideoDataSettingsClicked, LocalMediaStream, HandlingFetchError, CameraTestClicked, SetCameraTestButton, ChatAddHintLine, ConnectionProps, SetConnectionComp, RemoteMediaStream, ReceivedCallDlg, ReceivedCallProps, AcceptClicked, HangUpClicked, HangUpProps, HangUpDlg, HangUp } from "./busEvents";
import { ChatPanelComp, MultiSelectChatUserListComp, useMultiSelectChat } from "./_lib/chat/chat-client";
import assert from "assert";
import timeout from "./_lib/pr-timeout/pr-timeout";
import useTardyFlag from "./_lib/pr-client-utils/useTardyFlag";
import ModalDialog from "@/components/ModalDialog";
import { VideoComp } from "./_lib/video/video-client";

const eventBusKey = 'pr-webrtc';
const chatId = 'pr-webrtc';

function fireEvent<E = any>(e: E) {
    getEventBus(eventBusKey).publish(e);
}

function StartPageComp(props: StartPageProps) {

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

    return (

        <div className={`${styles.startPage} ${styles.flexColumn}`}>
            <Image className={styles.img} src='/Dekobildchen.svg' alt='Image for video calls as decoration' width={imgWidth} height={imgWidth * 500 / 750} priority /><br />
            <p className={styles.imgAttribute}><a href="https://www.freepik.com/free-vector/video-conferencing-concept-landing-page_5155828.htm#query=video%20call&position=13&from_view=search&track=ais&uuid=d88bd399-7c39-4f67-8c62-d2715f65f654">Image by pikisuperstar</a> on Freepik</p>

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
                <button onClick={() => fireEvent<RegisterClicked>({ type: 'RegisterClicked' })} className={styles.redButton}>Register now</button>
                <p>and then</p>
                <button className={styles.greenButton} onClick={() => fireEvent<LoginClicked>({ type: 'LoginClicked' })}>Login</button>
            </div>
        </div>
    )
}

function LoginDlgComp(props: LoginOrRegisterDlgProps) {
    const loginInputRef = useRef<HTMLInputElement>(null);
    const [loginName, setLoginName] = useState<string>(props.user);
    const [loginPasswd, setLoginPasswd] = useState<string>(props.passwd);

    function onOk() {
        fireEvent<LoginOrRegisterOk>({
            type: 'LoginOrRegisterOk',
            user: loginName,
            passwd: loginPasswd
        })
    }

    function onCancel() {
        fireEvent<CancelClicked>({ type: 'CancelClicked' })
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            onOk();
        }
    }

    return (
        <div className={styles.flexColumn}>
            <h2>Login (as existing user)</h2>
            {props.error != null && <p className={styles.errorParagraph}>{props.error}</p>}
            <label>User</label>
            <input ref={loginInputRef} value={loginName} onChange={(e) => {
                setLoginName(e.target.value)
            }} onKeyDown={(e) => onKeyDown(e)} />
            <label>Password</label>
            <input type='password' value={loginPasswd} onChange={(e) => {
                setLoginPasswd(e.target.value);
            }} onKeyDown={(e) => onKeyDown(e)} />
            <ButtonRow>
                <button className={styles.greenButton} onClick={onOk}>Login</button>
                <button className={styles.redButton} onClick={onCancel}>Cancel</button>
            </ButtonRow>
        </div>

    )
}

function RegisterDlgComp(props: LoginOrRegisterDlgProps) {
    const loginInputRef = useRef<HTMLInputElement>(null);
    const [loginName, setLoginName] = useState<string>(props.user)
    const [loginPasswd, setLoginPasswd] = useState<string>(props.passwd)


    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            onOk();
        }
    }

    function onOk() {
        fireEvent<LoginOrRegisterOk>({
            type: 'LoginOrRegisterOk',
            user: loginName,
            passwd: loginPasswd
        })

    }

    function onCancel() {
        fireEvent<CancelClicked>({
            type: 'CancelClicked',
        })
    }

    return (
        <div className={styles.flexColumn}>
            <h2>Register as a new user</h2>
            {props.error != null && <p className={styles.errorParagraph}>{props.error}</p>}
            <label>User</label>
            <input ref={loginInputRef} value={loginName} onChange={(e) => {
                setLoginName(e.target.value)
            }} onKeyDown={(e) => onKeyDown(e)} />
            <label>Password</label>
            <input type='password' value={loginPasswd} onChange={(e) => {
                setLoginPasswd(e.target.value);
            }} onKeyDown={(e) => onKeyDown(e)} />
            <ButtonRow>
                <button className={styles.greenButton} onClick={onOk}>Register</button>
                <button className={styles.redButton} onClick={onCancel}>Cancel</button>
            </ButtonRow>
        </div>

    )
}

function standardCatching(prom: Promise<unknown>) {
    prom.catch((reason: any) => {
        if (reason.name !== 'AbortError') {
            console.error(reason);
        } else {
            console.log('silently ignored', reason);
        }
    });
}

function ShowFetchErrorDuringLoginComp({ error }: { error: string }) {
    return (
        <div className={styles.dlg}>
            <h3>Error during login</h3>
            <p className={styles.errorParagraph}>{error}</p>
            <button onClick={() => fireEvent<TryAgainClicked>({
                type: 'TryAgainClicked',
            })}>Try again</button>
        </div>
    )
}

function ButtonRow({ children }: PropsWithChildren<{}>) {
    return (
        <div className={styles.buttonRow}>
            {children}
        </div>
    )
}

function AuthFailedComp({ onClose, onUseHere }: { onClose: () => void, onUseHere: () => void }) {
    return (
        <div className={styles.dlg}>
            <p>
                pr-webRTC has been opened in another window/tab or on another device. Click &quot;use here&quot; to to use pr-webRTC in this window/tab.
            </p>
            <ButtonRow>
                <button className={styles.redButton} onClick={onClose}>Close</button>
                <button className={styles.greenButton} onClick={onUseHere}>Use here</button>
            </ButtonRow>
        </div>
    )
}

function SetupPushComp({ error, onOk, onCancel, onTryAgain }: { error: string | null; onOk: () => void; onCancel: () => void; onTryAgain: () => void }) {
    return (
        <div className={styles.dlg}>
            <h2>Setup push notifications</h2>
            {
                error == null ?
                    <>
                        <p>If you want to be notified by a push message in the browser on a call, then click &quot;OK&quot;. This is only possible if you also confirm the push permission that the browser will probably ask you, afterwards.</p>
                        <ButtonRow>
                            <button onClick={onOk}>OK</button>
                            <button onClick={onCancel}>Cancel</button>
                        </ButtonRow>
                    </>
                    :
                    <>
                        <p className={styles.errorParagraph}>Error: {error}</p>
                        <p>Maybe you have forbidden push notifications for this site? Then, please change the browser settings to &quot;Allow&quot; or &quot;Ask&quot;, and then click &quot;Try again&quot;.</p>
                        <ButtonRow>
                            <button onClick={onTryAgain}>Try again</button>
                            <button onClick={onCancel}>Cancel</button>
                        </ButtonRow>
                    </>
            }
        </div>
    )
}

function AwaitPushComp({ onCancel }: { onCancel: () => void }) {
    return (
        <div className={styles.dlg}>
            <h4>Pausing until push notification</h4>
            <p>The server has been set up to wake this site up on a call.
                Waiting for a call...</p>
            <ButtonRow>
                <button onClick={onCancel}>Cancel</button>
            </ButtonRow>
        </div>
    )
}

function FetchErrorComp({ error }: { error: string }) {
    return (
        <div className={styles.fetchError}>
            <p className={styles.errorParagraph}>{error}</p>
            <ButtonRow>
                <button onClick={() => fireEvent<TryAgainClicked>({
                    type: 'TryAgainClicked',
                })
                }>Try again</button>
            </ButtonRow>
        </div>
    )
}

interface VideoConfigInputProps {
    name: 'send' | 'receive';
    value: VideoConfigValue;
    checked: boolean;
    onChange(e: ChangeEvent<HTMLInputElement>): void;
}
function VideoConfigInputComp(props: VideoConfigInputProps) {
    const id = `${props.name}-${props.value}`
    return (
        <>
            <input type='radio' id={id} name={props.name} value={props.value} checked={props.checked} onChange={props.onChange} />
            <label htmlFor={id}>{props.value}</label>
        </>
    )
}

interface VideoConfigProps {
    initialSendVideo: VideoConfigValue;
    initialReceiveVideo: VideoConfigValue;
}
function VideoConfigComp({ initialSendVideo, initialReceiveVideo }: VideoConfigProps) {
    const [sendVideo, setSendVideo] = useState<VideoConfigValue>(initialSendVideo)
    const [receiveVideo, setReceiveVideo] = useState<VideoConfigValue>(initialReceiveVideo)

    function onSendChange(e: ChangeEvent<HTMLInputElement>) {
        const val = VideoConfigValue.check(e.target.value)
        setSendVideo(val)
        fireEvent<ConfigSendVideoChanged>({
            type: 'ConfigSendVideoChanged',
            sendVideo: val
        })
    }

    function onReceiveChange(e: ChangeEvent<HTMLInputElement>) {
        const val = VideoConfigValue.check(e.target.value)
        setReceiveVideo(val)
        fireEvent<ConfigReceiveVideoChanged>({
            type: 'ConfigReceiveVideoChanged',
            receiveVideo: val
        })
    }

    function checked(name: 'send' | 'receive', value: VideoConfigValue): boolean {
        switch (name) {
            case 'send': return sendVideo === value
            case 'receive': return receiveVideo === value
            default: assert(false);
        }
    }

    function generateInput(name: 'send' | 'receive', value: VideoConfigValue) {
        const id = `${name}-${value}`
        return (
            <div key={id}>
                <input className={styles.videoConfigInp} aria-roledescription={value} type='radio' id={id} name={name} value={value} checked={checked(name, value)} onChange={name === 'send' ? onSendChange : onReceiveChange} />
                <label className={styles.videoConfigLabel} htmlFor={id}>{value}</label>
            </div>
        )
    }

    function generateFieldSet(name: 'send' | 'receive') {
        const options = VideoConfigValue.alternatives
        return (
            <fieldset className={styles.videoConfigSet}>
                <legend>{name} video</legend>
                {options.map(option => generateInput(name, option.value))}
            </fieldset>
        )
    }

    return (
        <fieldset className={styles.videoConfigSet}>
            <legend>Video configuration</legend>
            {generateFieldSet('send')}
            {generateFieldSet('receive')}
        </fieldset>
    )
}


function DecideIfWithVideoDlgComp(props: DecideIfWithVideoProps) {
    const eventBus = useEventBus(props.eventBusKey)


    function fireEvent<T = any>(e: T) {
        eventBus.publish(e);
    }

    const sendChanged = (remoteUser: string) => () => {
        fireEvent<SendVideoChanged>({
            type: 'SendVideoChanged',
            remoteUser: remoteUser,
            send: !props.decisions[remoteUser].withVideo.send
        })
    }

    const receiveChanged = (remoteUser: string) => () => {
        fireEvent<ReceiveVideoChanged>({
            type: 'ReceiveVideoChanged',
            remoteUser: remoteUser,
            receive: !props.decisions[remoteUser].withVideo.receive
        })
    }

    return (
        <div className={styles.dlg}>
            <h4>Video Settings For Connections</h4>
            {
                Object.entries(props.decisions).map(([remoteUser, decision]) => (
                    <div key={remoteUser} className={styles.withVideo}>
                        <div>
                            <input id={`sendVideo-${remoteUser}`} type='checkbox' checked={decision.withVideo.send} onChange={sendChanged(remoteUser)} />
                            <label htmlFor={`sendVideo-${remoteUser}`}>Offer to <b>send</b> video to <b>{remoteUser}</b>
                            </label>
                        </div>
                        <div>
                            <input id={`receiveVideo-${remoteUser}`} type='checkbox' checked={decision.withVideo.receive} onChange={receiveChanged(remoteUser)} />
                            <label htmlFor={`receiveVideo-${remoteUser}`}>Offer to <b>receive</b> video from <b>{remoteUser}</b></label>
                        </div>
                    </div>
                ))
            }
            <ButtonRow>
                <button onClick={() => fireEvent<OkClicked>({
                    type: 'OkClicked',
                })
                }>OK</button>
                <button onClick={() => fireEvent<CancelClicked>({
                    type: 'CancelClicked',
                })
                }>Cancel</button>
            </ButtonRow>
        </div>
    )
}

function HangUpDlgComp(props: HangUpProps) {
    const initialSelected = useCallback(() => {
        return props.remoteUsers.map((remoteUser, i) => i)
    }, [props.remoteUsers])
    const [selected, setSelected] = useState<number[]>(initialSelected());
    function onUserClick(idx: number) {
        setSelected(d => {
            if (d.indexOf(idx) === -1) {
                return [...d, idx].sort()
            } else {
                return d.filter(val => val !== idx)
            }
        })
    }
    return (
        <div className={styles.dlg}>
            <h4>Hang Up ?</h4>
            <MultiSelectChatUserListComp label='Select the connections to hang up:' emptyLabel='No active connections' small={true} userListState={({
                users: props.remoteUsers.map(remoteUser => ({name: remoteUser})),
                selected: selected
            })} onClick={onUserClick} onKey={(e) => {
                console.error('nyi');
            }} />
            <ButtonRow>
                <button onClick={() => fireEvent<HangUp>({
                    type: 'HangUp',
                    remoteUsers: selected.map(idx => props.remoteUsers[idx])
                })}>OK</button>
                <button onClick={() => fireEvent<CancelClicked>({
                    type: 'CancelClicked',
                })}>Cancel</button>
            </ButtonRow>
        </div>
    )
}

function ConnectionComp(props: ConnectionProps) {
    return (
        <div className={styles.connectionComp}>
            {props.msg != null ? <p>{props.msg}</p> : <span>{props.remoteUser}</span>}
            {props.stream != null && <VideoComp mediaStream={props.stream as MediaStream} />}
        </div>
    )
}

const ConnectionsProps = rt.Record({
    connections: rt.Dictionary(ConnectionProps, rt.String)
})
type ConnectionsProps = rt.Static<typeof ConnectionsProps>

// interface ConnectionsProps {
//     connections: {
//         [remoteUser: string]: ConnectionProps
//     }
// }

function ConnectionsComp(props: ConnectionsProps) {
    console.log('ConnectionsComp: props.connections', props.connections)
    const valList = Object.values(props.connections)
    console.log('ConnectionsComp: valList', valList)
    return (
        <div>
            <p className={styles.comment}></p>
            {
                valList.map(c => (
                    <ConnectionComp key={c.remoteUser} {...c} />
                ))
            }
        </div>
    )
}

function ReceivedCallComp(props: ReceivedCallProps) {
    function sendChanged() {
        fireEvent<SendVideoChanged>({
            type: 'SendVideoChanged',
            remoteUser: props.remoteUser,
            send: !props.withVideo.send
        })
    }
    function receiveChanged() {
        fireEvent<ReceiveVideoChanged>({
            type: 'ReceiveVideoChanged',
            remoteUser: props.remoteUser,
            receive: !props.withVideo.receive
        })
    }

    return (
        <div className={styles.dlg}>
            <h4>{props.remoteUser} calling!</h4>
            <div key={props.remoteUser} className={styles.withVideo}>
                <div>
                    <input id={`sendVideo-${props.remoteUser}`} type='checkbox' checked={props.withVideo.send} onChange={sendChanged} />
                    <label htmlFor={`sendVideo-${props.remoteUser}`}>Offer to <b>send</b> video to <b>{props.remoteUser}</b>
                    </label>
                </div>
                <div>
                    <input id={`receiveVideo-${props.remoteUser}`} type='checkbox' checked={props.withVideo.receive} onChange={receiveChanged} />
                    <label htmlFor={`receiveVideo-${props.remoteUser}`}>Offer to <b>receive</b> video from <b>{props.remoteUser}</b></label>
                </div>
            </div>
            <ButtonRow>
                <button className={styles.accept} title='Accept Call' onClick={() => {
                    fireEvent<AcceptClicked>({
                        type: 'AcceptClicked',
                        remoteUser: props.remoteUser,
                    });
                }}></button>
                <button className={styles.reject} title='Reject Call' onClick={() => {
                    fireEvent<HangUpClicked>({
                        type: 'HangUpClicked',
                        remoteUser: props.remoteUser
                    });
                    remoteUser: props.remoteUser
                }}></button>

            </ButtonRow>
        </div>
    )
}

const busyTardyFlagProps = {
    initialValue: false, timeoutDelays: {
        minInvisible: 0,
        minVisible: 400,
        setToVisible: 300,
        unsetToInvisible: 0
    }
}

const initialChatProps = {
    chatId: chatId,
    timeoutMs: 2000
}

function initialConnectionsProps(): ConnectionsProps {
    return {
        connections: {}
    }
}

export default function Page() {
    const [startPageProps, setStartPageProps] = useState<StartPageProps | null>(null);
    const [loginDlgProps, setLoginDlgProps] = useState<LoginOrRegisterDlgProps | null>(null);
    const [registerDlgProps, setRegisterDlgProps] = useState<LoginOrRegisterDlgProps | null>(null);
    // const [busy, setBusy] = useState<string | null>(null);
    const [fetchErrorDuringLogin, setFetchErrorDuringLogin] = useState<string | null>(null);
    const [regularPageProps, setRegularPageProps] = useState<RegularPageProps | null>(null);
    const [chat, chatOnStart, chatOnInputChange, chatOnSend, chatOnUserClick, chatAddErrorLine, chatOnStop] = useMultiSelectChat(initialChatProps);
    const [callActive, setCallActive] = useState<boolean>(false);
    // const [callButtonText, setCallButtonText] = useState<string>('Call');
    const [cameraTestButtonText, setCameraTestButtonText] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const chatInputRef = useRef<HTMLInputElement | null>(null);
    const [authFailedProps, setAuthFailedProps] = useState<EmptyPropsOrNull>(null);
    const [setupPushProps, setSetupPushProps] = useState<SetupPushProps | null>(null);
    const [awaitPushProps, setAwaitPushProps] = useState<EmptyPropsOrNull>(null);
    const [decideIfWithVideoProps, setDecideIfWithVideoProps] = useState<DecideIfWithVideoProps | null>(null);
    const tryAgainRef = useRef<HTMLButtonElement>(null);
    const [busyResult, setBusy] = useTardyFlag(/* busyTardyFlagProps */{
        initialValue: false, timeoutDelays: {
            minInvisible: 0,
            minVisible: 400,
            setToVisible: 300,
            unsetToInvisible: 0
        }
    })
    const busyVisible = busyResult.value;
    const [busyComment, setBusyComment] = useState<string | null>(null);
    const [modalMsg, setModalMsg] = useState<string | null>(null);
    const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(null);
    const [connectionsProps, setConnectionsProps] = useState<ConnectionsProps>(initialConnectionsProps())
    const [receivedCallProps, setReceivedCallProps] = useState<ReceivedCallProps | null>(null);
    const [hangUpProps, setHangUpProps] = useState<HangUpProps | null>(null);


    useEffect(() => {
        console.log('DEBUG EFFECT BECAUSE setBusy CHANGED!', setBusy);
    }, [setBusy])

    useEffect(() => {
        console.log('starting main effect with routeActivity()')
        const abortController = new FixedAbortController();
        const eventBus = getEventBus(eventBusKey);
        const throwIfAborted = () => abortController.signal.throwIfAborted();
        const accumulatedFetching = new AccumulatedFetching(
            '/api/webRTC',
            {
                fetchError: (error) => {
                    fireEvent<FetchError>({
                        type: 'FetchError',
                        error: error
                    })
                }
            },
            abortController
        );


        async function handleEvents() {
            const subscr = eventBus.subscribe();
            try {
                // TODO add ReceivedCallDlg and ReceivedCallComp and so on
                const MyEvents = rt.Union(StartPage, LoginDlg, RegisterDlg, Busy, RegularPage, ChatStart, ChatStop, /* SetCallButtonText, */
                    SetCameraTestButton,
                    SetFetchErrorState, AuthFailedDlg, ChatAddErrorLine, ChatAddHintLine, FetchingSetInterrupted, SetupPushDlg, AwaitPushDlg, DecideIfWithVideoDlg,
                    SetCallActive, ModalDlg, LocalMediaStream, HandlingFetchError, SetConnectionComp, RemoteMediaStream, ReceivedCallDlg, HangUpDlg)
                type MyEvents = rt.Static<typeof MyEvents>


                while (true) {
                    throwIfAborted();
                    const e: any = await subscr.nextEvent();
                    throwIfAborted();
                    console.log('handleEvents got', ('type' in e ? e.type : ''), e);
                    if (MyEvents.guard(e)) {
                        switch (e.type) {
                            case 'StartPage':
                                setStartPageProps(e.props);
                                break;
                            case 'LoginDlg':
                                console.log('setting loginDlgProps to ', e.props);
                                setLoginDlgProps(e.props);
                                break;
                            case 'RegisterDlg':
                                setRegisterDlgProps(e.props);
                                break;
                            case 'Busy':
                                setBusy(e.comment != null);
                                if (e.comment != null) setBusyComment(e.comment);
                                break;
                            // case 'ShowFetchErrorDuringLogin':
                            //     setFetchErrorDuringLogin(e.error);
                            //     break;
                            case 'RegularPage':
                                setRegularPageProps(e.props);
                                break;
                            // case 'SetCallButtonText':
                            //     setCallButtonText(e.text);
                            //     break;
                            case 'SetCameraTestButton':
                                setCameraTestButtonText(e.label)
                                break;
                            case 'HandlingFetchError':
                                console.log('HandlingFetchError', e.error);
                                setFetchError(e.error);
                                break;
                            case 'ChatStart':
                                chatOnStart(accumulatedFetching, e.loginResultData, () => {
                                    fireEvent<AuthFailed>({
                                        type: 'AuthFailed',
                                    })
                                })
                                break;
                            case 'AuthFailedDlg':
                                setAuthFailedProps(e.props);
                                break;
                            case 'ChatAddErrorLine':
                                chatAddErrorLine(e.error);
                                break;
                            case 'ChatAddHintLine':
                                chatAddErrorLine(e.hint);
                                break;
                            case 'FetchingSetInterrupted':
                                accumulatedFetching.setInterrupted(e.interrupted);
                                break;
                            case 'ChatStop':
                                chatOnStop();
                                break;
                            case 'SetupPushDlg':
                                setSetupPushProps(e.props);
                                break;
                            case 'AwaitPushDlg':
                                setAwaitPushProps(e.props);
                                break;
                            case 'DecideIfWithVideoDlg':
                                setDecideIfWithVideoProps(e.props);
                                break;
                            case 'SetCallActive':
                                setCallActive(e.active);
                                break;
                            case 'ModalDlg':
                                setModalMsg(e.msg)
                                break;
                            case 'LocalMediaStream':
                                setLocalMediaStream(e.stream as MediaStream | null);
                                break;
                            case 'SetConnectionComp':
                                setConnectionsProps(d => {
                                    ConnectionsProps.check(d);
                                    const newConnectionsProps: ConnectionsProps = {
                                        connections: {}
                                    }
                                    for (const key in d.connections) {
                                        if (key !== e.remoteUser) {
                                            newConnectionsProps.connections[key] = d.connections[key]
                                        }
                                    }

                                    if (e.props != null) {
                                        newConnectionsProps.connections[e.remoteUser] = e.props;
                                    }
                                    return ConnectionsProps.check(newConnectionsProps);
                                })
                                break;
                            case 'RemoteMediaStream':
                                setConnectionsProps(d => {
                                    ConnectionsProps.check(d);
                                    assert(e.remoteUser in d.connections);
                                    const res = {
                                        ...d,
                                        connections: {
                                            ...d.connections,
                                            [e.remoteUser]: {
                                                ...d.connections[e.remoteUser],
                                                stream: e.stream
                                            }
                                        }
                                    }
                                    return ConnectionsProps.check(res)

                                })
                                break;
                            case 'ReceivedCallDlg':
                                setReceivedCallProps(e.props);
                                break;
                            case 'HangUpDlg':
                                setHangUpProps(e.props);
                                break;
                        }
                    }
                }
            } finally {
                subscr.unsubscribe();
            }
        }

        try {
            standardCatching(handleEvents());
            standardCatching(routeActivity(chatId, abortController.signal, eventBusKey, accumulatedFetching).catch(reason => {
                console.log('caught directly', reason);
            }));


            // // TODO begin repetitive test of routeActivity for memory leaks
            // {
            //     const runTest = async () => {
            //         for (let i = 0; i < 10; ++i) {
            //             console.warn('runTest', i);
            //             const c = new FixedAbortController();
            //             const routeActivityProm = routeActivity(chatId, c.signal, eventBusKey, accumulatedFetching);
            //             await timeout(10, c.signal);
            //             c.abort();
            //             console.log('after abort')
            //             try {
            //                 await routeActivityProm;
            //             } catch (reason) {
            //                 console.error('caught in routeActivityProm of runTest');
            //             }
            //         }

            //     }

            //     runTest();
            // }
            // // TODO end repetitive test of routeActivity for memory leaks
        } catch (reason: any) {
            console.log('caught in page mount effect', reason);
            if (reason.name !== 'AbortError') {
                console.error(reason);
            }
        }

        return () => {
            try {
                console.log('before abortController.abort(): signal', abortController.signal)
                abortController.abort();
                console.log('after abortController.abort()')

            } catch (reason) {
                console.error('caught in abort effect', reason);
            }
        }
    }, [chatAddErrorLine, chatOnStart, chatOnStop, setBusy])

    const onChatKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === 'Enter') {
            chatOnSend();
        }
    }

    const chatComponents = <>
        <ChatPanelComp /* ref={chatLinesRef} */ events={chat.chatEvents} linesBeingSent={chat.linesBeingSent} /* lines={chatLines} */ /* onScroll={onScroll} */ small={callActive} />
        <input key='chatInput' readOnly={fetchError != null} contentEditable={fetchError == null} ref={chatInputRef} className={fetchError != null ? styles.frozen : ''} value={chat.chatInput} onChange={chatOnInputChange} onKeyDown={onChatKeyDown} />
        {
            fetchError == null &&
            <button key='send' onClick={chatOnSend}>Send</button>
        }
        {
            fetchError != null &&
            <button ref={tryAgainRef} key='tryAgain' onClick={() => {
                fireEvent<TryAgainClicked>({
                    type: 'TryAgainClicked',
                })
            }}>Try again</button>
        }
    </>

    return (
        <div>
            <header className={styles.header}>
                {/* <div className={styles.inlineBlock}>
                <h5>a demonstration of video/audio calls by Peter Reitinger inspired by the documention on WebRTC on MDN</h5>
            </div>
            {
                regularPageProps != null &&
                <div className={`${styles.inlineBlock}`}>
                    <div className={`${styles.inlineBlock}`}>
                        <button className={styles.redButton}>Logout</button>
                    </div>
                    <div className={styles.inlineBlock}>
                        <button>Wait for push notification ...</button>
                    </div>
                </div>
            } */}


                <div className={styles.headerSub}>
                    <div>
                        <h4>pr-webRTC</h4>
                        <h5>a demonstration of video/audio calls by Peter Reitinger inspired by the documention on WebRTC on MDN</h5>
                    </div>

                    {
                        regularPageProps != null && fetchError == null &&
                        <div className={styles.flexRow}>
                            <button className={styles.redButton} onClick={() => fireEvent<LogoutClicked>({
                                type: 'LogoutClicked',
                            })
                            }>Logout</button>
                            <button onClick={() => fireEvent<WaitForPushClicked>({
                                type: 'WaitForPushClicked',
                            })
                            }>Wait for push notification ...</button>
                        </div>
                    }
                </div>
            </header>
            {startPageProps != null && <StartPageComp {...startPageProps} />}
            {loginDlgProps != null && <LoginDlgComp {...loginDlgProps} />}
            {registerDlgProps != null && <RegisterDlgComp {...registerDlgProps} />}
            {/* {
                fetchErrorDuringLogin != null &&
                <ShowFetchErrorDuringLoginComp error={fetchErrorDuringLogin} />
            } */}
            <main className={styles.main}>
                {busyVisible && busyComment != null && <div>
                    <h1>Busy ...</h1>
                    <p>{busyComment}</p>
                </div>}
                {authFailedProps != null && <AuthFailedComp {...authFailedProps} onClose={() =>
                    fireEvent<CloseClicked>({
                        type: 'CloseClicked',
                    })

                } onUseHere={() => fireEvent<UseHereClicked>({
                    type: 'UseHereClicked',
                })
                } />}
                {
                    setupPushProps != null &&
                    <SetupPushComp {...setupPushProps} onOk={() => fireEvent<OkClicked>({
                        type: 'OkClicked',
                    })
                    } onCancel={() => fireEvent<CancelClicked>({
                        type: 'CancelClicked',
                    })
                    } onTryAgain={() => fireEvent<TryAgainClicked>({
                        type: 'TryAgainClicked',
                    })
                    } />
                }
                {
                    awaitPushProps != null &&
                    <AwaitPushComp {...awaitPushProps} onCancel={() => fireEvent<CancelClicked>({
                        type: 'CancelClicked',
                    })
                    } />
                }
                {regularPageProps != null &&
                    <>
                        <div className={styles.left}>
                            <MultiSelectChatUserListComp
                                userListState={chat.userList}
                                small={callActive}
                                onKey={(e) => {
                                    throw new Error('nyi');
                                }}
                                onClick={chatOnUserClick} />
                            <button className={styles.accept} disabled={chat.userList.selected.length === 0} onClick={() =>
                                fireEvent<CallClicked>({
                                    type: 'CallClicked',
                                    callees: chat.userList.selected.map(idx => chat.userList.users[idx].name)
                                })

                            } />
                            <button className={styles.reject} onClick={() => {
                                fireEvent<HangUpClicked>({
                                    type: 'HangUpClicked',
                                    remoteUser: null
                                });
                            }} />
                            {
                                cameraTestButtonText != null &&
                                <button onClick={() => fireEvent<CameraTestClicked>({
                                    type: 'CameraTestClicked',
                                })
                                }>{cameraTestButtonText}</button>
                            }
                            {hangUpProps != null && <HangUpDlgComp {...hangUpProps} />}
                            <button onClick={() => fireEvent<VideoDataSettingsClicked>({
                                type: 'VideoDataSettingsClicked',
                            })
                            }>Video settings for individual connections ...</button>
                            {receivedCallProps && <ReceivedCallComp {...receivedCallProps} />}
                            {decideIfWithVideoProps != null && <DecideIfWithVideoDlgComp {...decideIfWithVideoProps} />}
                            <VideoConfigComp initialSendVideo={regularPageProps.sendVideo} initialReceiveVideo={regularPageProps.receiveVideo} />
                            {callActive && chatComponents}

                        </div>
                        <div className={styles.right}>
                            {!callActive && chatComponents}
                            {
                                localMediaStream != null &&
                                <VideoComp mediaStream={localMediaStream} />
                            }
                            <p className={styles.comment}>Hierunter folgt ConnectionsComp</p>
                            <ConnectionsComp {...connectionsProps} />
                        </div>
                    </>
                }
            </main>

            {
                modalMsg != null &&
                <ModalDialog >
                    <p>{modalMsg}</p>
                    <ButtonRow><button onClick={() => {
                        setModalMsg(null); fireEvent<OkClicked>({
                            type: 'OkClicked',
                        })
                    }
                    }>OK</button></ButtonRow>
                </ModalDialog>
            }

            {
                fetchError != null &&
                <FetchErrorComp error={fetchError} />
            }
        </div>
    )
}
