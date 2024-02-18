import EventBus from "./_lib/EventBus";

const eventBusses: Map<string, EventBus<any>> = new Map<string, EventBus<any>>();

export function useEventBus<Event>(key: string): EventBus<Event> {
    return getEventBus<Event>(key);
}

export function getEventBus<Event>(key: string): EventBus<Event> {
    if (!eventBusses.has(key)) {
        const bus = new EventBus<Event>(key);
        eventBusses.set(key, bus);
        return bus;
    } else {
        return eventBusses.get(key) as EventBus<Event>;
    }

}