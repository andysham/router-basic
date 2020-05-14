import { router, reroute } from "../src"

type Match = string

interface Response {
    log: (str: string) => void
}

interface Request {
    endpoint: string
}

test("endpoints", async () => {
    const logged: string[] = []

    const testRouter = router<Match, {}, Request, Response, string>({
        matches: (str, req) => str === req.endpoint,
        response: {
            log(str) {
                logged.push(str)
            },
        },
    })

    const app = testRouter({})

    const helloWorldLog = "Found the hello world endpoint!"
    app.handle("hello-world", (req, res) => {
        res.log(helloWorldLog)
    })

    await app.emit({ endpoint: "hello-world" })

    expect(logged).toEqual([helloWorldLog])
})
test("captured returns", async () => {
    const logged: string[] = []

    const testRouter = router<Match, {}, Request, Response, string>({
        matches: (str, req) => str === req.endpoint,
        response: {
            log(str) {
                logged.push(str)
            },
        },
        captureReturn: (value, _, res) => res.log(value),
    })

    const app = testRouter({})

    const helloWorldLog = "Found the hello world endpoint!"
    app.handle("hello-world", (req, res) => {
        res.log(helloWorldLog)
        return helloWorldLog + 2
    })

    await app.emit({ endpoint: "hello-world" })

    expect(logged).toEqual([helloWorldLog, helloWorldLog + 2])
})

test("middleware", async () => {
    const logged: string[] = []

    const testRouter = router<Match, {}, Request, Response, string>({
        matches: (str, req) => str === req.endpoint,
        response: {
            log(str) {
                logged.push(str)
            },
        },
    })

    const app = testRouter({})

    const everythingLog = "Hey this exists"
    app.use(async (req, res, next) => {
        res.log(everythingLog)
        next()
    })

    const helloWorldLog = "Found the hello world endpoint!"
    app.handle("hello-world", (req, res) => {
        res.log(helloWorldLog)
    })

    const goodbyeWorldLog = "Looks like we're leaving, huh..."
    app.handle("goodbye-world", async (req, res) => {
        res.log(goodbyeWorldLog)
    })

    await app.emit({ endpoint: "hello-world" })
    await app.emit({ endpoint: "goodbye-world" })

    expect(logged).toEqual([everythingLog, helloWorldLog, everythingLog, goodbyeWorldLog])
})

test("reroute", async () => {
    const logged: string[] = []
    const helloWorldLog = "Found the hello world endpoint!"

    const testRouter = router<Match, {}, Request, Response, string>({
        matches: (str, req) => str === req.endpoint,
        response: {
            log(str) {
                logged.push(str)
            },
        },
    })

    const testRerouter = reroute<Match, {}, Request, Response, string>({
        matches: (str, req) => str === req.endpoint,
        mutateResponse: () => ({
            log(str) {
                logged.push("rerouted" + str)
            },
        }),
    })

    const app = testRouter({})
    const { middleware: subappMiddleware, app: subapp } = testRerouter()

    subapp.handle((req, res) => {
        res.log(helloWorldLog)
    })

    app.use("hey-world", subappMiddleware)

    app.handle("hello-world", (req, res) => {
        res.log(helloWorldLog)
    })

    await app.emit({ endpoint: "hello-world" })
    await app.emit({ endpoint: "hey-world" })

    expect(logged).toEqual([helloWorldLog, "rerouted" + helloWorldLog])
})
