import { __ } from '@wordpress/i18n';
import { PanelBody, CheckboxControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'Password Settings', 'profile-builder' ) }>
            <CheckboxControl
                label={ __( 'Ask for Current Password', 'profile-builder' ) }
                help={ __( 'On Edit Profile forms, require users to enter their current password before changing it. Applies only when users change their own password.', 'profile-builder' ) }
                checked={ attributes[ 'ask-current-password' ] === 'yes' }
                onChange={ ( checked ) => setAttributes( { 'ask-current-password': checked ? 'yes' : '' } ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <input type="password" disabled style={ { width: '100%' } } placeholder={ __( 'Password', 'profile-builder' ) } />
        </BaseFieldEdit>
    );
}
