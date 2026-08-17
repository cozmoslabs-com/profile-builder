import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'Number Settings', 'profile-builder' ) }>
            <TextControl
                label={ __( 'Default Value', 'profile-builder' ) }
                value={ attributes[ 'default-value' ] }
                onChange={ ( val ) => setAttributes( { 'default-value': val } ) }
            />
            <TextControl
                label={ __( 'Min Value', 'profile-builder' ) }
                value={ attributes[ 'min-number-value' ] }
                onChange={ ( val ) => setAttributes( { 'min-number-value': val } ) }
            />
            <TextControl
                label={ __( 'Max Value', 'profile-builder' ) }
                value={ attributes[ 'max-number-value' ] }
                onChange={ ( val ) => setAttributes( { 'max-number-value': val } ) }
            />
            <TextControl
                label={ __( 'Step', 'profile-builder' ) }
                value={ attributes[ 'number-step-value' ] }
                onChange={ ( val ) => setAttributes( { 'number-step-value': val } ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <input 
                type="number" 
                disabled 
                style={ { width: '100%' } } 
                min={ attributes[ 'min-number-value' ] }
                max={ attributes[ 'max-number-value' ] }
                step={ attributes[ 'number-step-value' ] }
            />
        </BaseFieldEdit>
    );
}
