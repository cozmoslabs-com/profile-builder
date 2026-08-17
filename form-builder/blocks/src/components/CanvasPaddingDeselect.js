/**
 * Click empty canvas padding to deselect (core's padding appender eats the event
 * and would insert `core/paragraph`, which we disallow). Deselect only.
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { select as dataSelect, useDispatch, useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { registerPlugin } from '@wordpress/plugins';

const PB_CPTS = [ 'wppb-rf-cpt', 'wppb-epf-cpt' ];

/**
 * True when the click hit canvas empty space (styles wrapper, or `<html>` in iframe).
 *
 * @param {EventTarget} target
 * @return {boolean}
 */
const isCanvasEmptySpace = ( target ) => {
    const doc = target && target.ownerDocument;
    if ( ! doc ) return false;

    const wrapper = doc.querySelector( '.editor-styles-wrapper' );
    if ( ! wrapper ) return false;
    if ( target === wrapper ) return true;

    // Only when the canvas is iframed: there, `<html>` is part of the canvas.
    // In the non-iframed fallback the wrapper is a plain div and everything
    // outside it is editor chrome, which must not deselect.
    return wrapper === doc.body && target === doc.documentElement;
};

const CanvasPaddingDeselect = () => {
    const postType = useSelect( ( select ) => select( 'core/editor' ).getCurrentPostType(), [] );
    const isOurPostType = PB_CPTS.includes( postType );

    const { clearSelectedBlock } = useDispatch( blockEditorStore );

    useEffect( () => {
        if ( ! isOurPostType ) return undefined;

        const onPointerDown = ( event ) => {
            // Primary button only — a right-click opens a context menu and
            // shouldn't move the selection.
            if ( event.button !== 0 ) return;
            if ( ! isCanvasEmptySpace( event.target ) ) return;

            const editor = dataSelect( blockEditorStore );
            if ( ! editor.getSelectedBlockClientId() && ! editor.hasMultiSelection() ) return;

            clearSelectedBlock();

            // Clearing the store isn't enough: the same `preventDefault()` also
            // cancels the browser's focus shift, and core paints a selection
            // outline off `:focus` alone, so the field would still LOOK selected.
            // `blur()` hands focus to the canvas `<body>` — where a click on the
            // canvas' sides leaves it anyway.
            const doc = event.target.ownerDocument;
            const active = doc.activeElement;
            if ( active && active !== doc.body && typeof active.blur === 'function' ) {
                active.blur();
            }
        };

        let attachedDoc = null;
        let frame = 0;

        const sync = () => {
            const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
            // `document` fallback covers a non-iframed canvas (device preview /
            // older Gutenberg), as in RootCanvasAppender.
            const doc = iframe ? iframe.contentDocument : document;
            if ( doc === attachedDoc ) return;

            if ( attachedDoc ) {
                attachedDoc.removeEventListener( 'pointerdown', onPointerDown, true );
            }
            attachedDoc = doc;
            if ( doc ) {
                doc.addEventListener( 'pointerdown', onPointerDown, true );
            }
        };

        const schedule = () => {
            if ( frame ) return;
            frame = window.requestAnimationFrame( () => {
                frame = 0;
                sync();
            } );
        };

        sync();
        // The canvas iframe is recreated on device-preview switches, which
        // replaces the document we're attached to.
        const observer = new MutationObserver( schedule );
        observer.observe( document.body, { childList: true, subtree: true } );

        return () => {
            observer.disconnect();
            if ( frame ) window.cancelAnimationFrame( frame );
            if ( attachedDoc ) {
                attachedDoc.removeEventListener( 'pointerdown', onPointerDown, true );
            }
        };
    }, [ isOurPostType, clearSelectedBlock ] );

    return null;
};

registerPlugin( 'wppb-fb-canvas-padding-deselect', { render: CanvasPaddingDeselect } );

export default CanvasPaddingDeselect;
