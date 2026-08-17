/**
 * Replace core's root appender with AddFieldButton (mini inserter, not quick inserter).
 * Own host node: core's root appender hides while a block is selected.
 * `sync()` keeps our node last when Gutenberg appends after it.
 */
import { useSelect } from '@wordpress/data';
import { createPortal, useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';

import AddFieldButton from './AddFieldButton';

const PB_CPTS = [ 'wppb-rf-cpt', 'wppb-epf-cpt' ];

// Root list only — a nested appender (Columns / Repeater) renders our
// AddFieldButton from the block's own edit() already.
const ROOT_LIST_SELECTOR = '.block-editor-block-list__layout.is-root-container';
const HOST_CLASS = 'wppb-fb-root-appender';

const RootCanvasAppender = () => {
    const postType = useSelect( ( select ) => select( 'core/editor' ).getCurrentPostType(), [] );
    const isOurPostType = PB_CPTS.includes( postType );

    const [ target, setTarget ] = useState( null );
    // Ref in lockstep with `target` so the observer effect never lists it as a
    // dependency (that would tear down and rebuild the observers on every sync).
    const targetRef = useRef( null );
    const applyTarget = useCallback( ( next ) => {
        if ( targetRef.current === next ) return;
        targetRef.current = next;
        setTarget( next );
    }, [] );

    useEffect( () => {
        if ( ! isOurPostType ) return undefined;

        let frame = 0;
        let canvasDoc = null;
        let canvasObserver = null;

        const schedule = () => {
            if ( frame ) return;
            frame = window.requestAnimationFrame( () => {
                frame = 0;
                sync();
            } );
        };

        const sync = () => {
            const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
            // `document` fallback covers a non-iframed canvas (device preview /
            // older Gutenberg): the block list then lives in the main document.
            const doc = iframe ? iframe.contentDocument : document;

            // Re-point the inner observer whenever the canvas document changes
            // (the iframe is recreated on device-preview switches).
            if ( doc !== canvasDoc ) {
                if ( canvasObserver ) canvasObserver.disconnect();
                canvasDoc = doc;
                canvasObserver = null;
                if ( doc && doc.body ) {
                    canvasObserver = new MutationObserver( schedule );
                    canvasObserver.observe( doc.body, { childList: true, subtree: true } );
                }
            }

            const list = doc ? doc.querySelector( ROOT_LIST_SELECTOR ) : null;
            if ( ! list ) {
                applyTarget( null );
                return;
            }

            // Idempotent: re-running on every canvas mutation must not mutate the
            // DOM again, or the observer would feed itself. Hence the two
            // guards — create only when missing, move only when displaced by a
            // block React appended after it.
            let host = list.querySelector( `:scope > .${ HOST_CLASS }` );
            if ( ! host ) {
                host = doc.createElement( 'div' );
                host.className = HOST_CLASS;
                list.appendChild( host );
            } else if ( list.lastElementChild !== host ) {
                list.appendChild( host );
            }
            applyTarget( host );
        };

        sync();
        // Outer observer: catches the canvas iframe being (re)created.
        const outerObserver = new MutationObserver( schedule );
        outerObserver.observe( document.body, { childList: true, subtree: true } );

        return () => {
            outerObserver.disconnect();
            if ( canvasObserver ) canvasObserver.disconnect();
            if ( frame ) window.cancelAnimationFrame( frame );
        };
    }, [ isOurPostType, applyTarget ] );

    if ( ! isOurPostType || ! target ) return null;

    // No rootClientId → insert at the end of the root list, matching what core's
    // root appender did.
    return createPortal(
        <AddFieldButton label={ __( 'Add field', 'profile-builder' ) } />,
        target
    );
};

registerPlugin( 'wppb-fb-root-canvas-appender', { render: RootCanvasAppender } );

export default RootCanvasAppender;
