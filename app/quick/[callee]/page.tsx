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

        sessionStorage.setItem('callee', callee);
        router.push('/');
    }

    return (
        <div>
            <p className={styles.hint}>You could add a bookmark on your device for this site now in order to call {`"${callee}"`} quickly.</p>
            <p>Call {callee}</p>
            <button onClick={onCall}>Call now</button>
        </div>
    )
}