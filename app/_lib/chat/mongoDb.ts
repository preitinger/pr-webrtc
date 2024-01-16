import { Collection, Condition, Db, FindCursor, WithId } from "mongodb";
import { ChatEvent, ChatReq, ChatResp } from "./chat-common";
import { transformPasswd } from "../hash";
import clientPromise from "../mongodb";
import { EventDoc, ChatDoc, UserOnline } from "./chat-server";
import { ApiResp } from "../user-management-client/user-management-common/apiRoutesCommon";
import { checkToken, executeLogin } from "../user-management-server/userManagementServer";

//////////////////////////////////////////////////////////// mit class?
class ChatsCol {
    static instance = new ChatsCol('chats');
    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    private async open(): Promise<Collection<ChatDoc>> {
        const client = await clientPromise;
        const db = client.db('chats');
        return db.collection<ChatDoc>(this.name);
    }

    async find(chatId: string): Promise<ChatDoc | null> {
        const chatsCol = await this.open();
        return await chatsCol.findOne({
            _id: chatId
        });
    }
}

/////
const exampleChat = ChatsCol.instance.find('pr-webrtc');
/////

//////////////////////////////////////////////////////////// oder doch funktional?

const chatsColName = 'chats';

export async function getDb(): Promise<Db> {
    const client = await clientPromise;
    return client.db('chats');

}

export async function getChatsCol(db: Promise<Db>): Promise<Collection<ChatDoc>> {
    return (await db).collection<ChatDoc>(chatsColName);
}

export async function getEventsCol(db: Promise<Db>, chatId: Promise<string>) {
    return (await db).collection<EventDoc>((await chatId) + '.events');
}

/**
 * Remove all entries in ChatDoc.usersOnline where lastAction is older than inactiveMs milliseconds.
 * Then, increment nextEventId by the number of those removed entries and insert a corresponding event 'UserLeft'
 * for each of them.
 * @param chatsCol 
 * @param chatId 
 * @param eventsCol 
 * @param inactiveMs
 */
export async function deleteInactiveUsers(chatsCol: Promise<Collection<ChatDoc>>, chatIdProm: Promise<string>, eventsCol: Promise<Collection<EventDoc>>, inactiveMs: number): Promise<void> {
    const limitMs = Date.now() - inactiveMs;
    const lastActionLimit = new Date(limitMs);
    const chatId = await chatIdProm;
    const oldDoc = await (await chatsCol).findOneAndUpdate({
        _id: chatId
    }, {
        $pull: {
            usersOnline: {
                lastAction: {
                    $lt: lastActionLimit
                }
            }
        }
    })

    if (oldDoc == null) return;

    const deletedUsers = oldDoc.usersOnline.filter(d => d.lastAction.getTime() < limitMs);

    if (deletedUsers.length === 0) return;

    const incrementedDoc = await (await chatsCol).findOneAndUpdate({
        _id: chatId
    }, {
        $inc: { nextEventId: deletedUsers.length }
    }, {
        projection: {
            nextEventId: 1
        }
    });

    if (incrementedDoc == null) throw new Error('Collection disappeared during deleteInactiveUsers() ?!');

    const insertRes = await (await eventsCol).insertMany(
        deletedUsers.map((u, i) => ({
            _id: incrementedDoc.nextEventId + i,
            type: 'UserLeft',
            user: u.name
        }))
    );
    if (!insertRes.acknowledged) throw new Error('INsertion of UserLeft events not acknowledged?!');
    if (insertRes.insertedCount !== deletedUsers.length) throw new Error(
        `Deleted ${deletedUsers.length} inactive users, but inserted only ${insertRes.insertedCount}?!`
    );
}

// /**
//  * (1) find users with lastActionDate older than a minute.
//  * (2) remove the users from the ChatEntity document and increment nextEventId by the number of removed users
//  * (3) add a UserLeft event to <chatId>.events for each user to remove
//  * (4) remove the users from the <chatId>.users collection
//  * If user exists in collection <chatId>.users, check passwd. Otherwise, insert new user.
//  * If user exists in ChatDocument.usersOnline, return 
//  * (5) return the new user list and the according nextEventId as response
//  * </ul>
//  */
// async function login(req: Promise<LoginReq>): Promise<LoginResp> {
//     const db = getDb();
//     const chatId = req.then(req => req.chatId);
//     const usersCol = req.then(req => getUsersCol(db, chatId));
//     const inactiveUsers: Promise<string[]> = findInactiveUsers(usersCol, new Date(Date.now() - 60000));
//     const chatsCol = getChatsCol(db);
//     const firstEventId = deleteFromUserList(chatsCol, chatId, inactiveUsers);
//     const user = req.then(req => req.user);
//     const transformedPasswd = req.then(req => transformPasswd(req.user, req.passwd));
//     (await usersCol).findOneAndUpdate({
//         _id: (await user)
//     }, {
//         $setOnInsert: {
//             passwd: await transformedPasswd,
//             lastActive: new Date()
//         }
//     }, {
//         upsert: true
//     }).then(async val => {
//         if (val == null) throw new Error('returned val null though upsert true')
//         if (val.passwd === await transformedPasswd) {

//         }
//     })
// }


////////////////////////////////////////////////////////////

// export type AddUserRes = {
//     type: 'success'
// } | {
//     type: 'error';
//     error: string;
// }

// export async function addUser(chatId: string, userId: string, passwd: string): Promise<AddUserRes> {
//     const client = await clientPromise;
//     const db = client.db('chats');
//     const colName = chatId + '.users';
//     const usersCol = db.collection<UserDoc>(colName);

//     try {
//         const res = await usersCol.insertOne({
//             _id: userId,
//             passwd: transformPasswd(userId, passwd)
//         })

//         if (!res.acknowledged) {
//             console.error(`insert of ${userId} into ${colName} was not acknowledged by MongoDB`);
//             return {
//                 type: 'error',
//                 error: 'insert to <chatId>.users not acknowledged'
//             }
//         }

//         const eventsCol = db.collection<EventDoc>(chatId + '.events');


//         return {
//             type: 'success'
//         }
//     } catch (reason) {
//         console.error('MongoDB error', reason);
//         return {
//             type: 'error',
//             error: 'MongoDB error: ' + JSON.stringify(reason)
//         }
//     }

// }

function eventValue(e: EventDoc): ChatEvent {
    return e.type === 'ChatMsg' ? {
        type: e.type,
        user: e.user,
        text: e.text
    } : e.type === 'UserEntered' ? {
        type: e.type,
        user: e.user,
    } : {
        type: e.type,
        user: e.user
    }
}

export async function executeChatReq(req: ChatReq): Promise<ApiResp<ChatResp>> {
    // await (new Promise<void>((res, rej) => {
    //     setTimeout(() => {
    //         res();
    //     }, 3000)
    // }));
    const tokenValid = checkToken(req.user, req.token);
    const client = await clientPromise;
    const db = client.db('chats');
    const eventsCol = db.collection<EventDoc>(req.chatId + '.events');

    if (! await tokenValid) {
        return {
            type: 'authenticationFailed'
        }
    }

    const msg = req.msg;
    if (msg != null) {
        const nextEventId = await readAndIncrementNextEventId(req.chatId, req.user)
        const insertRes = await eventsCol.insertOne({
            type: 'ChatMsg',
            _id: nextEventId,
            user: req.user,
            text: msg
        });
        if (!insertRes.acknowledged) {
            console.error('insert not acknowledged?!');
            throw new Error('Unexpected: insert not acknowledged');
        }
    } else {
        updateLastAction(req.chatId, req.user);
    }

    const events = await (
        req.lastEventId == null
            ? eventsCol.find()
            : eventsCol.find({
                _id: {
                    $gt: req.lastEventId
                }
            })
    ).toArray();

    // console.log('req.lastEventId', req.lastEventId);
    // console.log('found events', events);

    const eventValues: ChatEvent[] = [];
    let lastId = req.lastEventId;

    if (events.length > 0) {
        let i = 0;
        eventValues.push(eventValue(events[0]))
        lastId = events[0]._id;

        for (i = 1; i < events.length; ++i) {
            if (events[i]._id !== events[i - 1]._id + 1) {
                // If there is a gap, congratulations, a very rare racing occurred. ;-)
                // The function behaves as if the events after the gap had not yet been added.
                // So, they will just be fetched by the next call from the client together with the event(s) that is/are missing, now.
                break;
            } else {
                const e = events[i];
                lastId = e._id;
                eventValues.push(eventValue(e));
            }
        }

    }

    return {
        type: 'success',
        events: eventValues,
        lastEventId: lastId
    }
}

/**
 * 
 * @param chatId reads and increments the field nextEventId.
 * As a side effect, it also updates the field lastAction of user to the current time
 * @param user 
 * @returns 
 */
export async function readAndIncrementNextEventId(chatId: string, user: string): Promise<number> {
    const client = await clientPromise;
    const db = client.db('chats');
    const chatsCol = db.collection<ChatDoc>('chats');

    try {
        const res = await chatsCol.findOneAndUpdate({
            _id: chatId,
            'usersOnline.name': user
        }, {
            // Attention! $inc does implicitly set nextEventId to 0 in the case of an upsert.
            // Adding an entry $setOnInsert for nextEventId is handled as an error by MongoDB!
            $inc: {
                nextEventId: 1
            },

            // NO!: see above
            // $setOnInsert: {
            //     nextEventId: 1
            // }

            $set: {
                'usersOnline.$.lastAction': new Date()
            }
        }, {
            upsert: true,
        })
        return res == null ? 0 : res.nextEventId;
    } catch (reason) {
        console.error(reason);
        throw reason;
    }
}

export async function updateLastAction(chatId: string, user: string) {
    const chatsCol = await getChatsCol(getDb());
    const res = await chatsCol.updateOne({
        _id: chatId,
        'usersOnline.name': user
    }, {
        $set: {
            'usersOnline.$.lastAction': new Date()
        }
    })
    if (!res.acknowledged) throw new Error('update for lastAction was not acknowledged!');
    if (res.modifiedCount !== 1) throw new Error(`Unexpected modifiedCount of update for lastAction: ${res.modifiedCount}`);
}