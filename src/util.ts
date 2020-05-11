export const asyncFilter = async <T>(xs: T[], filter: (x: T) => Promise<boolean>): Promise<T[]> => {
    const r: T[] = []
    for (const x of xs) if (await filter(x)) r.push(x)
    return r
}

class BasicEventEmitter<T> {
    handlers: ((x: T) => void)[] = []

    once(f: (x: T) => void) {
        this.handlers.push(f)
    }

    emit(x: T) {
        const handlers = this.handlers
        this.handlers = []
        for (const handler of handlers) handler(x)
    }
}

export const externalPromise = <T>(): {
    promise: Promise<T>
    res: (x: T) => void
    rej: (x: any) => void
} => {
    const e = new BasicEventEmitter<{ res: T } | { rej: any }>()
    return {
        promise: new Promise((res, rej) => {
            e.once(r => {
                if ("res" in r) res(r.res)
                else rej(r.rej)
            })
        }),
        res(x) {
            e.emit({ res: x })
        },
        rej(x: any) {
            e.emit({ rej: x })
        },
    }
}
