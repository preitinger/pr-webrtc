'use client'

import Image from 'next/image'
import styles from './page.module.css'
import { ForwardedRef, KeyboardEvent, KeyboardEventHandler, forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ModalDialog from '@/components/ModalDialog';
import EscapableFlexComp from '@/components/EscapableFlexComp';
import { LoginResponse } from './lib/Login';

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

interface UserListProps {
    userListState: UserListState;
    onClick: (idx: number) => void;
    onKey: (e: KeyboardEvent<HTMLElement>) => void;
}

function UserList(props: UserListProps) {
    return (
        <div>
            <label>Users:</label>
            <ul className={styles.userList} tabIndex={1} onKeyDown={props.onKey}>
                {
                    props.userListState.users.length === 0 ?
                        <li className={styles.noUsers}>No users online</li> :
                        props.userListState.users.map((user, i) => (<li key={user.name} className={`${styles.userListItem} ${i === props.userListState.selected ? styles.selected : ''}`}
                            onClick={() => props.onClick(i)}
                        >{user.name}</li>))
                }
            </ul>
        </div>
    )
}

type ChatLineType = 'error' | 'hint' | 'msg';

interface ChatLine {
    className: string;
    text: string;
}

interface ChatLinesProps {
    lines: ChatLine[];
}

const ChatLines = forwardRef(function ChatLines(props: ChatLinesProps, ref: ForwardedRef<HTMLDivElement>) {
    return (
        <div className={styles.chatLinesBorder}>
            <div ref={ref} className={styles.chatLines}>
                {props.lines.map((line, i) =>
                    <p key={i} className={line.className}>{line.text}</p>)}
            </div>
        </div>
    )
})

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
        ownUser: null
    })

    const [loginName, setLoginName] = useState<string>('');

    const [userList, setUserList] = useState<UserListState>({
        users: [],
        selected: -1
    });

    const [chatInput, setChatInput] = useState<string>('');

    const [chatLines, setChatLines] = useState<ChatLine[]>(exampleLines());
    const [scrollDown, setScrollDown] = useState<boolean>(true);

    const loginInputRef = useRef<HTMLInputElement | null>(null);
    const chatLinesRef = useRef<HTMLDivElement | null>(null);
    const chatInputRef = useRef<HTMLInputElement | null>(null);

    function pushErrorLine(line: string) {
        setChatLines([...chatLines, {
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

    function onLogin() {
        fetch('/api/login', {
            method: 'POST',
            body: JSON.stringify({
                name: loginName
            })
        }).then(res => res.json()).then((loginRes: LoginResponse) => {
            console.log('loginRes', loginRes);
            if (loginRes.error != null) {
                alert('Error on login: ' + loginRes.error);
            } else {
                setLoginState({
                    ownUser: loginName
                })

                setChatLines(d => [
                    ...d,
                    {
                        className: styles.hintLine,
                        text: `Welcome, ${loginName}!`
                    }
                ])
                setScrollDown(true);
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

    function onLoginNameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            onLogin();
        }
    }

    function onChatSend() {
        // TODO send chatInput to server
        pushErrorLine('nyi onChatSend')
    }

    const onChatKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === 'Enter') {
            onChatSend();
        }
    }

    return (
        <>
            <header className={styles.header}>pr-webRTC - a demonstration of video/audio calls by Peter Reitinger inspired by the documention on WebRTC on MDN</header>
            <main className={styles.main}>
                <div className={styles.left}>
                    <UserList userListState={userList} onClick={onUserClick} onKey={onUserKey} />
                    <button className={styles.call} onClick={onCall}>Call {userList.selected === -1 ? '(nobody selected)' : userList.users[userList.selected].name}</button>
                </div>
                <div className={styles.right}>
                    <ChatLines ref={chatLinesRef} lines={chatLines} />
                    <input ref={chatInputRef} className={styles.chatTf} value={chatInput} onChange={(e) => { setChatInput(e.target.value); }} onKeyDown={onChatKeyDown} />
                    <button onClick={onChatSend}>Send</button>
                </div>
            </main>
            {
                loginState.ownUser == null &&
                <ModalDialog>
                    <EscapableFlexComp onCancel={onDlgCancel}>
                        <label>User</label>
                        <input ref={loginInputRef} value={loginName} onChange={(e) => {
                            setLoginName(e.target.value)
                        }} onKeyDown={(e) => onLoginNameKeyDown(e)} />
                        <button onClick={onLogin}>OK</button>
                    </EscapableFlexComp>
                </ModalDialog>

            }
        </>
    )
}
