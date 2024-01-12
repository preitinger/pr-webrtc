import { executeLogout } from "@/app/_lib/chat/logout-server";
import { apiPOST } from "@/app/_lib/user-management-server/apiRoutesForServer";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    return apiPOST(req, executeLogout);
}
