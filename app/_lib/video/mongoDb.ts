import { Collection, Db, WithId } from "mongodb";
import clientPromise from "../user-management-server/mongodb";
import { ApiResp } from "../user-management-server/user-management-common/apiRoutesCommon";
// import { sendPushMessage } from "../pr-push-api-server/pr-push-api-server";

const dbName = process.env.VIDEO_DB_NAME
console.log('dbName', dbName);

export async function pushMessages(col: Collection<UserStateDoc>, user: string, msg: string[]): Promise<void> {
    const res = await col.updateOne({
        _id: user
    }, {
        $inc: {
            msgCount: msg.length
        },
        $push: {
            messages: {
                $each: msg
            }
        }
    })
    if (!(res.acknowledged && res.matchedCount === 1)) throw new Error(`pushMessages failed (acknowledged=${res.acknowledged}, matchedCount=${res.matchedCount})`)
}

/**
 * removes all
 * @param col 
 */
export async function fetchMessages(col: Collection<UserStateDoc>, user: string, fetchCount: number): Promise<[string[], UserStateDoc | null]> {
    console.log('col', col);
    const res = await col.findOneAndUpdate({
        _id: user,
        // msgCount: {
        //     $gte: fetchCount
        // }
    }, [
        {
            $set: {
                messages: {
                    $slice: [
                        "$messages",
                        {
                            $subtract: [
                                fetchCount,
                                "$msgCount"
                            ]
                        }
                    ]
                }
            },
        }
    ], {
        returnDocument: "after"
    })
    console.log('fetchMessages: res', res, 'user', user, 'fetchCount', fetchCount);

    if (res == null && fetchCount > 0) throw new Error('no db entry when fetchCount > 0');

    const messages = res == null ? [] : res.messages;
    return [messages, res];
}

export async function executeVideoReq(db: Db, validatedUser: string, req: VideoReq): Promise<ApiResp<VideoResp>> {
    switch (req.type) {

        case 'video-offer': {

            console.log('processing video-offer')
            if (validatedUser === req.callee) {
                return {
                    type: 'error',
                    error: "Don't call yourself!"
                }
            }
            const col = db.collection<UserStateDoc>('userState');
            console.log('got col');

            const callerDoc: UserStateDoc = {
                _id: validatedUser,
                state: 'requestedCaller',
                data: req.callee,
                msgCount: 0,
                messages: [],
            }
            const calleeDoc: UserStateDoc = {
                _id: req.callee,
                state: 'requestedCallee',
                data: validatedUser,
                msgCount: 0,
                messages: [],
            }

            if (validatedUser < req.callee) {
                console.log('user < callee');
                try {
                    const callerResp = await col.insertOne(callerDoc);
                    console.log('callerResp', callerResp);

                    if (!callerResp.acknowledged) {
                        return {
                            type: 'error',
                            error: 'insertion of caller not acknowledged'
                        }
                    }

                    try {
                        // const calleeResp = await col.insertOne(calleeDoc)
                        const calleeResp = await col.findOneAndUpdate({
                            _id: req.callee,
                            state: 'subscribed'
                        }, {
                            $set: calleeDoc
                        }, {
                            upsert: true
                        })

                        if (calleeResp != null) {
                            if (calleeResp.state === 'subscribed') {
                                const subscription = JSON.parse(calleeResp.data);
                                try {
                                    // const sendRes = await sendPushMessage(subscription, { caller: validatedUser });
                                    console.warn('web-push removed for testing');
                                } catch (reason) {
                                    console.warn('sendPushMessage failed: ', reason);
                                }
                            }
                        }

                        return {
                            type: 'video-resp',
                            state: callerDoc
                        }

                    } catch (reason: any) {
                        const delRes = await col.deleteOne({
                            _id: validatedUser
                        });
                        let rollbackError = null;
                        if (!delRes.acknowledged) {
                            rollbackError = 'rollback delete for caller was not acknowledged';
                        } else if (delRes.deletedCount !== 1) {
                            rollbackError = 'deleteCount was not 1 at rollback for caller';
                        } else {
                            rollbackError = null;
                        }
                        if (reason.code === 11000) {
                            return rollbackError == null ? {
                                type: 'video-resp',
                                state: null
                            } : {
                                type: 'error',
                                error: rollbackError
                            }
                        } else {
                            return {
                                type: 'error',
                                error: `error on insert for callee (${JSON.stringify(reason)})${rollbackError == null ? '' : ` and error on rollback delete for caller (${rollbackError})`}`
                            }
                        }
                    }

                } catch (reason: any) {
                    if (reason.code === 11000) {
                        try {
                            // important: 0 because a new call!
                            const userState = (await fetchMessages(col, validatedUser, 0))[1];
                            return {
                                type: 'video-resp',
                                state: userState
                            }
                        } catch (reason) {
                            return {
                                type: 'error',
                                error: `error in fetchMessages (${JSON.stringify(reason)})`
                            }
                        }
                    } else {
                        return {
                            type: 'error',
                            error: `error during insertion of caller (${JSON.stringify(reason)})`
                        }
                    }
                }
            } else {
                try {
                    const calleeResp = await col.insertOne(calleeDoc);
                    if (!calleeResp.acknowledged) {
                        return {
                            type: 'error',
                            error: 'insertion of callee not acknowledged'
                        }
                    }

                    try {
                        const callerResp = await col.insertOne(callerDoc);

                        if (!callerResp.acknowledged) {
                            return {
                                type: 'error',
                                error: 'insertion of caller not acknowledged'
                            }
                        }

                        return {
                            type: 'video-resp',
                            state: (await fetchMessages(col, validatedUser, 0))[1]
                        }
                    } catch (reason: any) {
                        const delCalleeRes = await col.deleteOne({
                            _id: req.callee
                        })
                        if (!(delCalleeRes.acknowledged && delCalleeRes.deletedCount === 1)) throw new Error(`rollback deletion of callee failed in video-offer (acknowledged=${delCalleeRes.acknowledged}, deletedCount=${delCalleeRes.deletedCount})`)
                        return {
                            type: 'video-resp',
                            state: (await fetchMessages(col, validatedUser, 0))[1]
                        }
                    }
                } catch (reason: any) {
                    if (reason.code === 11000) {
                        return {
                            type: 'video-resp',
                            state: (await fetchMessages(col, validatedUser, req.fetchCount))[1]
                        }
                    } else {
                        return {
                            type: 'error',
                            error: `error during insertion of callee (${JSON.stringify(reason)})`
                        }
                    }
                }
            }
        }

            break;

        case 'video-check': {

            console.log('processing video-check');
            const col = db.collection<UserStateDoc>('userState');
            return {
                type: 'video-resp',
                state: (await fetchMessages(col, validatedUser, req.fetchCount))[1]
            }
        }

        case 'video-decline': {

            const col = db.collection<UserStateDoc>('userState');

            const doDelete = async (id: string, state: 'requestedCaller' | 'requestedCallee') => {
                const res = await col.deleteOne({
                    _id: id,
                    state: state
                })
                if (!(res.acknowledged && res.deletedCount === 1)) throw new Error(`deletion of ${state} ${id} failed`);
            }

            const doUpdate = async (id: string, oldState: 'requestedCaller' | 'requestedCallee') => {
                const newState = oldState === 'requestedCaller' ? 'hungupCaller' : 'hungupCallee';
                const res = await col.updateOne({
                    _id: id,
                    state: oldState
                }, {
                    $set: {
                        state: newState
                    }
                })
                if (!(res.acknowledged && res.modifiedCount === 1)) throw new Error(`update of ${oldState} ${id} failed`)
            }
            let action1: () => Promise<void>;
            let action2: () => Promise<void>;

            if (req.caller < validatedUser) {
                action1 = () => doUpdate(req.caller, 'requestedCaller');
                action2 = () => doDelete(validatedUser, 'requestedCallee')
            } else {
                action1 = () => doDelete(validatedUser, 'requestedCallee');
                action2 = () => doUpdate(req.caller, 'requestedCaller');
            }

            try {
                await action1();
            } catch (reason) {
                return {
                    type: 'video-resp',
                    state: (await fetchMessages(col, validatedUser, req.fetchCount))[1]
                }
            }
            await action2();
            return {
                type: 'video-resp',
                state: null
            }

            break;
        }

        case 'video-hangup': {

            const col = db.collection<UserStateDoc>('userState');

            if (validatedUser !== req.caller && validatedUser !== req.callee) {
                return {
                    type: 'auth-failed'
                }
            }

            const doDelete = async (id: string, state: 'acceptedCaller' | 'acceptedCallee') => {
                const res = await col.deleteOne({
                    _id: id,
                    state: state
                })
                if (!(res.acknowledged && res.deletedCount === 1)) throw new Error(`deletion of ${state} ${id} failed`);
            }

            const doUpdate = async (id: string, oldState: 'acceptedCaller' | 'acceptedCallee') => {
                const newState = oldState === 'acceptedCaller' ? 'hungupCaller' : 'hungupCallee';
                const res = await col.updateOne({
                    _id: req.callee,
                    state: oldState
                }, {
                    $set: {
                        state: newState
                    }
                })
                if (!(res.acknowledged && res.modifiedCount === 1)) throw new Error(`update of ${oldState} ${id} failed`)
            }

            let action1: () => Promise<void>;
            let action2: () => Promise<void>;
            // always actions in alphabetical order for synchronization because no transaction is used, but 2 single document updates
            // If the order is defined alphabetically the actions always succeed both or fail both except for programming errors ;-)
            if (req.caller < req.callee) {
                if (validatedUser === req.caller) {
                    action1 = () => doDelete(validatedUser, 'acceptedCaller');
                    action2 = () => doUpdate(req.callee, 'acceptedCallee');
                } else {
                    action1 = () => doUpdate(req.caller, 'acceptedCaller');
                    action2 = () => doDelete(req.callee, 'acceptedCallee');
                }
            } else {
                if (validatedUser === req.callee) {
                    action1 = () => doDelete(validatedUser, 'acceptedCallee');
                    action2 = () => doUpdate(req.caller, 'acceptedCaller');
                } else {
                    action1 = () => doUpdate(req.callee, 'acceptedCallee');
                    action2 = () => doDelete(req.caller, 'acceptedCaller');
                }
            }

            try {
                await action1();
            } catch (reason) {
                return {
                    type: 'video-resp',
                    state: (await fetchMessages(col, validatedUser, req.fetchCount))[1]
                }
            }
            await action2();
            return {
                type: 'video-resp',
                state: null
            }

            break;
        }

        case 'video-delete-caller': {

            const col = db.collection<UserStateDoc>('userState');

            const resp = await col.deleteOne({
                _id: validatedUser,
                state: 'hungupCaller'
            })
            console.log('resp of video-delete-caller', resp);
            if (!(resp.acknowledged && resp.deletedCount === 1)) throw new Error(`could not delete hungupCaller ${validatedUser}`)
            return {
                type: 'video-resp',
                state: null
            };
        }

        default:
            return {
                type: 'error',
                error: 'nyi'
            }
    }
}
