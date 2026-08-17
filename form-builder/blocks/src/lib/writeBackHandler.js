/**
 * Shared write-back: apply sanitized server values only if the user has not typed past them.
 */

/**
 * @param {Object}   opts
 * @param {Function} opts.getBlock
 * @param {Function} opts.updateBlockAttributes
 * @param {Function} [opts.markNonPersistent]
 * @returns {Function} `(clientId) => (sanitizedDiff, sentPatch) => void`
 */
export function makeWriteBackHandler( { getBlock, updateBlockAttributes, markNonPersistent } ) {
    return ( clientId ) => ( sanitizedDiff, sentPatch ) => {
        const current = getBlock( clientId );
        if ( ! current || ! current.attributes ) return;

        const safeUpdates = {};
        for ( const k of Object.keys( sanitizedDiff ) ) {
            // Apply only if the block's value still equals what we sent —
            // protects in-progress typing.
            // When sentPatch doesn't include the key (server volunteered it,
            // e.g. auto-gen), we require the block's current value to still
            // be empty so we never clobber explicit input.
            if ( sentPatch[ k ] !== undefined ) {
                if ( current.attributes[ k ] === sentPatch[ k ] ) {
                    safeUpdates[ k ] = sanitizedDiff[ k ];
                }
            } else if ( ! current.attributes[ k ] ) {
                safeUpdates[ k ] = sanitizedDiff[ k ];
            }
        }

        if ( Object.keys( safeUpdates ).length === 0 ) return;

        if ( typeof markNonPersistent === 'function' ) markNonPersistent();
        updateBlockAttributes( clientId, safeUpdates );
    };
}
