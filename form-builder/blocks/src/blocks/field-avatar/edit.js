import { __ } from '@wordpress/i18n';
import { PanelBody, CheckboxControl, Button, TextControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'Avatar Settings', 'profile-builder' ) }>
            <CheckboxControl
                label={ __( 'Use Simple Upload', 'profile-builder' ) }
                help={ __( 'Use a simple upload field instead of the WordPress upload.', 'profile-builder' ) }
                checked={ attributes[ 'simple-upload' ] === 'yes' }
                onChange={ ( checked ) => setAttributes( { 'simple-upload': checked ? 'yes' : '' } ) }
            />
            <TextControl
                label={ __( 'Avatar Size', 'profile-builder' ) }
                value={ attributes[ 'avatar-size' ] }
                onChange={ ( val ) => setAttributes( { 'avatar-size': val } ) }
                help={ __( 'A value between 20 and 200 (default 100).', 'profile-builder' ) }
            />
            <TextControl
                label={ __( 'Allowed Image Extensions', 'profile-builder' ) }
                value={ attributes[ 'allowed-image-extensions' ] }
                onChange={ ( val ) => setAttributes( { 'allowed-image-extensions': val } ) }
                help={ __( 'Comma-separated list (e.g. .jpg,.png,.gif). Default .* allows .jpg,.jpeg,.gif,.png.', 'profile-builder' ) }
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
            <div style={ { display: 'flex', alignItems: 'center' } }>
                <div style={ { 
                    width: attributes[ 'avatar-size' ] + 'px', 
                    height: attributes[ 'avatar-size' ] + 'px', 
                    backgroundColor: '#eee', 
                    marginRight: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999'
                } }>
                    { __( 'Avatar', 'profile-builder' ) }
                </div>
                <Button isSecondary disabled>
                    { __( 'Select Image', 'profile-builder' ) }
                </Button>
            </div>
        </BaseFieldEdit>
    );
}
