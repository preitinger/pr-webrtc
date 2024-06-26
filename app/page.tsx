'use client'

import { ChangeEvent, Dispatch, KeyboardEvent, KeyboardEventHandler, PropsWithChildren, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import routeActivity from "./routeActivity";
import FixedAbortController from "./_lib/pr-client-utils/FixedAbortController";
import * as rt from "runtypes";
import { getEventBus, useEventBus } from "./useEventBus";
import styles from './page.module.css'
import Image from "next/image";
import { AccumulatedFetching } from "./_lib/user-management-client/AccumulatedFetching";
import { StartPageProps, RegisterClicked, LoginClicked, LoginOrRegisterDlgProps, LoginOrRegisterOk, CancelClicked, StartPage, LoginDlg, Busy, FetchError, TryAgainClicked, RegisterDlg, RegularPage, RegularPageProps, CallClicked/* , SetCallButtonText */, SetFetchErrorState, ChatStart, ChatStop, AuthFailed, AuthFailedDlg, EmptyPropsOrNull, CloseClicked, UseHereClicked, ChatAddErrorLine, FetchingSetInterrupted, LogoutClicked, WaitForPushClicked, SetupPushDlg, OkClicked, SetupPushProps, AwaitPushDlg, DecideIfWithVideoDlg, DecideIfWithVideoProps, SendVideoChanged, ReceiveVideoChanged, VideoConfigValue, ConfigSendVideoChanged, ConfigReceiveVideoChanged, SetCallActive, ModalDlg, VideoDataSettingsClicked, LocalMediaStream, HandlingFetchError, CameraTestClicked, SetCameraTestButton, ChatAddHintLine, ConnectionProps, SetConnectionComp, RemoteMediaStream, ReceivedCallDlg, ReceivedCallProps, AcceptClicked, HangUpClicked, HangUpProps, HangUpDlg, HangUp, ConfigChanged, ChatAddDbgLine, SetPushError } from "./busEvents";
import { ChatPanelComp, MultiSelectChatUserListComp, useMultiSelectChat } from "./_lib/chat/chat-client";
import assert from "assert";
import timeout from "./_lib/pr-timeout/pr-timeout";
import useTardyFlag from "./_lib/pr-client-utils/useTardyFlag";
import ModalDialog from "@/components/ModalDialog";
import { VideoComp } from "./_lib/video/video-client";
import { ChatEvent } from "./_lib/chat/chat-common";
import { log } from "console";

const eventBusKey = 'pr-webrtc';
const chatId = 'pr-webrtc';

function fireEvent<E = any>(e: E) {
    getEventBus(eventBusKey).publish(e);
}

function ImageAttributes() {
    const list = [
        { url: '/icons/app_14741112.png', link: <a href="https://www.freepik.com/icon/app_14741112#fromView=search&page=2&position=1&uuid=fb77fe47-4010-4623-9b5d-bcc62a8da4f1">Icon by justicon</a> },
        { url: '/icons/configuration_102642.png', link: <a href="https://www.freepik.com/icon/configuration_102642">Icon by Freepik</a> },
        { url: '/icons/customer_6012823.png', link: <a href="https://www.freepik.com/icon/customer_6012823#fromView=search&page=1&position=1&uuid=d409d3a9-34d2-4fbe-a7ad-8e35c1cc0087">Icon by Uniconlabs</a> },
        { url: '/icons/delete_8385838.png', link: <a href="https://www.freepik.com/icon/delete_8385838#fromView=search&page=1&position=29&uuid=0050bbd8-9fa1-4b26-bf66-2e7361267903">Icon by deha21</a> },
        { url: '/icons/film_1146152.png', link: <a href="https://www.freepik.com/icon/film_1146152#fromView=search&page=1&position=10&uuid=8129e0bb-f37c-42a2-9bde-beaab03e9483">Icon by Freepik</a> },
        { url: '/icons/menu-bar_8037816.png', link: <a href="https://www.freepik.com/icon/menu-bar_8037816#fromView=search&page=1&position=87&uuid=d1bd2a95-706c-4796-a09b-43b419d91a9b">Icon by alkhalifi design</a> },
        { url: '/icons/power_12472615.png', link: <a href="https://www.freepik.com/icon/power_12472615#fromView=search&page=1&position=10&uuid=ec80c16f-0235-4b51-8cb3-0303c7f199b3">Icon by IYIKON</a> },
        { url: '/icons/speech-bubble_1078011.png', link: <a href="https://www.freepik.com/icon/speech-bubble_1078011">Icon by Freepik</a> },
        { url: '/accept-call-64x64.png', link: <a href="https://www.freepik.com/icon/phone-ringing_8735279#fromView=search&term=accept+call&track=ais&page=1&position=14">Icon by Maan Icons</a> },
        { url: '/call-missed-64x64.png', link: <a href="https://www.freepik.com/icon/call-missed_8735616#fromView=search&term=reject+call&track=ais&page=1&position=19&uuid=71bd4103-45f4-4732-ac6d-1250770d3b4e">Icon by Maan Icons</a> },
        { url: '/icons/video-calling_7502562.png', link: <a href="https://www.freepik.com/icon/video-calling_7502562#fromView=search&page=1&position=30&uuid=336edfb6-85fa-477a-9735-61db30653aa8">Icon by Iconic Panda</a> },
    ]
    return (
        <div className={styles.imgAttributes}>
            Many thanks to <a href="https://freepik.com">FREEP!K</a> and the authors for providing the following images for free!
            <table>
                <tbody>
                    {list.map(e => (
                        <tr key={e.url}><td><Image alt={e.url} src={e.url} width={32} height={32} /></td><td>{e.link}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
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
            <ImageAttributes />
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

function standardCatching(prom: Promise<unknown>, setErrorText: Dispatch<SetStateAction<string>>) {
    prom.catch((reason: any) => {
        if (reason.name !== 'AbortError') {
            console.error(reason);
            if (typeof (reason.toString) === 'function') {
                setErrorText(reason.toString());
                if ('stack' in reason) {
                    console.log('typeof stack', typeof(reason.stack));
                    setErrorText(reason.stack);
                }
            } else {
                setErrorText(JSON.stringify(reason));
            }
        } else {
            // console.log('silently ignored', reason);
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

function TransientMsg({ msg, fadeOut }: { msg: string, fadeOut: boolean }) {
    const [cn, setCn] = useState<string>(styles.transientMsg);
    const divRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (divRef.current == null) return;
        const to = setTimeout(() => {
            setCn(styles.transientMsgAnimate);
        }, 0)
        return () => {
            clearTimeout(to);
        }
    }, [msg])
    return (
        <div ref={divRef} className={`${cn} ${fadeOut ? styles.transientMsgFadeout : ''}`}>
            {msg}
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
    sendVideo: VideoConfigValue;
    receiveVideo: VideoConfigValue;
    ringOnCall: boolean;
    debugMessages: boolean;
    onSendChange(e: ChangeEvent<HTMLInputElement>): void;
    onReceiveChange(e: ChangeEvent<HTMLInputElement>): void;
    onChange(name: string): (e: ChangeEvent<HTMLInputElement>) => void;
}
function VideoConfigComp({ sendVideo, receiveVideo, ringOnCall, debugMessages, onSendChange, onReceiveChange, onChange }: VideoConfigProps) {
    // const [sendVideo, setSendVideo] = useState<VideoConfigValue>(initialSendVideo)
    // const [receiveVideo, setReceiveVideo] = useState<VideoConfigValue>(initialReceiveVideo)
    // const [ringOnCall, setRingOnCall] = useState(initialRingOnCall);

    // function onSendChange(e: ChangeEvent<HTMLInputElement>) {
    //     const val = VideoConfigValue.check(e.target.value)
    //     setSendVideo(val)
    //     fireEvent<ConfigSendVideoChanged>({
    //         type: 'ConfigSendVideoChanged',
    //         sendVideo: val
    //     })
    // }

    // function onReceiveChange(e: ChangeEvent<HTMLInputElement>) {
    //     const val = VideoConfigValue.check(e.target.value)
    //     setReceiveVideo(val)
    //     fireEvent<ConfigReceiveVideoChanged>({
    //         type: 'ConfigReceiveVideoChanged',
    //         receiveVideo: val
    //     })
    // }

    // const onChange = (name: string) => (e: ChangeEvent<HTMLInputElement>) => {
    //     const checked = e.target.checked;
    //     switch (name) {
    //         case 'ringOnCall': setRingOnCall(checked); break;
    //         // case 'fitToDisplay': setFitToDisplay(checked); break;
    //     }
    //     fireEvent<ConfigChanged>({
    //         type: 'ConfigChanged',
    //         name: name,
    //         checked: checked
    //     });
    // }

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
        <div>
            <fieldset className={styles.videoConfigSet}>
                <legend>Video configuration</legend>
                {generateFieldSet('send')}
                {generateFieldSet('receive')}
            </fieldset>
            <div>
                <input id='ringOnCall' type='checkbox' checked={ringOnCall} onChange={onChange('ringOnCall')} />
                <label htmlFor='ringOnCall'>Ring On Call
                </label>
            </div>
            <div>
                <input id='debugMessages' type='checkbox' checked={debugMessages} onChange={onChange('debugMessages')} />
                <label htmlFor='debugMessages'>Debug Messages In The Chat
                </label>
            </div>
            {/* <div>
                <input id='fitToDisplay' type='checkbox' checked={fitToDisplay} onChange={onChange('fitToDisplay')} />
                <label htmlFor='fitToDisplay'>Fit all videos to display
                </label>
            </div> */}
        </div>
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

    const entries = Object.entries(props.decisions);

    return (
        <div className={styles.dlg}>
            <h4>Video Settings For Connections</h4>
            {
                entries.length === 0 ? <p><i>No connections</i></p> :
                    entries.map(([remoteUser, decision]) => (
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
                users: props.remoteUsers.map(remoteUser => ({ name: remoteUser })),
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

function ConnectionComp(props: ConnectionProps & { maxWidth: string, maxHeight: string }) {
    const stream = props.stream as MediaStream | null
    return (
        <div className={styles.connectionComp}/*  style={{ maxWidth: props.maxWidth, maxHeight: props.maxHeight }} */>
            {props.msg != null ? <p className={styles.connectionCompParagraph}>{props.msg}</p> : <p className={styles.connectionCompParagraph}>{props.remoteUser}</p>}
            {
                (props.msg == null && (stream == null || stream.getVideoTracks().length === 0)) && <p><i>No video from {props.remoteUser}</i></p>
            }
            {props.stream != null &&
                <div className={styles.connectionCompItem}>
                    {/* <div className={styles.fakeVideoComp}>Fake Video Comp</div> */}
                    <VideoComp mediaStream={props.stream as MediaStream} width={props.maxWidth} height={props.maxHeight} />
                </div>
            }
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

function ConnectionsComp(props: ConnectionsProps & { localMediaStream?: MediaStream }) {
    const valList = Object.values(props.connections)
    const n = (props.localMediaStream != null ? 1 : 0) + valList.length;
    if (n === 0) return (
        <p>No active connection!</p>
    )
    const columns = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / columns)
    const connectionsRows: JSX.Element[] = [];
    const maxWidth = `calc(${100 / columns}vw - 1rem)`
    const maxHeight = `calc(${100 / rows}vh - ${rows * 1.5 + 1}rem)`

    let i = 0;

    for (let row = 0; row < rows; ++row) {
        const comps: JSX.Element[] = [];
        for (let column = 0; column < columns; ++column) {
            if (row === 0 && column === 0 && props.localMediaStream != null) {
                comps.push(
                    <div key='$local$' className={styles.connectionComp}/*  style={{ maxWidth: props.maxWidth, maxHeight: props.maxHeight }} */>
                        {<p className={styles.connectionCompParagraph}>Local video</p>}
                        {
                            (props.localMediaStream == null || props.localMediaStream.getVideoTracks().length === 0) && <p><i>No local video</i></p>
                        }
                        {props.localMediaStream != null &&
                            <div className={styles.connectionCompItem}>
                                {/* <div className={styles.fakeVideoComp}>Fake Video Comp</div> */}
                                <VideoComp mediaStream={props.localMediaStream} width={maxWidth} height={maxHeight} />
                            </div>
                        }
                    </div>

                    // <VideoComp key='$local$' mediaStream={props.localMediaStream} width={maxWidth} height={maxHeight} />
                )
            } else {
                if (i >= valList.length) continue;
                const c = valList[i++];
                comps.push(
                    <ConnectionComp key={c.remoteUser} {...c} maxWidth={maxWidth} maxHeight={maxHeight} />
                )

            }
        }
        connectionsRows.push(
            <div key={`row.${row}`} className={styles.connectionsRow}>
                {comps}
            </div>
        )
    }

    return (
        <div className={styles.connectionsComp}>
            {props.localMediaStream == null && <p>Not sending or testing video.</p>}
            {connectionsRows}
            {/* {
                valList.map(c => (
                    // <div key={c.remoteUser} className={styles.fakeConnectionComp}>
                    //     {c.remoteUser}
                    //     <div className={styles.fakeVideo}>
                    //         Fake Video
                    //     </div>
                    // </div>
                    <ConnectionComp key={c.remoteUser} {...c} />
                ))
            } */}
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


function menuItemClassName(option: ViewOption, activeOption: ViewOption) {
    let s = option === activeOption ? styles.activeMenu + ' ' : '';
    return s + menuItemClassName1(option);
}

function menuItemClassName1(option: ViewOption) {
    return styles['button-' + option];
}

interface TopMenuItemProps {
    option: ViewOption
    activeOption: ViewOption;
    marked: boolean;
    imgUrl: string | null;
    onClick: (option: ViewOption) => () => void;
}
function TopMenuItem(props: PropsWithChildren<TopMenuItemProps>) {
    const ref = useRef<HTMLButtonElement>(null);
    const [markedImgUrl, setMarkedImgUrl] = useState<string | null>(props.imgUrl);

    useEffect(() => {
        const abortController = new FixedAbortController();
        const signal = abortController.signal;

        async function f() {
            if (props.imgUrl == null) return;

            try {

                const resp = await fetch(props.imgUrl, {
                    signal: signal
                })
                const blob = await resp.blob()
                const canvas = new OffscreenCanvas(32, 32);
                const c = canvas.getContext('2d');
                if (c == null) return;
                c.drawImage(await createImageBitmap(blob), 0, 0);
                c.fillStyle = 'red';
                c.arc(4, 4, 4, 0, Math.PI * 2)
                c.fill();
                setMarkedImgUrl(URL.createObjectURL(await canvas.convertToBlob()));
            } catch (reason: any) {
                if (reason.name !== 'AbortError') {
                    console.error(reason);
                }
            }
        }

        f();
        return () => {
            abortController.abort();
        }
    }, [props.imgUrl])
    return (
        <div className={`${styles.topMenuButtonWrapper} ${/* props.option === props.activeOption ? styles.activeMenu : '' */''}`}>
            <button ref={ref} style={props.imgUrl == null ? {} : { backgroundImage: `url("${props.marked ? markedImgUrl : props.imgUrl}")` }}
                className={menuItemClassName(props.option, props.activeOption)}
                onClick={props.onClick(props.option)} disabled={props.option === props.activeOption}>
                {props.children}
            </button>
        </div>
    )
}

interface OptionPageProps {
    option: ViewOption;
    active: ViewOption;
    notLoggedIn?: boolean
}
function OptionPage(props: PropsWithChildren<OptionPageProps>) {
    return (
        <>
            {props.option === props.active &&
                (props.notLoggedIn ? <p>You are not logged in.</p>
                    : props.children)
            }
        </>
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

type ViewOption = 'all' | 'users' | 'config' | 'chat' | 'video';

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
    const [transientMsg, setTransientMsg] = useState<string | null>(null);
    const [transientMsgFadeout, setTransientMsgFadeout] = useState(false);
    const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(null);
    const [connectionsProps, setConnectionsProps] = useState<ConnectionsProps>(initialConnectionsProps())
    const [receivedCallProps, setReceivedCallProps] = useState<ReceivedCallProps | null>(null);
    const [hangUpProps, setHangUpProps] = useState<HangUpProps | null>(null);
    const [viewOption, setViewOption] = useState<ViewOption>('users');
    const [markedOptions, setMarkedOptions] = useState<{ [key: string]: boolean }>({})
    const testButtonRef = useRef<HTMLButtonElement>(null);
    const testCanvasRef = useRef<HTMLCanvasElement>(null)
    const [errorsAndHints, setErrorsAndHints] = useState<ChatEvent[]>([])
    const [videoMenu, setVideoMenu] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const debugMessages = useRef<boolean>(false);
    const [errorText, setErrorText] = useState<string>('');

    function nyi() {
        console.error('nyi');
    }

    useEffect(() => {
        if (audioRef.current == null) return;
        if (receivedCallProps != null && regularPageProps?.ringOnCall) {
            audioRef.current.play();
        } else {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, [receivedCallProps, regularPageProps?.ringOnCall])

    useEffect(() => {
        // console.log('starting main effect with routeActivity()')
        try {
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


            const handleEvents = async () => {
                function mark(option: ViewOption) {
                    setTopMenuItemMarked(option, true);
                }
                const subscr = eventBus.subscribe();
                try {
                    // TODO add ReceivedCallDlg and ReceivedCallComp and so on
                    const MyEvents = rt.Union(StartPage, LoginDlg, RegisterDlg, Busy, RegularPage, ChatStart, ChatStop, /* SetCallButtonText, */
                        SetCameraTestButton,
                        SetFetchErrorState, AuthFailedDlg, ChatAddErrorLine, ChatAddHintLine, ChatAddDbgLine, FetchingSetInterrupted, SetupPushDlg, AwaitPushDlg, DecideIfWithVideoDlg,
                        SetCallActive, ModalDlg, LocalMediaStream, HandlingFetchError, SetConnectionComp, RemoteMediaStream, ReceivedCallDlg, HangUpDlg,
                        SetPushError)
                    // setupPushProps, awaitPushProps, decideIfWithVideoProps, fetchError, receivedCallProps
                    type MyEvents = rt.Static<typeof MyEvents>


                    while (true) {
                        throwIfAborted();
                        const e: any = await subscr.nextEvent();
                        throwIfAborted();
                        // console.log('handleEvents got', ('type' in e ? e.type : ''), e);
                        if (MyEvents.guard(e)) {
                            switch (e.type) {
                                case 'StartPage':
                                    setStartPageProps(e.props);
                                    break;
                                case 'LoginDlg':
                                    // console.log('setting loginDlgProps to ', e.props);
                                    setLoginDlgProps(e.props);
                                    mark('users');
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
                                    // console.log('HandlingFetchError', e.error);
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
                                    mark('users');
                                    break;
                                case 'ChatAddErrorLine':
                                    chatAddErrorLine(e.error);
                                    setErrorsAndHints(d => ([...d, {
                                        type: 'Error',
                                        error: e.error
                                    }]))
                                    mark('chat');
                                    setTransientMsg(e.error);
                                    break;
                                case 'ChatAddHintLine':
                                    chatAddErrorLine(e.hint);
                                    setErrorsAndHints(d => ([...d,
                                    {
                                        type: 'Hint',
                                        hint: e.hint
                                    }]))
                                    mark('chat');
                                    setTransientMsg(e.hint);
                                    break;
                                case 'ChatAddDbgLine':
                                    if (debugMessages.current) {
                                        chatAddErrorLine(e.msg);
                                    }
                                    mark('chat');
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
                                    mark('video');
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
                                    mark('video');
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
                                    mark('video');

                                    break;
                                case 'ReceivedCallDlg':
                                    setReceivedCallProps(e.props);
                                    if (e.props != null) {
                                        mark('users');
                                    }
                                    break;
                                case 'HangUpDlg':
                                    setHangUpProps(e.props);
                                    break;

                                case 'SetPushError':
                                    setSetupPushProps({
                                        error: e.error
                                    })
                                    break;
                            }
                        }
                    }
                } finally {
                    subscr.unsubscribe();
                }
            }

            try {
                standardCatching(handleEvents(), setErrorText);
                standardCatching(routeActivity(chatId, abortController.signal, eventBusKey, accumulatedFetching), setErrorText);


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
                // console.log('caught in page mount effect', reason);
                if (reason.name !== 'AbortError') {
                    console.error(reason);
                }
            }

            return () => {
                try {
                    // console.log('before abortController.abort(): signal', abortController.signal)
                    abortController.abort();
                    // console.log('after abortController.abort()')

                } catch (reason) {
                    console.error('caught in abort effect', reason);
                }
            }
        } catch (reason) {
            showError(JSON.stringify(reason));
        }
    }, [chatAddErrorLine, chatOnStart, chatOnStop, setBusy])

    function showError(s: string) {
        setErrorText(old => old + '\n' + s);
    }

    useEffect(() => {
        if (transientMsg != null) {
            const to1 = setTimeout(() => {
                setTransientMsgFadeout(true);
            }, 2000)
            const to2 = setTimeout(() => {
                setTransientMsg(null);
                setTransientMsgFadeout(false);
            }, 2400)

            return () => {
                clearTimeout(to2);
                clearTimeout(to1);
                setTransientMsgFadeout(false);
            }
        }
    }, [transientMsg])

    useEffect(() => {
        if (markedOptions[viewOption]) {
            setTopMenuItemMarked(viewOption, false);
        }
    }, [viewOption, markedOptions])

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

    function setTopMenuItemMarked(option: ViewOption, marked: boolean) {
        setMarkedOptions(d => ({
            ...d,
            [option]: marked


        })
        )
    }

    useEffect(() => {
        const str = sessionStorage['viewOption'];
        if (str != null) setViewOption(str);
    }, [])

    const onTopMenuItemClick = (option: ViewOption) => () => {
        setViewOption(option);
        sessionStorage['viewOption'] = option;
        setTopMenuItemMarked(option, false);
    }

    const actionButtonsEnabled =
        setupPushProps == null &&
        awaitPushProps == null &&
        decideIfWithVideoProps == null &&
        fetchError == null &&
        receivedCallProps == null &&
        hangUpProps == null;

    function videoConfigOnSendChange(e: ChangeEvent<HTMLInputElement>) {
        const val = VideoConfigValue.check(e.target.value)
        setRegularPageProps(d => d == null ? d : (
            {
                ...d,
                sendVideo: val
            }
        ))
        fireEvent<ConfigSendVideoChanged>({
            type: 'ConfigSendVideoChanged',
            sendVideo: val
        })
    }

    function videoConfigOnReceiveChange(e: ChangeEvent<HTMLInputElement>) {
        const val = VideoConfigValue.check(e.target.value)
        setRegularPageProps(d => d == null ? d : (
            {
                ...d,
                receiveVideo: val
            }
        ))
        fireEvent<ConfigReceiveVideoChanged>({
            type: 'ConfigReceiveVideoChanged',
            receiveVideo: val
        })
    }

    const videoConfigOnChange = (name: string) => (e: ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        switch (name) {
            case 'debugMessages':
                debugMessages.current = true;
            // no break
            case 'ringOnCall':
                setRegularPageProps(d => d == null ? d : ({
                    ...d,
                    [name]: checked
                }))
                break;
        }
        fireEvent<ConfigChanged>({
            type: 'ConfigChanged',
            name: name,
            checked: checked
        });
    }

    return (
        <>
            <div className={styles.topMenu}>
                {/* <TopMenuItem imgUrl={null} marked={false} option='all' activeOption={viewOption} onClick={onTopMenuItemClick}>All</TopMenuItem> */}
                {([['all', '/icons/app_14741112.png'],
                ['users', '/icons/customer_6012823.png'],
                ['config', '/icons/configuration_102642.png'],
                ['chat', '/icons/speech-bubble_1078011.png'],
                ['video', '/icons/film_1146152.png']] as [ViewOption, string][]).map(option => (
                    <TopMenuItem key={option[0]} option={option[0]} activeOption={viewOption} imgUrl={option[1]} marked={markedOptions[option[0]]} onClick={onTopMenuItemClick} />
                ))}
                {/* <button className={menuItemClassName('all'')} onClick={() => { setViewOption('all'') }}>Old view</button> */}
                {/* <button className={menuItemClassName('config')} onClick={() => {
                    setViewOption('config')
                }} />
                <button className={menuItemClassName('chat')} onClick={() => {
                    setViewOption('chat')
                }} />
                <button className={menuItemClassName('video')} onClick={() => {
                    setViewOption('video')
                }} /> */}
                <div className={styles.gap} />
                {
                    viewOption === 'video' && <button className={styles.buttonVideoMenu} onClick={() => setVideoMenu(!videoMenu)} />
                }
                {regularPageProps != null &&
                    <button className={styles.logout} onClick={() => fireEvent<LogoutClicked>({
                        type: 'LogoutClicked',
                    })
                    } />
                }
            </div>
            <div>
                <OptionPage option={'users'} active={viewOption}>
                    {
                        regularPageProps == null ?
                            <>
                                {startPageProps != null && <StartPageComp {...startPageProps} />}
                                {loginDlgProps != null && <LoginDlgComp {...loginDlgProps} />}
                                {registerDlgProps != null && <RegisterDlgComp {...registerDlgProps} />}
                                {
                                    authFailedProps != null && <AuthFailedComp {...authFailedProps} onClose={() =>
                                        fireEvent<CloseClicked>({
                                            type: 'CloseClicked',
                                        })

                                    } onUseHere={() => fireEvent<UseHereClicked>({
                                        type: 'UseHereClicked',
                                    })
                                    } />
                                }
                            </>
                            :
                            <>
                                <MultiSelectChatUserListComp
                                    userListState={chat.userList}
                                    small={callActive}
                                    onKey={(e) => {
                                        // throw new Error('nyi');
                                    }}
                                    onClick={chatOnUserClick} />
                                {actionButtonsEnabled && <>
                                    <button className={styles.accept} disabled={/* chat.userList.selected.length === 0 */ false} onClick={() =>
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
                                </>}
                                {hangUpProps != null && <HangUpDlgComp {...hangUpProps} />}
                                {decideIfWithVideoProps != null && <DecideIfWithVideoDlgComp {...decideIfWithVideoProps} />}
                                {receivedCallProps && <ReceivedCallComp {...receivedCallProps} />}
                                <ChatPanelComp /* ref={chatLinesRef} */ events={errorsAndHints} linesBeingSent={chat.linesBeingSent} /* lines={chatLines} */ /* onScroll={onScroll} */ small={callActive} />
                            </>
                    }
                </OptionPage>
                <OptionPage option={'config'} active={viewOption}>
                    {
                        authFailedProps != null && <AuthFailedComp {...authFailedProps} onClose={() =>
                            fireEvent<CloseClicked>({
                                type: 'CloseClicked',
                            })

                        } onUseHere={() => fireEvent<UseHereClicked>({
                            type: 'UseHereClicked',
                        })
                        } />
                    }
                    {regularPageProps == null ? <p>You are not logged in.</p> :
                        <>
                            {actionButtonsEnabled && <button onClick={() => fireEvent<VideoDataSettingsClicked>({
                                type: 'VideoDataSettingsClicked',
                            })
                            }>Video settings for individual connections ...</button>}

                            {hangUpProps != null && <HangUpDlgComp {...hangUpProps} />}
                            {decideIfWithVideoProps != null && <DecideIfWithVideoDlgComp {...decideIfWithVideoProps} />}
                            {receivedCallProps && <ReceivedCallComp {...receivedCallProps} />}

                            <VideoConfigComp sendVideo={regularPageProps.sendVideo} receiveVideo={regularPageProps.receiveVideo}
                                ringOnCall={regularPageProps.ringOnCall} debugMessages={regularPageProps.debugMessages} onSendChange={videoConfigOnSendChange} onReceiveChange={videoConfigOnReceiveChange} onChange={videoConfigOnChange} />
                            {
                                cameraTestButtonText != null &&
                                <button onClick={() => fireEvent<CameraTestClicked>({
                                    type: 'CameraTestClicked',
                                })
                                }>{cameraTestButtonText}</button>
                            }
                            {actionButtonsEnabled &&
                                <div className={styles.flexRow}>
                                    {/* <button className={styles.redButton} onClick={() => fireEvent<LogoutClicked>({
                                    type: 'LogoutClicked',
                                })
                                }>Logout</button> */}
                                    <button onClick={() => fireEvent<WaitForPushClicked>({
                                        type: 'WaitForPushClicked',
                                    })
                                    }>Wait for push notification ...</button>
                                </div>
                            }
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
                        </>
                    }
                </OptionPage>
                <OptionPage option='chat' active={viewOption}>
                    {
                        authFailedProps != null && <AuthFailedComp {...authFailedProps} onClose={() =>
                            fireEvent<CloseClicked>({
                                type: 'CloseClicked',
                            })

                        } onUseHere={() => fireEvent<UseHereClicked>({
                            type: 'UseHereClicked',
                        })
                        } />
                    }
                    {
                        regularPageProps == null ? <p>You are not logged in.</p> :
                            <div className={styles.flexColumn}>
                                {chatComponents}
                            </div>
                    }
                </OptionPage>
                {/* <button onClick={async () => {
                    if (testButtonRef.current != null) {
                        const canvas = new OffscreenCanvas(32, 32);
                        const c = canvas.getContext("2d");
                        if (c == null) return;
                        const resp = await fetch('/icons/film_1146152.png');
                        const bmp = await createImageBitmap(await resp.blob())
                        c.drawImage(bmp, 0, 0);
                        c.fillStyle = 'red';
                        c.arc(5, 5, 4, 0, Math.PI * 2)
                        c.fill();
                        const newBlob = await canvas.convertToBlob();
                        const imgUrl = URL.createObjectURL(newBlob);
                        if (testCanvasRef.current != null) {
                            const testC = testCanvasRef.current.getContext("2d");
                            testC?.drawImage(canvas.transferToImageBitmap(), 0, 0);

                        }
                        console.log('imgUrl', imgUrl);
                        testButtonRef.current.style.backgroundImage = `url('${imgUrl}')`
                        testButtonRef.current.style.backgroundPosition = 'center';
                        testButtonRef.current.style.backgroundRepeat = 'no-repeat';
                        testButtonRef.current.innerText = ''
                        console.log('set new background image for testButton')
                    }
                }}>Test</button>
                <button style={{
                    background: "url('/accept-call-64x64.png')"
                }} ref={testButtonRef}>This button will be decorated</button>
                <canvas ref={testCanvasRef} />
                <input type='text' id='markOption' />
                <button onClick={() => {
                    const el = document.getElementById('markOption') as HTMLInputElement;
                    setMarkedOptions(d => ({
                        ...d,
                        [el.value]: !(d[el.value] ?? false)
                    }))
                }}>Toggle mark</button> */}
                {/* The 'video' option must always be rendered for sound being also available when this option is not active.
                But if not active, it is rendered 'hidden'. */}
                <div style={{ visibility: viewOption === 'video' ? 'visible' : 'hidden' }}>
                    {
                        authFailedProps != null && <AuthFailedComp {...authFailedProps} onClose={() =>
                            fireEvent<CloseClicked>({
                                type: 'CloseClicked',
                            })

                        } onUseHere={() => fireEvent<UseHereClicked>({
                            type: 'UseHereClicked',
                        })
                        } />
                    }
                    {
                        regularPageProps == null ? <p>You are not logged in.</p> :
                            <>
                                {
                                    videoMenu && <div className={styles.dlg}>
                                        <button className={styles.closeButton} onClick={() => {
                                            setVideoMenu(false);
                                        }}><Image src='/icons/delete_8385838.png' alt='Close menu' width={32} height={32} /></button>
                                        {/* <h4>Video Menu</h4> */}
                                        {
                                            actionButtonsEnabled &&
                                            <>
                                                <button className={styles.reject} onClick={() => {
                                                    fireEvent<HangUpClicked>({
                                                        type: 'HangUpClicked',
                                                        remoteUser: null
                                                    });
                                                }} />
                                                <button onClick={() => fireEvent<VideoDataSettingsClicked>({
                                                    type: 'VideoDataSettingsClicked',
                                                })
                                                }>Video settings for individual connections ...</button>
                                            </>
                                        }
                                        {
                                            cameraTestButtonText != null &&
                                            <button onClick={() => fireEvent<CameraTestClicked>({
                                                type: 'CameraTestClicked',
                                            })
                                            }>{cameraTestButtonText}</button>
                                        }
                                        {hangUpProps != null && <HangUpDlgComp {...hangUpProps} />}
                                        {decideIfWithVideoProps != null && <DecideIfWithVideoDlgComp {...decideIfWithVideoProps} />}
                                        {receivedCallProps && <ReceivedCallComp {...receivedCallProps} />}

                                    </div>
                                }
                                <ConnectionsComp {...connectionsProps} localMediaStream={localMediaStream ?? undefined} />
                            </>
                    }
                </div>
            </div>
            <OptionPage option='all' active={viewOption}>
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
                                    {/* <button className={styles.redButton} onClick={() => fireEvent<LogoutClicked>({
                                        type: 'LogoutClicked',
                                    })
                                    }>Logout</button> */}
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
                        {setupPushProps == null && awaitPushProps == null && regularPageProps != null &&
                            <>
                                <div className={styles.left}>
                                    <MultiSelectChatUserListComp
                                        userListState={chat.userList}
                                        small={callActive}
                                        onKey={(e) => {
                                            throw new Error('nyi');
                                        }}
                                        onClick={chatOnUserClick} />
                                    {actionButtonsEnabled && <>
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
                                        <button onClick={() => fireEvent<VideoDataSettingsClicked>({
                                            type: 'VideoDataSettingsClicked',
                                        })
                                        }>Video settings for individual connections ...</button>
                                    </>}
                                    {
                                        cameraTestButtonText != null &&
                                        <button onClick={() => fireEvent<CameraTestClicked>({
                                            type: 'CameraTestClicked',
                                        })
                                        }>{cameraTestButtonText}</button>
                                    }
                                    {hangUpProps != null && <HangUpDlgComp {...hangUpProps} />}

                                    {receivedCallProps && <ReceivedCallComp {...receivedCallProps} />}
                                    {decideIfWithVideoProps != null && <DecideIfWithVideoDlgComp {...decideIfWithVideoProps} />}
                                    <VideoConfigComp sendVideo={regularPageProps.sendVideo}
                                        receiveVideo={regularPageProps.receiveVideo}
                                        ringOnCall={regularPageProps.ringOnCall}
                                        debugMessages={regularPageProps.debugMessages}
                                        onSendChange={videoConfigOnSendChange}
                                        onReceiveChange={videoConfigOnReceiveChange}
                                        onChange={videoConfigOnChange} />
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

                </div>
            </OptionPage>
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
            {transientMsg != null && <TransientMsg msg={transientMsg} fadeOut={transientMsgFadeout} />}
            {
                awaitPushProps != null &&
                <ModalDialog>
                    <AwaitPushComp {...awaitPushProps} onCancel={() => fireEvent<CancelClicked>({
                        type: 'CancelClicked',
                    })
                    } />
                </ModalDialog>
            }
            <audio ref={audioRef} preload="auto" controls={false} src="/ring.mp3" typeof="audio/mpeg" loop={true}/*  onEnded={() => {
                if (receivedCallProps != null && regularPageProps?.ringOnCall) {
                    audioRef.current?.play();
                }
            }} */ />
            {/* {
                busyVisible && busyComment != null && <div>
                    <h1>Busy ...</h1>
                    <p>{busyComment}</p>
                </div>
            } */}
            {
                busyVisible && busyComment != null &&
                <TransientMsg msg={busyComment} fadeOut={false} />
            }

            {errorText != '' && 
            <textarea className={styles.errorText} value={errorText} />}
        </>
    )
}
