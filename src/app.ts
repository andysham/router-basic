export interface App<Match, Request, Response, MRequest = Request> {
    emit: (req: Request) => Promise<void>
    use: (
        match: Match,
        handler: (req: MRequest, res: Response, next: () => void) => void | Promise<void>
    ) => void
    handle: (match: Match, handler: (req: MRequest, res: Response) => void | Promise<void>) => void
}
