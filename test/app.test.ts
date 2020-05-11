import { router } from "../src"

type Match = string

interface Response {
    log: (str: string) => void
}

interface Request {
    endpoint: string
}

test("basic testing", async () => {
    const logged: string[] = []

    const testRouter = router<Match, {}, Request, Response>({
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

    const goodbyeWorldLog = "Looks like we're leaving, huh..."
    app.handle("goodbye-world", (req, res) => {
        res.log(goodbyeWorldLog)
    })

    await app.emit({ endpoint: "hello-world" })
    await app.emit({ endpoint: "goodbye-world" })

    expect(logged).toEqual([helloWorldLog, goodbyeWorldLog])
})
