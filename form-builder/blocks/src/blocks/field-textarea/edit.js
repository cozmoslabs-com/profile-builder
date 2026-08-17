import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, TextareaControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'Textarea Settings', 'profile-builder' ) }>
            <TextareaControl
                label={ __( 'Default Value', 'profile-builder' ) }
                value={ attributes[ 'default-content' ] }
                onChange={ ( val ) => setAttributes( { 'default-content': val } ) }
            />
            <TextControl
                label={ __( 'Row Count', 'profile-builder' ) }
                value={ attributes[ 'row-count' ] }
                onChange={ ( val ) => setAttributes( { 'row-count': val } ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <textarea 
                disabled 
                style={ { width: '100%' } } 
                rows={ attributes[ 'row-count' ] }
            />
        </BaseFieldEdit>
    );
}
