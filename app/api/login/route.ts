import { LoginResponse } from "@/app/lib/Login";
import clientPromise from "@/app/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

interface RTCUser {
    _id: string;
    lastActionDate: Date;
}

export async function POST(req: NextRequest) {
    const j = await req.json();

    if (typeof (j.name) !== 'string') {
        const res: LoginResponse = {
            error: 'name missing',
            users: [],
        }
        return NextResponse.json(res);
    }
    const name = j.name;
    const client = await clientPromise;
    const db = client.db('testWebRTC');
    const usersCol = db.collection<RTCUser>('users');

    return usersCol.deleteMany({
        lastActionDate: {
            $lt: new Date(Date.now() - 60000)
        }
    }).then(async deleteResult => {
        if (!deleteResult.acknowledged) {
            return 'delete of outdated users not acknowledged';
        }
        return null;
    }).then(async error => {
        return usersCol.insertOne({
            _id: name,
            lastActionDate: new Date(),
        }).then((insertOneResult) => {
            if (!insertOneResult.acknowledged) {
                return 'insert not acknowledged';
            }
            return null;
        }).catch(reason => {
            return (reason.code === 11000) ?
                'Probably duplicate user name' :
                'Unknown error: ' + reason.toString()
        }).then(async (error) => {
            return usersCol.find<RTCUser>({}, {
                projection: {
                    _id: 1
                }
            }).toArray().then(users => {
                const res: LoginResponse = {
                    error: error,
                    users: users.map(rtcUser => rtcUser._id)
                }
                return res;
            })
        })

    }).then(loginRes => NextResponse.json(loginRes));

}

export async function GET(req: Request) {
    console.log('get request on /api/login');
    return NextResponse.json('bla from get');
}