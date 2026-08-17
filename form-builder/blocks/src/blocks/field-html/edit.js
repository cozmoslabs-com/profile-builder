import { __ } from '@wordpress/i18n';
import { PanelBody, TextareaControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'HTML Settings', 'profile-builder' ) }>
            <TextareaControl
                label={ __( 'HTML Content', 'profile-builder' ) }
                value={ attributes[ 'html-content' ] }
                onChange={ ( val ) => setAttributes( { 'html-content': val } ) }
                help={ __( 'Enter custom HTML content.', 'profile-builder' ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <div style={ { padding: '10px', border: '1px dashed #ccc', backgroundColor: '#fafafa', color: '#666', fontSize: '12px' } }>
                { attributes[ 'html-content' ] ? (
                    <div>{ __( 'HTML Content (Preview not available in editor)', 'profile-builder' ) }</div>
                ) : (
                    <div>{ __( 'Empty HTML Block', 'profile-builder' ) }</div>
                ) }
            </div>
        </BaseFieldEdit>
    );
}
