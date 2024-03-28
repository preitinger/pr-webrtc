'use client';
import { testInstantiate } from "./testConnection"

export default function Page() {
    async function start() {
        try {
            await testInstantiate();
        } catch (reason) {
            console.error(reason);
        }
    }
    return (
        <div>
            <button onClick={start}>Start</button>
        </div>
    )
}