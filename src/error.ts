/**
 * Any error related to routing issues.
 */
export class RouterError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "RouterError"
    }
}
