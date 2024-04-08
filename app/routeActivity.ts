import * as rt from "runtypes"
import { Literal, Null, Record, Static, String, Union } from "runtypes";
import EventBus, { waitForGuard, waitForOneOf } from "./_lib/EventBus";
import { getEventBus } from "./useEventBus";
import { RuntypeBase } from "runtypes/lib/runtype";
import assert from "assert";
import { AccumulatedFetching } from "./_lib/user-management-client/AccumulatedFetching";
import { LoginReq, LoginResp } from "./_lib/chat/login-common";
import { fireEvent } from "@testing-library/react";
import { RegisterReq } from "./_lib/user-management-client/user-management-common/register";
import { userLogoutFetch, userRegisterFetch } from "./_lib/user-management-client/userManagementClient";
import { LoginResultData } from "./_lib/chat/chat-client";
import { StartPage, LoginClicked, RegisterClicked, RegisterDlg, LoginOrRegisterOk, CancelClicked, Busy, LoginDlg, FetchError, TryAgainClicked, ChatStart, CallStarted, CallStopped, LogoutClicked, AuthFailed, WaitForPushClicked, SetCallActive, ChatAddErrorLine, ChatStop, FetchingSetInterrupted, SetupPushDlg, AuthFailedDlg, CloseClicked, UseHereClicked, OkClicked, SetFetchErrorState, RegularPage, AwaitPushDlg, CallClicked, DecideIfWithVideoDlg, SendVideoChanged, DecideIfWithVideoProps, ModalDlg, LocalMediaStream, HandlingFetchError, FetchingInterruptedRecursive } from "./busEvents";
import FixedAbortController from "./_lib/pr-client-utils/FixedAbortController";
import { ApiResp } from "./_lib/user-management-client/user-management-common/apiRoutesCommon";
import { LogoutReq, LogoutResp } from "./_lib/chat/logout-common";
import chainedAbortController from "./_lib/pr-client-utils/chainedAbortController";
import { AuthenticatedVideoReq } from "./_lib/video/video-common-old";
import { PushSubscribeReq, PushSubscribeResp } from "./_lib/video/video-common";
import { deprecate } from "util";
import { MsgClient } from "./_lib/pr-msg-client/pr-msg-client";
import { MsgReq, MsgResp } from "./_lib/pr-msg-common/pr-msg-common";
import regularFunctions from "./regularFunctionsActivity";
import * as localStorageAccess from './localStorageAccess'

const VIEW_TEST = false;

/**
 * @deprecated
 */
function nyi(): never {
    throw new Error("nyi");
}

const subscriptionOptions = {
    userVisibleOnly: true,
    applicationServerKey: "BPz5hyoDeI73Jgu6-rxgQmz2-WMQnDh4vMGszZO8-fBWPo0UV9yJsWYScxJqRMJpxAS1WxnvDoescRPeaPM6VGs"
};

// function sleep(ms: number) {
//     return new Promise<void>(res => {
//         setTimeout(() => {
//             res();
//         }, ms)
//     })
// }

function abortableSleep(ms: number, signal: AbortSignal) {
    type EventListener = () => void;
    const eventListeners: EventListener[] = [];
    function addEventListener(l: EventListener) {
        eventListeners.push(l);
        signal.addEventListener('abort', l);
        // console.log('addedEventListener in abortableSleep');
        return l;
    }
    return new Promise<void>((res, rej) => {
        signal.throwIfAborted();
        const to = setTimeout(() => {
            res();
        }, ms)
        addEventListener(() => {
            clearTimeout(to);
            rej(signal.reason);
        })
    }).finally(() => {
        for (const l of eventListeners) {
            signal.removeEventListener('abort', l);
            // console.log('removedEventListener in abortableSleep')
        }
    })
}

let testCount = 0;


export default async function routeActivity(chatId: string, routeActivitySignal: AbortSignal, eventBusKey: string, accumulatedFetching: AccumulatedFetching) {
    const myCount = testCount++;

    const eventBus = getEventBus(eventBusKey);
    // const abortPromise = new Promise<never>((res, rej) => {
    //     signal.addEventListener('abort', () => {
    //         rej(signal.reason);
    //     }, {
    //         once: true
    //     })
    // })

    function fireEvent<T = any>(e: T) {
        eventBus.publish(e);
    }
    // const waitFor = <T>(guard: RuntypeBase<T>): Promise<Static<typeof guard>> => {
    //     return Promise.race([abortPromise, waitForGuard({bus: eventBus}, guard)]);
    // }

    let user: string | null = sessionStorage.user ?? null;
    let passwd: string | null = sessionStorage.passwd ?? null;
    let token: string | null = null;

    async function authenticatedVideoReq<Req, Resp>(req: Req, signal: AbortSignal): Promise<ApiResp<Resp>> {
        assert(user != null);
        assert(token != null);

        const authReq: AuthenticatedVideoReq<Req> = {
            type: 'authenticatedVideoReq',
            ownUser: user,
            req: req,
            sessionToken: token
        }
        return await accumulatedFetching.push<AuthenticatedVideoReq<Req>, Resp>(authReq, signal);
    }

    async function startPage(signal: AbortSignal) {
        // console.error('just stacktrace');
        fireEvent<StartPage>({
            type: 'StartPage',
            props: {}
        })
        // console.log('before wait for LoginClicked or RegisterClicked')
        const startPageRes = await waitForGuard({ bus: eventBus }, Union(LoginClicked, RegisterClicked), signal);

        // console.log('after wait for LoginClicked or RegisterClicked', startPageRes)
        fireEvent<StartPage>({
            type: 'StartPage',
            props: null
        })

        switch (startPageRes.type) {
            case 'LoginClicked':
                const res = await loginDlg(user ?? '', passwd ?? '', '', signal);
                if (res.type === 'CancelClicked') {
                    // start page
                    return;
                }

                user = res.user;
                passwd = res.passwd;

                await loginLoop(signal)
                break;
            case 'RegisterClicked':
                await registerLoop(signal);
                break;
            default: throw new Error('wtf');
        }

    }

    async function registerLoop(signal: AbortSignal) {
        let error = null;

        while (true) {
            const dlgResp = await registerDlg(user ?? '', passwd ?? '', error, signal);
            switch (dlgResp.type) {
                case 'LoginOrRegisterOk':
                    user = dlgResp.user;
                    passwd = dlgResp.passwd;
                    const requestResp = await registerRequest(user, passwd, signal);
                    error = requestResp.error;
                    if (error == null) {
                        const res = await loginDlg(user, passwd, error, signal);
                        if (res.type === 'CancelClicked') {
                            // start page
                            return;
                        }

                        user = res.user;
                        passwd = res.passwd;

                        await loginLoop(signal);
                        // start page
                        return;
                    }
                    break;
                case 'CancelClicked':
                    // start page
                    return;
            }
        }
    }

    async function registerDlg(user: string, passwd: string, error: string | null, signal: AbortSignal) {
        fireEvent<RegisterDlg>({
            type: 'RegisterDlg',
            props: {
                user: user,
                passwd: passwd,
                error: error
            }
        })
        const res = (await waitForGuard({ bus: eventBus }, Union(LoginOrRegisterOk, CancelClicked), signal));

        fireEvent<RegisterDlg>({
            type: 'RegisterDlg',
            props: null
        })
        return res;
    }

    async function registerRequest(user: string, passwd: string, signal: AbortSignal): Promise<{ error: string | null }> {
        fireEvent<Busy>({
            type: 'Busy',
            comment: 'Registering at the server ...'
        })

        try {
            const req: RegisterReq = {
                user: user,
                passwd: passwd
            }
            try {
                const resp = await userRegisterFetch(req, signal);
                switch (resp.type) {
                    case 'error':
                        return { error: resp.error };
                        break;
                    case 'nameNotAvailable':
                        return { error: (`User name ${user} not available.`) };
                        break;
                    case 'success':
                        alert('Registration successful.')
                        return { error: null }
                    default:
                        // never
                        throw new Error('Never here?!');
                }
            } catch (reason) {
                if (reason instanceof Error) {
                    if (reason.message === 'Failed to fetch') {
                        return { error: 'No internet connection.' }
                    } else {
                        return { error: `Unknown server error(${reason.name}): ${reason.message}` }
                    }
                } else {
                    console.warn('Caught unknown in apiFetchPost', reason);
                    return { error: 'Caught unknown in apiFetchPost: ' + JSON.stringify(reason) };
                }
            }
        } finally {
            fireEvent<Busy>({
                type: 'Busy',
                comment: null
            })
        }
    }

    async function loginLoop(signal: AbortSignal) {
        let error: string | null = null;
        while (true) {

            if (user == null || passwd == null) throw new Error('user or passwd null');
            const requestResp = await loginRequest1(user, passwd, signal).then(resp => {
                // console.log('abortFetchErrorHandling aborted');
                return resp;
            })

            // const requestResp = await loginRequestCatchingFetchError(user, passwd, signal);
            // console.log('requestResp', requestResp)
            switch (requestResp.type) {
                case 'success':
                    const loginResultData: LoginResultData = {
                        user,
                        sessionKey: requestResp.token,
                        initialUsers: requestResp.users,
                        eventIdForUsers: requestResp.eventIdForUsers
                    }
                    localStorage.user = user;
                    localStorage.passwd = passwd;
                    sessionStorage.user = user;
                    sessionStorage.passwd = passwd;
                    token = requestResp.token;
                    const authenticatedActionsRes = await authenticatedActions(loginResultData, signal);
                    switch (authenticatedActionsRes) {
                        case 'startPage':
                            return;
                        case 'login': {
                            const res = await loginDlg(user ?? '', passwd ?? '', '', signal);
                            if (res.type === 'CancelClicked') {
                                // start page
                                return;
                            }

                            user = res.user;
                            passwd = res.passwd;

                            // continue loop
                            break;
                        }
                    }
                    break;
                case 'authenticationFailed': {
                    error = 'Wrong user or password!';
                    const loginDlgRes = await loginDlg(user, passwd, error, signal);
                    switch (loginDlgRes.type) {
                        case 'LoginOrRegisterOk':
                            user = loginDlgRes.user;
                            passwd = loginDlgRes.passwd;
                            error = null;
                            // continue this loop
                            break;
                        case 'CancelClicked':
                            // stop this loop which leads to start page
                            return;
                    }
                    break;
                }
                case 'error':
                    error = `Server problem: ${requestResp.error}`
                    const loginDlgRes = await loginDlg(user, passwd, error, signal);
                    switch (loginDlgRes.type) {
                        case 'LoginOrRegisterOk':
                            user = loginDlgRes.user;
                            passwd = loginDlgRes.passwd;
                            error = null;
                            // continue this loop
                            break;
                        case 'CancelClicked':
                            // stop this loop which leads to start page
                            return;
                    }
                    break;
            }
        }
    }

    async function loginDlg(user: string, passwd: string, error: string | null, signal: AbortSignal) {
        // console.error('just stacktrace');
        fireEvent<LoginDlg>({
            type: 'LoginDlg',
            props: {
                user: user,
                passwd: passwd,
                error: error
            }
        })
        // console.log('after publish(loginDlg)', user, passwd);
        const res = (await waitForGuard({ bus: eventBus }, Union(LoginOrRegisterOk, CancelClicked), signal))
        fireEvent<LoginDlg>({
            type: 'LoginDlg',
            props: null
        })
        return res;
    }

    // async function loginRequestCatchingFetchError(user: string, passwd: string, signal: AbortSignal) {
    //     const abortFetchErrorHandling = chainedAbortController(signal);
    //     try {
    //         let requestDone = false;
    //         const requestProm = loginRequest1(user, passwd, signal).then(resp => {
    //             abortFetchErrorHandling[0].abort();
    //             console.log('abortFetchErrorHandling aborted');
    //             return resp;
    //         })

    //         try {
    //             while (!abortFetchErrorHandling[0].signal.aborted) {
    //                 {
    //                     console.log('before FetchError');
    //                     const e = await waitForGuard({ bus: eventBus }, FetchError, abortFetchErrorHandling[0].signal);
    //                     console.log('after FetchError');
    //                     fireEvent<ShowFetchErrorDuringLogin>({
    //                         type: 'ShowFetchErrorDuringLogin',
    //                         error: e.error
    //                     })
    //                 }
    //                 console.log('before TryAgainClicked');
    //                 await waitForGuard({ bus: eventBus }, TryAgainClicked, abortFetchErrorHandling[0].signal);
    //                 accumulatedFetching.setInterrupted(false);
    //                 fireEvent<ShowFetchErrorDuringLogin>({
    //                     type: 'ShowFetchErrorDuringLogin',
    //                     error: null
    //                 })

    //             }
    //         } catch (reason: any) {
    //             if (reason.name !== 'AbortError') {
    //                 console.error(reason);
    //             } else {
    //                 console.log('ignore', reason);
    //             }
    //         }

    //         console.log('before return await requestProm');
    //         return await requestProm;

    //     } finally {
    //         abortFetchErrorHandling[1]();
    //     }
    // }

    async function loginRequest1(user: string, passwd: string, signal: AbortSignal) {
        fireEvent<Busy>({
            type: 'Busy',
            comment: 'Login at the server ...'
        })
        const resp = await accumulatedFetching.push<LoginReq, LoginResp>({
            type: 'login',
            chatId: chatId,
            user: user,
            passwd: passwd
        }, signal)
        // console.log('login resp', resp);
        fireEvent<Busy>({
            type: 'Busy',
            comment: null
        })
        return resp;
    }

    async function authenticatedActions(loginResultData: LoginResultData, outerSignal: AbortSignal): Promise<'startPage' | 'login'> {
        assert(user != null);
        assert(token != null);
        fireEvent<ChatStart>({
            type: 'ChatStart',
            loginResultData
        })
        const sendVideo = localStorageAccess.videoConfig.send.get(user)
        const receiveVideo = localStorageAccess.videoConfig.receive.get(user)
        const fitToDisplay = localStorageAccess.fitToDisplay.get(user)
        fireEvent<RegularPage>({
            type: 'RegularPage',
            props: {
                sendVideo: sendVideo,
                receiveVideo: receiveVideo,
                fitToDisplay: fitToDisplay
            }
        })

        const regRes = await regularFunctions(eventBusKey, accumulatedFetching, user, token, outerSignal)
        fireEvent<RegularPage>({
            type: 'RegularPage',
            props: null
        })
        fireEvent<ChatStop>({
            type: 'ChatStop',
        })

        switch (regRes.type) {

            case 'LogoutClicked': {
                const logoutRes = await logoutRequest(user, token, outerSignal);
                switch (logoutRes.type) {
                    case 'success':
                        return 'startPage';

                    case 'error':
                        fireEvent<ModalDlg>({
                            type: 'ModalDlg',
                            msg: `Error: ${logoutRes.error}`
                        })
                        await waitForGuard({ bus: eventBus }, OkClicked, outerSignal);
                        return 'startPage';
                }
                break;
            }

            case 'AuthFailed': {
                return await authFailedDlg(outerSignal);
                break;
            }
        }


        // TODO

        await abortableSleep(4000, outerSignal)
        return 'login';

        // old outdated implementation:
        // const abortController = chainedAbortController(outerSignal);
        // const signal = abortController.signal;

        // fireEvent<ChatStart>({
        //     type: 'ChatStart',
        //     loginResultData: loginResultData
        // })
        // fireEvent<RegularPage>({
        //     type: 'RegularPage',
        //     props: {}
        // })

        // while (true) {
        //     signal.throwIfAborted();

        //     // const res = await regularFunctions(signal);
        //     assert(user != null);
        //     assert(token != null);
        //     const res = await regularFunctions(eventBusKey, accumulatedFetching, user, token, signal);

        //     switch (res.type) {

        //         // case 'FetchError':

        //         //     fireEvent<ChatAddErrorLine>({
        //         //         type: 'ChatAddErrorLine',
        //         //         error: res.error
        //         //     })
        //         //     fireEvent<SetFetchErrorState>({
        //         //         type: 'SetFetchErrorState',
        //         //         state: true
        //         //     })
        //         //     await waitForGuard({bus: eventBus}, TryAgainClicked, signal);
        //         //     fireEvent<SetFetchErrorState>({
        //         //         type: 'SetFetchErrorState',
        //         //         state: false
        //         //     })
        //         //     fireEvent<FetchingSetInterrupted>({
        //         //         type: 'FetchingSetInterrupted',
        //         //         interrupted: false
        //         //     })

        //         //     break;

        //         case 'LogoutClicked': {
        //             fireEvent<RegularPage>({
        //                 type: 'RegularPage',
        //                 props: null
        //             })

        //             const res = await logoutRequest(loginResultData.user, loginResultData.sessionKey, signal);
        //             switch (res.type) {
        //                 case 'success':
        //                     fireEvent<ChatStop>({
        //                         type: 'ChatStop',
        //                     })
        //                     return 'startPage';
        //                 case 'error':
        //                     fireEvent<RegularPage>({
        //                         type: 'RegularPage',
        //                         props: {}
        //                     })
        //                     fireEvent<ChatAddErrorLine>({
        //                         type: 'ChatAddErrorLine',
        //                         error: res.error
        //                     })
        //                     break;
        //             }
        //             break;
        //         }

        //         case 'AuthFailed': {
        //             fireEvent<RegularPage>({
        //                 type: 'RegularPage',
        //                 props: null
        //             })
        //             const res = await authFailedDlg(signal);
        //             // Cleaner to call this even though current implementation of useChat does not need this:
        //             fireEvent<ChatStop>({
        //                 type: 'ChatStop',
        //             })
        //             return res;
        //         }

        //         // case 'WaitForPushClicked': {
        //         //     fireEvent<RegularPage>({
        //         //         type: 'RegularPage',
        //         //         props: null
        //         //     })

        //         //     const res = await setupPushNotifications(signal)
        //         //     switch (res) {
        //         //         case 'success': {
        //         //             fireEvent<FetchingSetInterrupted>({
        //         //                 type: 'FetchingSetInterrupted',
        //         //                 interrupted: true
        //         //             })
        //         //             await awaitPushDlg(signal)
        //         //             // TODO maybe better release push subscription here?
        //         //             fireEvent<FetchingSetInterrupted>({
        //         //                 type: 'FetchingSetInterrupted',
        //         //                 interrupted: false
        //         //             })
        //         //             fireEvent<RegularPage>({
        //         //                 type: 'RegularPage',
        //         //                 props: {}
        //         //             })
        //         //             break;
        //         //         }
        //         //         default:
        //         //             break;
        //         //     }
        //         //     fireEvent<RegularPage>({
        //         //         type: 'RegularPage',
        //         //         props: {}
        //         //     })

        //         //     break;
        //         // }
        //     }
        // }


        // // muss teilweise in neue funktion regularFunctions:
        // // const abortAuthenticatedActions = chainedAbortController(signal)
        // // // shall abort also on signal for the whole routeActivity
        // // signal
        // // fireEvent<ChatStart>({
        // //     type: 'ChatStart',
        // //     loginResultData: loginResultData
        // // })

        // // try {
        // //     while (true) {
        // //         abortAuthenticatedActions.signal.throwIfAborted();
        // //         const e = await waitForGuard({bus: eventBus}, rt.Union(CallStarted, CallStopped, LogoutClicked, AuthFailed, WaitForPushClicked), abortAuthenticatedActions.signal);
        // //         switch (e.type) {
        // //             case 'CallStarted':
        // //                 fireEvent<SetChatSmall>({
        // //                     type: 'SetChatSmall',
        // //                     small: true
        // //                 })
        // //                 break;
        // //             case 'CallStopped':
        // //                 fireEvent<SetChatSmall>({
        // //                     type: 'SetChatSmall',
        // //                     small: false
        // //                 })
        // //                 break;
        // //             case 'LogoutClicked':
        // //                 try {
        // //                     const logoutResp = await accumulatedFetching.push<LogoutReq, LogoutResp>({
        // //                         type: "logout",
        // //                         chatId: chatId,
        // //                         token: loginResultData.sessionKey,
        // //                         user: loginResultData.user,
        // //                     }, abortAuthenticatedActions.signal)
        // //                     switch (logoutResp.type) {
        // //                         case 'success':
        // //                         await mergeStop(abortAuthenticatedActions);
        // //                         return;

        // //                         case 'error':
        // //                             fireEvent<ChatAddErrorLine>({
        // //                                 type: 'ChatAddErrorLine',
        // //                                 error: logoutResp.error
        // //                             })
        // //                             break;
        // //                     }
        // //                 } catch (reason: any) {
        // //                     fireEvent<ChatAddErrorLine>({
        // //                         type: 'ChatAddErrorLine',
        // //                         error: JSON.stringify(reason)
        // //                     })

        // //                 }
        // //                 break;
        // //             case 'AuthFailed':
        // //                 alert('You seem to have logged in using another device and are now logged out here.');
        // //                 await mergeStop(abortAuthenticatedActions);
        // //                 return;

        // //             case 'WaitForPushClicked':
        // //                 fireEvent<ConfirmPushDlg>({
        // //                     type: 'ConfirmPushDlg',
        // //                 })
        // //                 const e = await waitForGuard({bus: eventBus}, okclick , signal);


        // //                 break;
        // //         }

        // //     }

        // // } catch (reason: any) {
        // //     if (reason.name !== 'AbortError') {
        // //         console.error(reason);
        // //     }
        // // }

    }

    async function authFailedDlg(signal: AbortSignal): Promise<'startPage' | 'login'> {
        fireEvent<AuthFailedDlg>({
            type: 'AuthFailedDlg',
            props: {}
        })

        const e = await waitForGuard({ bus: eventBus }, rt.Union(CloseClicked, UseHereClicked), signal);
        fireEvent<AuthFailedDlg>({
            type: 'AuthFailedDlg',
            props: null
        })


        switch (e.type) {
            case 'CloseClicked':
                return 'startPage';
            case 'UseHereClicked':
                return 'login';
            default:
                assert(false);
        }
    }

    // /**
    //  * @deprecated
    //  * @param outerSignal 
    //  * @returns 
    //  */
    // async function regularFunctions(outerSignal: AbortSignal): Promise<FetchError | LogoutClicked | AuthFailed | WaitForPushClicked> {
    //     const abortController = chainedAbortController(outerSignal);
    //     const signal = abortController.signal;
    //     assert(user != null);
    //     const msgClient = new MsgClient(user, 2000, async (req) => {
    //         assert(user != null);
    //         assert(token != null);
    //         const authReq: AuthenticatedVideoReq<MsgReq> = {
    //             type: 'authenticatedVideoReq',
    //             ownUser: user,
    //             req: req,
    //             sessionToken: token
    //         }
    //         const resp = await accumulatedFetching.push<AuthenticatedVideoReq<MsgReq>, MsgResp>(authReq, signal);
    //         switch (resp.type) {
    //             case 'success':
    //                 msgClient.handleSerially(resp, async (sender, stringifiedMsg) => {
    //                     // TODO
    //                     nyi();
    //                 })
    //                 break;
    //             case 'error':
    //                 console.error(resp);
    //                 break;
    //         }
    //     }, 300, signal)
    //     // TODO also other events!
    //     const e = await waitForGuard({bus: eventBus}, rt.Union(FetchError, LogoutClicked, AuthFailed, WaitForPushClicked, CallClicked), signal);
    //     if (e.type !== 'CallClicked') {
    //         abortController.abort();
    //         return e;
    //     }

    //     nyi();
    // }

    function logoutRequest(user: string, token: string, signal: AbortSignal): Promise<ApiResp<LogoutResp>> {
        return accumulatedFetching.push<LogoutReq, LogoutResp>({
            type: 'logout',
            chatId,
            user,
            token
        }, signal)
    }

    // async function confirmPushDlg(signal: AbortSignal): Promise<'ok' | 'cancel'> {
    //     fireEvent<SetupPushDlg>({
    //         type: 'SetupPushDlg',
    //         props: {}
    //     })
    //     const e = await waitForGuard({bus: eventBus}, rt.Union(OkClicked, CancelClicked), signal);
    //     fireEvent<SetupPushDlg>({
    //         type: 'SetupPushDlg',
    //         props: null
    //     })

    //     switch (e.type) {
    //         case 'OkClicked':
    //             return 'ok';
    //         default:
    //             return 'cancel';
    //     }
    // }

    // async function setupPushNotifications(signal: AbortSignal): Promise<PushSubscription | null> {
    //     fireEvent<SetupPushDlg>({
    //         type: 'SetupPushDlg',
    //         props: { error: null }
    //     })
    //     try {
    //         const e = await waitForGuard({ bus: eventBus }, rt.Union(OkClicked, CancelClicked), signal);
    //         switch (e.type) {
    //             case 'OkClicked': {
    //                 let tryAgain = true;

    //                 do {
    //                     const pushManager = (await navigator.serviceWorker.ready).pushManager;
    //                     let subscription = await pushManager.getSubscription()
    //                     // console.log('subscription from pushManager.getSubscription', subscription)
    //                     if (subscription == null) {
    //                         try {
    //                             subscription = await pushManager.subscribe(subscriptionOptions)
    //                         } catch (reason: any) {
    //                             let error: string;
    //                             if ('name' in reason) {
    //                                 if (reason.name === 'NotAllowedError' || reason.name === 'NotFoundError' || reason.name === 'NotSupportedError') {
    //                                     error = reason.message;
    //                                 } else {
    //                                     console.error(reason);
    //                                     error = 'Unexpected error';
    //                                 }
    //                             } else {
    //                                 console.error(reason);
    //                                 error = 'Unexpected error';
    //                             }
    //                             tryAgain = await pushError(error, signal)
    //                             continue;
    //                         }
    //                     }


    //                     const resp = await authenticatedVideoReq<PushSubscribeReq, PushSubscribeResp>({
    //                         type: 'pushSubscribe',
    //                         subscription: JSON.stringify(subscription),
    //                     }, signal)

    //                     switch (resp.type) {
    //                         case 'success':
    //                             return subscription;
    //                         case 'error':
    //                             subscription.unsubscribe()
    //                             tryAgain = await pushError(resp.error, signal);
    //                             break;
    //                     }

    //                 } while (tryAgain);
    //                 return null;
    //             }
    //             case 'CancelClicked': {
    //                 return null;
    //             }
    //         }
    //     } finally {
    //         signal.throwIfAborted();
    //         fireEvent<SetupPushDlg>({
    //             type: 'SetupPushDlg',
    //             props: null
    //         })
    //     }
    // }

    /**
     * return true if user decided to try again
     * @param error 
     * @param signal 
     */
    async function pushError(error: string, signal: AbortSignal): Promise<boolean> {
        fireEvent<SetupPushDlg>({
            type: 'SetupPushDlg',
            props: {
                error: error
            }
        })

        const e = await waitForGuard({ bus: eventBus }, rt.Union(TryAgainClicked, CancelClicked), signal);
        switch (e.type) {
            case 'TryAgainClicked':
                return true;
            default:
                return false;
        }
    }

    function awaitPushDlg(outerSignal: AbortSignal): Promise<void> {
        fireEvent<AwaitPushDlg>({
            type: 'AwaitPushDlg',
            props: {}
        })

        const [abortController, releaseAbortController] = chainedAbortController(outerSignal);
        const signal = abortController.signal

        return new Promise<void>((res, rej) => {
            signal.onabort = () => {
                navigator.serviceWorker.removeEventListener('message', onPush);
            }
            const onPush = (e: MessageEvent<{ caller: string; callee: string }>) => {
                // console.log('onPush: e.data', e.data);
                if (signal.aborted) return;
                if (e.data.callee !== user) {
                    // ignore
                    return;
                }

                fireEvent<AwaitPushDlg>({
                    type: 'AwaitPushDlg',
                    props: null
                })
                res();
                abortController.abort();
            }
            navigator.serviceWorker.addEventListener('message', onPush)
            console.warn('added event listener to serviceWorker');
            waitForGuard({ bus: eventBus }, CancelClicked, signal).then(e => {
                switch (e.type) {
                    case 'CancelClicked':

                        fireEvent<AwaitPushDlg>({
                            type: 'AwaitPushDlg',
                            props: null
                        })
                        res();
                        abortController.abort();
                        break;
                }
            }).catch((reason: any) => {
                if (reason.name !== 'AbortError') {
                    console.error('Unknown error in waitForGuard(...CancelClicked)', reason);
                }
            })
        }).finally(() => {
            releaseAbortController()
        })

    }

    async function manageFetching(signal: AbortSignal) {

        type State = 'fetching' | 'interruptedByUser' | 'handlingError';
        let st: State = 'fetching';
        let interruptCount = 0;
        const subscr = eventBus.subscribe();

        try {
            while (true) {
                signal.throwIfAborted();
                const e = await waitForGuard({ subscr: subscr }, rt.Union(FetchingInterruptedRecursive, FetchError, TryAgainClicked), signal);
                switch (st) {
                    case 'fetching':
                        switch (e.type) {
                            case 'FetchingInterruptedRecursive':
                                if (e.interrupted) {
                                    fireFetchingSetInterrupted(true);
                                    ++interruptCount;
                                    st = 'interruptedByUser';
                                } else {
                                    console.error('Unexpected event', e);
                                }
                                break;

                            case 'FetchError':
                                fireHandlingFetchError(e.error);
                                st = 'handlingError';
                                break;

                            case 'TryAgainClicked':
                                // ignore
                                break;
                        }
                        break;

                    case 'interruptedByUser':
                        switch (e.type) {
                            case 'FetchingInterruptedRecursive':
                                if (e.interrupted) {
                                    ++interruptCount;
                                } else {
                                    --interruptCount;
                                    if (interruptCount === 0) {
                                        fireFetchingSetInterrupted(false);
                                        st = 'fetching';
                                    } else {
                                        // stay in state 'interruptedByUser'
                                    }
                                }
                                break;

                            case 'FetchError':
                                // ignore and stay in state 'interruptedByUser'
                                break;

                            case 'TryAgainClicked':
                                // dito
                                break;
                        }
                        break;

                    case 'handlingError':
                        switch (e.type) {
                            case 'FetchingInterruptedRecursive':
                                if (e.interrupted) {
                                    interruptCount = 1;
                                    exitHandlingError();
                                    st = 'interruptedByUser';
                                } else {
                                    console.error('Unexpected event', e);
                                }
                                break;

                            case 'FetchError':
                                console.error('Unexpected event', e);
                                break;

                            case 'TryAgainClicked':
                                exitHandlingError();
                                fireFetchingSetInterrupted(false);
                                st = 'fetching';
                                break;
                        }
                }
            }
        } finally {
            subscr.unsubscribe();
        }

        // helper functions

        function fireHandlingFetchError(error: string | null) {
            fireEvent<HandlingFetchError>({
                type: 'HandlingFetchError',
                error: error
            })
        }

        function fireFetchingSetInterrupted(interrupted: boolean) {
            fireEvent<FetchingSetInterrupted>({
                type: 'FetchingSetInterrupted',
                interrupted: interrupted
            })

        }

        function exitHandlingError() {
            fireHandlingFetchError(null);
        }
    }

    async function viewTest() {
        async function testInTest() {
            for (let i = 0; i < 10; ++i) {
                await abortableSleep(0, signal)
            }
            console.error('testInTest');
        }
        function testInTestRecursive() {
            let i = 0;
            function conditionalSleep(): Promise<void> {
                if (i < 10) return abortableSleep(0, signal).then(() => {
                    ++i;
                    return conditionalSleep();
                });
                console.error('testInTestRecursive');
                return Promise.resolve();
            }
            return conditionalSleep();
        }
        const signal = routeActivitySignal;
        await testInTest();
        await testInTestRecursive();
        // console.log('viewTest: signal', signal);
        // console.log('viewTest 1');
        // console.log('viewTest: signal', signal);
        fireEvent<RegularPage>({
            type: 'RegularPage',
            props: {
                sendVideo: 'individually',
                receiveVideo: 'always',
                fitToDisplay: false
            }
        })

        {
            const mediaStream: MediaStream | null = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            })

            try {

                fireEvent<LocalMediaStream>({
                    type: 'LocalMediaStream',
                    stream: mediaStream
                })
                // console.log('fired LocalMediaStream(mediaStream)');

                await abortableSleep(3000, signal);
                fireEvent<LocalMediaStream>({
                    type: 'LocalMediaStream',
                    stream: null
                })
                // console.log('fired LocalMediaStream(null)');

            } finally {
                mediaStream.getTracks().forEach(track => {
                    track.stop();
                })
                console.log("all tracks in mediaStream stopped")
            }
        }


        // let props: DecideIfWithVideoProps = {
        //     eventBusKey: eventBusKey,
        //     decisions: {
        //         ['Peter Johann Reitinger']: {
        //             remoteUser: 'Peter Johann Reitinger',
        //             withVideo: {
        //                 send: true,
        //                 receive: true
        //             }
        //         }
        //     }
        // }
        // fireEvent<DecideIfWithVideoDlg>({
        //     type: 'DecideIfWithVideoDlg',
        //     props: props
        // })
        // const subscr = eventBus.subscribe();

        // try {

        //     fireEvent<SetChatSmall>({
        //         type: 'SetChatSmall',
        //         small: false
        //     })

        //     // await abortableSleep(1000, signal);

        //     fireEvent<RegularPage>({
        //         type: 'RegularPage',
        //         props: null
        //     })
        //     fireEvent<Busy>({
        //         type: 'Busy',
        //         comment: 'Preparing ...'
        //     })

        //     // await abortableSleep(1000, signal);
        //     fireEvent<Busy>({
        //         type: 'Busy',
        //         comment: null
        //     })
        //     fireEvent<RegularPage>({
        //         type: 'RegularPage',
        //         props: {
        //             sendVideo: 'individually',
        //             receiveVideo: 'always'
        //         }
        //     })

        //     fireEvent<ModalDlg>({
        //         type: 'ModalDlg',
        //         msg: 'Please close your calls, first.'
        //     })




        //     // fireEvent<SetupPushDlg>({
        //     //     type: 'SetupPushDlg',
        //     //     props: {
        //     //         error: null
        //     //     }
        //     // })


        //     while (true) {
        //         await abortableSleep(10, signal);
        //         console.log(myCount, 'before throwIfAborted[1] in viewTest', signal);
        //         signal.throwIfAborted();
        //         console.log(myCount, 'before throwIfAborted[2] in viewTest', signal);
        //         signal.throwIfAborted();
        //         console.log(myCount, 'before waitForGuard in viewTest', signal);
        //         const e = await waitForGuard({ subscr: subscr }, SendVideoChanged, signal);
        //         console.log(myCount, 'after waitForGuard')
        //         switch (e.type) {
        //             case 'SendVideoChanged':
        //                 console.log(myCount, 'received SendVideoChanged')
        //                 props = {
        //                     ...props,
        //                     decisions: {
        //                         ...props.decisions,
        //                         [e.remoteUser]: {
        //                             ...props.decisions[e.remoteUser],
        //                             withVideo: {
        //                                 ...props.decisions[e.remoteUser].withVideo,
        //                                 send: e.send
        //                             }
        //                         }
        //                     }
        //                 }
        //                 fireEvent<DecideIfWithVideoDlg>({
        //                     type: 'DecideIfWithVideoDlg',
        //                     props: props
        //                 })

        //                 break;
        //         }
        //     }
        // } finally {
        //     try {
        //         subscr.unsubscribe();
        //     } catch (reason) {
        //         console.log('caught in unsubscribe in finally', reason);
        //     }
        // }

    }


    try {

        if (VIEW_TEST) {
            await viewTest();
            console.log(myCount, 'before return in if VIEW_TEST')
            return;
        }

        // activity implementation starts here

        manageFetching(routeActivitySignal).catch(reason => {
            if (reason.name !== 'AbortError') {
                console.error(reason);
            }
        });

        const callee = sessionStorage['callee'];
        const accept = sessionStorage['accept'];
        if (callee != null || accept != null || (user != null && passwd != null)) {
            if (user == null) user = localStorage['user'];
            if (passwd == null) passwd = localStorage['passwd'];

            if (user == null || passwd == null) {
                const loginDlgResp = await loginDlg(user ?? '', passwd ?? '', null, routeActivitySignal)
                switch (loginDlgResp.type) {
                    case 'LoginOrRegisterOk':
                        user = loginDlgResp.user;
                        passwd = loginDlgResp.passwd;
                        await loginLoop(routeActivitySignal);
                        break;

                    case 'CancelClicked':
                        await startPage(routeActivitySignal);
                        break;
                }
            } else {
                await loginLoop(routeActivitySignal);
            }
        }

        // no endless recursion, so this while-loop:
        while (true) {
            await startPage(routeActivitySignal);
        }

    } catch (reason: any) {
        if (reason.name !== 'AbortError') {
            console.error(reason);
        } else {
            // console.log('ignoring', reason);
        }
    }

    // console.warn(myCount, 'routeActivity ending');
    return;


    // try {
    //     while (!signal.aborted) {
    //         await sleep(1000);
    //         console.log('will sleep in test routeActivity');
    //         await abortableSleep(1000, signal);
    //         console.log('have slept in test routeActivity');
    //     }
    // } catch (reason: any) {
    //     if (reason.name !== 'AbortError') {
    //         console.error(reason);
    //     } else {
    //         console.log('Ignoring abort error', reason);
    //     }
    // }

    // // TODO
    // console.error('nyi');

    // console.log('routeActivity ending');

}