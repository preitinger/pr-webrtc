import { ForwardedRef, KeyboardEvent, PropsWithRef, forwardRef, useEffect, useRef, useState } from "react";
import styles from './chat-client.module.css'

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
                console.log('e.key', e.key);
                if (e.key === ' ' || e.key === 'Enter') {
                    props.onClick();
                    e.stopPropagation();
                    e.preventDefault();
                } else if (e.key === 'ArrowDown') {
                    console.log('ArrowDown on UserListItem');
                    props.onDown(e);
                } else if (e.key === 'ArrowUp') {
                    console.log('ArrowUp on UserListItem');
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
                                            console.log('new focus', i + 1);
                                            setFocus(i + 1);
                                            e.stopPropagation();
                                            e.preventDefault();
                                        }
                                    }}
                                    onUp={(e: KeyboardEvent<HTMLLIElement>) => {
                                        if (i > 0) {
                                            console.log('new focus', i - 1);
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

