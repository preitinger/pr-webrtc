'use client'

import { PropsWithChildren } from "react";

import styles from './ModalDialog.module.css'

export interface ModalDialogProps {
    header?: string
    onDeactivate?: () => void
}

export default function ModalDialogWithoutFocusTrap({ header, onDeactivate, children }: PropsWithChildren<ModalDialogProps>) {
    return (
        <div className={styles.outer}>
            <div className={styles.inner}>
                {header && <h1>{header}</h1>}
                {children}
            </div>
        </div>
    )
}
