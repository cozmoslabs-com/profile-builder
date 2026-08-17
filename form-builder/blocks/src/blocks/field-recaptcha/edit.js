import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, SelectControl, CheckboxControl, BaseControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';
import { toggleInCsv, csvIncludes } from '../../components/csv';

const PB_FORMS = [
    { value: 'pb_login', label: __( 'PB Login', 'profile-builder' ) },
    { value: 'pb_register', label: __( 'PB Register', 'profile-builder' ) },
    { value: 'pb_recover_password', label: __( 'PB Recover Password', 'profile-builder' ) },
];

const WP_FORMS = [
    { value: 'default_wp_login', label: __( 'Default WP Login', 'profile-builder' ) },
    { value: 'default_wp_register', label: __( 'Default WP Register', 'profile-builder' ) },
    { value: 'default_wp_recover_password', label: __( 'Default WP Recover Password', 'profile-builder' ) },
];

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'reCAPTCHA Settings', 'profile-builder' ) }>
            <SelectControl
                label={ __( 'reCAPTCHA Type', 'profile-builder' ) }
                value={ attributes[ 'recaptcha-type' ] }
                options={ [
                    { label: 'reCAPTCHA V2 Checkbox', value: 'v2' },
                    { label: 'reCAPTCHA V2 Invisible', value: 'invisible' },
                    { label: 'reCAPTCHA V3', value: 'v3' },
                ] }
                onChange={ ( val ) => setAttributes( { 'recaptcha-type': val } ) }
            />
            <TextControl
                label={ __( 'Site Key', 'profile-builder' ) }
                value={ attributes[ 'public-key' ] }
                onChange={ ( val ) => setAttributes( { 'public-key': val } ) }
            />
            <TextControl
                label={ __( 'Secret Key', 'profile-builder' ) }
                value={ attributes[ 'private-key' ] }
                onChange={ ( val ) => setAttributes( { 'private-key': val } ) }
            />
            { attributes[ 'recaptcha-type' ] === 'v3' && (
                <TextControl
                    label={ __( 'Score Threshold', 'profile-builder' ) }
                    value={ attributes[ 'score-threshold' ] }
                    onChange={ ( val ) => setAttributes( { 'score-threshold': val } ) }
                    help={ __( '1.0 is very likely a good interaction, 0.0 is very likely a bot.', 'profile-builder' ) }
                />
            ) }
            <BaseControl label={ __( 'Display on PB forms', 'profile-builder' ) }>
                { PB_FORMS.map( ( opt ) => (
                    <CheckboxControl
                        key={ opt.value }
                        label={ opt.label }
                        checked={ csvIncludes( attributes[ 'captcha-pb-forms' ], opt.value ) }
                        onChange={ ( checked ) =>
                            setAttributes( { 'captcha-pb-forms': toggleInCsv( attributes[ 'captcha-pb-forms' ], opt.value, checked ) } )
                        }
                    />
                ) ) }
            </BaseControl>
            <BaseControl label={ __( 'Display on default WP forms', 'profile-builder' ) }>
                { WP_FORMS.map( ( opt ) => (
                    <CheckboxControl
                        key={ opt.value }
                        label={ opt.label }
                        checked={ csvIncludes( attributes[ 'captcha-wp-forms' ], opt.value ) }
                        onChange={ ( checked ) =>
                            setAttributes( { 'captcha-wp-forms': toggleInCsv( attributes[ 'captcha-wp-forms' ], opt.value, checked ) } )
                        }
                    />
                ) ) }
            </BaseControl>
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <div style={ { padding: '10px', border: '1px dashed #ccc', backgroundColor: '#fafafa', color: '#666', fontSize: '12px' } }>
                <span className="dashicons dashicons-shield" style={ { marginRight: '5px' } } />
                { __( 'reCAPTCHA Placeholder', 'profile-builder' ) }
            </div>
        </BaseFieldEdit>
    );
}
