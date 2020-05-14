export const asyncFilter = async <T>(xs: T[], filter: (x: T) => Promise<boolean>): Promise<T[]> => {
    const r: T[] = []
    for (const x of xs) if (await filter(x)) r.push(x)
    return r
}

export const asyncFind = async <T>(
    xs: T[],
    match: (x: T) => Promise<boolean>
): Promise<T | undefined> => {
    for (const x of xs) if (await match(x)) return x
    return undefined
}

export const toAsync = <A extends any[], R>(
    f: (...args: A) => R | Promise<R>
): ((...args: A) => Promise<R>) => {
    return async (...args): Promise<R> => {
        const r = f(...args)
        return r instanceof Promise ? await r : r
    }
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

export const isBoolean = (x: any): x is boolean => typeof x === "boolean"
