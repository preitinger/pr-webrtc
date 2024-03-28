import { useCallback, useState } from "react"

export interface UseTestHookProps {
    name: string;
}

export default function useTestHook(props: UseTestHookProps): [number, (bla: number) => void] {
    console.log('useTestHook()');
    const [internState, setInternState] = useState<number>(0);
    function setSth2(bla: number) {
        setInternState(bla * 2);
    }

    const setSth = useCallback((bla: number) => {
        setInternState(bla * 2);
    }, []);

    return [
        internState,
        setSth
    ]
}