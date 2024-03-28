'use client';

import { useEffect, useRef } from "react";
import FixedAbortController from "../_lib/pr-client-utils/FixedAbortController";

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, ms);
    })
}

export default function Page() {
    const abortControllerRef = useRef<AbortController | null>(null);
    function getAbortController() {
        if (abortControllerRef.current == null) {
            throw new Error('abortControllerRef.current is null');
        }
        return abortControllerRef.current;
    }

    useEffect(() => {
        const abortController = abortControllerRef.current = new FixedAbortController();
        // workaround for jsdom because they f... do not make it to implement AbortController and AbortSignal correctly.
        abortController.signal.throwIfAborted = () => {
            if (abortController.signal.aborted) {
                throw new Error('thrown because aborted')
            }
        }
        console.log('abortControllerRef.current', abortControllerRef.current);
        console.log('signal', abortControllerRef.current.signal);
        console.log('typeof(...throwIfAborted)', typeof(abortControllerRef.current.signal.throwIfAborted));
        let effectStopped = false;

        async function testLoop(): Promise<void> {
            try {
                while (true) {
                    await sleep(5000);
                    if (effectStopped) {
                        console.log('returning because effect stopped');
                        return;
                    }
                    console.log('before throwIfAborted');
                    getAbortController().signal.throwIfAborted();
                    console.log('after throwIfAborted');
                }
            } catch(reason) {
                console.log('Caught', reason);
            }
        }

        testLoop();

        return () => {
            effectStopped = true;
            abortControllerRef.current = null;
        }
    }, [])

    function onAbort() {
        const abortController = abortControllerRef.current;
        if (abortController == null) throw new Error('cannot be null here');
        console.log('before abort()');
        abortController.abort();
        console.log('after abort()', abortController.signal.aborted);
    }

    return (
        <div>
            <button role='abort' onClick={onAbort}>Abort now</button>
        </div>
    )
}