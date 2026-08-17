/**
 * Keep fullscreen off on PB form CPTs without writing the global
 * `fullscreenMode` preference. Strip `is-fullscreen-mode` from body and
 * re-strip on MutationObserver (PB CPTs only).
 */

import { useEffect } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { registerPlugin } from '@wordpress/plugins';

const PB_CPTS = [ 'wppb-rf-cpt', 'wppb-epf-cpt' ];
const FULLSCREEN_CLASS = 'is-fullscreen-mode';

const ForceDisableFullscreen = () => {
    const postType = useSelect(
        ( select ) => select( 'core/editor' ).getCurrentPostType(),
        []
    );
    const isOurPostType = PB_CPTS.includes( postType );

    useEffect( () => {
        if ( ! isOurPostType ) return undefined;

        const body = document.body;
        if ( ! body ) return undefined;

        const strip = () => {
            if ( body.classList.contains( FULLSCREEN_CLASS ) ) {
                body.classList.remove( FULLSCREEN_CLASS );
            }
        };

        strip();

        const observer = new MutationObserver( strip );
        observer.observe( body, { attributes: true, attributeFilter: [ 'class' ] } );

        return () => observer.disconnect();
    }, [ isOurPostType ] );

    return null;
};

registerPlugin( 'wppb-fb-force-disable-fullscreen', { render: ForceDisableFullscreen } );
