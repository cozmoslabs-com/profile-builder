import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'Datepicker Settings', 'profile-builder' ) }>
            <TextControl
                label={ __( 'Default Value', 'profile-builder' ) }
                value={ attributes[ 'default-value' ] }
                onChange={ ( val ) => setAttributes( { 'default-value': val } ) }
            />
            <TextControl
                label={ __( 'Date Format', 'profile-builder' ) }
                value={ attributes[ 'date-format' ] }
                onChange={ ( val ) => setAttributes( { 'date-format': val } ) }
                help={ __( 'Example: mm/dd/yy, dd-mm-yy, etc.', 'profile-builder' ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <input 
                type="text" 
                disabled 
                style={ { width: '100%' } } 
                placeholder={ attributes[ 'date-format' ] || 'mm/dd/yy' }
            />
        </BaseFieldEdit>
    );
}
