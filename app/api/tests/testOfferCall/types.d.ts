import { ApiResp } from "@/app/_lib/user-management-server/user-management-common/apiRoutesCommon";
import { AcceptCallReq, CheckCallReq, OfferCallReq, OfferCallResp } from "@/app/_lib/video/video-common";

export interface TestReq {
    user: string;
    token: string;
    req: OfferCallReq | CheckCallResp | AcceptCallReq | RejectCallReq;
}

export type TestResp = {
    type: 'success';
    resp: ApiResp<OfferCallResp | CheckCallResp | AcceptCallResp | RejectCallResp>;
}
