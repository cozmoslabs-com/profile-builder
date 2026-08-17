/**
 * Keep Repeater sub-fields inside their parent (CSS drag gate + drop reconciler).
 * Reconciler is suspended during drag so it does not fight the live preview.
 */

import { registerPlugin } from '@wordpress/plugins';
import { useSelect, useDispatch, select as dataSelect } from '@wordpress/data';
import { useEffect, useRef } from '@wordpress/element';

import { REPEATER_BLOCK_NAME as REPEATER_BLOCK } from '../lib/repeaterBlockName';

/**
 * Build a clientId → { parent, index } position map by walking the entire
 * top-level block tree (one level deep is enough — Repeater InnerBlocks are
 * direct children; we don't currently model nested containers below that).
 */
function buildPositionMap( blocks ) {
    const map = {};
    const walk = ( list, parentClientId ) => {
        for ( let i = 0; i < list.length; i++ ) {
            const b = list[ i ];
            map[ b.clientId ] = { parent: parentClientId, index: i, name: b.name };
            if ( b.innerBlocks && b.innerBlocks.length ) {
                walk( b.innerBlocks, b.clientId );
            }
        }
    };
    walk( blocks, '' );
    return map;
}

/**
 * Locate the root element that should carry the drag-origin CSS classes.
 * In modern WP the editor canvas lives in an iframe; in legacy / non-iframe
 * Gutenberg it's in the main document. Try the iframe first.
 */
function findCanvasRoot() {
    const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
    const doc    = iframe && iframe.contentDocument;
    if ( doc && doc.body ) return doc.body;
    return document.querySelector( '.editor-styles-wrapper' );
}

function useRepeaterScopeGuard() {
    const { positionMap, isDragging, dragOrigin, allowedParentId } = useSelect(
        ( select ) => {
            const ed       = select( 'core/block-editor' );
            const dragged  = ed.getDraggedBlockClientIds ? ed.getDraggedBlockClientIds() : [];
            const dragging = !! ( dragged && dragged.length );

            let origin    = null;
            let parentId  = null;
            if ( dragging ) {
                // Walk the first dragged block's ancestor chain. If any
                // ancestor is a Repeater, the drag originated inside one.
                const firstId  = dragged[ 0 ];
                const parents  = ed.getBlockParents( firstId ) || [];
                for ( let i = parents.length - 1; i >= 0; i-- ) {
                    const p = ed.getBlock( parents[ i ] );
                    if ( p && p.name === REPEATER_BLOCK ) {
                        origin   = 'inside';
                        parentId = parents[ i ];
                        break;
                    }
                }
                if ( ! origin ) origin = 'outside';
            }

            return {
                positionMap:     buildPositionMap( ed.getBlocks() ),
                isDragging:      dragging,
                dragOrigin:      origin,
                allowedParentId: parentId,
            };
        },
        []
    );

    const lastMapRef = useRef( null );
    const { moveBlocksToPosition } = useDispatch( 'core/block-editor' );

    // Effect 1 — CSS overlay. Only the class flip lives here; the `pointer-events`
    // suppression and why it must be anchored at the SENIOR wrapper are documented
    // in style/_repeater-scope.scss. Depends only on dragOrigin + allowedParentId,
    // so it runs at drag start/end and origin transitions — not per frame.
    useEffect( () => {
        const root = findCanvasRoot();
        if ( ! root ) return;

        root.classList.remove( 'wppb-fb-drag-from-outside', 'wppb-fb-drag-from-repeater' );
        const stale = root.querySelectorAll( '.wppb-fb-drag-allowed-parent' );
        for ( const el of stale ) el.classList.remove( 'wppb-fb-drag-allowed-parent' );

        if ( dragOrigin === 'outside' ) {
            root.classList.add( 'wppb-fb-drag-from-outside' );
        } else if ( dragOrigin === 'inside' ) {
            root.classList.add( 'wppb-fb-drag-from-repeater' );
            if ( allowedParentId ) {
                const parentEl = root.querySelector( '[data-block="' + allowedParentId + '"]' );
                if ( parentEl ) parentEl.classList.add( 'wppb-fb-drag-allowed-parent' );
            }
        }
    }, [ dragOrigin, allowedParentId ] );

    // Effect 2 — drop-time reconciler. Skipped during an active drag (the
    // CSS overlay handles that). On every tree change while NOT dragging,
    // diffs against the last stable snapshot and snaps back any cross-
    // boundary moves. Uses a two-pass `expectedMap` pattern and fires at
    // most once per drag (after release).
    useEffect( () => {
        if ( isDragging ) {
            // Freeze the snapshot during the drag. Don't update lastMapRef
            // here — we want the post-drag diff to compare against the
            // pre-drag state.
            return;
        }

        const prev = lastMapRef.current;
        if ( ! prev ) {
            lastMapRef.current = positionMap;
            return;
        }

        const editor = dataSelect( 'core/block-editor' );
        const isRepeaterContainer = ( clientId ) => {
            if ( ! clientId ) return false;
            const b = editor.getBlock( clientId );
            return !! ( b && b.name === REPEATER_BLOCK );
        };

        // Two-pass to avoid an infinite update loop — the ping-pong between the
        // snap-back dispatch and the tree change it triggers. Predict the
        // post-snap state, write it to lastMapRef BEFORE dispatching, then dispatch.
        const expectedMap = { ...positionMap };
        const snapBacks   = [];

        for ( const clientId in positionMap ) {
            if ( ! ( clientId in prev ) ) continue;
            const prevPos = prev[ clientId ];
            const currPos = positionMap[ clientId ];
            if ( prevPos.parent === currPos.parent ) continue;

            const prevWasInRepeater = isRepeaterContainer( prevPos.parent );
            const currIsInRepeater  = isRepeaterContainer( currPos.parent );
            if ( ! prevWasInRepeater && ! currIsInRepeater ) continue;

            snapBacks.push( {
                clientId,
                fromParent: currPos.parent || '',
                toParent:   prevPos.parent || '',
                toIndex:    prevPos.index,
            } );
            expectedMap[ clientId ] = prevPos;
        }

        lastMapRef.current = expectedMap;

        for ( const sb of snapBacks ) {
            moveBlocksToPosition( [ sb.clientId ], sb.fromParent, sb.toParent, sb.toIndex );
        }
    }, [ positionMap, isDragging, moveBlocksToPosition ] );
    // moveBlocksToPosition is stable across renders via Gutenberg's
    // useDispatch memoization, so including it in deps doesn't change
    // re-run frequency — it just keeps the dep array honest and lets the
    // exhaustive-deps lint catch real omissions in future edits.
}

// Inner component runs the hook. Conditionally rendered so the hook (and
// its full block-tree useSelect subscription) doesn't fire on non-PB CPTs.
const RepeaterScopeGuardInner = () => {
    useRepeaterScopeGuard();
    return null;
};

// Outer component gates on post type. Calling the hook on every WP editor
// (posts, pages, every CPT) just to no-op on tree changes is wasted work —
// the hook subscribes to the full block tree.
const RepeaterScopeGuard = () => {
    const postType = useSelect( ( select ) => select( 'core/editor' ).getCurrentPostType(), [] );
    if ( ! [ 'wppb-rf-cpt', 'wppb-epf-cpt' ].includes( postType ) ) return null;
    return <RepeaterScopeGuardInner />;
};

registerPlugin( 'wppb-repeater-scope-guard', { render: RepeaterScopeGuard } );
