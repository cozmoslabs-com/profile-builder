import { useEffect, useRef } from '@wordpress/element';
import { select } from '@wordpress/data';

/**
 * IDs claimed this session before save round-trip. Save-time projection is the real dedup.
 */
const sessionClaimedIds = new Set();

function collectAllIdsFromBlocks( blocks, out = [] ) {
    for ( const b of blocks ) {
        const id = b.attributes?.id;
        if ( typeof id === 'number' && id > 0 ) out.push( id );
        if ( b.innerBlocks && b.innerBlocks.length ) {
            collectAllIdsFromBlocks( b.innerBlocks, out );
        }
    }
    return out;
}

/**
 * Allocate a field ID via REST when `id === 0` on first mount. Failures stay at 0 until save.
 */
const MAX_ALLOCATE_ATTEMPTS = 3;

export function useAllocateFieldId( currentId, setAttributes ) {
    const attempted = useRef( false );
    const failures  = useRef( 0 );

    useEffect( () => {
        if ( currentId > 0 ) return;
        if ( attempted.current ) return;
        attempted.current = true;

        const cfg = ( typeof window !== 'undefined' && window.wppbFb && window.wppbFb.allocate ) || {};
        if ( ! cfg.restRoot || ! cfg.restNonce ) return;

        // Read the tree's claimed ids LAZILY, once, here. A `useSelect` would
        // re-walk the whole block tree in every mounted field block on every
        // core/block-editor emission (Gutenberg emits per keystroke) — O(n²) node
        // visits per keypress on a large form — to feed a value only ever consumed
        // on this one-shot path.
        const currentTreeIds = collectAllIdsFromBlocks( select( 'core/block-editor' ).getBlocks() );

        const claimed = Array.from( new Set( [ ...currentTreeIds, ...sessionClaimedIds ] ) );

        fetch( cfg.restRoot, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-WP-Nonce':   cfg.restNonce,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify( { claimed } ),
        } )
            .then( ( r ) => ( r.ok ? r.json() : null ) )
            .then( ( data ) => {
                const allocated = data && typeof data.id === 'number' ? data.id : 0;
                if ( allocated > 0 ) {
                    sessionClaimedIds.add( allocated );
                    setAttributes( { id: allocated } );
                    return;
                }
                releaseForRetry();
            } )
            .catch( releaseForRetry );

        // A failed allocation used to be one-shot: `attempted` stayed true, the
        // block kept id === 0, and scheduleAttributePersist() bails on id <= 0 —
        // so ALL per-edit persistence for this block was silently dead for the
        // rest of the session (the save-time allocator only covers the on-canvas
        // path, never a not-in-form card). Re-open the gate, bounded, so a later
        // render tries again.
        function releaseForRetry() {
            failures.current += 1;
            if ( failures.current < MAX_ALLOCATE_ATTEMPTS ) attempted.current = false;
        }
    }, [ currentId ] );
}
