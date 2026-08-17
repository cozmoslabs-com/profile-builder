import { __ } from '@wordpress/i18n';
import { PanelBody, TextareaControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'WYSIWYG Settings', 'profile-builder' ) }>
            <TextareaControl
                label={ __( 'Default Value', 'profile-builder' ) }
                value={ attributes[ 'default-content' ] }
                onChange={ ( val ) => setAttributes( { 'default-content': val } ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <div style={ { border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' } }>
                <div style={ { backgroundColor: '#f1f1f1', padding: '5px', borderBottom: '1px solid #ddd', display: 'flex', gap: '5px' } }>
                    <span className="dashicons dashicons-editor-bold" />
                    <span className="dashicons dashicons-editor-italic" />
                    <span className="dashicons dashicons-editor-ul" />
                    <span className="dashicons dashicons-editor-ol" />
                </div>
                <textarea
                    disabled
                    style={ { width: '100%', border: 'none', padding: '10px', resize: 'none' } }
                    rows={ 5 }
                />
            </div>
        </BaseFieldEdit>
    );
}
