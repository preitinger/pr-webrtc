import { executeLogin } from "@/app/_lib/chat/login-server";
import { executeLogout } from "@/app/_lib/chat/logout-server";
import { executeChatReq } from "@/app/_lib/chat/mongoDb";
import { accumulatedExecutor, apiPOST } from "@/app/_lib/user-management-server/apiRoutesForServer";
import { AccumulatedReq, AccumulatedResp, ApiResp } from "@/app/_lib/user-management-server/user-management-common/apiRoutesCommon";
import { executeAuthenticatedVideoReq } from "@/app/_lib/video/video-server";
import { NextRequest, NextResponse } from "next/server";

export function POST(req: NextRequest): Promise<NextResponse<ApiResp<AccumulatedResp>>> {
    return apiPOST<AccumulatedReq, AccumulatedResp>(req, accumulatedExecutor({
        'chat': executeChatReq,
        'login': executeLogin,
        'logout': executeLogout,
        'authenticatedVideoReq': executeAuthenticatedVideoReq
    }));
}