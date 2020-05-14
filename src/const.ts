/**
 * When no `match` filter is declared for a given endpoint or middleware, we must
 * give it a default value to work with.
 */
export const MATCH_ALL = Symbol("matchAll")
