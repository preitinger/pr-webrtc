import { ApiResp } from "../user-management-server/user-management-common/apiRoutesCommon";
import { LoginReq, LoginResp } from "./login-common";
import { deleteInactiveUsers, getChatsCol, getDb, getEventsCol } from "./mongoDb";

import { executeLogin as executeUserManagementLogin } from "../user-management-server/userManagementServer";
import { LoginResp as UserManagementLoginResp } from "../user-management-server/user-management-common/login";
import { UserOnline } from "../chat-server";

const inactiveMs = 300000;
// const inactiveMs = 5000;

export async function executeLogin(req: LoginReq): Promise<ApiResp<LoginResp>> {
    // - execute login of user-management-server
    // - remove inactive users
    // - add new user to set ChatDoc.usersOnline
    // - increment nextEventId by one
    // - insert "UserEntered" event to the events collection
    // - return the new user list and the according nextEventId as response

    const userManagementLoginResp: UserManagementLoginResp = await executeUserManagementLogin({
        user: req.user,
        passwd: req.passwd
    });

    if (userManagementLoginResp.type === 'wrongUserOrPasswd') {
        return {
            type: 'authenticationFailed'
        }
    }
    if ((userManagementLoginResp.type === 'error')) {
        return {
            type: 'error',
            error: userManagementLoginResp.error
        }
    }

    // @ts-ignore
    if (userManagementLoginResp.type !== 'success') throw new Error(`Unexpected userManagementLoginResp type: ${userManagementLoginResp.type}`);

    const db = getDb();
    const chatId = Promise.resolve(req.chatId);
    const chatsColProm = getChatsCol(db);
    const eventsColProm = getEventsCol(db, chatId);
    await deleteInactiveUsers(chatsColProm, chatId, eventsColProm, inactiveMs);

    const chatsCol = await chatsColProm;
    const oldChatDoc = await chatsCol.findOneAndUpdate({
        _id: req.chatId,
        // req.user must not yet be in usersOnline
        'usersOnline.name': { $nin: [req.user] }
    }, {
        // then, add new online user
        $addToSet: {
            usersOnline: {
                name: req.user,
                lastAction: new Date()
            }
        },
        // and increment the nextEventId for reserving a UserEntered event, afterwards
        $inc: { nextEventId: 1 }
    })

    let users: UserOnline[];

    if (oldChatDoc != null) {
        const eventsCol = await eventsColProm;
        const insRes = await eventsCol.insertOne({
            _id: oldChatDoc.nextEventId,
            type: 'UserEntered',
            user: req.user
        })
        if (!insRes.acknowledged) throw new Error('insertion of UserEntered event not acknowledged?!');
        users = oldChatDoc.usersOnline;
    } else {
        users = (await chatsCol.findOne({
            _id: req.chatId
        }, {
            projection: {
                usersOnline: 1
            }
        }))?.usersOnline ?? []
    }

    return {
        type: 'success',
        token: userManagementLoginResp.token,
        users: users.map(u => u.name),
        eventIdForUsers: -1
    }
}