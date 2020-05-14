import { MATCH_ALL } from "./const"

export type Middleware<Req, Res, Options> = (
    req: Req,
    res: Res,
    next: (cont?: boolean) => void,
    options: Options
) => Promise<void | boolean>
export type Handler<Req, Res, Ret, Options> = (
    req: Req,
    res: Res,
    options: Options
) => Promise<void | Ret>
export interface MatchHandler<Match, Req, Res, Ret, Options> {
    match: Match | typeof MATCH_ALL
    handler: Handler<Req, Res, Ret, Options>
}

interface RouterOptionsProto<Match, Options, Request, Response, Return = void, MRequest = Request> {
    /*
     * A function which specifies when a match parameter should satisfy and incoming request
     */
    matches: (match: Match, request: Request, options: Options) => boolean | Promise<boolean>
    /**
     * Takes an incoming request and mutates it for consumption by middleware and endpoints
     */
    mutateRequest?: (
        request: Request,
        options: Options,
        match: Match | typeof MATCH_ALL
    ) => MRequest | Promise<MRequest>
    /**
     * Decides which endpoint handler best fits the incoming request. Defaults to the first satisfying match, and if none exist, the global MATCH_ALL endpoint.
     */
    preferredHandler?: (
        handlers: MatchHandler<Match, MRequest, Response, Return, Options>[],
        request: Request,
        options: Options
    ) =>
        | MatchHandler<Match, MRequest, Response, Return, Options>
        | undefined
        | Promise<MatchHandler<Match, MRequest, Response, Return, Options> | undefined>
    /**
     * When handlers return data, we can perform an operation as a result.
     */
    captureReturn?: (
        value: Return,
        req: MRequest,
        res: Response,
        options: Options
    ) => void | Promise<void>
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
 * `Return` - The type which may be returned by an endpoint function
 *
 * `MRequest` - Mutated request, the type of the request received by the user in endpoints, by default the same as the input request.
 */
export interface NewRouterOptions<
    Match,
    Options,
    Request,
    Response,
    Return = void,
    MRequest = Request
> extends RouterOptionsProto<Match, Options, Request, Response, Return, MRequest> {
    /**
     * Generates a response object to be given to each middleware and endpoint
     */
    response:
        | Response
        | ((
              match: Match | typeof MATCH_ALL,
              request: Request,
              options: Options,
              mutatedRequest: MRequest
          ) => Response | Promise<Response>)
}

/**
 * The input options for the new rerouter factory function.
 *
 * `Match` - The type of a match parameter
 *
 * `Options` - The options type for the resultant router creator
 *
 * `Request` - The type of the request
 *
 * `Response` - The type of the response given by the parent middleware function
 *
 * `Return` - The type which may be returned by an endpoint function
 *
 * `MRequest` - Mutated request, the type of the request received by the user in endpoints, by default the same as the input request.
 *
 * `MResponse` - Mutated response, the response actually given to endpoints and middleware.
 */
export interface NewRerouterOptions<
    Match,
    Options,
    Request,
    Response,
    Return = void,
    MRequest = Request,
    MResponse = Response
> extends RouterOptionsProto<Match, Options, Request, MResponse, Return, MRequest> {
    /**
     * Generates a response object to be given to each middleware and endpoint, based on the response of the parent router.
     */
    mutateResponse?: (
        response: Response,
        match: Match | typeof MATCH_ALL,
        request: Request,
        options: Options,
        mutatedRequest: MRequest
    ) => MResponse | Promise<MResponse>
}

/**
 * The structure of an app object.
 */
export interface App<Match, Options, Request, Response, Return, MRequest = Request> {
    /**
     * Declare an incoming request.
     * @param req The request.
     */
    emit: (req: Request) => Promise<void>
    /**
     * Declare a middleware function.
     * @param match The match parameter, which decides which requests this middleware filters to.
     * @param handler The middleware function.
     */
    use(
        match: Match,
        handler: (
            req: MRequest,
            res: Response,
            next: (cont?: boolean) => void,
            options: Options
        ) => boolean | void | Promise<boolean | void>
    ): void
    use(
        handler: (
            req: MRequest,
            res: Response,
            next: (cont?: boolean) => void,
            options: Options
        ) => boolean | void | Promise<boolean | void>
    ): void
    /**
     * Declare an endpoint function.
     * @param match The match parameter, which decides which requests this endpoint filters to.
     * @param handler The endpoint function.
     */
    handle(
        match: Match,
        handler: (req: MRequest, res: Response) => Return | void | Promise<Return | void>
    ): void
    handle(handler: (req: MRequest, res: Response) => Return | void | Promise<Return | void>): void
}
