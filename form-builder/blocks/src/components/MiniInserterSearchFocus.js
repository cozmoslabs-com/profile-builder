/**
 * Focus the mini inserter search field when its popover opens.
 *
 * Inserter hardcodes popover focus with no seam; WP 7.0's first tabbable is the
 * tab button, not search. Re-assert for a few frames (core steals focus once via
 * setTimeout), then stop on real user input. Docked inserter and tab switches
 * are left alone.
 */
import { useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { registerPlugin } from '@wordpress/plugins';

import { getMiniInserterTarget, subscribeMiniInserterTarget } from '../lib/miniInserterTarget';

const PB_CPTS = [ 'wppb-rf-cpt', 'wppb-epf-cpt' ];

const POPOVER_SELECTOR = '.block-editor-inserter__popover';

// Hard cap; only real frames count so a slow mount doesn't eat the budget.
const MAX_FRAMES = 12;

// Enough consecutive focused frames to outlast core's focus-first-tabbable timeout.
const SETTLED_FRAMES = 3;

/**
 * Visible tab's search input (both panels stay mounted; inactive is `hidden`).
 *
 * @param {Element} popover The open inserter popover.
 * @return {?HTMLInputElement} The visible search input, or null.
 */
const visibleSearchInput = ( popover ) => {
    for ( const search of popover.querySelectorAll( '.block-editor-inserter__search' ) ) {
        if ( search.closest( '[hidden]' ) ) continue;
        const input = search.querySelector( 'input' );
        if ( input ) return input;
    }
    return null;
};

/**
 * Keep search focused for the first few frames of the popover's life.
 *
 * @return {Function} Cancels the loop; idempotent.
 */
const assertSearchFocus = () => {
    let frames = 0;
    let settled = 0;
    let raf = 0;

    const stop = () => {
        if ( raf ) window.cancelAnimationFrame( raf );
        raf = 0;
        document.removeEventListener( 'pointerdown', stop, true );
        document.removeEventListener( 'keydown', stop, true );
    };

    const tick = () => {
        raf = 0;
        if ( frames++ >= MAX_FRAMES || settled >= SETTLED_FRAMES ) {
            stop();
            return;
        }

        const popover = document.querySelector( POPOVER_SELECTOR );
        const input = popover ? visibleSearchInput( popover ) : null;
        if ( input ) {
            if ( input.ownerDocument.activeElement === input ) {
                settled++;
            } else {
                settled = 0;
                // preventScroll: popover is still positioning; scroll-into-view yanks the canvas.
                input.focus( { preventScroll: true } );
            }
        }

        raf = window.requestAnimationFrame( tick );
    };

    document.addEventListener( 'pointerdown', stop, true );
    document.addEventListener( 'keydown', stop, true );
    raf = window.requestAnimationFrame( tick );

    return stop;
};

const MiniInserterSearchFocus = () => {
    const isOurPostType = useSelect(
        ( select ) => PB_CPTS.includes( select( 'core/editor' ).getCurrentPostType() ),
        []
    );

    useEffect( () => {
        if ( ! isOurPostType ) return undefined;

        // Destination store already published by AddFieldButton / CanvasPointInserter.
        let cancel = null;
        const onTargetChange = () => {
            if ( ! getMiniInserterTarget().open ) {
                if ( cancel ) cancel();
                cancel = null;
                return;
            }
            // Destination change is not a reopen — don't restart the loop.
            if ( ! cancel ) cancel = assertSearchFocus();
        };

        const unsubscribe = subscribeMiniInserterTarget( onTargetChange );
        onTargetChange();

        return () => {
            unsubscribe();
            if ( cancel ) cancel();
        };
    }, [ isOurPostType ] );

    return null;
};

registerPlugin( 'wppb-fb-mini-inserter-search-focus', { render: MiniInserterSearchFocus } );

export default MiniInserterSearchFocus;
