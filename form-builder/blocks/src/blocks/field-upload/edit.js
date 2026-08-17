import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, CheckboxControl, Button } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'Upload Settings', 'profile-builder' ) }>
            <CheckboxControl
                label={ __( 'Use Simple Upload', 'profile-builder' ) }
                help={ __( 'Use a simple upload field instead of the WordPress upload.', 'profile-builder' ) }
                checked={ attributes[ 'simple-upload' ] === 'yes' }
                onChange={ ( checked ) => setAttributes( { 'simple-upload': checked ? 'yes' : '' } ) }
            />
            <TextControl
                label={ __( 'Allowed Upload Extensions', 'profile-builder' ) }
                value={ attributes[ 'allowed-upload-extensions' ] }
                onChange={ ( val ) => setAttributes( { 'allowed-upload-extensions': val } ) }
                help={ __( 'Comma-separated list (e.g. .jpg,.png,.pdf). Default .* allows all WP-permitted extensions.', 'profile-builder' ) }
            />
            <TextControl
                label={ __( 'Maximum File Size (MB)', 'profile-builder' ) }
                value={ attributes[ 'max-file-size' ] }
                onChange={ ( val ) => setAttributes( { 'max-file-size': val } ) }
                help={ __( 'Leave empty to use the server upload limit.', 'profile-builder' ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <div style={ { padding: '10px', border: '1px dashed #ccc', textAlign: 'center' } }>
                <Button isSecondary disabled>
                    { __( 'Select File', 'profile-builder' ) }
                </Button>
            </div>
        </BaseFieldEdit>
    );
}
