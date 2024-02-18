import { RenderHookResult, act, renderHook } from "@testing-library/react";
import { UseChatProps, UseChatResult, useChat } from "../_lib/chat/chat-client"
import { AccumulatedFetching } from "../_lib/user-management-client/AccumulatedFetching";
import { ChatEvent, ChatReq, ChatResp } from "../_lib/chat/chat-common";
import { AccumulatedResp } from "../_lib/user-management-server/user-management-common/apiRoutesCommon";
import { ChangeEventHandler } from "react";
import { AccumulatedReq } from "../_lib/user-management-client/user-management-common/apiRoutesCommon";
import FixedAbortController from "../_lib/user-management-client/FixedAbortController";

jest.useFakeTimers();

function fakeSleep(ms: number): Promise<void> {
    return jest.advanceTimersByTimeAsync(ms);
}


const NYI = () => {
    throw new Error('Not implemented');
}

type FetchResponseProducer = (url: string, body?: string | any) => Promise<any>

const registeredFetchResponseProducers: { [key: string]: FetchResponseProducer } = {}

const createNextFetchResponse = (url: string, body?: string | any): Promise<any> => {
    const gen = registeredFetchResponseProducers[url];
    if (registeredFetchResponseProducers[url] == null) {
        return Promise.reject({ undefined: 'json ;-)' })
    }
    return gen(url, body);
}

global.fetch = async (url: URL | RequestInfo, init?: RequestInit | undefined) => {
    // console.log('url', url);
    // console.log('init', init);
    const headers: Headers = {
        append: NYI,
        delete: NYI,
        entries: NYI,
        get: NYI,
        getSetCookie: NYI,
        has: NYI,
        set: NYI,
        forEach: NYI,
        keys: NYI,
        values: NYI,
        [Symbol.iterator]: NYI
    };
    const res: Response = {
        arrayBuffer: () => {
            console.error('not implemented')
            throw 'not implemented';
        },
        blob: () => {
            console.error('not implemented')
            throw 'not implemented';
        },
        headers: headers,
        body: null,
        ok: false,
        redirected: false,
        status: 200,
        bodyUsed: false,
        statusText: '',
        type: "basic",
        url: url.toString(),
        clone: NYI,
        formData: NYI,
        json: () => {
            return createNextFetchResponse(url.toString(), init?.body);
        },
        text: NYI,

    }

    return res;
}

describe('useChat is a hook that uses an object of class AccumulatedFetching to fetch chat events in the background and provides \
a sub-state with all received chat events', () => {

    it('implements the activity of diagram WebRTC Demo.vpp://diagram/aYR7QbGD.AACARA.',
        async () => {

            const testUrl = '/api/bla';
            let nextEventId = -1;

            registeredFetchResponseProducers[testUrl] = async (url, body: string) => {
                // console.log('body in responseProducer', body);
                const accReq: AccumulatedReq = JSON.parse(body);
                if (accReq.requests.length === 1) {
                    const req = accReq.requests[0] as ChatReq;
                    expect(req.lastEventId).toBe(nextEventId);
                }
                const resp: ChatResp = {
                    type: 'success',
                    events: [
                        {
                            user: 'TestUser',
                            type: 'ChatMsg',
                            text: '1 line',
                        }
                    ],
                    lastEventId: (++nextEventId),
                }
                const accumulatedResp: AccumulatedResp = {
                    type: 'success',
                    responses: [resp]
                }
                // console.log('mocked accumulatedResp', accumulatedResp);
                return accumulatedResp;
            }

            const timeoutMs = 1800;
            const initialUsers = ['Hans', 'Sepp'];
            const loginResultData = { user: 'user', sessionKey: 'sessionKey', eventIdForUsers: 5, initialUsers: initialUsers };
            const props: UseChatProps = { chatId: 'blaId', timeoutMs: timeoutMs };
            type Result = RenderHookResult<UseChatResult, UseChatProps>;
            const chat: Result = renderHook(() => useChat(props));
            console.log('after hook creation', chat.result.current);

            const abortControllerForAccumulatedFetching: FixedAbortController = new FixedAbortController();
            const accumulatedFetching = new AccumulatedFetching('/api/bla', {
                fetchError(error) {
                    console.log('fetchError', error);
                }
            }, abortControllerForAccumulatedFetching);

            await act(async () => {
                await fakeSleep(1000);
                console.log('after 1sec', chat.result.current);
                chat.result.current.onStart(accumulatedFetching, loginResultData, function () {
                    expect(true).toBe(false);
                });
                console.log('after onStart', chat.result.current);
                await fakeSleep(1);

            })

            chat.rerender(props);
            function length(result: Result) {
                return result.result.current.chatEvents.length;
            }
            function event(result: Result, idx: number) {
                return result.result.current.chatEvents[idx];
            }
            expect(length(chat)).toBe(1);
            expect(event(chat, 0)).toEqual({
                user: 'TestUser',
                type: 'ChatMsg',
                text: '1 line',
            })
            // console.log('after 2sec', chat.result.current);

            await act(async () => {
                await fakeSleep(timeoutMs + 1)
            });
            expect(length(chat)).toBe(2);
            expect(event(chat, 1)).toEqual({
                user: 'TestUser',
                type: 'ChatMsg',
                text: '1 line',
            })
            expect(chat.result.current.userList).toEqual({
                users: initialUsers.map(name => ({
                    name: name
                })),
                selected: -1
            }
            )

            try {
                await act(async () => {
                    chat.unmount();
                    abortControllerForAccumulatedFetching.abort();
                    await fakeSleep(100);
                })

            } catch (reason) {
                console.log('caught in tidy-up', reason);
            }

        })

    it('provides a user list that is updated according to UserEntered and UserLeft events from the server', async () => {
        // to test:
        // no enter, no left
        // 1 enter
        // 1 left
        // enter and left of same user
        // left and enter of same user
        // enter of 2 users and left of 2 other users

        const eventListGeneratorFunction = function* (): Generator<ChatEvent[], ChatEvent[]> {
            yield [];
            yield [{
                type: 'UserEntered',
                user: 'a'
            }];
            yield [{
                type: 'UserLeft',
                user: 'a'
            }]
            yield [{
                type: 'UserEntered',
                user: 'a'
            }, {
                type: 'UserLeft',
                user: 'a'
            }, {
                type: 'UserEntered',
                user: 'b'
            }]

            yield [{
                type: 'UserLeft',
                user: 'b'
            }, {
                type: 'UserEntered',
                user: 'b'
            }, {
                type: 'UserEntered',
                user: 'c'
            }]
            yield [{
                type: 'UserEntered',
                user: 'd'
            }, {
                type: 'UserLeft',
                user: 'b'
            }, {
                type: 'UserEntered',
                user: 'e'
            }, {
                type: 'UserLeft',
                user: 'c'
            }]
            return [];
        }

        const eventListGenerator = eventListGeneratorFunction();

        const testUrl = '/api/bla';
        let nextEventId = -1;

        registeredFetchResponseProducers[testUrl] = async (url, body: string) => {
            // console.log('body in responseProducer', body);
            const accReq: AccumulatedReq = JSON.parse(body);
            if (accReq.requests.length === 1) {
                const req = accReq.requests[0] as ChatReq;
                expect(req.lastEventId).toBe(nextEventId);
            }
            const events = eventListGenerator.next().value;
            // console.log('events from generator', events);
            const resp: ChatResp = {
                type: 'success',
                events: events,
                lastEventId: (nextEventId += events.length),
            }
            const accumulatedResp: AccumulatedResp = {
                type: 'success',
                responses: [resp]
            }
            // console.log('mocked accumulatedResp', accumulatedResp);
            return accumulatedResp;
        }

        const timeoutMs = 1800;
        const initialUsers = ['Hans', 'Sepp'];
        const loginResultData = { user: 'user', sessionKey: 'sessionKey', eventIdForUsers: 0, initialUsers: initialUsers };
        const props: UseChatProps = { chatId: 'blaId', timeoutMs: timeoutMs };
        type Result = RenderHookResult<UseChatResult, UseChatProps>;
        const chat: Result = renderHook(() => useChat(props));

        const abortControllerForAccumulatedFetching: FixedAbortController = new FixedAbortController();
        const accumulatedFetching = new AccumulatedFetching('/api/bla', {
            fetchError(error) {
                console.log('fetchError', error);
            }
        }, abortControllerForAccumulatedFetching);

        await act(async () => {
            await fakeSleep(1000);
            // console.log('after 1sec', chat.result.current);
            chat.result.current.onStart(accumulatedFetching, loginResultData, function () {
                expect(true).toBe(false);
            });
            // console.log('after onAccumulatedFetching', chat.result.current);
            await fakeSleep(1);
        })

        // console.log('current userList: ', chat.result.current.userList);

        expect(chat.result.current.userList.users.map(u => u.name)).toEqual(['Hans', 'Sepp'])

        await act(async () => {
            await fakeSleep(timeoutMs + 1);
        })

        expect(chat.result.current.userList.users).toEqual([
            {
                name: 'a'
            }, {
                name: 'Hans'
            }, {
                name: 'Sepp'
            },
        ])

        await act(async () => {
            await fakeSleep(timeoutMs);
        })

        expect(chat.result.current.userList.users).toEqual([
            {
                name: 'Hans'
            }, {
                name: 'Sepp'
            },
        ])

        await act(async () => {
            await fakeSleep(timeoutMs);
        })

        expect(chat.result.current.userList.users).toEqual([
            {
                name: 'b'
            }, {
                name: 'Hans'
            }, {
                name: 'Sepp'
            },
        ])

        await act(async () => {
            await fakeSleep(timeoutMs);
        })

        expect(chat.result.current.userList.users).toEqual([
            {
                name: 'b'
            }, {
                name: 'c'
            }, {
                name: 'Hans'
            }, {
                name: 'Sepp'
            },
        ])

        await act(async () => {
            await fakeSleep(timeoutMs);
        })

        expect(chat.result.current.userList.users).toEqual([
            {
                name: 'd'
            }, {
                name: 'e'
            }, {
                name: 'Hans'
            }, {
                name: 'Sepp'
            },
        ])

        await act(async () => {
            chat.unmount();
            abortControllerForAccumulatedFetching.abort();
            await fakeSleep(100);
        })

    })

    it('sets the selectedIndex to -1 if the selected user is deleted', async () => {
        const eventListGeneratorFunction = function* (): Generator<ChatEvent[], ChatEvent[]> {
            yield [];
            yield [{
                type: 'UserLeft',
                user: 'Hans'
            }];
            yield [{
                type: 'UserLeft',
                user: 'Sepp'
            }]
            return [];
        }

        const eventListGenerator = eventListGeneratorFunction();

        const testUrl = '/api/bla';
        let nextEventId = -1;

        registeredFetchResponseProducers[testUrl] = async (url, body: string) => {
            // console.log('body in responseProducer', body);
            const accReq: AccumulatedReq = JSON.parse(body);
            if (accReq.requests.length === 1) {
                const req = accReq.requests[0] as ChatReq;
                expect(req.lastEventId).toBe(nextEventId);
            }
            const events = eventListGenerator.next().value;
            // console.log('events from generator', events);
            const resp: ChatResp = {
                type: 'success',
                events: events,
                lastEventId: (nextEventId += events.length),
            }
            const accumulatedResp: AccumulatedResp = {
                type: 'success',
                responses: [resp]
            }
            // console.log('mocked accumulatedResp', accumulatedResp);
            return accumulatedResp;
        }

        const timeoutMs = 1800;
        const initialUsers = ['Hans', 'Sepp'];
        const props: UseChatProps = { chatId: 'blaId', timeoutMs: timeoutMs };
        type Result = RenderHookResult<UseChatResult, UseChatProps>;
        const chat: Result = renderHook(() => useChat(props));

        const abortControllerForAccumulatedFetching: FixedAbortController = new FixedAbortController();
        const accumulatedFetching = new AccumulatedFetching('/api/bla', {
            fetchError(error) {
                console.log('fetchError', error);
            }
        }, abortControllerForAccumulatedFetching);

        await act(async () => {
            await fakeSleep(1000);
            // console.log('after 1sec', chat.result.current);
            chat.result.current.onStart(accumulatedFetching, { user: 'user', sessionKey: 'sessionKey', eventIdForUsers: 0, initialUsers: initialUsers }, function () {
                expect(true).toBe(false);
            });
            // console.log('after onAccumulatedFetching', chat.result.current);
            await fakeSleep(1);
        })

        // console.log('current userList: ', chat.result.current.userList);

        await act(async () => {
            chat.result.current.onUserClick(0);
            await fakeSleep(10);
        })

        expect(chat.result.current.userList).toEqual({
            users: [{
                name: 'Hans'
            }, {
                name: 'Sepp'
            }],
            selected: 0
        });

        await act(async () => {
            await fakeSleep(timeoutMs + 1);
        })

        expect(chat.result.current.userList).toEqual({
            users: [
                {
                    name: 'Sepp'
                },
            ],
            selected: -1
        })

        await act(async () => {
            chat.result.current.onUserClick(0)
            await fakeSleep(1);
        })

        expect(chat.result.current.userList).toEqual({
            users: [
                {
                    name: 'Sepp'
                },
            ],
            selected: 0
        })

        await act(async () => {
            await fakeSleep(timeoutMs);
        })

        expect(chat.result.current.userList).toEqual({
            users: [],
            selected: -1
        })


        await act(async () => {
            chat.unmount();
            abortControllerForAccumulatedFetching.abort();
            await fakeSleep(100);
        })
    })

    it('keeps selected index if user enters or leaves behind the selected user', async () => {
        const eventListGeneratorFunction = function* (): Generator<ChatEvent[], ChatEvent[]> {
            yield [];
            yield [{
                type: 'UserLeft',
                user: 'Sepp'
            }]
            yield [{
                type: 'UserEntered',
                user: 'Zarathustra'
            }]
            yield [{
                type: 'UserEntered',
                user: 'Zorro'
            }, {
                type: 'UserEntered',
                user: 'Zed'
            }]
            yield [{
                type: 'UserLeft',
                user: 'Zed'
            }]
            yield [{
                type: 'UserLeft',
                user: 'Zorro'
            }]


            return [];
        }

        const eventListGenerator = eventListGeneratorFunction();

        const testUrl = '/api/bla';
        let nextEventId = -1;

        registeredFetchResponseProducers[testUrl] = async (url, body: string) => {
            // console.log('body in responseProducer', body);
            const accReq: AccumulatedReq = JSON.parse(body);
            if (accReq.requests.length === 1) {
                const req = accReq.requests[0] as ChatReq;
                expect(req.lastEventId).toBe(nextEventId);
            }
            const events = eventListGenerator.next().value;
            // console.log('events from generator', events);
            const resp: ChatResp = {
                type: 'success',
                events: events,
                lastEventId: (nextEventId += events.length),
            }
            const accumulatedResp: AccumulatedResp = {
                type: 'success',
                responses: [resp]
            }
            // console.log('mocked accumulatedResp', accumulatedResp);
            return accumulatedResp;
        }

        const timeoutMs = 1800;
        const initialUsers = ['Hans', 'Sepp'];
        const props: UseChatProps = { chatId: 'blaId', timeoutMs: timeoutMs };
        type Result = RenderHookResult<UseChatResult, UseChatProps>;
        const chat: Result = renderHook(() => useChat(props));

        const abortControllerForAccumulatedFetching: FixedAbortController = new FixedAbortController();
        const accumulatedFetching = new AccumulatedFetching('/api/bla', {
            fetchError(error) {
                console.log('fetchError', error);
            }
        }, abortControllerForAccumulatedFetching);

        await act(async () => {
            await fakeSleep(1000);
            // console.log('after 1sec', chat.result.current);
            chat.result.current.onStart(accumulatedFetching, { user: 'user', sessionKey: 'sessionKey', eventIdForUsers: 0, initialUsers: initialUsers }, function () {
                expect(true).toBe(false);
            });
            // console.log('after onAccumulatedFetching', chat.result.current);
            await fakeSleep(1);
            chat.result.current.onUserClick(0);
            await fakeSleep(1);
        })
        // console.warn('before rerender')
        chat.rerender();

        expect(chat.result.current.userList).toEqual({
            users: [
                { name: 'Hans' },
                { name: 'Sepp' }
            ],
            selected: 0
        })

        await act(async () => {
            await fakeSleep(timeoutMs);
        })

        expect(chat.result.current.userList).toEqual({
            users: [
                { name: 'Hans' },
            ],
            selected: 0
        })

        await act(async () => {
            await fakeSleep(timeoutMs);
        })

        expect(chat.result.current.userList).toEqual({
            users: [
                { name: 'Hans' },
                { name: 'Zarathustra' }
            ],
            selected: 0
        })

        await act(async () => {
            chat.result.current.onUserClick(1);
        })

        expect(chat.result.current.userList).toEqual({
            users: [
                { name: 'Hans' },
                { name: 'Zarathustra' }
            ],
            selected: 1
        })

        await act(async () => {
            await fakeSleep(timeoutMs);
        })

        expect(chat.result.current.userList).toEqual({
            users: [
                { name: 'Hans' },
                { name: 'Zarathustra' },
                { name: 'Zed' },
                { name: 'Zorro' }
            ],
            selected: 1
        })

        await act(async () => {
            await fakeSleep(timeoutMs);
        })

        expect(chat.result.current.userList).toEqual({
            users: [
                { name: 'Hans' },
                { name: 'Zarathustra' },
                { name: 'Zorro' }
            ],
            selected: 1
        })

        await act(async () => {
            await fakeSleep(timeoutMs);
        })

        expect(chat.result.current.userList).toEqual({
            users: [
                { name: 'Hans' },
                { name: 'Zarathustra' },
            ],
            selected: 1
        })


        await act(async () => {
            chat.unmount();
            abortControllerForAccumulatedFetching.abort();
            await fakeSleep(100);
        })

    })

    it('updates selected index if users enter or leave with an index less than the selected index', async () => {
        const eventListGeneratorFunction = function* (): Generator<ChatEvent[], ChatEvent[]> {
            yield [];

            yield [{
                type: 'UserEntered',
                user: 'Adam'
            }]

            yield [{
                type: 'UserLeft',
                user: 'Adam'
            }]

            yield [{
                type: 'UserEntered',
                user: 'Adam'
            }]

            yield [{
                type: 'UserEntered',
                user: 'Berta'
            }, {
                type: 'UserEntered',
                user: 'Caesar'

            }]

            yield [
                {
                    type: 'UserLeft',
                    user: 'Sepp'
                },
                {
                    type: 'UserLeft',
                    user: 'Hans'
                },
                {
                    type: 'UserLeft',
                    user: 'Adam'
                },
                {
                    type: 'UserLeft',
                    user: 'Berta'
                },
                {
                    type: 'UserLeft',
                    user: 'Caesar'
                },
            ]

            return [];
        }

        const eventListGenerator = eventListGeneratorFunction();

        const testUrl = '/api/bla';
        let nextEventId = -1;

        registeredFetchResponseProducers[testUrl] = async (url, body: string) => {
            // console.log('body in responseProducer', body);
            const accReq: AccumulatedReq = JSON.parse(body);
            if (accReq.requests.length === 1) {
                const req = accReq.requests[0] as ChatReq;
                expect(req.lastEventId).toBe(nextEventId);
            }
            const events = eventListGenerator.next().value;
            // console.log('events from generator', events);
            const resp: ChatResp = {
                type: 'success',
                events: events,
                lastEventId: (nextEventId += events.length),
            }
            const accumulatedResp: AccumulatedResp = {
                type: 'success',
                responses: [resp]
            }
            // console.log('mocked accumulatedResp', accumulatedResp);
            return accumulatedResp;
        }

        const timeoutMs = 1800;
        const initialUsers = ['Hans', 'Sepp'];
        const props: UseChatProps = { chatId: 'blaId', timeoutMs: timeoutMs };
        type Result = RenderHookResult<UseChatResult, UseChatProps>;
        const chat: Result = renderHook(() => useChat(props));

        const abortControllerForAccumulatedFetching: FixedAbortController = new FixedAbortController();
        const accumulatedFetching = new AccumulatedFetching('/api/bla', {
            fetchError(error) {
                console.log('fetchError', error);
            }
        }, abortControllerForAccumulatedFetching);

        await act(async () => {
            await fakeSleep(1000);
            // console.log('after 1sec', chat.result.current);
            chat.result.current.onStart(accumulatedFetching, { user: 'user', sessionKey: 'sessionKey', eventIdForUsers: 0, initialUsers: initialUsers }, function () {
                expect(true).toBe(false);
            });

            // console.log('after onAccumulatedFetching', chat.result.current);
            await fakeSleep(1);
            chat.result.current.onUserClick(0);
            await fakeSleep(1);
        })

        chat.rerender();

        expect(chat.result.current.userList).toEqual({
            users: [
                { name: 'Hans' },
                { name: 'Sepp' }
            ],
            selected: 0
        })

        await act(async () => {
            await fakeSleep(timeoutMs)
        })

        expect(chat.result.current.userList).toEqual({
            users: [
                { name: 'Adam' },
                { name: 'Hans' },
                { name: 'Sepp' }
            ],
            selected: 1
        })

        await act(async () => {
            await fakeSleep(timeoutMs)
        })

        expect(chat.result.current.userList).toEqual({
            users: [
                { name: 'Hans' },
                { name: 'Sepp' }
            ],
            selected: 0
        })

        await act(async () => {
            await fakeSleep(timeoutMs)
        })

        expect(chat.result.current.userList).toEqual({
            users: [
                { name: 'Adam' },
                { name: 'Hans' },
                { name: 'Sepp' }
            ],
            selected: 1
        })

        await act(async () => {
            await fakeSleep(timeoutMs)
        })

        expect(chat.result.current.userList).toEqual({
            users: [
                { name: 'Adam' },
                { name: 'Berta' },
                { name: 'Caesar' },
                { name: 'Hans' },
                { name: 'Sepp' }
            ],
            selected: 3
        })

        await act(async () => {
            await fakeSleep(timeoutMs)
        })

        expect(chat.result.current.userList).toEqual({
            users: [
            ],
            selected: -1
        })


        await act(async () => {
            chat.unmount();
            abortControllerForAccumulatedFetching.abort();
            await fakeSleep(100);
        })

    })

    it('offers addErrorLine for adding an error event to the chat event list', async () => {
        const eventListGeneratorFunction = function* (): Generator<ChatEvent[], ChatEvent[]> {

            return [];
        }

        const eventListGenerator = eventListGeneratorFunction();

        const testUrl = '/api/bla';
        let nextEventId = -1;

        registeredFetchResponseProducers[testUrl] = async (url, body: string) => {
            // console.log('body in responseProducer', body);
            const accReq: AccumulatedReq = JSON.parse(body);
            if (accReq.requests.length === 1) {
                const req = accReq.requests[0] as ChatReq;
                expect(req.lastEventId).toBe(nextEventId);
            }
            const events = eventListGenerator.next().value;
            // console.log('events from generator', events);
            const resp: ChatResp = {
                type: 'success',
                events: events,
                lastEventId: (nextEventId += events.length),
            }
            const accumulatedResp: AccumulatedResp = {
                type: 'success',
                responses: [resp]
            }
            // console.log('mocked accumulatedResp', accumulatedResp);
            return accumulatedResp;
        }

        const timeoutMs = 1800;
        const initialUsers = ['Hans', 'Sepp'];
        const props: UseChatProps = { chatId: 'blaId', timeoutMs: timeoutMs };
        type Result = RenderHookResult<UseChatResult, UseChatProps>;
        const chat: Result = renderHook(() => useChat(props));

        const abortControllerForAccumulatedFetching: FixedAbortController = new FixedAbortController();
        const accumulatedFetching = new AccumulatedFetching('/api/bla', {
            fetchError(error) {
                console.log('fetchError', error);
            }
        }, abortControllerForAccumulatedFetching);

        await act(async () => {
            await fakeSleep(1000);
            // console.log('after 1sec', chat.result.current);
            chat.result.current.onStart(accumulatedFetching, { user: 'user', sessionKey: 'sessionKey', eventIdForUsers: 0, initialUsers: initialUsers }, function () {
                expect(true).toBe(false);
            });
        })

        expect(chat.result.current.chatEvents).toEqual([]);

        await act(async () => {
            chat.result.current.addErrorLine('test error')
        })

        const expectedChatEvents: ChatEvent[] = [
            {
                type: 'Error',
                error: 'test error'
            }
        ]
        expect(chat.result.current.chatEvents).toEqual(expectedChatEvents);

        await act(async () => {
            chat.unmount();
            abortControllerForAccumulatedFetching.abort();
            await fakeSleep(100);
        })

    })

})