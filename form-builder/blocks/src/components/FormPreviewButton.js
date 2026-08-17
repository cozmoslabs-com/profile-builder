/**
 * Header "Save and preview" — CPTs are non-public so core has no Preview.
 * Saves first, then opens the front-end preview URL (blank tab opened on gesture).
 */

import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import { Button } from '@wordpress/components';
import { createPortal, useEffect, useState, useCallback } from '@wordpress/element';
import { useSelect, useDispatch, select as dataSelect } from '@wordpress/data';
import { addQueryArgs } from '@wordpress/url';

const SLOT_ATTR = 'data-wppb-fb-preview-slot';
// Newer @wordpress/editor header uses `.editor-header__settings`; classic
// edit-post wraps it as `.edit-post-header__settings`. Match either.
const HEADER_SETTINGS_SELECTOR = '.edit-post-header__settings, .editor-header__settings';

/**
 * Returns the external-link glyph used on the button (inline so we don't take a
 * dependency on @wordpress/icons / the wp-icons script handle).
 */
const ExternalIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <path
            style={ { fill: 'currentColor' } }
            d="M18.2 17c0 .7-.6 1.2-1.2 1.2H7c-.7 0-1.2-.6-1.2-1.2V7c0-.7.6-1.2 1.2-1.2h3.2V4.2H7C5.5 4.2 4.2 5.5 4.2 7v10c0 1.5 1.2 2.8 2.8 2.8h10c1.5 0 2.8-1.2 2.8-2.8v-3.6h-1.5V17zM14.9 3v1.5h3.4l-6.6 6.6 1 1 6.7-6.6v3.4h1.5V3h-6z"
        />
    </svg>
);

/**
 * Finds the header settings region and ensures our portal slot is its first
 * child (so the button renders to the left of the Save/Update button).
 *
 * @return {HTMLElement|null} The slot element, or null if the header isn't mounted yet.
 */
const ensureSlot = () => {
    const settings = document.querySelector( HEADER_SETTINGS_SELECTOR );
    if ( ! settings ) return null;

    let slot = settings.querySelector( `[${ SLOT_ATTR }]` );
    if ( ! slot ) {
        slot = document.createElement( 'div' );
        slot.setAttribute( SLOT_ATTR, '' );
        slot.style.display = 'flex';
        slot.style.alignItems = 'center';
    }
    // Keep it as the first child even if the header re-renders and reorders.
    if ( settings.firstChild !== slot ) {
        settings.insertBefore( slot, settings.firstChild );
    }
    return slot;
};

const FormPreviewButton = () => {
    const { postType, postId, isSaving, isAutosaving } = useSelect( ( select ) => {
        const editor = select( 'core/editor' );
        return {
            postType:     editor.getCurrentPostType(),
            postId:       editor.getCurrentPostId(),
            isSaving:     editor.isSavingPost(),
            isAutosaving: editor.isAutosavingPost(),
        };
    }, [] );

    const { savePost } = useDispatch( 'core/editor' );
    const [ slot, setSlot ] = useState( null );

    const isOurPostType = [ 'wppb-rf-cpt', 'wppb-epf-cpt' ].includes( postType );

    useEffect( () => {
        if ( ! isOurPostType ) return undefined;

        const sync = () => {
            const found = ensureSlot();
            setSlot( ( prev ) => ( prev === found ? prev : found ) );
        };

        // Coalesce a burst of Gutenberg DOM mutations into a single sync per
        // animation frame. Undebounced, the observer invoked sync on every
        // mutation batch on the typing→paint path (INP).
        let frame = 0;
        const scheduleSync = () => {
            if ( frame ) return;
            frame = window.requestAnimationFrame( () => {
                frame = 0;
                sync();
            } );
        };

        sync();
        const observer = new MutationObserver( scheduleSync );
        // Scope to the editor skeleton (the header lives inside it) instead of
        // the whole document body, so admin-chrome mutations don't wake the
        // observer. Fall back to body if the skeleton class ever moves.
        const root = document.querySelector( '.interface-interface-skeleton' ) || document.body;
        observer.observe( root, { childList: true, subtree: true } );
        return () => {
            observer.disconnect();
            if ( frame ) window.cancelAnimationFrame( frame );
        };
    }, [ isOurPostType ] );

    const onPreview = useCallback( () => {
        // Open the tab synchronously within the click gesture to dodge pop-up
        // blockers; redirect it once the save resolves.
        const win = window.open( 'about:blank', '_blank' );

        Promise.resolve( savePost() )
            .then( () => {
                const bridge = ( window.wppbFb && window.wppbFb.preview ) || {};
                const id = dataSelect( 'core/editor' ).getCurrentPostId();
                if ( ! bridge.home || ! id ) {
                    if ( win ) win.close();
                    return;
                }
                const url = addQueryArgs( bridge.home, {
                    wppb_fb_preview: id,
                    _wppbnonce: bridge.nonce,
                } );
                if ( win ) {
                    win.location = url;
                } else {
                    window.open( url, '_blank' );
                }
            } )
            .catch( () => {
                if ( win ) win.close();
            } );
    }, [ savePost ] );

    if ( ! isOurPostType || ! slot ) return null;

    return createPortal(
        <Button
            variant="secondary"
            className="wppb-fb-preview-button"
            icon={ <ExternalIcon /> }
            iconPosition="right"
            onClick={ onPreview }
            disabled={ isSaving && ! isAutosaving }
            aria-haspopup="dialog"
        >
            { __( 'Save and preview', 'profile-builder' ) }
        </Button>,
        slot
    );
};

registerPlugin( 'wppb-fb-form-preview-button', { render: FormPreviewButton } );
