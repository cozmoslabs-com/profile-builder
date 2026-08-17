/**
 * Read-only Form Shortcode panel (`wppb_fb_form_shortcode`). Register first in index.js.
 */

import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { Button, Notice } from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useCopyToClipboard } from '@wordpress/compose';
import { useState, useEffect } from '@wordpress/element';

// Inline icons (project's inline-SVG convention — no @wordpress/icons dependency).
// NOTE: fill is set via inline `style`, NOT the `fill="none"` attribute.
// Gutenberg's `.components-button svg { fill: currentColor }` beats a presentation
// attribute and would fill the closed rectangles solid (hiding the copy glyph's
// interior lines); an inline style wins over that rule.
const CopyIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" style={ { fill: 'none' } } aria-hidden="true" focusable="false">
        <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" style={ { fill: 'none' } } aria-hidden="true" focusable="false">
        <path d="M5 12l5 5 9-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CopyShortcodeButton = ( { text } ) => {
    const [ copied, setCopied ] = useState( false );
    const ref = useCopyToClipboard( text, () => setCopied( true ) );

    useEffect( () => {
        if ( ! copied ) return undefined;
        const timer = setTimeout( () => setCopied( false ), 2000 );
        return () => clearTimeout( timer );
    }, [ copied ] );

    return (
        <Button
            ref={ ref }
            className="wppb-fb-shortcode-copy"
            showTooltip
            label={ copied ? __( 'Copied!', 'profile-builder' ) : __( 'Copy shortcode', 'profile-builder' ) }
        >
            { copied ? <CheckIcon /> : <CopyIcon /> }
        </Button>
    );
};

const FormShortcodePanel = () => {
    const postType = useSelect(
        ( select ) => select( 'core/editor' ).getCurrentPostType(),
        []
    );
    const [ meta ] = useEntityProp( 'postType', postType, 'meta' );

    if ( ! [ 'wppb-rf-cpt', 'wppb-epf-cpt' ].includes( postType ) ) return null;

    const shortcode = ( meta && meta.wppb_fb_form_shortcode ) || '';

    return (
        <PluginDocumentSettingPanel
            name="wppb-form-shortcode"
            title={ __( 'Form Shortcode', 'profile-builder' ) }
        >
            { shortcode === '' ? (
                <Notice status="warning" isDismissible={ false }>
                    { __( 'The shortcode will be available after you publish this form.', 'profile-builder' ) }
                </Notice>
            ) : (
                <>
                    <p className="wppb-fb-shortcode-intro">
                        { __( 'Use this shortcode on the page where you want the form to be displayed.', 'profile-builder' ) }
                    </p>
                    <div className="wppb-fb-shortcode-box">
                        <code className="wppb-fb-shortcode-code">{ shortcode }</code>
                        <CopyShortcodeButton text={ shortcode } />
                    </div>
                    { /* The title-change caveat only applies when the shortcode
                         carries a title-derived form_name. Default forms embed as
                         a bare [wppb-register] / [wppb-edit-profile], so
                         their shortcode is title-independent — no warning. */ }
                    { shortcode.includes( 'form_name=' ) && (
                        <p className="wppb-fb-shortcode-help">
                            { __( 'Changing the form title also changes the shortcode!', 'profile-builder' ) }
                        </p>
                    ) }
                </>
            ) }
        </PluginDocumentSettingPanel>
    );
};

registerPlugin( 'wppb-form-shortcode-plugin', {
    render: FormShortcodePanel,
} );
