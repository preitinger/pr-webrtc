'use client';

import { Compo, useValue } from "../_lib/useTestHook2";

export default function Page() {
    const [value, setValue] = useValue();

    return (
        <Compo/>
    )
}