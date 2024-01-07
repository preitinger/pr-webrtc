import clientPromise from "@/app/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export interface ChatLine {
    text: string;
}
export interface ChatRequest {
    chatId: string;
    lines: ChatLine[];
}
export interface ChatResponse {
    lines: ChatLine[];
}

async function chatPost(dbName: string, chatReqProm: Promise<ChatRequest>): Promise<ChatResponse> {
    const client = await clientPromise;
    const db = client.db(dbName);
    return {
        lines: [
            {
                text: '1. Beispielzeile'
            }
        ]
    };

}

// TODO Ne, es ist hoechste Zeit, web sockets zu testen: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket?retiredLocale=de
export async function POST(req: NextRequest) {
    const clientProm = clientPromise;
    const chatReq: ChatRequest = await req.json();
    const client = await clientProm;
    const chatBody: ChatResponse = {
        lines: [
            {
                text: '1. Beispielzeile'
            }
        ]
    }
    return NextResponse.json(chatBody);
}