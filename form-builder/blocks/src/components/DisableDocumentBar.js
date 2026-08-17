/**
 * Drop the document-bar title button from the tab order on PB form CPTs (Layer 12).
 * CSS already blocks pointer events; MutationObserver re-applies tabindex="-1".
 */

import { useEffect } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { registerPlugin } from '@wordpress/plugins';

const PB_CPTS = [ 'wppb-rf-cpt', 'wppb-epf-cpt' ];
const COMMAND_SELECTOR = '.editor-document-bar__command';

const applyTabIndex = () => {
    const btn = document.querySelector( COMMAND_SELECTOR );
    if ( btn && btn.getAttribute( 'tabindex' ) !== '-1' ) {
        btn.setAttribute( 'tabindex', '-1' );
    }
};

const DisableDocumentBar = () => {
    const postType = useSelect(
        ( select ) => select( 'core/editor' ).getCurrentPostType(),
        []
    );
    const isOurPostType = PB_CPTS.includes( postType );

    useEffect( () => {
        if ( ! isOurPostType ) return undefined;

        applyTabIndex();

        const observer = new MutationObserver( applyTabIndex );
        observer.observe( document.body, { childList: true, subtree: true } );
        return () => observer.disconnect();
    }, [ isOurPostType ] );

    return null;
};

registerPlugin( 'wppb-fb-disable-document-bar', { render: DisableDocumentBar } );
