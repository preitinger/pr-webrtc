import { act, render, screen } from "@testing-library/react"
import Page from "../testThrowIfAborted/page"
// import { AbortSignal as AbortSignalFromNode } from "node-abort-controller";

// const origAbortController = global.AbortController;

// class MyAbortSignal {
//     constructor() {
//         console.warn('constructed my AbortSignal');
//     }
//     aborted = false;

//     throwIfAborted(reason?: any) {
//         if (this.aborted) {
//             throw new Error(reason);
//         }
//     }

//     abort(reason?: any) {

//     }

// }

// // global.AbortSignal = MyAbortSignal;

// class MyAbortController /* extends AbortController */ {
//     constructor() {
//         // super();
//         console.log('constructed MyAbortController, then signal is', this.signal);
//         // this.mySignal = new AbortSignalFromNode();


//         this.mySignal = new MyAbortSignal();

//     }

//     get signal() {
//         console.warn('signal getter');
//         return this.mySignal;
//     }

//     abort() {
//         this.mySignal.aborted = true;
//         // this.mySignal.onabort(new Event('abort'));
//         console.log('my abort');
//     }

//     // private mySignal: AbortSignalFromNode;
//     private mySignal: MyAbortSignal;
// }

// global.AbortController = MyAbortController;
// const OrigAbortSignal = AbortSignal;

jest.useFakeTimers();

function fakeSleep(ms: number): Promise<void> {
    return jest.advanceTimersByTimeAsync(ms);
}

test('/testThrowIfAborted', async () => {
    render(<Page/>)
    screen.debug();
    await fakeSleep(300);
    screen.debug();
    const abortButton = screen.getByRole('abort');
    console.log('abortButton', abortButton);

    act(() => {
        abortButton.click();
    })
    await fakeSleep(10000);
})
