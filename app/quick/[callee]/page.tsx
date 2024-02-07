'use client'

import { KeyboardEvent, useState } from 'react';
import styles from './page.module.css'
import ModalDialog from '@/components/ModalDialog';
import EscapableFlexComp from '@/components/EscapableFlexComp';
import { useRouter } from 'next/navigation';

export default function Page({ params }: { params: { callee: string } }) {
    const [authenticationDlg, setAuthenticationDlg] = useState<boolean>(false);
    const [loginName, setLoginName] = useState<string>('');
    const [loginPasswd, setLoginPasswd] = useState<string>('');
    const router = useRouter();
    const callee = decodeURIComponent(params.callee);

    function onCall() {

        // no, authentication will be done on the main page! Here just set an entry callee in the sessionStorage
        // which triggers the main page to call him if online

        // const user = localStorage.getItem('user') ?? '';
        // const passwd = localStorage.getItem('passwd') ?? '';

        // if (true || user === '' || passwd === '') {
        //     setAuthenticationDlg(true);
        // }

        sessionStorage.setItem('callee', callee);
        router.push('/');
    }

    function onLoginKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            onLogin();
        }
    }

    function onLogin() {
        localStorage.setItem('user', loginName);
        localStorage.setItem('passwd', loginPasswd)
    }

    function onDlgCancel() {
        setAuthenticationDlg(false);
    }

    return (
        <div>
            <p className={styles.hint}>You could add a bookmark on your device for this site now in order to call {`"${callee}"`} quickly.</p>
            <p>Call {callee}</p>
            <button onClick={onCall}>Call now</button>
            {
                authenticationDlg &&
                <ModalDialog key='authenticationDlg' >
                    <EscapableFlexComp onCancel={onDlgCancel}>
                        <h2>Login (already registered)</h2>
                        <label>User</label>
                        <input value={loginName} onChange={(e) => {
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
        </div>
    )
}