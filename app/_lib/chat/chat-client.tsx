import { ForwardedRef, KeyboardEvent, PropsWithRef, forwardRef, useEffect, useRef, useState } from "react";
import styles from './chat-client.module.css'
import { AccumulatedFetcher } from "../user-management-client/apiRoutesClient";
import { ChatEvent, ChatReq, ChatResp } from "./chat-common";

export interface ChatLine {
    className: string;
    text: string;
}

export interface ChatPanelProps {
    lines: ChatLine[];
    small: boolean;
    onScroll: () => void;
}

export const ChatPanelComp = forwardRef(
    function ChatPanelComp1(props: ChatPanelProps, ref: ForwardedRef<HTMLDivElement>) {
        return (
            <div className={styles.chatLinesBorder}>
                <div
                    ref={ref}
                    className={`${styles.chatLines} ${props.small && styles.chatLinesSmall}`}
                    onScroll={(e => { props.onScroll(); })}
                    tabIndex={0}
                >
                    {
                        props.lines.map((line, i) =>
                            <p key={i} className={`${line.className}${props.small ? ' ' + styles.small : ''}`}>{line.text}</p>)
                    }
                </div>
            </div>
        )
    }
)

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

export interface ChatUserListProps {
    userListState: UserListState;
    small: boolean;
    onClick: (idx: number) => void;
    onKey: (e: KeyboardEvent<HTMLElement>) => void;

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
        console.log('ChatManager.send in state ', this.state);
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
            msg: this.lineToSend,
            lastEventId: this.lastEventId,
        }

        this.fetcher.push<ChatReq, ChatResp>(req).then(resp => {
            console.log('ChatManager: response in state', this.state, resp);
            if (this.state === 'closed') return;
            console.log('before switch');
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
        console.log('ChatManager sent request');
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