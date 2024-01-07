import { PropsWithChildren } from 'react';
import EscapableComp from './EscapableComp';
import styles from './EscapableFlexComp.module.css'

export interface EscapableFlexProps {
    onCancel: () => void;
}
export default function EscapableFlexComp(props: PropsWithChildren<EscapableFlexProps>) {
    return (
        <EscapableComp className={styles.content} onCancel={props.onCancel}>
            {props.children}
        </EscapableComp>
    )
}