import * as rt  from "runtypes"
import { LoginResultData } from "./_lib/chat/chat-client"
import { WithVideo } from "./_lib/video/DoWebRTCStuff"

export const LoginClicked = rt.Record({
    type: rt.Literal('LoginClicked')
})
export type LoginClicked = rt.Static<typeof LoginClicked>
export const RegisterClicked = rt.Record({
    type: rt.Literal('RegisterClicked')
})
export type RegisterClicked = rt.Static<typeof RegisterClicked>
export const StartPageProps = rt.Record({})
export type StartPageProps = rt.Static<typeof StartPageProps>

export const StartPage = rt.Record({
    type: rt.Literal('StartPage'),
    props: rt.Union(StartPageProps, rt.Null)
})
export type StartPage = rt.Static<typeof StartPage>

export const LoginOrRegisterDlgProps = rt.Record({
    user: rt.String,
    passwd: rt.String,
    error: rt.Union(rt.String, rt.Null)
})
export type LoginOrRegisterDlgProps = rt.Static<typeof LoginOrRegisterDlgProps>
export const LoginDlg = rt.Record({
    type: rt.Literal('LoginDlg'),
    props: rt.Union(LoginOrRegisterDlgProps, rt.Null)
})
export type LoginDlg = rt.Static<typeof LoginDlg>
export const RegisterDlg = rt.Record({
    type: rt.Literal('RegisterDlg'),
    props: rt.Union(LoginOrRegisterDlgProps, rt.Null)
})
export type RegisterDlg = rt.Static<typeof RegisterDlg>

export const LoginOrRegisterOk = rt.Record({
    type: rt.Literal('LoginOrRegisterOk'),
    user: rt.String,
    passwd: rt.String
})
export type LoginOrRegisterOk = rt.Static<typeof LoginOrRegisterOk>

export const CancelClicked = rt.Record({
    type: rt.Literal('CancelClicked'),
})
export type CancelClicked = rt.Static<typeof CancelClicked>

export const Busy = rt.Record({
    type: rt.Literal('Busy'),
    comment: rt.Union(rt.String, rt.Null)
})
export type Busy = rt.Static<typeof Busy>

export const FetchError = rt.Record({
    type: rt.Literal('FetchError'),
    error: rt.String
})
export type FetchError = rt.Static<typeof FetchError>

export const CallStarted = rt.Record({
    type: rt.Literal('CallStarted'),
})
export type CallStarted = rt.Static<typeof CallStarted>

export const CallStopped = rt.Record({
    type: rt.Literal('CallStopped'),
})
export type CallStopped = rt.Static<typeof CallStopped>

export const LogoutClicked = rt.Record({
    type: rt.Literal('LogoutClicked'),
})
export type LogoutClicked = rt.Static<typeof LogoutClicked>

export const ChatStart = rt.Record({
    type: rt.Literal('ChatStart'),
    loginResultData: LoginResultData
})
export type ChatStart = rt.Static<typeof ChatStart>

export const ChatStop = rt.Record({
    type: rt.Literal('ChatStop'),
})
export type ChatStop = rt.Static<typeof ChatStop>

export const AuthFailed = rt.Record({
    type: rt.Literal('AuthFailed'),
})
export type AuthFailed = rt.Static<typeof AuthFailed>

export const WaitForPushClicked = rt.Record({
    type: rt.Literal('WaitForPushClicked'),
})
export type WaitForPushClicked = rt.Static<typeof WaitForPushClicked>

export const ChatAddErrorLine = rt.Record({
    type: rt.Literal('ChatAddErrorLine'),
    error: rt.String
})
export type ChatAddErrorLine = rt.Static<typeof ChatAddErrorLine>

export const ChatAddHintLine = rt.Record({
    type: rt.Literal('ChatAddHintLine'),
    hint: rt.String
})
export type ChatAddHintLine = rt.Static<typeof ChatAddHintLine> 

// export const ShowFetchErrorDuringLogin = rt.Record({
//     type: rt.Literal('ShowFetchErrorDuringLogin'),
//     error: rt.Union(rt.String, rt.Null)
// })
// export type ShowFetchErrorDuringLogin = rt.Static<typeof ShowFetchErrorDuringLogin>

export const TryAgainClicked = rt.Record({
    type: rt.Literal('TryAgainClicked'),
})
export type TryAgainClicked = rt.Static<typeof TryAgainClicked>

export const SetCallActive = rt.Record({
    type: rt.Literal('SetCallActive'),
    active: rt.Boolean
})
export type SetCallActive = rt.Static<typeof SetCallActive>

export const SetFetchErrorState = rt.Record({
    type: rt.Literal('SetFetchErrorState'),
    state: rt.Boolean
})
export type SetFetchErrorState = rt.Static<typeof SetFetchErrorState>

export const FetchingSetInterrupted = rt.Record({
    type: rt.Literal('FetchingSetInterrupted'),
    interrupted: rt.Boolean
})
export type FetchingSetInterrupted = rt.Static<typeof FetchingSetInterrupted>

export const EmptyPropsOrNull = rt.Union(rt.Record({}), rt.Null);
export type EmptyPropsOrNull = rt.Static<typeof EmptyPropsOrNull>

export const AuthFailedDlg = rt.Record({
    type: rt.Literal('AuthFailedDlg'),
    props: EmptyPropsOrNull
})
export type AuthFailedDlg = rt.Static<typeof AuthFailedDlg>

export const SetupPushProps = rt.Record({
    error: rt.Union(rt.String, rt.Null)
})
export type SetupPushProps = rt.Static<typeof SetupPushProps>

export const SetupPushDlg = rt.Record({
    type: rt.Literal('SetupPushDlg'),
    props: rt.Union(rt.Null, SetupPushProps)
})
export type SetupPushDlg = rt.Static<typeof SetupPushDlg>

export const AwaitPushDlg = rt.Record({
    type: rt.Literal('AwaitPushDlg'),
    props: EmptyPropsOrNull
})
export type AwaitPushDlg = rt.Static<typeof AwaitPushDlg>

export const CloseClicked = rt.Record({
    type: rt.Literal('CloseClicked'),
})
export type CloseClicked = rt.Static<typeof CloseClicked>

export const UseHereClicked = rt.Record({
    type: rt.Literal('UseHereClicked'),
})
export type UseHereClicked = rt.Static<typeof UseHereClicked>

export const OkClicked = rt.Record({
    type: rt.Literal('OkClicked'),
})
export type OkClicked = rt.Static<typeof OkClicked>

export const VideoConfigValue = rt.Union(rt.Literal('always'), rt.Literal('never'), rt.Literal('individually'))
export type VideoConfigValue = rt.Static<typeof VideoConfigValue>

export const RegularPageProps = rt.Record({
    sendVideo: VideoConfigValue,
    receiveVideo: VideoConfigValue
})
export type RegularPageProps = rt.Static<typeof RegularPageProps>

export const ConfigSendVideoChanged = rt.Record({
    type: rt.Literal('ConfigSendVideoChanged'),
    sendVideo: VideoConfigValue
})
export type ConfigSendVideoChanged = rt.Static<typeof ConfigSendVideoChanged>

export const ConfigReceiveVideoChanged = rt.Record({
    type: rt.Literal('ConfigReceiveVideoChanged'),
    receiveVideo: VideoConfigValue
})
export type ConfigReceiveVideoChanged = rt.Static<typeof ConfigReceiveVideoChanged>

export const RegularPage = rt.Record({
    type: rt.Literal('RegularPage'),
    props: rt.Union(RegularPageProps, rt.Null)
})
export type RegularPage = rt.Static<typeof RegularPage>

export const CallClicked = rt.Record({
    type: rt.Literal('CallClicked'),
    callees: rt.Array(rt.String)
})
export type CallClicked = rt.Static<typeof CallClicked>

// export const SetCallButtonText = rt.Record({
//     type: rt.Literal('SetCallButtonText'),
//     text: rt.String
// })
// export type SetCallButtonText = rt.Static<typeof SetCallButtonText>

export const SetPushError = rt.Record({
    type: rt.Literal('SetPushError'),
    error: rt.Union(rt.String, rt.Null)
})
export type SetPushError = rt.Static<typeof SetPushError>

export const RemoteMsg = rt.Union(
    rt.Record({
        type: rt.Literal('prepareCall'),
        videoAccepted: rt.Boolean
    }),
    rt.Record({
        /**
         * also used as 'reject call'
         */
        type: rt.Literal('hangUp'),
    }),
    rt.Record({
        type: rt.Literal('sdp'),
        jsonSdp: rt.String,
        videoAccepted: rt.Boolean
    }),
    rt.Record({
        type: rt.Literal('candidate'),
        jsonCandidate: rt.String
    }),
    rt.Record({
        type: rt.Literal('videoAcception'),
        accepted: rt.Boolean
    })
)
export type RemoteMsg = rt.Static<typeof RemoteMsg>;

export const RemoteMsgReceived = rt.Record({
    type: rt.Literal('RemoteMsgReceived'),
    sender: rt.String,
    msg: RemoteMsg
})
export type RemoteMsgReceived = rt.Static<typeof RemoteMsgReceived>

export const VideoDataSettingsClicked = rt.Record({
    type: rt.Literal('VideoDataSettingsClicked'),
})
export type VideoDataSettingsClicked = rt.Static<typeof VideoDataSettingsClicked>

export const VideoDecision = rt.Record({
    remoteUser: rt.String,
    withVideo: WithVideo
})
export type VideoDecision = rt.Static<typeof VideoDecision>

export const VideoDecisionDictionary = rt.Dictionary(VideoDecision, rt.String)
export type VideoDecisionDictionary = rt.Static<typeof VideoDecisionDictionary>

export const DecideIfWithVideoProps = rt.Record({
    eventBusKey: rt.String,
    decisions: VideoDecisionDictionary
})
export type DecideIfWithVideoProps = rt.Static<typeof DecideIfWithVideoProps>

export const DecideIfWithVideoDlg = rt.Record({
    type: rt.Literal('DecideIfWithVideoDlg'),
    props: rt.Union(DecideIfWithVideoProps, rt.Null)
})
export type DecideIfWithVideoDlg = rt.Static<typeof DecideIfWithVideoDlg>

export const SendVideoChanged = rt.Record({
    type: rt.Literal('SendVideoChanged'),
    remoteUser: rt.String,
    send: rt.Boolean
})
export type SendVideoChanged = rt.Static<typeof SendVideoChanged>

export const ReceiveVideoChanged = rt.Record({
    type: rt.Literal('ReceiveVideoChanged'),
    remoteUser: rt.String,
    receive: rt.Boolean
})
export type ReceiveVideoChanged = rt.Static<typeof ReceiveVideoChanged>

export const RegularFunctionsShutdown = rt.Record({
    type: rt.Literal('RegularFunctionsShutdown'),
})
export type RegularFunctionsShutdown = rt.Static<typeof RegularFunctionsShutdown>

export const PushNotificationsShutdown = rt.Record({
    type: rt.Literal('PushNotificationsShutdown'),
})
export type PushNotificationsShutdown = rt.Static<typeof PushNotificationsShutdown>

export const CallsInterrupt = rt.Record({
    type: rt.Literal('CallsInterrupt'),
})
export type CallsInterrupt = rt.Static<typeof CallsInterrupt>

export const CallsInterruptResult = rt.Record({
    type: rt.Literal('CallsInterruptResult'),
    success: rt.Boolean
})
export type CallsInterruptResult = rt.Static<typeof CallsInterruptResult>

export const CallsCont = rt.Record({
    type: rt.Literal('CallsCont'),
})
export type CallsCont = rt.Static<typeof CallsCont>

export const ModalDlg = rt.Record({
    type: rt.Literal('ModalDlg'),
    msg: rt.String
})
export type ModalDlg = rt.Static<typeof ModalDlg>

export const HandlingFetchError = rt.Record({
    type: rt.Literal('HandlingFetchError'),
    error: rt.Union(rt.Null, rt.String)
})
export type HandlingFetchError = rt.Static<typeof HandlingFetchError>

// TODO This will probably not be used, but a direct callback given from activity ManageCalls to Connection instances
export const VideoSenderCountUpdate = rt.Record({
    type: rt.Literal('VideoSenderCountUpdate'),
    stream: rt.Unknown // reference to MediaStream
})
export type VideoSenderCountUpdate = rt.Static<typeof VideoSenderCountUpdate>

export const LocalMediaStream = rt.Record({
    type: rt.Literal('LocalMediaStream'),
    stream: rt.Unknown
})
export type LocalMediaStream = rt.Static<typeof LocalMediaStream>

export const RemoteMediaStream = rt.Record({
    type: rt.Literal('RemoteMediaStream'),
    remoteUser: rt.String,
    stream: rt.Unknown
})
export type RemoteMediaStream = rt.Static<typeof RemoteMediaStream>

export const EnqueueCall = rt.Record({
    type: rt.Literal('EnqueueCall'),
    remoteUser: rt.String
})
export type EnqueueCall = rt.Static<typeof EnqueueCall>

export const ReceivedCallProps = rt.Record({
    remoteUser: rt.String,
    withVideo: WithVideo
})
export type ReceivedCallProps = rt.Static<typeof ReceivedCallProps>

export const ReceivedCallDlg = rt.Record({
    type: rt.Literal('ReceivedCallDlg'),
    props: rt.Union(rt.Null, ReceivedCallProps)
})
export type ReceivedCallDlg = rt.Static<typeof ReceivedCallDlg>

export const HangUpProps = rt.Record({
    remoteUsers: rt.Array(rt.String)
})
export type HangUpProps = rt.Static<typeof HangUpProps>

export const HangUpDlg = rt.Record({
    type: rt.Literal('HangUpDlg'),
    props: rt.Union(HangUpProps, rt.Null)
})
export type HangUpDlg = rt.Static<typeof HangUpDlg>

/**
 * own user triggered hang-up
 */
export const HangUp = rt.Record({
    type: rt.Literal('HangUp'),
    remoteUsers: rt.Array(rt.String)
})
export type HangUp = rt.Static<typeof HangUp>

export const RemoteHangUp = rt.Record({
    type: rt.Literal('RemoteHangUp'),
    remoteUser: rt.String
})
export type RemoteHangUp = rt.Static<typeof RemoteHangUp>

export const FetchingInterruptedRecursive = rt.Record({
    type: rt.Literal('FetchingInterruptedRecursive'),
    interrupted: rt.Boolean
})
export type FetchingInterruptedRecursive = rt.Static<typeof FetchingInterruptedRecursive>

export const AddToSend = rt.Record({
    type: rt.Literal('AddToSend'),
    receiver: rt.String,
    messages: rt.Array(rt.String)
})
export type AddToSend = rt.Static<typeof AddToSend>

export const AcceptClicked = rt.Record({
    type: rt.Literal('AcceptClicked'),
    remoteUser: rt.String,
})
export type AcceptClicked = rt.Static<typeof AcceptClicked>

export const HangUpClicked = rt.Record({
    type: rt.Literal('HangUpClicked'),
    remoteUser: rt.Union(rt.String, rt.Null)
})
export type HangUpClicked = rt.Static<typeof HangUpClicked>

export const SetCameraTestButton = rt.Record({
    type: rt.Literal('SetCameraTestButton'),
    label: rt.Union(rt.String, rt.Null)
})
export type SetCameraTestButton = rt.Static<typeof SetCameraTestButton>

export const CameraTestClicked = rt.Record({
    type: rt.Literal('CameraTestClicked'),
})
export type CameraTestClicked = rt.Static<typeof CameraTestClicked>

// interface ConnectionProps {
//     remoteUser: string;
//     msg: string | null;
//     stream: MediaStream | null;
// }

export const ConnectionProps = rt.Record({
    remoteUser: rt.String,
    msg: rt.Union(rt.String, rt.Null),
    stream: rt.Union(rt.Null, rt.Unknown)
})
export type ConnectionProps = rt.Static<typeof ConnectionProps>

export const SetConnectionComp = rt.Record({
    type: rt.Literal('SetConnectionComp'),
    remoteUser: rt.String,
    props: rt.Union(ConnectionProps, rt.Null)
})
export type SetConnectionComp = rt.Static<typeof SetConnectionComp>
