import { ApiResp } from "../user-management-server/user-management-common/apiRoutesCommon";
import { LogoutReq, LogoutResp } from "./logout-common";

import { LogoutResp as UserManagementLogoutResp } from "../user-management-server/user-management-common/logout";
import { executeLogout as executeUserManagementLogout } from "../user-management-server/userManagementServer";
import { getChatsCol, getDb, getEventsCol } from "./mongoDb";

export async function executeLogout(req: LogoutReq): Promise<ApiResp<LogoutResp>> {
    const userManagementLogoutResp: UserManagementLogoutResp = await executeUserManagementLogout({
        user: req.user,
        token: req.token
    });

    if (userManagementLogoutResp.type !== 'success') {
        return {
            type: 'error',
            error: userManagementLogoutResp.type === 'error' ? userManagementLogoutResp.error : userManagementLogoutResp.type
        }
    }

    const db = getDb();
    const chatIdProm = Promise.resolve(req.chatId);
    const chatsColProm = getChatsCol(db);
    const chatsCol = await chatsColProm;
    const oldChatDoc = await chatsCol.findOneAndUpdate({
        _id: req.chatId,
        'usersOnline.name': { $in: [req.user] }
    }, {
        $pull: {
            usersOnline: {
                name: req.user
            }
        },
        $inc: {nextEventId: 1 }
    })

    if (oldChatDoc != null) {
        const eventsCol = await getEventsCol(db, chatIdProm);
        const insRes = await eventsCol.insertOne({
            _id: oldChatDoc.nextEventId,
            type: 'UserLeft',
            user: req.user
        })

        if (!insRes.acknowledged) throw new Error('insertion of UserLeft event not acknowledged?!');
    }

    return {
        type: 'success'
    };
}