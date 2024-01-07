'use client'

import { PropsWithChildren } from "react";

import styles from './ModalDialog.module.css'
import FocusTrap from "focus-trap-react";

export interface ModalDialogProps {
    header?: string
    onDeactivate?: () => void
}

export default function ModalDialog({ header, onDeactivate, children }: PropsWithChildren<ModalDialogProps>) {
    return (
        <FocusTrap active={true} focusTrapOptions={{
            onDeactivate: onDeactivate
        }}>
            <div className={styles.outer}>
                <div className={styles.inner}>
                    {header && <h1>{header}</h1>}
                    {children}
                </div>
            </div>
        </FocusTrap>
    )
}