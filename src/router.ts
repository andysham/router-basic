import { App } from "./app"
import { RouterError } from "./error"
import { asyncFilter, externalPromise } from "./util"

export type Middleware<Req, Res> = (req: Req, res: Res, next: () => void) => Promise<void>
export type Handler<Req, Res> = (req: Req, res: Res) => Promise<void>
export interface MatchHandler<Match, Req, Res> {
    match: Match
    handler: (req: Req, res: Res) => Promise<void>
}

/**
 * The input options for the new router factory function.
 *
 * `Match` - The type of a match parameter
 *
 * `Options` - The options type for the resultant router creator
 *
 * `Request` - The type of the request
 *
 * `Response` - The type of the response utility object given to the user in endpoints
 *
 * `MRequest` - Mutated request, the type of the request received by the user in endpoints, by default the same as the input request.
 */
export interface NewRouterOptions<Match, Options, Request, Response, MRequest = Request> {
    matches: (match: Match, request: Request, options: Options) => boolean | Promise<boolean>
    mutateRequest?: (
        request: Request,
        options: Options,
        match: Match
    ) => MRequest | Promise<MRequest>
    response:
        | Response
        | ((
              match: Match,
              request: Request,
              options: Options,
              mutatedRequest: MRequest
          ) => Response | Promise<Response>)
    preferredHandler?: (
        handlers: MatchHandler<Match, MRequest, Response>[],
        request: Request,
        options: Options
    ) =>
        | MatchHandler<Match, MRequest, Response>
        | undefined
        | Promise<MatchHandler<Match, MRequest, Response> | undefined>
}

export const router = <M, O, Req, Res, MReq = Req>({
    matches,
    mutateRequest,
    response,
    preferredHandler,
}: NewRouterOptions<M, O, Req, Res, MReq>) => (options: O): App<M, Req, Res, MReq> => {
    const middleware: { match: M; handler: Middleware<MReq, Res> }[] = []
    const handlers = new Map<M, Handler<MReq, Res>>()
    const toAsync = <A extends any[], R>(
        f: (...args: A) => R | Promise<R>
    ): ((...args: A) => Promise<R>) => {
        return async (...args): Promise<R> => {
            const r = f(...args)
            return r instanceof Promise ? await r : r
        }
    }

    const getResponse = response instanceof Function ? toAsync(response) : async () => response
    const getMatches = toAsync(matches)
    const getRequest = mutateRequest
        ? toAsync(mutateRequest)
        : async (req: Req): Promise<MReq> => {
              // @ts-ignore
              return req
          }
    const getPreferredHandler = preferredHandler
        ? toAsync(preferredHandler)
        : async (
              handlers: MatchHandler<M, MReq, Res>[],
              request: Req,
              options: O
          ): Promise<MatchHandler<M, MReq, Res> | undefined> => {
              return handlers.find(({ match }) => matches(match, request, options))
          }

    return {
        async emit(req) {
            for (const { match, handler } of await asyncFilter(middleware, ({ match }) =>
                getMatches(match, req, options)
            )) {
                const request = await getRequest(req, options, match)
                const response = await getResponse(match, req, options, request)
                const { promise: onNext, res: next } = externalPromise<undefined>()
                const p = handler(request, response, () => next(undefined))
                await Promise.race([p, onNext])
            }

            const matchhandler = await getPreferredHandler(
                [...handlers.entries()].map(([match, handler]) => ({ match, handler })),
                req,
                options
            )
            if (matchhandler) {
                const { match, handler } = matchhandler
                const request = await getRequest(req, options, match)
                const response = await getResponse(match, req, options, request)
                await handler(request, response)
            }
        },
        use(match, handler) {
            middleware.push({ match, handler: toAsync(handler) })
        },
        handle(match, handler) {
            if (handlers.has(match))
                throw new RouterError(
                    `Match ${match} already represented by a handler, you cannot have two handlers for the same match.`
                )
            else handlers.set(match, toAsync(handler))
        },
    }
}
