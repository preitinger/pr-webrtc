import { useCallback, useEffect, useState } from "react";

export type UseValueResult = [x: number, f: (x: number) => void]
export function useValue() {
    const [internValue, setInternValue] = useState<number>(0);

    const setValue = useCallback((x: number) => {
        setInternValue(x);
    }, [])

    const result: UseValueResult = [internValue, setValue];

    return result;
}

let renderCount = 0;

export function Compo() {
    const [value, setValue] = useValue();

    useEffect(() => {
        setValue(Date.now())
    }, [setValue]);

    console.log('renderCount', ++renderCount);

    return (
        <div>{value} </div>
    );
}