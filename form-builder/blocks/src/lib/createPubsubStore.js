/**
 * Tiny pub/sub store for `useSyncExternalStore`. `set` short-circuits on
 * `equals` so `get` keeps a stable reference while unchanged.
 *
 * @param {*}        initialState
 * @param {Function} [equals] Default `Object.is`.
 * @returns {{ get, set, subscribe }}
 */
export function createPubsubStore( initialState, equals = Object.is ) {
    let state = initialState;
    const subscribers = new Set();
    return {
        get: () => state,
        set: ( next ) => {
            if ( equals( state, next ) ) return;
            state = next;
            subscribers.forEach( ( fn ) => fn() );
        },
        subscribe: ( fn ) => {
            subscribers.add( fn );
            return () => subscribers.delete( fn );
        },
    };
}
