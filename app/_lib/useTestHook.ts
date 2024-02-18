import { useState } from "react"

export interface UseTestHookProps {
    name: string;
}

export default function useTestHook(props: UseTestHookProps): [number, (bla: number) => void] {
    console.log('useTestHook()');
    const [internState, setInternState] = useState<number>(0);
    function setSth(bla: number) {
        setInternState(bla * 2);
    }

    return [
        internState,
        setSth
    ]
}