import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'Last Name Settings', 'profile-builder' ) }>
            <TextControl
                label={ __( 'Default Value', 'profile-builder' ) }
                value={ attributes[ 'default-value' ] }
                onChange={ ( val ) => setAttributes( { 'default-value': val } ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <input type="text" disabled style={ { width: '100%' } } placeholder={ __( 'Last Name', 'profile-builder' ) } />
        </BaseFieldEdit>
    );
}
