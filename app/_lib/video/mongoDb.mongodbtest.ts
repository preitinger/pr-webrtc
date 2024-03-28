import { Db, MongoClient, MongoClientOptions } from "mongodb";
import { executeVideoReq, fetchMessages, pushMessages } from "./mongoDb";

function sleep() {
    return new Promise<void>(res => {
        setTimeout(() => {
            res();
        }, 1000)
    })
}

describe('test for app/_lib/video/mongoDb.ts', () => {
    let connection: MongoClient | null = null;
    let db: Db | null = null;

    beforeAll(async () => {
        const MONGO_URI = process.env.MONGODB_URI;
        if (MONGO_URI == null) return;

        const options: MongoClientOptions = {
        }
        connection = await MongoClient.connect(MONGO_URI, options);
        db = connection.db(process.env.VIDEO_DB_NAME);
    });

    afterAll(async () => {
        if (connection != null) {
            await connection.close();
            connection = null;
            console.log('closed db con');
        }
    });

    test('fetchMessages', async () => {
        expect(db).not.toBeNull();
        if (db == null) return;
        const col = db.collection<UserStateDoc>('testUserState');

        // Fall 1

        {
            const res = await col.replaceOne({
                _id: 'Peter'
            }, {
                state: 'requestedCaller',
                data: 'Markus',
                msgCount: 3,
                messages: ['a', 'b', 'c']
            }, {
                upsert: true
            })

            console.log('res', res);
        }

        {
            const fetchRes = (await fetchMessages(col, 'Peter', 1));
            console.log("fetchRes", fetchRes);
            expect(fetchRes).toEqual([
                ['b', 'c']
                , {
                    _id: 'Peter',
                    state: 'requestedCaller',
                    data: 'Markus',
                    msgCount: 3,
                    messages: ['b', 'c']
                }]);
        }

        { // auch beim 2. mal, falls fetch-antwort verloren geht:
            const fetchRes = (await fetchMessages(col, 'Peter', 1));
            console.log("fetchRes", fetchRes);
            expect(fetchRes).toEqual([
                ['b', 'c']
                , {
                    _id: 'Peter',
                    state: 'requestedCaller',
                    data: 'Markus',
                    msgCount: 3,
                    messages: ['b', 'c']
                }]);
        }

        // Fall 2

        {
            const res = await col.updateOne({
                _id: 'Peter'
            }, {
                $set: {
                    state: 'requestedCaller',
                    data: 'Markus',
                    msgCount: 5,
                    messages: ['a', 'b', 'c']
                }
            }, { upsert: true })
        }

        {
            const fetchRes = await fetchMessages(col, 'Peter', 3);
            console.log('fetch2Res', fetchRes);
            expect(fetchRes).toEqual([['b', 'c'], {
                _id: 'Peter',
                state: 'requestedCaller',
                data: 'Markus',
                msgCount: 5,
                messages: ['b', 'c']
            }])
        }

        // Fall 3

        {
            const res = await col.updateOne({
                _id: 'Peter'
            }, {
                $set: {
                    state: 'requestedCaller',
                    data: 'Markus',
                    msgCount: 5,
                    messages: ['a', 'b', 'c']
                }
            }, { upsert: true })
        }

        {
            const fetchRes = await fetchMessages(col, 'Peter', 1);
            console.log('fetch2Res', fetchRes);
            expect(fetchRes).toEqual([['a', 'b', 'c'], {
                _id: 'Peter',
                state: 'requestedCaller',
                data: 'Markus',
                msgCount: 5,
                messages: ['a', 'b', 'c']
            }])
        }

        // Fall 4

        {
            const res = await col.updateOne({
                _id: 'Peter'
            }, {
                $set: {
                    state: 'requestedCaller',
                    data: 'Markus',
                    msgCount: 5,
                    messages: ['a', 'b', 'c']
                }
            }, {
                upsert: true
            })

            console.log('res', res);
        }

        {
            const fetchRes = await fetchMessages(col, 'Peter', 5);
            console.log("fetchRes", fetchRes);
            expect(fetchRes).toEqual([[], {
                _id: 'Peter',
                state: 'requestedCaller',
                data: 'Markus',
                msgCount: 5,
                messages: []
            }]);
        }

    })

    test('pushMessages', async () => {
        expect(db).not.toBeNull();
        if (db == null) return;
        const col = db.collection<UserStateDoc>('testUserState');

        {
            const res = await col.replaceOne({
                _id: 'Peter'
            }, {
                state: 'requestedCaller',
                data: 'wer',
                msgCount: 0,
                messages: []
            }, {
                upsert: true
            })
            expect(res.acknowledged).toBe(true);
            expect(res.matchedCount + res.upsertedCount).toBe(1);
        }

        await pushMessages(col, 'Peter', ['msg 1', 'msg 2', 'msg 3']);
        expect((await col.findOne({
            _id: 'Peter'
        }))).toEqual({
            _id: 'Peter',
            state: 'requestedCaller',
            data: 'wer',
            msgCount: 3,
            messages: ['msg 1', 'msg 2', 'msg 3']

        })

        await pushMessages(col, 'Peter', []);
        expect((await col.findOne({
            _id: 'Peter'
        }))).toEqual({
            _id: 'Peter',
            state: 'requestedCaller',
            data: 'wer',
            msgCount: 3,
            messages: ['msg 1', 'msg 2', 'msg 3']

        })

        await pushMessages(col, 'Peter', ['msg 4', 'msg 5']);
        expect((await col.findOne({
            _id: 'Peter'
        }))).toEqual({
            _id: 'Peter',
            state: 'requestedCaller',
            data: 'wer',
            msgCount: 5,
            messages: ['msg 1', 'msg 2', 'msg 3', 'msg 4', 'msg 5']
        })

        expect((await fetchMessages(col, 'Peter', 2))[0]).toEqual(
            ['msg 3', 'msg 4', 'msg 5']
        )

        await pushMessages(col, 'Peter', ['msg 6', 'msg 7']);
        expect((await col.findOne({
            _id: 'Peter'
        }))).toEqual({
            _id: 'Peter',
            state: 'requestedCaller',
            data: 'wer',
            msgCount: 7,
            messages: ['msg 3', 'msg 4', 'msg 5', 'msg 6', 'msg 7']
        })
    })

    test('executeVideoReq', async () => {
        if (db == null) throw new Error('db null');
        const col = db.collection<UserStateDoc>('userState');
        {
            // prepare
            const pa = col.deleteOne({
                _id: 'a'
            })
            const pb = col.deleteOne({
                _id: 'b'
            })
            const pc = col.deleteOne({
                _id: 'c'
            })
            
            for (const res of await Promise.all([pa, pb, pc])) {
                console.log('result', res);
            };
        }
        const reqAB: VideoReq = {
            type: 'video-offer',
            callee: 'b',
            fetchCount: 0
        }
        const reqCB = structuredClone(reqAB);
        const offerAB = executeVideoReq(db, 'a', reqAB)
        const offerCB = executeVideoReq(db, 'c', reqCB);
        const expectedRespAB: VideoResp = {
            type: 'video-resp',
            state: null // state null means callee busy and yes, because of racing call from c which makes first the callee entry being inserted because 'b' < 'c'
        }
        const expectedRespCB: VideoResp = {
            type: 'video-resp',
            state: {
                _id: 'c',
                state: 'requestedCaller',
                data: 'b',
                msgCount: 0,
                messages: []
            }
        }
        expect(await offerAB).toEqual(expectedRespAB);
        expect(await offerCB).toEqual(expectedRespCB);
        const reqBCheck: VideoReq = {
            type: 'video-check',
            fetchCount: 0
        }
        const checkB = executeVideoReq(db, 'b', reqBCheck);
        const expectedRespBCheck: VideoResp = {
            type: 'video-resp',
            state: {
                _id: 'b',
                state: 'requestedCallee',
                data: 'c',
                msgCount: 0,
                messages: []
            }
        }
        expect(await checkB).toEqual(expectedRespBCheck);

        const declineB: VideoReq = {
            type: 'video-decline',
            caller: 'c',
            fetchCount: 0
        }
        const declineBResp = executeVideoReq(db, 'b', declineB);
        const expectedDeclineBResp: VideoResp = {
            type: 'video-resp',
            state: null
        }
        expect(await declineBResp).toEqual(expectedDeclineBResp);

        expect(await col.findOne({
            _id: 'b'
        })).toBe(null);

        const expectedCState: UserStateDoc = {
            _id: 'c',
            state: 'hungupCaller',
            data: 'b',
            msgCount: 0,
            messages: []
        }
        expect(await col.findOne({
            _id: 'c'
        })).toEqual(expectedCState);

        const checkC: VideoReq = {
            type: 'video-check',
            fetchCount: 0
        }
        const checkCResp = await executeVideoReq(db, 'c', checkC);
        const expectedCheckCResp: VideoResp = {
            type: 'video-resp',
            state: {
                _id: 'c',
                state: 'hungupCaller',
                data: 'b',
                msgCount: 0,
                messages: []
            }
        }
        expect(checkCResp).toEqual(expectedCheckCResp);

        const deleteC: VideoReq = {
            type: 'video-delete-caller',
            fetchCount: 0
        }
        const deleteCResp = await executeVideoReq(db, 'c', deleteC);
        const expectedDeleteCResp: VideoResp = {
            type: 'video-resp',
            state: null
        }
        expect(deleteCResp).toEqual(expectedDeleteCResp);
    })
})