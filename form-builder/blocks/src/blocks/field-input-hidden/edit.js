import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'Hidden Input Settings', 'profile-builder' ) }>
            <TextControl
                label={ __( 'Default Value', 'profile-builder' ) }
                value={ attributes[ 'default-value' ] }
                onChange={ ( val ) => setAttributes( { 'default-value': val } ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <div style={ { padding: '10px', border: '1px dashed #ccc', backgroundColor: '#fafafa', color: '#666', fontSize: '12px' } }>
                <span className="dashicons dashicons-hidden" style={ { marginRight: '5px' } } />
                { __( 'Hidden Input Field', 'profile-builder' ) }
                { attributes[ 'default-value' ] && (
                    <span style={ { marginLeft: '10px', fontStyle: 'italic' } }>
                        { __( 'Value:', 'profile-builder' ) } { attributes[ 'default-value' ] }
                    </span>
                ) }
            </div>
        </BaseFieldEdit>
    );
}
