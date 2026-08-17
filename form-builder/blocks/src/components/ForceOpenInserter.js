/**
 * Keep the inserter open on PB form CPTs (field palette, not dismissible).
 * Re-opens on any close; CSS hides the "+" toggle (Layer 8d).
 * Prefers `core/editor`, falls back to `core/edit-post` (pre-WP 6.5).
 */

import { useEffect } from '@wordpress/element';
import { useSelect, select as dataSelect, dispatch as dataDispatch } from '@wordpress/data';
import { registerPlugin } from '@wordpress/plugins';

const PB_CPTS = [ 'wppb-rf-cpt', 'wppb-epf-cpt' ];

// Canonical first, deprecated proxy second.
const INSERTER_STORES = [ 'core/editor', 'core/edit-post' ];

// Open the inserter via whichever store owns the action. Returns true once a
// dispatch target accepts the call.
const openInserter = () => {
    for ( const store of INSERTER_STORES ) {
        const sel = dataSelect( store );
        const dis = dataDispatch( store );
        if (
            sel && typeof sel.isInserterOpened === 'function' &&
            dis && typeof dis.setIsInserterOpened === 'function'
        ) {
            dis.setIsInserterOpened( true );
            return true;
        }
    }
    return false;
};

const ForceOpenInserter = () => {
    const postType = useSelect(
        ( select ) => select( 'core/editor' ).getCurrentPostType(),
        []
    );
    const isOurPostType = PB_CPTS.includes( postType );

    // Subscribe to the inserter open-state on whichever store exposes the
    // selector. Returning a boolean keeps the effect dep stable so it only
    // re-runs on a genuine open↔closed change. Default to `true` when no store
    // exposes the selector so we never thrash trying to open something we can't
    // read.
    const isInserterOpen = useSelect( ( select ) => {
        for ( const store of INSERTER_STORES ) {
            const sel = select( store );
            if ( sel && typeof sel.isInserterOpened === 'function' ) {
                return !! sel.isInserterOpened();
            }
        }
        return true;
    }, [] );

    useEffect( () => {
        if ( ! isOurPostType ) return;
        // Covers the initial open (inserter closed by default on load) and
        // every subsequent close attempt — re-opening on a false state is what
        // makes it un-closable. Re-opening to `true` flips the selector,
        // re-runs this effect with isInserterOpen === true, and no-ops; no loop.
        if ( isInserterOpen === false ) {
            openInserter();
        }
    }, [ isOurPostType, isInserterOpen ] );

    return null;
};

registerPlugin( 'wppb-fb-force-open-inserter', { render: ForceOpenInserter } );
