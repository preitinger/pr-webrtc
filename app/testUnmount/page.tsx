'use client';

import { useEffect, useState } from "react"
import FixedAbortController from "../_lib/pr-client-utils/FixedAbortController";
import timeout from "../_lib/pr-timeout/pr-timeout";

export default function Page() {
    const [count, setCount] = useState<number>(0);

    useEffect(() => {
            const abortController = new FixedAbortController();
        const signal = abortController.signal;
        let c = 0;

        const interval = setInterval(() => {
            ++c;
            console.log('interval', c);
            setCount(d => d + 1);
        }, 200)

        return () => {
            abortController.abort();
            clearInterval(interval);
        }
    }, [])
    return (
        <div>
            {count}
        </div>
    )
}