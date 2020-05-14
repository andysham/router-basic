import { RouterError } from "./error"
import { asyncFilter, externalPromise, asyncFind, isBoolean, toAsync } from "./util"
import { NewRouterOptions, Middleware, Handler, MatchHandler, App } from "./types"
import { MATCH_ALL } from "./const"

/**
 * A router factory function.
 * @param o The factory options object.
 * @param o.matches A function which specifies when a match parameter should satisfy and incoming request
 * @param o.mutateRequest Takes an incoming request and mutates it for consumption by middleware and endpoints
 * @param o.response Generates a response object to be given to each middleware and endpoint
 * @param o.preferredHandler Decides which endpoint handler best fits the incoming request. Defaults to the first satisfying match, and if none exist, the global MATCH_ALL endpoint.
 * @returns A router function which takes the described options object, and returns an 'app'.
 */
export const router = <M, O, Req, Res, Ret = void, MReq = Req>({
    matches,
    mutateRequest,
    response,
    preferredHandler,
    captureReturn,
}: NewRouterOptions<M, O, Req, Res, Ret, MReq>) => (
    options: O | ((req: Req) => O | Promise<O>)
): App<M, O, Req, Res, Ret, MReq> => {
    // Middleware / Endpoint handler store
    const middleware: { match: M; handler: Middleware<MReq, Res, O> }[] = []
    const handlers = new Map<M, Handler<MReq, Res, Ret, O>>()

    // Declaring defaults to input parameters
    const getResponse = response instanceof Function ? toAsync(response) : async () => response

    const getMatches = async (
        match: M | typeof MATCH_ALL,
        request: Req,
        options: O
    ): Promise<boolean> => {
        if (match === MATCH_ALL) return true
        return await toAsync(matches)(match, request, options)
    }

    const getRequest = mutateRequest
        ? toAsync(mutateRequest)
        : async (req: Req): Promise<MReq> => {
              // @ts-ignore
              return req
          }
    const getPreferredHandler = preferredHandler
        ? toAsync(preferredHandler)
        : async (
              handlers: MatchHandler<M, MReq, Res, Ret, O>[],
              request: Req,
              options: O
          ): Promise<MatchHandler<M, MReq, Res, Ret, O> | undefined> => {
              return asyncFind(handlers, ({ match }) => getMatches(match, request, options))
          }

    const getCaptureReturn = captureReturn ? toAsync(captureReturn) : async () => {}

    const getOptions = options instanceof Function ? toAsync(options) : async () => options

    // Actual object
    return {
        async emit(req) {
            const options = await getOptions(req)
            // Handle middlewares
            for (const { match, handler } of await asyncFilter(
                middleware,
                async ({ match }) => await getMatches(match, req, options)
            )) {
                const request = await getRequest(req, options, match)
                const response = await getResponse(match, req, options, request)
                const { promise: onNext, res: next } = externalPromise<boolean>()
                const p = async () => {
                    const cont = await handler(
                        request,
                        response,
                        (cont?: boolean) => next(cont ?? true),
                        options
                    )
                    return isBoolean(cont) ? cont : true
                }
                if (!(await Promise.race([p(), onNext]))) return
            }

            // Handle endpoint
            const matchhandler = await getPreferredHandler(
                [...handlers.entries()].map(([match, handler]) => ({ match, handler })),
                req,
                options
            )
            if (matchhandler) {
                const { match, handler } = matchhandler
                const request = await getRequest(req, options, match)
                const response = await getResponse(match, req, options, request)
                const ret = await handler(request, response, options)
                if (ret !== undefined) await getCaptureReturn(ret, request, response, options)
            }
        },
        use() {
            // Declare middleware
            const { match, handler } =
                arguments.length === 2
                    ? { match: arguments[0], handler: arguments[1] }
                    : { match: MATCH_ALL, handler: arguments[0] }
            middleware.push({ match, handler: toAsync(handler) })
        },
        handle() {
            // Declare endpoint
            const { match, handler } =
                arguments.length === 2
                    ? { match: arguments[0], handler: arguments[1] }
                    : { match: MATCH_ALL, handler: arguments[0] }
            if (handlers.has(match))
                throw new RouterError(
                    `Match ${match} already represented by a handler, you cannot have two handlers for the same match.`
                )
            else handlers.set(match, toAsync(handler))
        },
    }
}
