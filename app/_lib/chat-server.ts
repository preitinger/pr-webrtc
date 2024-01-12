import { ChatEvent } from "./chat-common";

export type EventDoc = ChatEvent & {
    _id: number;
}

export type UserOnline = {
    /**
     * references db('user').collection('users')._id
     */
    name: string;
    lastAction: Date;
}

export interface ChatDoc {
    _id: string;
    nextEventId: number;
    /**
     * ids of the users who are currently online.
     * usersOnline contains exactly the state after all chat events (including UserEntered and UserLeft events with an id < nextEventId)
     */
    usersOnline: UserOnline[];
}