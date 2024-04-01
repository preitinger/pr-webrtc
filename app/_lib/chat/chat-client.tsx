import { ChangeEvent, ChangeEventHandler, ForwardedRef, KeyboardEvent, PropsWithRef, forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from './chat-client.module.css'
import { AccumulatedFetcher } from "../user-management-client/apiRoutesClient";
import { ChatEvent, ChatReq, ChatResp } from "./chat-common";
import { AccumulatedFetching } from "../user-management-client/AccumulatedFetching";
import EventBus, { Subscription } from "../EventBus";
import FixedAbortController from "../pr-client-utils/FixedAbortController";
import timeout from "../pr-timeout/pr-timeout";
import useTardyFlag from "../pr-client-utils/useTardyFlag";
import * as rt from "runtypes";


export interface ChatLine {
    className: string;
    text: string;
}

export interface ChatPanelProps {
    // lines: ChatLine[];
    events: ChatEvent[];
    linesBeingSent: string[];
    small: boolean;
}

export function ChatPanelComp(props: ChatPanelProps) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [scrollDown, setScrollDown] = useState<boolean>(true);

    const lines: ChatLine[] = props.events.map(msg => (msg.type === 'ChatMsg' ? {
        className: '',
        text: `${msg.user}: ${msg.text}`
    } : msg.type === 'UserEntered' ? {
        className: styles.hintLine,
        text: `[ ${msg.user} has entered. ]`
    } : msg.type === 'UserLeft' ? {
        className: styles.hintLine,
        text: `[ ${msg.user} has left. ]`
    } : msg.type === 'Error' ? {
        className: styles.errorLine,
        text: `[ ${msg.error} ]`
    } : msg.type === 'Hint' ? {
        className: styles.hintLine,
        text: `[ ${msg.hint}] `
    } : {
        className: '',
        text: '(never)'
    }));


    function onScroll() {
        const div = ref.current;
        if (div == null) return;
        if (div.scrollTop + div.offsetHeight + 10 > div.scrollHeight) {
            setScrollDown(true);
        } else {
            setScrollDown(false);
        }
    }

    useLayoutEffect(() => {
        if (scrollDown) {
            const div = ref.current;
            if (div == null) return;
            div.scroll({
                top: div.scrollHeight
            })
        }
    }, [scrollDown, lines])

    return (
        <div className={styles.chatLinesBorder}>
            <div
                ref={ref}
                className={`${styles.chatLines} ${props.small && styles.chatLinesSmall}`}
                onScroll={(e => { onScroll(); })}
                tabIndex={0}
            >
                {
                    lines.map((line, i) =>
                        <p key={i} className={`${line.className}${props.small ? ' ' + styles.small : ''}`}>{line.text.split('\n').map(subLine => ([<span key='span'>{subLine}</span>, <br key='br' />]))}</p>)
                }
                {
                    props.linesBeingSent.map((line, i) =>
                        <p key={i}><span className={styles.sendingPrefix}>Sending ...&nbsp;</span><span className={styles.sendingContent}>{line}</span></p>)
                }
            </div>
        </div>
    )
}


export interface ChatUser {
    name: string;
}


export interface ChatUserListItemProps {
    user: ChatUser;
    focussed: boolean;
    selected: boolean;
    onClick: () => void;
    onFocus: () => void;
    onDown: (e: KeyboardEvent<HTMLLIElement>) => void;
    onUp: (e: KeyboardEvent<HTMLLIElement>) => void;
}

export function ChatUserListItemComp(props: ChatUserListItemProps) {
    const divRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (props.focussed && divRef.current != null) {
            divRef.current.focus();
        }
    }, [props.focussed])

    return (
        <li role='option' aria-selected={props.selected} className={`${styles.userListItemOuter}`}
            onClick={() => props.onClick()}
            onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    props.onClick();
                    e.stopPropagation();
                    e.preventDefault();
                } else if (e.key === 'ArrowDown') {
                    props.onDown(e);
                } else if (e.key === 'ArrowUp') {
                    props.onUp(e);
                }
            }}
            onFocus={(e) => {
                props.onFocus();
            }}
        >
            <div ref={divRef} tabIndex={0} className={`${styles.userListItemInner} ${props.selected ? styles.selected : ''}`}>
                {props.user.name}
            </div>
        </li>
    )
}


export interface UserListState {
    users: ChatUser[];
    /**
     * -1 for none
     */
    selected: number;

}

export interface MultiSelectUserListState {
    users: ChatUser[];
    selected: number[];
}

export interface ChatUserListProps {
    userListState: UserListState;
    small: boolean;
    onClick: (idx: number) => void;
    onKey: (e: KeyboardEvent<HTMLElement>) => void;
}

export interface MultiSelectChatUserListProps {
    userListState: MultiSelectUserListState;
    small: boolean;
    onClick: (idx: number) => void;
    onKey: (e: KeyboardEvent<HTMLElement>) => void;
    label?: string;
    emptyLabel?: string;
}

export function ChatUserListComp(props: ChatUserListProps) {
    const [focus, setFocus] = useState<number>(-1);

    return (
        <div>
            <label>Users:</label>
            <div role='listbox' className={styles.userListOuter}>
                <ul className={`${styles.userList} ${props.small && styles.userListSmall}`}>
                    {
                        props.userListState.users.length === 0 ?
                            <li role='option' aria-selected={false} className={styles.noUsers} >No users online</li> :
                            props.userListState.users.map((user, i) => (
                                // <li tabIndex={0} role='option' aria-selected={i === props.userListState.selected} key={user.name} className={`${styles.userListItem} ${i === props.userListState.selected ? styles.selected : ''}`}
                                //     onClick={() => props.onClick(i)}
                                //     onKeyDown={(e) => {
                                //         console.log('e.key', e.key);
                                //         if (e.key === ' ' || e.key === 'Enter') {
                                //             props.onClick(i);
                                //             e.stopPropagation();
                                //             e.preventDefault();
                                //         }
                                //     }}
                                // >{user.name}
                                // </li>
                                <ChatUserListItemComp key={'li-' + user.name} user={user} focussed={focus === i} onFocus={() => setFocus(i)}
                                    onClick={() => props.onClick(i)}
                                    selected={i === props.userListState.selected}
                                    onDown={(e: KeyboardEvent<HTMLLIElement>) => {
                                        if (i < props.userListState.users.length - 1) {
                                            setFocus(i + 1);
                                            e.stopPropagation();
                                            e.preventDefault();
                                        }
                                    }}
                                    onUp={(e: KeyboardEvent<HTMLLIElement>) => {
                                        if (i > 0) {
                                            setFocus(i - 1);
                                            e.stopPropagation();
                                            e.preventDefault();
                                        }
                                    }} />
                            ))
                    }
                </ul>
            </div>
        </div>
    )
}

export function MultiSelectChatUserListComp(props: MultiSelectChatUserListProps) {
    const [focus, setFocus] = useState<number>(-1);

    return (
        <div>
            <label className={styles.userListLabel}>{props.label ?? 'Users:'}</label>
            <div role='listbox' className={styles.userListOuter}>
                <ul className={`${styles.userList} ${props.small && styles.userListSmall}`}>
                    {
                        props.userListState.users.length === 0 ?
                            <li role='option' aria-selected={false} className={styles.noUsers} >{props.emptyLabel ?? 'No users online'}</li> :
                            props.userListState.users.map((user, i) => (
                                // <li tabIndex={0} role='option' aria-selected={i === props.userListState.selected} key={user.name} className={`${styles.userListItem} ${i === props.userListState.selected ? styles.selected : ''}`}
                                //     onClick={() => props.onClick(i)}
                                //     onKeyDown={(e) => {
                                //         console.log('e.key', e.key);
                                //         if (e.key === ' ' || e.key === 'Enter') {
                                //             props.onClick(i);
                                //             e.stopPropagation();
                                //             e.preventDefault();
                                //         }
                                //     }}
                                // >{user.name}
                                // </li>
                                <ChatUserListItemComp key={'li-' + user.name} user={user} focussed={focus === i} onFocus={() => setFocus(i)}
                                    onClick={() => props.onClick(i)}
                                    selected={props.userListState.selected.includes(i)}
                                    onDown={(e: KeyboardEvent<HTMLLIElement>) => {
                                        if (i < props.userListState.users.length - 1) {
                                            setFocus(i + 1);
                                            e.stopPropagation();
                                            e.preventDefault();
                                        }
                                    }}
                                    onUp={(e: KeyboardEvent<HTMLLIElement>) => {
                                        if (i > 0) {
                                            setFocus(i - 1);
                                            e.stopPropagation();
                                            e.preventDefault();
                                        }
                                    }} />
                            ))
                    }
                </ul>
            </div>
        </div>
    )
}

/**
 * see diagram WebRTC Demo.vpp://diagram/ZxwrFzGD.AACAQpi
 */
type RequestState =
    'fetching' |
    'pending' |
    'sending' |
    'waiting for timeout' |
    'waiting on error' |
    'closed'

export interface ChatHandlers {
    onFetchError: (error: string) => void;
    onFreezeInput: (frozen: boolean) => void;
    onResetChatInput: () => void;
    onChatLines: (events: ChatEvent[], lastEventId: number) => void;
    onClosed: () => void;
}

/**
 * @deprecated
 * Lesson learnt: better use a custom hook for the chat
 */
export class ChatManager {
    constructor(
        timeoutMs: number,
        chatId: string,
        user: string,
        sessionToken: string,
        fetcher: AccumulatedFetcher,
        handlers: ChatHandlers
    ) {
        this.timeoutMs = timeoutMs;
        this.chatId = chatId;
        this.user = user;
        this.sessionToken = sessionToken;
        this.fetcher = fetcher;
        this.handlers = handlers;
        this.sendRequest();
    }

    send(msg: string) {
        // console.log('ChatManager.send in state ', this.state);
        switch (this.state) {
            case 'fetching': {
                this.state = 'pending';
                this.lineToSend = msg;
                this.handlers.onFreezeInput(true);
                break;
            }
            case 'waiting for timeout': {
                this.clearMyTimeout();
                if (this.lineToSend != null) throw new Error("unexpected: lineToSend should be null");
                this.lineToSend = msg;
                this.sendRequest();
                this.state = 'sending';
                this.handlers.onFreezeInput(true);
                break;
            }
            default: {
                break;
            }
        }
    }

    resumeAfterError() {
        switch (this.state) {
            case 'waiting on error': {
                this.sendRequest();
                if (this.lineToSend == null) {
                    this.state = 'fetching';
                    this.handlers.onFreezeInput(false);
                } else {
                    this.state = 'sending';
                    console.warn('actually unexpected state');
                }
                break;
            }
        }
    }

    close() {
        if (this.state === 'closed') return;

        this.state = 'closed';
        this.clearMyTimeout();
        this.handlers.onClosed();
    }

    private sendRequest() {
        const req: ChatReq = {
            type: 'chat',
            chatId: this.chatId,
            user: this.user,
            token: this.sessionToken,
            lines: this.lineToSend == null ? [] : [this.lineToSend],
            lastEventId: this.lastEventId,
        }

        this.fetcher.push<ChatReq, ChatResp>(req).then(resp => {
            // console.log('ChatManager: response in state', this.state, resp);
            if (this.state === 'closed') return;
            // console.log('before switch');
            switch (resp.type) {
                case 'error': {
                    this.state = 'waiting on error';
                    console.error('Error on server', resp.error);
                    this.handlers.onFetchError('Error on server: ' + resp.error);
                    break;
                }
                case 'success': {
                    this.lastEventId = resp.lastEventId;
                    switch (this.state) {
                        case 'fetching': {
                            this.state = 'waiting for timeout'
                            if (this.lineToSend != null) {
                                throw new Error('Unexpected: lineToSend should be null');
                            }
                            this.setMyTimeout();
                            break;
                        }
                        case 'pending': {
                            this.sendRequest();
                            this.state = 'sending';
                            break;
                        }
                        case 'sending': {
                            this.handlers.onResetChatInput();
                            this.handlers.onFreezeInput(false);
                            if (this.lineToSend == null) {
                                throw new Error('Unexpected: lineToSend should not be null');
                            }
                            this.lineToSend = null;
                            this.state = 'waiting for timeout';
                            this.setMyTimeout();
                            break;
                        }
                        default: {
                            break;
                        }
                    }
                    this.handlers.onChatLines(resp.events, resp.lastEventId);
                    break;
                }
                case 'authenticationFailed': {
                    alert('The session has been closed. Maybe you logged in on another device?');
                    this.close();
                    break;
                }
            }
        }).catch(reason => {
            if (reason instanceof Error) {
                if (reason.message === 'Failed to fetch') {
                    this.handlers.onFetchError('No connection to the server.')
                } else {
                    console.error('Unknown server error', reason);
                    this.handlers.onFetchError(`Unknown server error (${reason.name}): ${reason.message}`)
                }
            } else {
                console.error('Caught in apiFetchPost: Error', reason);
                this.handlers.onFetchError('Caught unknown in apiFetchPost: ' + JSON.stringify(reason));
            }
            // alert('Error (on server?)' + JSON.stringify(reason));
            this.state = 'waiting on error';
        })
        // console.log('ChatManager sent request');
    }

    private setMyTimeout() {
        if (this.timeout != null) throw new Error('timeout must be null when setMyTimeout() is called');
        this.timeout = setTimeout(() => {
            console.log('timeout function in state', this.state);
            this.timeout = null;
            switch (this.state) {
                case 'waiting for timeout': {
                    this.sendRequest();
                    if (this.lineToSend == null) {
                        this.state = 'fetching';
                    } else {
                        this.state = 'sending';
                        this.handlers.onFreezeInput(true);
                        console.warn('actually unexpected state');
                    }
                    break;
                }
            }
        }, this.timeoutMs)
    }

    private clearMyTimeout() {
        if (this.timeout == null) return;
        clearTimeout(this.timeout);
        this.timeout = null;
    }

    private chatId: string;
    private user: string;
    private sessionToken: string;
    private lastEventId: number = -1;
    private state: RequestState = 'fetching';
    private lineToSend: string | null = null;
    private fetcher: AccumulatedFetcher;
    private handlers: ChatHandlers;
    private timeout: NodeJS.Timeout | null = null;
    private timeoutMs: number;
}

type BusEventTypes = 'onStart' | 'timeout' | 'wakeup' | 'onStop';

type BusEvent = {
    type: 'onStart';
    accumulatedFetching: AccumulatedFetching;
    loginResultData: LoginResultData;
} | {
    type: 'timeout'
} | {
    type: 'wakeup'
} | {
    type: 'onStop' // TODO
    // } | {
    //     type: 'send';
    //     line: string;
}

export const LoginResultData = rt.Record({
    user: rt.String,
    sessionKey: rt.String,
    initialUsers: rt.Array(rt.String),
    eventIdForUsers: rt.Number
})

export type LoginResultData = rt.Static<typeof LoginResultData>

export interface UseChatProps {
    chatId: string;
    timeoutMs: number;
}

type UseMultiSelectChatProps = UseChatProps

export type UseChatResult = [
    state: {
        chatEvents: ChatEvent[];
        linesBeingSent: string[];
        userList: UserListState;
        chatInput: string;
    },
    onStart: (accumulatedFetching1: AccumulatedFetching, loginResultData: LoginResultData, onAuthenticationFailed: () => void
    ) => void,
    onInputChange: ChangeEventHandler<HTMLInputElement>,
    onSend: () => void,
    onUserClick: (idx: number) => void,
    addErrorLine: (error: string) => void,
    onStop: () => void,
]

export type UseMultiSelectChatResult = [
    state: {
        chatEvents: ChatEvent[];
        linesBeingSent: string[];
        userList: MultiSelectUserListState;
        chatInput: string;
    },
    onStart: (accumulatedFetching1: AccumulatedFetching, loginResultData: LoginResultData, onAuthenticationFailed: () => void
    ) => void,
    onInputChange: ChangeEventHandler<HTMLInputElement>,
    onSend: () => void,
    onUserClick: (idx: number) => void,
    addErrorLine: (error: string) => void,
    onStop: () => void,
]

let globalIdx = 0;

export function useChat<T extends { type: Exclude<string, BusEventTypes>; }>({ chatId, timeoutMs }: UseChatProps): UseChatResult {
    const [chatEvents, setChatEvents] = useState<ChatEvent[]>([]);
    const [linesBeingSent, setLinesBeingSent] = useState<string[]>([]);

    const [userList, setUserList] = useState<UserListState>({
        users: [],
        selected: -1
    });

    const chattingAborter = useRef<FixedAbortController | null>(null);
    function getChattingAborter() {
        if (chattingAborter.current == null) {
            throw new Error('chattingAborter.current null');
        }

        return chattingAborter.current;
    }

    // const [chatLines, setChatLines] = useState<ChatLine[]>([]);
    const [chatInput, setChatInput] = useState<string>('');
    const toSendRef = useRef<string[]>([]);
    const accumulatedFetching = useRef<AccumulatedFetching | null>(null);
    function getAccumulatedFetching() {
        if (accumulatedFetching.current == null) throw new Error('accumulatedFetching.current is null');
        return accumulatedFetching.current;
    }
    // const auth = useRef<{ user: string, token: string }>({ user: '', token: '' });
    const eventBus = useRef<EventBus<BusEvent /* | T */> | null>(null);
    function getEventBus() {
        if (eventBus.current == null) {
            throw new Error('eventBus.current null');
        }
        return eventBus.current;
    }

    const onAuthenticationFailed = useRef<null | (() => void)>(null);

    const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setChatInput(e.target.value);
    }

    const onSend = () => {
        const line = chatInput;
        setLinesBeingSent(d => [...d, line])
        toSendRef.current.push(line);
        setChatInput('');
        getEventBus().publish({
            type: 'wakeup'
        });
    };

    useEffect(() => {

        const mountAborter = new FixedAbortController();
        eventBus.current = new EventBus('useChatBus', mountAborter);

        async function chattingActivity(loginResultData: LoginResultData) {
            // setChat
            const sending: string[] = [];
            setChatEvents([]);
            let lastEventId = -1;
            setUserList({
                users: loginResultData.initialUsers.map(name => ({
                    name: name
                })),
                selected: -1
            })
            chattingAborter.current = new FixedAbortController();
            const signal = chattingAborter.current.signal;
            const subscription = getEventBus().subscribe();

            try {
                while (!getChattingAborter().signal.aborted) {
                    sending.push(...toSendRef.current);
                    toSendRef.current.length = 0;
                    const req: ChatReq = {
                        type: 'chat',
                        chatId: chatId,
                        user: loginResultData.user,
                        token: loginResultData.sessionKey,
                        lastEventId: lastEventId,
                        lines: sending,
                    }
                    const resp = await getAccumulatedFetching().pushRaw<ChatReq, ChatResp>(req)
                    switch (resp.type) {
                        case 'authenticationFailed':
                            if (signal.aborted) return;
                            if (onAuthenticationFailed.current != null) onAuthenticationFailed.current();
                            return;
                        case 'error':
                            if (signal.aborted) return;
                            setChatEvents(d =>
                                [...d, {
                                    type: 'Error',
                                    error: resp.error,
                                }]
                            )
                            return;
                        case 'success':
                            break;


                    }
                    sending.length = 0;
                    setChatEvents(d => ([
                        ...d,
                        ...resp.events
                    ]))

                    lastEventId = resp.lastEventId;

                    {
                        const m = resp.events;
                        const firstEventId = (lastEventId ?? -1) - m.length + 1;

                        m.forEach((e, i) => {
                            if (e.type === 'UserEntered' && firstEventId + i >= loginResultData.eventIdForUsers) {

                                setUserList(d => {
                                    const insertPos = d.users.findIndex(u => u.name.localeCompare(e.user) >= 0);
                                    if (insertPos === -1) {
                                        // all current users before the new user, so add at the end and keep selected
                                        return {
                                            users: [...d.users, {
                                                name: e.user
                                            }],
                                            selected: d.selected
                                        }
                                    } else if (d.users[insertPos].name === e.user) {
                                        // duplicate, so ignore
                                        return d;
                                    } else {
                                        // no duplicate, so insert before insertPos and increment d.selected if greater or equal than insertPos
                                        return {
                                            users: [
                                                ...d.users.slice(0, insertPos),
                                                {
                                                    name: e.user
                                                },
                                                ...d.users.slice(insertPos)
                                            ],
                                            selected: d.selected >= insertPos ? d.selected + 1 : d.selected
                                        }
                                    }
                                })

                            } else if (e.type === 'UserLeft' && firstEventId + i >= loginResultData.eventIdForUsers) {

                                setUserList(d => {
                                    const deletePos = d.users.findIndex(u => u.name.localeCompare(e.user) === 0);
                                    if (deletePos === -1) {
                                        // not found, so ignore
                                        return d;
                                    } else {
                                        // found, so remove entry at index deletePos and decrement d.selected if greater than deletePos,
                                        // or keep d.selected if less than deletePos or set it to -1 if equal to deletePos
                                        return {
                                            users: [...d.users.slice(0, deletePos), ...d.users.slice(deletePos + 1)],
                                            selected: d.selected > deletePos ? d.selected - 1 : d.selected < deletePos ? d.selected : -1
                                        }
                                    }
                                    return d;
                                });

                            }
                        })

                    }

                    setLinesBeingSent(toSendRef.current.slice());

                    if (toSendRef.current.length === 0 && !resp.linesMissing) {
                        const timeoutAborter = new FixedAbortController();
                        try {
                            timeout(timeoutMs, timeoutAborter.signal).then(() => {
                                getEventBus().publish({
                                    type: 'timeout'
                                });
                            }).catch((reason: any) => {
                                if (signal.aborted || mountAborter.signal.aborted || timeoutAborter.signal.aborted) return;
                                console.error('caught in timeout', reason);
                            })
                            let quitWhile = false;
                            const e = await subscription.nextEventWith(e => e.type === 'timeout' || toSendRef.current.length > 0)

                        } finally {
                            timeoutAborter.abort();
                        }
                    }
                    if (signal.aborted) return;
                    continue;
                }

            } catch (reason) {
                // TODO hide this log when 'normal', i.e. expected AbortError or the like
                console.log('caught in chatting activity', reason);
            } finally {
                subscription.unsubscribe();
            }
        }

        const handleEvent = (subscription: Subscription</* T | */ BusEvent>) => (e: BusEvent /* | T */) => {
            if (mountAborter.signal.aborted) return;
            if (e.type === 'onStart') {
                accumulatedFetching.current = e.accumulatedFetching;
                chattingActivity(e.loginResultData);
            }

            processNextEvent(subscription)
        }

        function processNextEvent(subscription: Subscription</* T | */ BusEvent>) {
            subscription.nextEvent().then(handleEvent(subscription)).catch(reason => {
                if (mountAborter.signal.aborted) return;
                console.error(reason);
            })
        }

        {
            const subscription = getEventBus().subscribe();
            processNextEvent(subscription);
        }

        // chattingActivity();
        return () => {
            // handle effect end
            // console.log('handle chat effect end');
            mountAborter.abort();
            chattingAborter.current?.abort();


            // TODO Decide if toSendRef.current should be cleared here?
            // Or better keep until next login? But if different user?
            // Then the kept messages from the old user would be sent (theoretically) from the new user.
        }
    }, [chatId, timeoutMs])

    const onStart = useCallback((accumulatedFetching1: AccumulatedFetching, loginResultData: LoginResultData, onAuthenticationFailed1: () => void) => {
        console.log('onStart');
        onAuthenticationFailed.current = onAuthenticationFailed1;
        getEventBus().publish({
            type: 'onStart',
            accumulatedFetching: accumulatedFetching1,
            loginResultData: loginResultData
        })
    }, [])

    const addErrorLine = useCallback((error: string) => {
        setChatEvents(d => [...d, {
            type: 'Error',
            error: error
        }])
    }, []);
    const onStop = useCallback(() => {
        chattingAborter.current?.abort();
    }, [])
    const onUserClick = useCallback((idx: number) => {
        setUserList(d => {
            if (d.selected === idx) {
                return {
                    ...d,
                    selected: -1
                };
            } else {
                return {
                    ...d,
                    selected: idx
                };
            }
        })

    }, []);

    return [
        {
            userList,
            chatEvents,
            linesBeingSent,
            chatInput,
        },
        onStart,
        // onStart(accumulatedFetching1: AccumulatedFetching, loginResultData: LoginResultData, onAuthenticationFailed1) {
        //     console.log('onStart');
        //     onAuthenticationFailed.current = onAuthenticationFailed1;
        //     getEventBus().publish({
        //         type: 'onStart',
        //         accumulatedFetching: accumulatedFetching1,
        //         loginResultData: loginResultData
        //     })
        // },
        onInputChange,
        onSend,
        onUserClick,
        addErrorLine,
        onStop
    ]
}

const initialUserListState: MultiSelectUserListState = {
    users: [],
    selected: []
}

export function useMultiSelectChat<T extends { type: Exclude<string, BusEventTypes>; }>(props1: UseMultiSelectChatProps): UseMultiSelectChatResult {
    const [{ chatId, timeoutMs }, setProps] = useState<UseMultiSelectChatProps>(props1)
    const [chatEvents, setChatEvents] = useState<ChatEvent[]>([]);
    const [linesBeingSent, setLinesBeingSent] = useState<string[]>([]);

    const [userList, setUserList] = useState<MultiSelectUserListState>(initialUserListState);

    const chattingAborter = useRef<FixedAbortController | null>(null);
    function getChattingAborter() {
        if (chattingAborter.current == null) {
            throw new Error('chattingAborter.current null');
        }

        return chattingAborter.current;
    }

    // const [chatLines, setChatLines] = useState<ChatLine[]>([]);
    const [chatInput, setChatInput] = useState<string>('');
    const toSendRef = useRef<string[]>([]);
    const accumulatedFetching = useRef<AccumulatedFetching | null>(null);
    function getAccumulatedFetching() {
        if (accumulatedFetching.current == null) throw new Error('accumulatedFetching.current is null');
        return accumulatedFetching.current;
    }
    // const auth = useRef<{ user: string, token: string }>({ user: '', token: '' });
    const eventBus = useRef<EventBus<BusEvent /* | T */> | null>(null);
    function getEventBus() {
        if (eventBus.current == null) {
            throw new Error('eventBus.current null');
        }
        return eventBus.current;
    }

    const onAuthenticationFailed = useRef<null | (() => void)>(null);

    const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setChatInput(e.target.value);
    }

    const onSend = () => {
        const line = chatInput;
        setLinesBeingSent(d => [...d, line])
        toSendRef.current.push(line);
        setChatInput('');
        getEventBus().publish({
            type: 'wakeup'
        });
    };

    useEffect(() => {

        const mountAborter = new FixedAbortController();
        eventBus.current = new EventBus('useChatBus', mountAborter);

        async function chattingActivity(loginResultData: LoginResultData) {
            // setChat
            const sending: string[] = [];
            setChatEvents([]);
            let lastEventId = -1;
            setUserList({
                users: loginResultData.initialUsers.map(name => ({
                    name: name
                })),
                selected: []
            })
            chattingAborter.current = new FixedAbortController();
            const signal = chattingAborter.current.signal;
            const subscription = getEventBus().subscribe();

            try {
                while (!getChattingAborter().signal.aborted) {
                    sending.push(...toSendRef.current);
                    toSendRef.current.length = 0;
                    const req: ChatReq = {
                        type: 'chat',
                        chatId: chatId,
                        user: loginResultData.user,
                        token: loginResultData.sessionKey,
                        lastEventId: lastEventId,
                        lines: sending,
                    }
                    const resp = await getAccumulatedFetching().pushRaw<ChatReq, ChatResp>(req)
                    switch (resp.type) {
                        case 'authenticationFailed':
                            if (signal.aborted) return;
                            if (onAuthenticationFailed.current != null) onAuthenticationFailed.current();
                            return;
                        case 'error':
                            if (signal.aborted) return;
                            setChatEvents(d =>
                                [...d, {
                                    type: 'Error',
                                    error: resp.error,
                                }]
                            )
                            return;
                        case 'success':
                            break;


                    }
                    sending.length = 0;
                    setChatEvents(d => ([
                        ...d,
                        ...resp.events
                    ]))

                    lastEventId = resp.lastEventId;

                    {
                        const m = resp.events;
                        const firstEventId = (lastEventId ?? -1) - m.length + 1;

                        m.forEach((e, i) => {
                            if (e.type === 'UserEntered' && firstEventId + i >= loginResultData.eventIdForUsers) {

                                setUserList(d => {
                                    const insertPos = d.users.findIndex(u => u.name.localeCompare(e.user) >= 0);
                                    if (insertPos === -1) {
                                        // all current users before the new user, so add at the end and keep selected
                                        return {
                                            users: [...d.users, {
                                                name: e.user
                                            }],
                                            selected: d.selected
                                        }
                                    } else if (d.users[insertPos].name === e.user) {
                                        // duplicate, so ignore
                                        return d;
                                    } else {
                                        // no duplicate, so insert before insertPos and increment d.selected if greater or equal than insertPos
                                        const newSelected: number[] = [];
                                        for (let i of d.selected) {
                                            newSelected.push(i >= insertPos ? i + 1 : i);
                                        }
                                        return {
                                            users: [
                                                ...d.users.slice(0, insertPos),
                                                {
                                                    name: e.user
                                                },
                                                ...d.users.slice(insertPos)
                                            ],
                                            selected: newSelected
                                        }
                                    }
                                })

                            } else if (e.type === 'UserLeft' && firstEventId + i >= loginResultData.eventIdForUsers) {

                                setUserList(d => {
                                    const deletePos = d.users.findIndex(u => u.name.localeCompare(e.user) === 0);
                                    if (deletePos === -1) {
                                        // not found, so ignore
                                        return d;
                                    } else {
                                        // found, so remove entry at index deletePos and decrement d.selected if greater than deletePos,
                                        // or keep d.selected if less than deletePos or set it to -1 if equal to deletePos
                                        const newSelected: number[] = [];

                                        for (let i of d.selected) {
                                            if (i > deletePos) {
                                                newSelected.push(i - 1);
                                            } else if (i < deletePos) {
                                                newSelected.push(i);
                                            } // else: was delete, so not take into newSelected
                                        }
                                        return {
                                            users: [...d.users.slice(0, deletePos), ...d.users.slice(deletePos + 1)],
                                            selected: newSelected
                                        }
                                    }
                                    return d;
                                });

                            }
                        })

                    }

                    setLinesBeingSent(toSendRef.current.slice());

                    if (toSendRef.current.length === 0 && !resp.linesMissing) {
                        const timeoutAborter = new FixedAbortController();
                        try {
                            timeout(timeoutMs, timeoutAborter.signal).then(() => {
                                getEventBus().publish({
                                    type: 'timeout'
                                });
                            }).catch((reason: any) => {
                                if (signal.aborted || mountAborter.signal.aborted || timeoutAborter.signal.aborted) return;
                                console.error('caught in timeout', reason);
                            })
                            let quitWhile = false;
                            const e = await subscription.nextEventWith(e => e.type === 'timeout' || toSendRef.current.length > 0)

                        } finally {
                            timeoutAborter.abort();
                        }
                    }
                    if (signal.aborted) return;
                    continue;
                }

            } catch (reason) {
                // TODO hide this log when 'normal', i.e. expected AbortError or the like
                console.log('caught in chatting activity', reason);
            } finally {
                subscription.unsubscribe();
            }
        }

        const handleEvent = (subscription: Subscription</* T | */ BusEvent>) => (e: BusEvent /* | T */) => {
            if (mountAborter.signal.aborted) return;
            if (e.type === 'onStart') {
                accumulatedFetching.current = e.accumulatedFetching;
                chattingActivity(e.loginResultData);
            }

            processNextEvent(subscription)
        }

        function processNextEvent(subscription: Subscription</* T | */ BusEvent>) {
            subscription.nextEvent().then(handleEvent(subscription)).catch(reason => {
                if (mountAborter.signal.aborted) return;
                console.error(reason);
            })
        }

        {
            const subscription = getEventBus().subscribe();
            processNextEvent(subscription);
        }

        // chattingActivity();
        return () => {
            // handle effect end
            // console.log('handle chat effect end');
            mountAborter.abort();
            chattingAborter.current?.abort();


            // TODO Decide if toSendRef.current should be cleared here?
            // Or better keep until next login? But if different user?
            // Then the kept messages from the old user would be sent (theoretically) from the new user.
        }
    }, [chatId, timeoutMs])

    const onStart = useCallback((accumulatedFetching1: AccumulatedFetching, loginResultData: LoginResultData, onAuthenticationFailed1: () => void) => {
        onAuthenticationFailed.current = onAuthenticationFailed1;
        getEventBus().publish({
            type: 'onStart',
            accumulatedFetching: accumulatedFetching1,
            loginResultData: loginResultData
        })
    }, [])

    const addErrorLine = useCallback((error: string) => {
        setChatEvents(d => [...d, {
            type: 'Error',
            error: error
        }])
    }, []);
    const onStop = useCallback(() => {
        chattingAborter.current?.abort();
    }, [])
    const onUserClick = useCallback((idx: number) => {
        setUserList(d => {
            const newSelected = d.selected.filter((i => i !== idx))
            if (newSelected.length === d.selected.length) {
                // was not included, so not selected, so select now, so add to selected
                newSelected.push(idx);
            }
            return {
                ...d,
                selected: newSelected
            }
        })

    }, []);

    return [
        {
            userList,
            chatEvents,
            linesBeingSent,
            chatInput,
        },
        onStart,
        // onStart(accumulatedFetching1: AccumulatedFetching, loginResultData: LoginResultData, onAuthenticationFailed1) {
        //     console.log('onStart');
        //     onAuthenticationFailed.current = onAuthenticationFailed1;
        //     getEventBus().publish({
        //         type: 'onStart',
        //         accumulatedFetching: accumulatedFetching1,
        //         loginResultData: loginResultData
        //     })
        // },
        onInputChange,
        onSend,
        onUserClick,
        addErrorLine,
        onStop
    ]
}
