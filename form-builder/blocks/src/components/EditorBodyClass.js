/**
 * Stamp `wppb-fb-block-editor` on admin + canvas iframe bodies for scoped chrome CSS.
 * Iframe mounts late / reloads — re-stamp on mutations and iframe load.
 */

import { registerPlugin } from '@wordpress/plugins';
import { useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';

const PB_CPTS = [ 'wppb-rf-cpt', 'wppb-epf-cpt' ];
const BODY_CLASS = 'wppb-fb-block-editor';

/** The block-canvas document: the iframe's contentDocument, else null. */
function findCanvasDoc() {
    const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
    if ( iframe && iframe.contentDocument ) return iframe.contentDocument;
    return null;
}

function stamp() {
    if ( document.body ) document.body.classList.add( BODY_CLASS );
    const canvasDoc = findCanvasDoc();
    if ( canvasDoc && canvasDoc.body ) canvasDoc.body.classList.add( BODY_CLASS );
}

const EditorBodyClass = () => {
    const isOurPostType = useSelect(
        ( select ) => PB_CPTS.includes( select( 'core/editor' ).getCurrentPostType() ),
        []
    );

    useEffect( () => {
        if ( ! isOurPostType ) return undefined;

        let frame = null;
        const scheduleStamp = () => {
            if ( frame ) return;
            frame = requestAnimationFrame( () => {
                frame = null;
                stamp();
            } );
        };

        stamp(); // immediate (the iframe may already be present)

        const observer = new MutationObserver( scheduleStamp );
        observer.observe( document.body, { childList: true, subtree: true } );

        const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
        if ( iframe ) iframe.addEventListener( 'load', scheduleStamp );

        return () => {
            observer.disconnect();
            if ( frame ) cancelAnimationFrame( frame );
            if ( iframe ) iframe.removeEventListener( 'load', scheduleStamp );
        };
    }, [ isOurPostType ] );

    return null;
};

registerPlugin( 'wppb-fb-editor-body-class', { render: EditorBodyClass } );
