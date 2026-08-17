import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, Notice } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    // The legacy front-end pipeline strips the Username field when
    // wppb_general_settings.loginWith === 'email' (see
    // front-end/default-fields/default-fields.php — the
    // `wppb_remove_username_field_when_login_with_email` filter returns false
    // for 'Default - Username'). The block stays on the canvas (it's mandatory
    // on Registration forms) but won't render to visitors; flag that here so
    // the user isn't surprised.
    const loginWith = ( typeof window !== 'undefined' && window.wppbFb && window.wppbFb.generalSettings && window.wppbFb.generalSettings.loginWith ) || 'usernameemail';
    const hiddenOnFrontEnd = loginWith === 'email';

    const extraPanels = (
        <PanelBody title={ __( 'Username Settings', 'profile-builder' ) }>
            <TextControl
                label={ __( 'Default Value', 'profile-builder' ) }
                value={ attributes[ 'default-value' ] }
                onChange={ ( val ) => setAttributes( { 'default-value': val } ) }
            />
            { hiddenOnFrontEnd && (
                <Notice status="info" isDismissible={ false }>
                    { __( 'Login is set to "Email" in Profile Builder → Settings → General Settings, so this field will not be rendered on the front-end. It is kept in the form because Registration forms require it server-side.', 'profile-builder' ) }
                </Notice>
            ) }
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            { hiddenOnFrontEnd && (
                <Notice status="info" isDismissible={ false } className="wppb-fb-username-hidden-notice">
                    { __( 'Not rendered on the front-end (Login with: Email).', 'profile-builder' ) }
                </Notice>
            ) }
            <input type="text" disabled style={ { width: '100%' } } placeholder={ __( 'Username', 'profile-builder' ) } />
        </BaseFieldEdit>
    );
}
