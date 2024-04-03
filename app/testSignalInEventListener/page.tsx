'use client';
import { useEffect, useRef, useState } from "react"
import FixedAbortController from "../_lib/pr-client-utils/FixedAbortController";

function someFunctionWithAlsoQuiteLongName(hugeMemory: number[]) {
    hugeMemory[hugeMemory.length - 1] = 42;
    console.log('hugeMemory.length', hugeMemory.length);
}

function createHandler(a: number[]) {
    console.log('creating handler with a.length', a.length);
    return function() {
        someFunctionWithAlsoQuiteLongName(a);
    }
}

export default function Page() {
    const abortControllerRef = useRef<AbortController | null>(null);

    const [result, setResult] = useState<string>('');
    const handlerRef = useRef<(() => void) | null>(null)

    useEffect(() => {
        console.log('start effect');
        abortControllerRef.current = new FixedAbortController();

        // const hugeMemory = new Array<number>(
        //     10000000
        //     // 1
        //     );

        // function handler() {
        //     console.log('handler');
        //     someFunctionWithAlsoQuiteLongName(hugeMemory);
        //     setResult(d => d + '; received abort event')

        // }
        // handlerRef.current = handler;
        // handlerRef.current = createHandler(new Array<number>(100000000));
        // handlerRef.current = createHandler(new Array<number>(1));
        // abortControllerRef.current.signal.addEventListener('abort', handlerRef.current, {
        //     // once: true
        //     // signal: abortControllerRef.current.signal
        // })

        return () => {
            abortControllerRef.current = null;
            console.log('stopped effect')
        }
    }, [])

    function addHandler() {
        if (abortControllerRef.current == null) throw new Error('abortControllerRef.current null');
        handlerRef.current = createHandler(new Array<number>(100000000));
        abortControllerRef.current.signal.addEventListener('abort', handlerRef.current);

    }

    function removeHandler() {
        if (handlerRef.current == null) return;
        if (abortControllerRef.current == null) return;
        console.log('removeHandler will remove event listener');
        abortControllerRef.current.signal.removeEventListener('abort', handlerRef.current);
        handlerRef.current = null;
    }

    function myTestWithALongerFunctionNameToFindIt() {
        if (abortControllerRef.current == null) return;
        setResult(d => d + '; on test aborted=' + abortControllerRef.current?.signal.aborted);
        abortControllerRef.current.abort();
    }
    return (
        <div>
            <button onClick={addHandler}>Add Handler</button>
            <button onClick={myTestWithALongerFunctionNameToFindIt}>Run Test</button>
            Result: [{result}]
            <button onClick={removeHandler}>Remove Handler</button>
        </div>
    )
}