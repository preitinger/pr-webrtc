import { Static, Union } from "runtypes";
import FixedAbortController from "./pr-client-utils/FixedAbortController";
import { RuntypeBase } from "runtypes/lib/runtype";
import { myAddEventListener } from "./pr-client-utils/eventListeners";

export type ClosedException = {
    type: 'closed'
};

let globalTestCount = 0;

export class Subscription<Event> {
    constructor(idx: number, bus: EventBus<Event>, secret: number, abortController: AbortController) {
        this.idx = idx;
        this.bus = bus;
        this.secret = secret;
        this.abortController = abortController;
        this.prom = null;
        this.resolve = null;
        this.reject = null;
    }
    unsubscribe() {
        this.abortController.signal.throwIfAborted();
        // console.log('unsubscribe(): this.reject', this.reject);
        if (this.prom != null) {
            // console.log('before this.prom.catch');
            this.prom.catch((reason) => {
                // console.log('in prom.catch')
                // console.log('caught reason to avoid the problem "UnhandledPromiseRejection" in jest tests in close');
            })
        }
        if (this.reject != null) {
            this.reject(new Error('Unsubscribed'));
        }
        this.bus.unsubscribe(this, this.idx, this.secret);

        this.resolve = null;
        this.reject = null;
        this.prom = null;

    }
    dispatch(e: Event) {
        if (this.prom != null) {
            if (this.resolve == null) throw new Error('resolve null when prom not null');
            this.resolve(e);
            this.prom = null;
            this.resolve = null;
            this.reject = null;
            return;
        }
        this.pendingEvents.push(e);
    }

    nextEvent(signal?: AbortSignal): Promise<Event> {
        let result: Promise<Event>;
        type Listener = () => void;
        // const addedAbortListeners: Listener[] = [];
        const listenerRemovers: (() => void)[] = [];
        function addAbortListener(l: Listener) {
            if (signal == null) return;
            listenerRemovers.push(myAddEventListener(signal, 'abort', l));
            ++globalTestCount;
            // console.log('globalTestCount nach add', globalTestCount);

            // const wastingMemInClosure: number[] = [];
            // for (let i = 0; i < 1000000; ++i) {
            //     wastingMemInClosure[i] = i;
            // }
            // const dummy = () => {
            //     console.log('dummy: len', wastingMemInClosure.length);
            // }
            // for (let i = 0; i < 10; ++i) {
            //     signal?.addEventListener('abort', dummy)
            //     // signal?.removeEventListener('abort', dummy);
            // }
        }

        if (this.abortController.signal.aborted) {
            result = Promise.reject(this.abortController.signal.reason);
        } else {
            if (this.pendingEvents.length > 0) {
                const e = this.pendingEvents.splice(0, 1)[0];
                result = Promise.resolve(e);
            } else if (this.prom != null) {
                const abortedProm = new Promise<never>((res, rej) => {
                    // const wastingInClosure: number[] = [];
                    // for (let i = 0; i < 1000000; ++i) wastingInClosure.push(i);

                    function abortListener() {
                        // console.log('len', wastingInClosure.length);
                        // console.log('abort listener[1] with once in nextEvent')
                        rej(signal?.reason)
                    }
                    addAbortListener(abortListener);
                })
                result = Promise.race([
                    this.prom,
                    abortedProm
                ]);
            } else {
                const abortedProm = new Promise<never>((res, rej) => {
                    // const wastingInClosure: number[] = [];
                    // for (let i = 0; i < 1000000; ++i) wastingInClosure.push(i);

                    function abortListener() {
                        // console.log('len', wastingInClosure.length);
                        // console.log('abort listener[2] with once in nextEvent')
                        rej(signal?.reason)
                    }
                    addAbortListener(abortListener);
                })
                result = Promise.race([
                    (this.prom = new Promise((res, rej) => {
                        this.resolve = res;
                        this.reject = rej;
                    })),
                    abortedProm
                ])
            }

        }

        return result.finally(() => {
            for (const remover of listenerRemovers) {
                remover();
                // console.log('abort listener removed')
                --globalTestCount;
                // console.log('globalTestCount nach remove', globalTestCount);
            }
        })
    }

    async nextEventWith(predicate: (e: Event) => boolean, signal?: AbortSignal): Promise<Event> {
        let e: Event;
        do {
            e = await this.nextEvent(signal);
            signal?.throwIfAborted();
        } while (!predicate(e));
        return e;
    }

    private idx: number;
    private bus: EventBus<Event>;
    private secret: number;
    // In reality so few entries that it does not pay to use a queue instead of an array here:
    private pendingEvents: Event[] = [];
    private abortController: AbortController;
    private prom: Promise<Event> | null;
    private resolve: ((e: Event) => void) | null;
    private reject: ((reason: any) => void) | null;
}

export default class EventBus<Event> {
    constructor(name: string, abortController?: AbortController) {
        this.name = name;
        // console.log('Constructing event bus ', name);
        // console.log('arg abortController in EventBus', abortController);
        // if (abortController != null) console.log('arg abortController.signal.aborted in EventBus', abortController.signal.aborted);

        // let res: null | ((e: Event) => void) = null;
        // let rej: null | ((reason: any) => void) = null;
        // this.prom = new Promise((resolve, reject) => {
        //     res = resolve;
        //     rej = reject;
        // })

        // if (res == null || rej == null) throw new Error('Unexpected behavior of Promise constructor');
        // this.resolve = res;
        // this.reject = rej;
        this.abortController = abortController ?? new FixedAbortController();
    }

    publish(e: Event) {
        if (this.isClosed()) {
            // console.log(this.name, 'will throw error Called publish() on a closed EventBus');
            throw new Error(`Called publish() on the closed EventBus ${this.name}`);
        }

        // console.log('publish: number of subscriptions', this.subscriptions.length);
        for (const subscription of this.subscriptions) {
            if (subscription == null) continue;
            // console.log('publish: dispatch on non-null subscription', subscription);
            subscription.dispatch(e);
        }

        // old:
        // this.resolve(e);
        // this.prom = new Promise((resolve, reject) => {
        //     this.resolve = resolve;
        //     this.reject = reject;
        //     // console.log('created promise')
        // })
    }

    close() {
        // const e: ClosedException = {
        //     type: 'closed'
        // }
        // this.reject(new Error('ClosedException'));

        for (const subscription of this.subscriptions.slice()) {
            subscription?.unsubscribe();
        }

        this.abortController.abort();
    }

    subscribe() {
        const that = this;
        const idx = this.freeIndexes.pop() ?? this.subscriptions.length;
        const subscription = new Subscription<Event>(idx, this, this.secret, this.abortController);
        this.subscriptions[idx] = subscription;
        if (this.subscriptions.length <= idx) throw new Error('Unexpected behavior of array length');
        return subscription
    }

    unsubscribe(subscription: Subscription<Event>, idx: number, secret: number) {
        if (this.subscriptions[idx] !== subscription) throw new Error('Illegal arguments');
        this.subscriptions[idx] = null;
        this.freeIndexes.push(idx);
    }

    // /**
    //  * 
    //  * @returns promise that will resolve on the next occurring event or reject with a ClosedException when this event bus is closed.
    //  */
    // nextEvent(): Promise<Event> {
    //     return this.prom;
    // }

    private isClosed() {
        // console.log('EventBus.isClosed: signal=', this.abortController.signal);
        return this.abortController.signal.aborted;
    }

    // private prom: Promise<Event>;
    // private resolve: (e: Event) => void;
    // private reject: (reason: any) => void;
    // private closed: boolean = false;
    private abortController: AbortController;
    private name: string;
    private subscriptions: (Subscription<Event> | null)[] = [];
    private freeIndexes: number[] = [];
    private secret = Math.random();
}


export async function waitForOneOf(eventBus: EventBus<unknown>, ...eventTypes: string[]): Promise<unknown> {
    const subscr = eventBus.subscribe();

    try {
        const e: any = await subscr.nextEventWith((e: any) => typeof (e.type) === 'string' && eventTypes.indexOf(e.type) !== -1);

        if (typeof (e.type) !== 'string') throw new Error('Unexpected event: ' + JSON.stringify(e));
        return e;

    } finally {
        subscr.unsubscribe();
    }

}

export type EventBusOrSubscription<T> = {
    bus: EventBus<T>
} | {
    subscr: Subscription<T>
}

export async function waitForGuard<Guard extends RuntypeBase<unknown>>(eventBusOrSubscription: EventBusOrSubscription<unknown>, guard: Guard, signal?: AbortSignal): Promise<Static<typeof guard>> {

    const subscr = 'bus' in eventBusOrSubscription ? eventBusOrSubscription.bus.subscribe() : eventBusOrSubscription.subscr;
    try {
        const res = await subscr.nextEventWith((e) => guard.guard(e), signal);
        return res;
    } finally {
        if ('eventBus' in eventBusOrSubscription) {
            subscr.unsubscribe();
        }
    }
}
