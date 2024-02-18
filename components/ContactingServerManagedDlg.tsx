import { useEffect, useState } from "react";
import EventBus from "@/app/_lib/EventBus";
import { getEventBus } from "@/app/useEventBus";
import ContactingServerEvent, { CONTACTING_SERVER_EVENT_BUS_KEY } from "@/app/_lib/ContactingServerEvent";

import styles from './ContactingServerManagedDlg.module.css'
import ModalDialogWithoutFocusTrap from "./ModalDialogWithoutFocusTrap";
import timeout, { timeoutWithResult } from "@/app/_lib/pr-timeout/pr-timeout";
import FixedAbortController from "@/app/_lib/user-management-client/FixedAbortController";
import useTardyFlag from "@/app/_lib/pr-client-utils/useTardyFlag";

export interface ContactingServerManagedDlgProps {
    eventBusKey: string
}

export default function ContactingServerManagedDlg(props: ContactingServerManagedDlgProps) {
    // const [dialogVisible, setDialogVisible] = useState<boolean>(false);
    const [tardyDialogVisible, setDialogVisible] = useTardyFlag({
        initialValue: false,
        timeoutDelays: {
            setToVisible: 300,
            minVisible: 400,
            minInvisible: 0,
            unsetToInvisible: 0
        }
    })


    useEffect(() => {
        console.log('contacting server effect')
        function set(contacting: boolean) {
            console.log('set', contacting);
            setDialogVisible(contacting);
        }
        const eventBus = getEventBus<ContactingServerEvent>(CONTACTING_SERVER_EVENT_BUS_KEY);
        const subscr = eventBus.subscribe();
        const abortController = new FixedAbortController();
        const signal = abortController.signal;

        // function set(contacting: boolean) {
        //     tardyDialogVisible.set(contacting);
        // }

        async function doTheThings(): Promise<void> {
            try {
                while (!signal.aborted) {
                    await subscr.nextEventWith(e => e.contactingServer);
                    set(true);
                    await subscr.nextEventWith(e => !e.contactingServer);
                    set(false);
                }

            } catch (reason) {
                if (signal.aborted) return;
                console.error('caught in doTheThings', reason);
            }
        }

        doTheThings();

        return () => {
            console.log('aborting contacting server effect');
            abortController.abort();
            subscr.unsubscribe();
        }
    }, [/* setDialogVisible */]) // eslint-disable-line

    // old effect:
    // useEffect(() => {
    //     let aborted = false;
    //     const subscription = eventBus.subscribe();

    //     function handleEvent(e: ContactingServerEvent) {
    //         setDialogVisible(e.contactingServer);
    //         if (!aborted) {
    //             subscription.nextEvent().then(handleEvent).catch(reason => {
    //                 console.warn('caught', reason);
    //             })
    //         }
    //     }
    //     subscription.nextEvent().then(handleEvent).catch(reason => {
    //         if (aborted) return;
    //         console.warn('caught', reason);
    //     });
    //     return () => {
    //         try {
    //             subscription.unsubscribe();
    //         } catch (reason) {
    //             if (aborted) return;
    //             console.error('caught during unsubscribe', reason);
    //         }
    //         aborted = true;
    //     }
    // }, [eventBus])

    return (
        <>
            {
                tardyDialogVisible.value &&
                <ModalDialogWithoutFocusTrap >
                    <p>Contacting server ...</p>
                </ModalDialogWithoutFocusTrap>
            }
        </>
    )
}