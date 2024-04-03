export function forEachReverse<T>(a: T[], f: (t: T)=>any) {
    for (let i = a.length - 1; i >= 0; --i) {
        f(a[i]);
    }
}

export function callEachReverse(toBeCalledReversed: (() => void)[]): void {
    forEachReverse(toBeCalledReversed, f => f());
}