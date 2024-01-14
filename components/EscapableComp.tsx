'use client'

import { KeyboardEventHandler, PropsWithChildren } from "react";

export interface EscapableProps {
    onCancel: () => void;
    className: string;
}

export default function EscapableComp(props: PropsWithChildren<EscapableProps>): React.ReactElement<EscapableProps> {

    const onKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
        if (e.key === 'Escape') {
            props.onCancel();
            e.stopPropagation();
            e.preventDefault();
        }
    }
    return (
        <div className={props.className} onKeyDown={onKeyDown}>
            {props.children}
        </div>
    )
}