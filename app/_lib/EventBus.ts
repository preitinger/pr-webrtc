import FixedAbortController from "./user-management-client/FixedAbortController";

export type ClosedException = {
    type: 'closed'
};

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

    nextEvent(): Promise<Event> {
        if (this.abortController.signal.aborted) {
            return Promise.reject('Already aborted');
        }
        if (this.pendingEvents.length > 0) {
            const e = this.pendingEvents.splice(0, 1)[0];
            return Promise.resolve(e);
        } else if (this.prom != null) {
            return this.prom;
        } else {
            return (this.prom = new Promise((res, rej) => {
                this.resolve = res;
                this.reject = rej;
            }))
        }
    }

    async nextEventWith(predicate: (e: Event) => boolean): Promise<Event> {
        let e: Event;
        do {
            e = await this.nextEvent();
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
