'use client';

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page(props: { params: { caller: string; callee: string } }) {
    const caller = props.params.caller;
    const callee = props.params.callee;
    const router = useRouter();

    useEffect(() => {
        sessionStorage.accept = caller;
        router.replace('/');
    }, [router, caller, callee])
    return (
        <p>
            Processing call from {props.params.caller} to {props.params.callee} ...
        </p>
    )
}