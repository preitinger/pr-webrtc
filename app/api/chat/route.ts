import { ChatReq, ChatResp } from "@/app/_lib/chat/chat-common";
import { executeChatReq } from "@/app/_lib/chat/mongoDb";
import { apiPOST } from "@/app/_lib/user-management-server/apiRoutesForServer";
import { NextRequest } from "next/server";

// const chatPost = (dbName: string) => async (req: ChatReq): Promise<ChatResp> => {
//     const client = await clientPromise;
//     const db = client.db(dbName);

//     // verify access token
    

//     // TODO nyi
//     return {
//         messages: [],
//         lastMsgId: null
//     }

// }

// const chatDB = 'chats';
// const chatExecutor = chatPost(chatDB);

export function POST(req: NextRequest) {
    return apiPOST<ChatReq, ChatResp>(req, executeChatReq);
}