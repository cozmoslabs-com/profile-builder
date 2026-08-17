import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'Phone Settings', 'profile-builder' ) }>
            <TextControl
                label={ __( 'Phone Format', 'profile-builder' ) }
                value={ attributes[ 'phone-format' ] }
                onChange={ ( val ) => setAttributes( { 'phone-format': val } ) }
                help={ __( 'Use # for numbers (e.g., (###) ###-####).', 'profile-builder' ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <input 
                type="text" 
                disabled 
                style={ { width: '100%' } } 
                placeholder={ attributes[ 'phone-format' ] || __( 'Phone Number', 'profile-builder' ) }
            />
        </BaseFieldEdit>
    );
}
