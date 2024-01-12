import { ForwardedRef, forwardRef } from "react";
import styles from './chat-client.module.css'

export interface ChatLine {
    className: string;
    text: string;
}

export interface ChatPanelProps {
    lines: ChatLine[];
    onScroll: () => void;
}

export const ChatPanel = forwardRef(
    function ChatPanel(props: ChatPanelProps, ref: ForwardedRef<HTMLDivElement>) {
        return (
            <div className={styles.chatLinesBorder}>
                <div
                    ref={ref}
                    className={styles.chatLines}
                    onScroll={(e => { props.onScroll(); })} >
                    {
                        props.lines.map((line, i) =>
                            <p key={i} className={line.className}>{line.text}</p>)
                    }
                </div>
            </div>
        )
    }
)
