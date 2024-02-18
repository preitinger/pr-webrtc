'use client';

import { useState } from "react"
import styles from './page.module.css';
import useTardyFlag, { UseTardyTimeoutDelayMap, UseTardyTimeoutKey } from "../_lib/pr-client-utils/useTardyFlag";


export default function Page() {
    console.log('render testTardyFlag');
    const [msSetToVisible, setMsSetToVisible] = useState<string>('');
    const [msMinVisible, setMsMinVisible] = useState<string>('');
    const [msUnsetToInvisible, setMsUnsetToInvisible] = useState<string>('');
    const [msMinInvisible, setMsMinInvisible] = useState<string>('');

    function createTimeoutDelays(): UseTardyTimeoutDelayMap {
        const m = new Map<UseTardyTimeoutKey, number>();
        m.set('setToVisible', Number.parseInt(msSetToVisible));
        m.set('minVisible', Number.parseInt(msMinVisible));
        m.set('unsetToInvisible', Number.parseInt(msUnsetToInvisible));
        m.set('minInvisible', Number.parseInt(msMinInvisible));

        return m;
    }

    const [tardyFlag, set] = useTardyFlag({
        initialValue: false,
        // timeoutDelays: createTimeoutDelays()
        timeoutDelays: {
            setToVisible: Number.parseInt(msSetToVisible),
            minVisible: Number.parseInt(msMinVisible),
            unsetToInvisible: Number.parseInt(msUnsetToInvisible),
            minInvisible: Number.parseInt(msMinInvisible)
        }
    })
    const [shownState, setShownState] = useState<string>('');
    return (
        <div>
            <h3>Timeout delays</h3>
            <table>
                <tbody>
                    <tr>
                        <th>setToVisible</th>
                        <td><input value={msSetToVisible} onChange={(e) => setMsSetToVisible(e.target.value)} /></td>
                    </tr>
                    <tr>
                        <th>minVisible</th>
                        <td><input value={msMinVisible} onChange={(e) => setMsMinVisible(e.target.value)} /></td>
                    </tr>
                    <tr>
                        <th>unsetToInvisible</th>
                        <td><input value={msUnsetToInvisible} onChange={(e) => setMsUnsetToInvisible(e.target.value)} /></td>
                    </tr>
                    <tr>
                        <th>minInvisible</th>
                        <td><input value={msMinInvisible} onChange={(e) => setMsMinInvisible(e.target.value)} /></td>
                    </tr>
                </tbody>
            </table>
            <button className={styles.button} onClick={() => tardyFlag.set(true)}>Set</button>
            <button className={styles.button} onClick={() => tardyFlag.set(false)}>Unset</button>
            <h3>Flag</h3>
            {tardyFlag.value ? 'True' : 'False'}
            <h3>Intern state</h3>
            <p>
                {shownState}
            </p>
            <button onClick={() => {
                setShownState(tardyFlag.debugResults().internState)
            }}>Show intern state</button>
        </div>
    )
}