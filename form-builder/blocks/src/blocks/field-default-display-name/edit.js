import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'Display Name Settings', 'profile-builder' ) }>
            <TextControl
                label={ __( 'Default Value', 'profile-builder' ) }
                value={ attributes[ 'default-value' ] }
                onChange={ ( val ) => setAttributes( { 'default-value': val } ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <select disabled style={ { width: '100%' } }>
                <option>{ __( 'Username', 'profile-builder' ) }</option>
                <option>{ __( 'First Name', 'profile-builder' ) }</option>
                <option>{ __( 'Last Name', 'profile-builder' ) }</option>
                <option>{ __( 'First Name Last Name', 'profile-builder' ) }</option>
            </select>
        </BaseFieldEdit>
    );
}
