import { executeLogin } from "@/app/_lib/chat/login-server";
import { apiPOST } from "@/app/_lib/user-management-server/apiRoutesForServer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    return apiPOST(req, executeLogin);



}

export async function GET(req: Request) {
    console.log('get request on /api/login');
    return NextResponse.json('bla from get');
}