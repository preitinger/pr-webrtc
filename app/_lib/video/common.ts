
// // TODO maybe move UserStateDoc to server file?
// interface UserStateDoc {
//     /**
//      * user name
//      */
//     _id: string;
//     state: 'subscribed' | 'requestedCaller' | 'requestedCallee' | 'acceptedCaller' | 'acceptedCallee';
//     /**
//      * subscription, callee, or caller respectively to state
//      */
//     data: string;
//     /**
//      * number of entries that have been removed from messages.
//      */
//     msgDelCount: number;
//     /**
//      * webRTC messages for user <_id>
//      */
//     messages: string[];
// }

interface UserStateDoc {
    /**
     * user name
     */
    _id: string;
    state: 'subscribed' | 'requestedCaller' | 'requestedCallee' | 'acceptedCaller' | 'acceptedCallee' | 'hungupCaller' | 'hungupCallee';
    /**
     * subscription, callee, or caller respectively to state
     */
    data: string;
    /**
     * number of all messages including the deleted ones since the creation of this document
     */
    msgCount: number;
    /**
     * webRTC messages for user <_id>
     */
    messages: string[];

}

// user not explicitly in VideoReq because always additionally as 'validatedUser' argument

type VideoReq = ({
    type: 'video-check';
} | {
    type: 'video-offer';
    callee: string;
} | {
    type: 'video-cancel'; // caller cancels his offer
    callee: string;
} | {
    type: 'video-subscribe';
    subscription: string;
} | {
    type: 'video-accept'; // callee accepts the offer
    caller: string;
} | {
    type: 'video-decline'; // callee declines the offer
    caller: string;
} | {
    type: 'video-msg';
    receiver: string;
    /**
     * messages to add for the user in receiver.
     */
    messages: string[];
} | {
    type: 'video-hangup'; // state for other user is updated to hungupCaller or hangupCallee, respectively; own entry is deleted
    caller: string;
    callee: string;
} | {
    type: 'video-delete-caller'; // as confirmation for video-hangup from other user; server deletes the db entry (db entry for other user was deleted on video-hangup)
} | {
    type: 'video-delete-callee'
}) & {
    fetchCount: number;
}

// new:

type VideoResp = {
    type: 'video-resp';
    /**
     * null means hung-up or callee busy
     */
    state: UserStateDoc | null;
} | {
    type: 'auth-failed';
}

// old:

// type VideoResp = {
//     type: 'video-idle';
// } | {
//     type: 'video-busy';
//     caller: string;
//     callee: string;
// } | {
//     type: 'video-offer';
//     caller: string;
//     callee: string;
// } | {
//     type: 'video-accept';
//     caller: string;
//     callee: string;
// } | {
//     type: 'video-msg';
//     caller: string;
//     callee: string;
//     messages: string[];
// } | {
//     type: 'auth-failed';
// }