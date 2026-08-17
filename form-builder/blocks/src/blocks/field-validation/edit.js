import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, TextareaControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'Validation Settings', 'profile-builder' ) }>
            <TextareaControl
                label={ __( 'Possible Values', 'profile-builder' ) }
                value={ attributes[ 'validation-possible-values' ] }
                onChange={ ( val ) => setAttributes( { 'validation-possible-values': val } ) }
                help={ __( 'Enter possible values separated by comma.', 'profile-builder' ) }
            />
            <TextControl
                label={ __( 'Custom Error Message', 'profile-builder' ) }
                value={ attributes[ 'custom-error-message' ] }
                onChange={ ( val ) => setAttributes( { 'custom-error-message': val } ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <input 
                type="text" 
                disabled 
                style={ { width: '100%' } } 
                placeholder={ __( 'Validation input...', 'profile-builder' ) }
            />
        </BaseFieldEdit>
    );
}
