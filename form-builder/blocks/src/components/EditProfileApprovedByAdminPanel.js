/**
 * Inspector panel for the Edit Profile Approved by Admin add-on.
 *
 * Edits one attribute injected by the EPAA bridge:
 *   - edit-profile-approved-by-admin  (string scalar: '' | 'yes')
 *
 * Storage shape matches the legacy classic-admin checkbox in
 * `wppb_in_epaa_properties_manage_field()`: the property is set to the literal
 * string 'yes' when enabled, and absent or empty otherwise.
 */
import { PanelBody, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function EditProfileApprovedByAdminPanel( { attributes, setAttributes } ) {
    const enabled = attributes[ 'edit-profile-approved-by-admin' ] === 'yes';

    return (
        <PanelBody title={ __( 'Admin Approval', 'profile-builder' ) } initialOpen={ false }>
            <ToggleControl
                label={ __( 'Requires admin approval on Edit Profile', 'profile-builder' ) }
                checked={ enabled }
                onChange={ ( on ) => setAttributes( { 'edit-profile-approved-by-admin': on ? 'yes' : '' } ) }
                help={ __( 'When a non-admin user edits their profile, this field\'s value is held for admin review instead of being saved directly. Affects every form this field appears in.', 'profile-builder' ) }
            />
        </PanelBody>
    );
}
