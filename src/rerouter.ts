import { Middleware, NewRerouterOptions, App } from "./types"
import { router } from "./router"
import { toAsync } from "./util"

export const reroute = <
    Match,
    Options,
    Request,
    Response,
    Return,
    MRequest = Request,
    MResponse = Response
>({
    matches,
    mutateRequest,
    preferredHandler,
    captureReturn,
    mutateResponse,
}: NewRerouterOptions<Match, Options, Request, Response, Return, MRequest, MResponse>) => {
    const getMutateResponse = mutateResponse
        ? toAsync(mutateResponse)
        : async (response: Response) => (response as unknown) as MResponse

    const routerType = router<
        Match,
        Options,
        { options: Options; req: Request; res: Response },
        MResponse,
        Return,
        MRequest
    >({
        matches: (match, { req }, options) => matches(match, req, options),
        mutateRequest: mutateRequest
            ? ({ req }, options, match) => mutateRequest(req, options, match)
            : undefined,
        preferredHandler: preferredHandler
            ? (handlers, { req }, options) => preferredHandler(handlers, req, options)
            : undefined,
        captureReturn,
        response: (match, { req: request, res: response }, options, mreq) => {
            return getMutateResponse(response, match, request, options, mreq)
        },
    })

    return (): {
        middleware: Middleware<Request, Response, Options>
        app: App<
            Match,
            Options,
            { options: Options; req: Request; res: Response },
            MResponse,
            Return,
            MRequest
        >
    } => {
        const app = routerType(async ({ options }: { options: Options }) => options)

        const middleware = async (
            req: Request,
            res: Response,
            next: (cont?: boolean) => void,
            options: Options
        ) => {
            await app.emit({ req, res, options })
            next(false)
        }

        return { app, middleware }
    }
}
