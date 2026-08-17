/**
 * Form Settings document sidebar panel.
 *
 * Renders the Redirect / Set Role / Ajax / Display Messages controls in the
 * Document sidebar (one panel for both wppb-rf-cpt and wppb-epf-cpt). Values
 * read from / written to virtual flat REST meta keys (wppb_fb_*) which
 * `form-builder-rest-mirror.php` folds into the legacy nested
 * `wppb_*_page_settings` array.
 */

import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { TextControl, SelectControl, ToggleControl } from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';

const FormSettingsPanel = () => {
    const postType = useSelect( ( select ) => select( 'core/editor' ).getCurrentPostType(), [] );
    if ( ! [ 'wppb-rf-cpt', 'wppb-epf-cpt' ].includes( postType ) ) return null;

    const [ meta, setMeta ] = useEntityProp( 'postType', postType, 'meta' );

    if ( ! meta ) return null;

    return (
        <PluginDocumentSettingPanel
            name="wppb-form-settings"
            title={ __( 'Form Settings', 'profile-builder' ) }
        >
            <SelectControl
                label={ __( 'Redirect', 'profile-builder' ) }
                value={ meta.wppb_fb_redirect || '-' }
                options={ [
                    { label: __( 'Default', 'profile-builder' ), value: '-' },
                    { label: __( 'No', 'profile-builder' ), value: 'No' },
                    { label: __( 'Yes', 'profile-builder' ), value: 'Yes' },
                ] }
                onChange={ ( val ) => setMeta( { wppb_fb_redirect: val } ) }
                help={ __( 'Whether to redirect the user to a specific page after submission.', 'profile-builder' ) }
            />

            { meta.wppb_fb_redirect === 'Yes' && (
                <>
                    <TextControl
                        label={ __( 'URL', 'profile-builder' ) }
                        value={ meta.wppb_fb_url || '' }
                        onChange={ ( val ) => setMeta( { wppb_fb_url: val } ) }
                        help={ __( 'Destination URL. Use the format: https://www.example.com', 'profile-builder' ) }
                    />
                    <TextControl
                        label={ __( 'Display Messages (seconds)', 'profile-builder' ) }
                        type="number"
                        min={ 0 }
                        max={ 250 }
                        step={ 1 }
                        value={ String( meta.wppb_fb_display_messages || '1' ) }
                        onChange={ ( val ) => {
                            const n = Math.max( 0, Math.min( 250, parseInt( val, 10 ) || 0 ) );
                            setMeta( { wppb_fb_display_messages: String( n ) } );
                        } }
                        help={ __( 'Allowed time to display any success messages (in seconds). 0 disables.', 'profile-builder' ) }
                    />
                </>
            ) }

            { postType === 'wppb-rf-cpt' && (
                <>
                    <SelectControl
                        label={ __( 'Set Role', 'profile-builder' ) }
                        value={ meta.wppb_fb_set_role || 'default role' }
                        options={ ( window.wppbFb && window.wppbFb.formSettings && window.wppbFb.formSettings.roles ) || [
                            { label: __( 'Default Role', 'profile-builder' ), value: 'default role' },
                        ] }
                        onChange={ ( val ) => setMeta( { wppb_fb_set_role: val } ) }
                        help={ __( 'Role assigned to users registered through this form.', 'profile-builder' ) }
                    />
                    <ToggleControl
                        label={ __( 'Automatically Log In', 'profile-builder' ) }
                        checked={ meta.wppb_fb_automatically_log_in === 'Yes' }
                        onChange={ ( val ) => setMeta( { wppb_fb_automatically_log_in: val ? 'Yes' : 'No' } ) }
                    />
                </>
            ) }

            <ToggleControl
                label={ __( 'Ajax Validation', 'profile-builder' ) }
                checked={ meta.wppb_fb_ajax === 'true' }
                onChange={ ( val ) => setMeta( { wppb_fb_ajax: val ? 'true' : '' } ) }
                help={ __( 'Validate this form without reloading the page.', 'profile-builder' ) }
            />
        </PluginDocumentSettingPanel>
    );
};

registerPlugin( 'wppb-form-settings-plugin', {
    render: FormSettingsPanel,
} );
