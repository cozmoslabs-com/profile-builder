/**
 * Block copy/cut/paste on PB form CPTs (native clipboard events, not the
 * keyboard-shortcuts store). Pasting a field block would duplicate `meta-name`.
 *
 * Capture-phase on the canvas iframe doc; editable text targets are left alone.
 * Re-attach when the iframe mounts or reloads.
 */

import { registerPlugin } from '@wordpress/plugins';
import { useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';

const PB_CPTS = [ 'wppb-rf-cpt', 'wppb-epf-cpt' ];
const CLIP_EVENTS = [ 'copy', 'cut', 'paste' ];
const ATTACHED_FLAG = 'wppbFbClipboardGuard';

// Non-text inputs: block-level clipboard from these should still be blocked.
const NON_TEXT_INPUT_TYPES = [
    'checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color', 'image',
];

/** True when the target is editable text — leave native clipboard alone. */
function isEditableTextTarget( target ) {
    if ( ! target || typeof target.closest !== 'function' ) return false;
    if ( target.closest( '[contenteditable="true"], [contenteditable=""]' ) ) return true;
    const field = target.closest( 'input, textarea' );
    if ( ! field ) return false;
    if ( field.tagName === 'TEXTAREA' ) return true;
    const type = ( field.getAttribute( 'type' ) || 'text' ).toLowerCase();
    return ! NON_TEXT_INPUT_TYPES.includes( type );
}

function clipboardHandler( event ) {
    if ( isEditableTextTarget( event.target ) ) return;
    event.stopImmediatePropagation();
    event.preventDefault();
}

function attachTo( doc ) {
    if ( ! doc || ! doc.documentElement ) return;
    if ( doc.documentElement.dataset[ ATTACHED_FLAG ] === '1' ) return;
    doc.documentElement.dataset[ ATTACHED_FLAG ] = '1';
    // Doc + window so we win regardless of where Gutenberg attaches.
    const targets = doc.defaultView ? [ doc, doc.defaultView ] : [ doc ];
    for ( const t of targets ) {
        for ( const type of CLIP_EVENTS ) {
            t.addEventListener( type, clipboardHandler, true );
        }
    }
}

/** Canvas iframe doc, or main document as non-iframe fallback. */
function findCanvasDoc() {
    const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
    if ( iframe && iframe.contentDocument ) return iframe.contentDocument;
    if ( document.querySelector( '.editor-styles-wrapper' ) ) return document;
    return null;
}

const DisableBlockClipboard = () => {
    const isOurPostType = useSelect(
        ( select ) => PB_CPTS.includes( select( 'core/editor' ).getCurrentPostType() ),
        []
    );

    useEffect( () => {
        if ( ! isOurPostType ) return undefined;

        let frame = null;
        const scheduleAttach = () => {
            if ( frame ) return;
            frame = requestAnimationFrame( () => {
                frame = null;
                attachTo( findCanvasDoc() );
            } );
        };

        attachTo( findCanvasDoc() );

        const observer = new MutationObserver( scheduleAttach );
        observer.observe( document.body, { childList: true, subtree: true } );

        const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
        if ( iframe ) iframe.addEventListener( 'load', scheduleAttach );

        return () => {
            observer.disconnect();
            if ( frame ) cancelAnimationFrame( frame );
            if ( iframe ) iframe.removeEventListener( 'load', scheduleAttach );
        };
    }, [ isOurPostType ] );

    return null;
};

registerPlugin( 'wppb-fb-disable-block-clipboard', { render: DisableBlockClipboard } );
