'use client';

import { useEffect, useRef, useState } from "react";
import { SaveSubscriptionReq, SaveSubscriptionResp, SendTestMsgReq } from "../_lib/testPushAPI";
import { apiFetchPost } from "../_lib/user-management-client/apiRoutesClient";

const check = () => {
    if (!('serviceWorker' in navigator)) {
        throw new Error('No Service Worker support!')
    }
    if (!('PushManager' in window)) {
        throw new Error('No Push API Support!')
    }
}

function askPermission() {
    return new Promise(function (resolve, reject) {
        const permissionResult = Notification.requestPermission(function (result) {
            resolve(result);
        });

        if (permissionResult) {
            permissionResult.then(resolve, reject);
        }
    }).then(function (permissionResult) {
        if (permissionResult !== 'granted') {
            throw new Error("We weren't granted permission.");
        }
    });
}

const subscriptionOptions = {
    userVisibleOnly: true,
    applicationServerKey: "BPz5hyoDeI73Jgu6-rxgQmz2-WMQnDh4vMGszZO8-fBWPo0UV9yJsWYScxJqRMJpxAS1WxnvDoescRPeaPM6VGs"
};

export default function Page() {
    const [ringing, setRinging] = useState<boolean>(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (audioRef.current != null) {
            if (ringing) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
            } else {
                audioRef.current.pause();
            }
        }
    }, [ringing])

    return (
        <div>
            <button onClick={() => {
                askPermission().then(perm => {
                    console.log('perm', perm);
                })
            }}>Notification permission</button>
            <button onClick={() => {
                check();
            }}>check if serviceWorker available</button>
            <button onClick={() => {
                navigator.serviceWorker.onmessage = e => {
                    setRinging(true);
                    // alert('msg from service worker with data: ' + JSON.stringify(e.data));
                }
                navigator.serviceWorker.getRegistrations().then(regs => {
                    const promises: Promise<boolean>[] = [];
                    for (const reg of regs) {
                        promises.push(reg.unregister())
                    }
                    Promise.allSettled(promises).then((res) => {
                        console.log('unregister results: ', res.length);
                        for (const r of res) {
                            console.log(r.status);
                        }
                    }).then(() => {
                        console.log('before register /sw.js');
                        navigator.serviceWorker.register('/sw.js')
                            .then(registration => {
                                console.log('in then')
                                registration.pushManager.getSubscription().then(gotSub => {
                                    console.log('gotSub', gotSub);
                                    if (registration.installing) {
                                        console.log('Service worker installing');
                                    } else if (registration.waiting) {
                                        console.log('Service worker installed');
                                    } else if (registration.active) {
                                        console.log('Service worker active');
                                        if (registration.active) {
                                            registration.active.onstatechange = (e) => {
                                                console.log('onstatechange: e', e);
                                            }

                                        }
                                    }
                                    // TODO add applicationServerKey to subscribe options as described in 
                                    registration.pushManager.permissionState(subscriptionOptions).then(permState => {
                                        switch (permState) {
                                            case 'denied':
                                                alert('Push messages are denied!');
                                                break;
                                            case 'prompt':
                                                alert('Push messages prompting?!');
                                                break;
                                            case 'granted':
                                                console.log('push messages are granted');
                                                registration.pushManager.subscribe(subscriptionOptions).then(pushSubscription => {
                                                    console.log('endpoint', pushSubscription.endpoint);
                                                    if (confirm(`Send endpoint "${pushSubscription.endpoint}" to the server?`)) {
                                                        const req: SaveSubscriptionReq = {
                                                            stringifiedSubscription: JSON.stringify(pushSubscription)
                                                        }
                                                        apiFetchPost<SaveSubscriptionReq, SaveSubscriptionResp>('/api/testPushAPI/save-subscription', req).then(resp => {
                                                            console.log('resp', resp);
                                                        })
                                                    } else {
                                                        pushSubscription.unsubscribe().then(val => {
                                                            console.log('result of unsubscribe', val);
                                                        })
                                                    }
                                                }).catch(reason => {
                                                    console.error('caught', reason);
                                                })
                                                break;
                                        }

                                    })
                                })
                            }).catch(reason => {
                                console.error('caught', reason);
                            })
                        // navigator.serviceWorker.ready.then(reg => {
                        //     console.log('serviceWorker.ready fulfilled');
                        //     console.log('reg.active', reg.active);
                        //     const origin = window.origin;
                        //     console.log('origin', origin);
                        //     reg.active?.postMessage({
                        //         targetOrigin: window.origin
                        //     })
                        // })
                        // console.log('navigator.serviceWorker.ready.then called');

                    })
                })

            }}>Test Register for Push Notifications (and send subscription to the application server)</button>

            <button onClick={() => {
                alert('Gonna trigger a push msg in 1 secs ...');
                setTimeout(() => {
                    const req: SendTestMsgReq = {
                        text: 'bla text'
                    }
                    apiFetchPost('/api/testPushAPI/send-test-msg', req).then(resp => {
                        console.log('resp', resp);
                        // ok ich arbeite und bla bla bla ddd tippe flei-
                    }).catch(reason => {
                        console.error(reason);
                    });

                }, 1000)
            }}>Send Test Msg</button>

            <button onClick={() => {
                setRinging(false);
            }}>Stop ringing</button>
            <audio ref={audioRef} preload="auto" controls={false} src="/ring.mp3" typeof="audio/mpeg" onEnded={() => {
                if (ringing) {
                    audioRef.current?.play();
                }
            }} />

        </div>
    )
}