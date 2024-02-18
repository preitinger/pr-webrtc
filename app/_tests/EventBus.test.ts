import EventBus from "../_lib/EventBus";
import PromiseChecker from "../_lib/pr-test-utils/PromiseChecker";

interface TestEvent {
    type: 'test',
    value: number;
}

jest.useFakeTimers();

function fakeSleep(ms: number): Promise<void> {
    return jest.advanceTimersByTimeAsync(ms);
}

describe('EventBus', () => {
    it('offers publish method to publish events', () => {
        const bus: EventBus<TestEvent> = new EventBus<TestEvent>('offers publish');
        const e: TestEvent = {
            type: 'test',
            value: 42,
        }
        bus.publish(e);
    });

    it('offers nextEvent method to wait for the next event', async () => {
        const bus: EventBus<TestEvent> = new EventBus<TestEvent>('offers nextEvent');
        const e: TestEvent = {
            type: 'test',
            value: 42,
        }

        const subscription = bus.subscribe();
        const eventPromise = subscription.nextEvent();
        const checkNextEvent = new PromiseChecker<TestEvent>(eventPromise);
        await fakeSleep(10);
        expect(checkNextEvent.hasRejected()).toBe(false);
        expect(checkNextEvent.hasResolved()).toBe(false);
        const eventPromise2 = subscription.nextEvent();
        const checkNextEvent2 = new PromiseChecker<TestEvent>(eventPromise2);
        await fakeSleep(10);
        expect(checkNextEvent.hasRejected()).toBe(false);
        expect(checkNextEvent.hasResolved()).toBe(false);
        expect(checkNextEvent2.hasRejected()).toBe(false);
        expect(checkNextEvent2.hasResolved()).toBe(false);

        bus.publish(e);
        await fakeSleep(10);
        expect(checkNextEvent.hasRejected()).toBe(false);
        expect(checkNextEvent.hasResolved()).toBe(true);
        expect(checkNextEvent2.hasRejected()).toBe(false);
        expect(checkNextEvent2.hasResolved()).toBe(true);
        expect(await eventPromise2).toEqual(e);
        expect(await eventPromise).toEqual(e);
    })

    it('offers a close method that finishes event publishing and makes the promise from nextEvent() throw a ClosedException', async () => {
        const bus: EventBus<TestEvent> = new EventBus<TestEvent>('offers close');

        const subscription = bus.subscribe();
        const eventPromise = subscription.nextEvent();
        const checkEventPromise = new PromiseChecker<TestEvent>(eventPromise);

        await fakeSleep(10);
        bus.close();
        console.log('after bus.close');
        await fakeSleep(1);
        console.log('after fakeSleep(1)')
        console.log('checkEventPromise', checkEventPromise.hasRejected());
        await (expect(async () => {
            return eventPromise;
        }).rejects.toThrow('Unsubscribed'));

        try {
            await eventPromise
        } catch (reason) {
            console.log('caught during await eventPromise', reason);
        }
        // Yes, its a duplication of the above.
        // Just because my personal trust into these test utilities is just being built ;-)
        expect(checkEventPromise.hasRejected()).toBe(true);

        return eventPromise.catch(reason => {
            console.log('eventPromise threw as expected', reason);
        })

    })

    test('publish throws Exception when the event bus has been closed', async (): Promise<void> => {
        expect.assertions(1);
        const bus: EventBus<TestEvent> = new EventBus<TestEvent>('throws Exception');

        await fakeSleep(10);
        bus.close();
        await fakeSleep(10);
        expect(() => bus.publish({
            type: 'test',
            value: 1
        })).toThrow('Called publish() on the closed EventBus throws Exception')
    })

    test('nextEventWith', async () => {
        const bus: EventBus<TestEvent> = new EventBus<TestEvent>('throws Exception');
        const e1: TestEvent = {
            type: 'test',
            value: 1
        }
        const e2: TestEvent = {
            type: 'test',
            value: 2
        }
        const e3: TestEvent = {
            type: 'test',
            value: 3
        }
        const subscr = bus.subscribe();
        const pred = (e: TestEvent) => e.value === 3;
        const matchingEvent = subscr.nextEventWith(pred);
        bus.publish(e1);
        bus.publish(e2);
        bus.publish(e3);
        expect((await matchingEvent).value).toBe(3);
        subscr.unsubscribe();
        bus.close();
    })

    test('nextEventWith throwing', async () => {
        const bus: EventBus<TestEvent> = new EventBus<TestEvent>('throws Exception');
        const e1: TestEvent = {
            type: 'test',
            value: 1
        }
        const e2: TestEvent = {
            type: 'test',
            value: 2
        }
        const subscr = bus.subscribe();
        const pred = (e: TestEvent) => e.value === 3;
        const matchingEvent = subscr.nextEventWith(pred);
        bus.publish(e1);
        bus.publish(e2);
        await fakeSleep(1000);
        subscr.unsubscribe();
        bus.close();
        await expect(matchingEvent).rejects.toThrow('Unsubscribed');

    })
})