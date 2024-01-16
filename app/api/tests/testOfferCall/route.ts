import { apiPOST } from "@/app/_lib/user-management-server/apiRoutesForServer";
import { acceptCall, checkCall, offerCall, rejectCall } from "@/app/_lib/video/video-server";
import { OfferCallReq, OfferCallResp } from "@/app/_lib/video/video-common";
import { NextRequest } from "next/server";
import { TestReq, TestResp } from "./types";
import { ApiResp } from "@/app/_lib/user-management-server/user-management-common/apiRoutesCommon";
import { checkToken } from "@/app/_lib/user-management-server/userManagementServer";


async function executeTestOfferCall(req: TestReq): Promise<ApiResp<TestResp>> {
    const tokenValid = checkToken(req.user, req.token);
    if (!await tokenValid) {
        return {
            type: 'error',
            error: 'Invalid user/token'
        }
    }
    return {
        type: 'success',
        resp: req.req.type === 'offerCall' ? await offerCall(req.user, req.req) 
        : req.req.type === 'acceptCall' ? await acceptCall(req.user, req.req) 
        : req.req.type === 'checkCall' ? await checkCall(req.user, req.req)
        : req.req.type === 'rejectCall' ? await rejectCall(req.user, req.req)
        : {
            type: 'error',
            error: 'Unexpected req.type'
        }
    };
}

export function POST(req: NextRequest) {
    return apiPOST<TestReq, TestResp>(req, executeTestOfferCall);
}
