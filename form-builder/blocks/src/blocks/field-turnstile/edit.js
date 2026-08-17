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
        <PanelBody title={ __( 'Turnstile Settings', 'profile-builder' ) }>
            <SelectControl
                label={ __( 'Turnstile Theme', 'profile-builder' ) }
                value={ attributes[ 'theme' ] }
                options={ [
                    { label: __( 'Auto', 'profile-builder' ), value: 'auto' },
                    { label: __( 'Light', 'profile-builder' ), value: 'light' },
                    { label: __( 'Dark', 'profile-builder' ), value: 'dark' },
                ] }
                onChange={ ( val ) => setAttributes( { 'theme': val } ) }
            />
            <TextControl
                label={ __( 'Site Key', 'profile-builder' ) }
                value={ attributes[ 'turnstile-site-key' ] }
                onChange={ ( val ) => setAttributes( { 'turnstile-site-key': val } ) }
            />
            <TextControl
                label={ __( 'Secret Key', 'profile-builder' ) }
                value={ attributes[ 'turnstile-secret-key' ] }
                onChange={ ( val ) => setAttributes( { 'turnstile-secret-key': val } ) }
            />
            <BaseControl label={ __( 'Display on PB forms', 'profile-builder' ) }>
                { PB_FORMS.map( ( opt ) => (
                    <CheckboxControl
                        key={ opt.value }
                        label={ opt.label }
                        checked={ csvIncludes( attributes[ 'turnstile-pb-forms' ], opt.value ) }
                        onChange={ ( checked ) =>
                            setAttributes( { 'turnstile-pb-forms': toggleInCsv( attributes[ 'turnstile-pb-forms' ], opt.value, checked ) } )
                        }
                    />
                ) ) }
            </BaseControl>
            <BaseControl label={ __( 'Display on default WP forms', 'profile-builder' ) }>
                { WP_FORMS.map( ( opt ) => (
                    <CheckboxControl
                        key={ opt.value }
                        label={ opt.label }
                        checked={ csvIncludes( attributes[ 'turnstile-wp-forms' ], opt.value ) }
                        onChange={ ( checked ) =>
                            setAttributes( { 'turnstile-wp-forms': toggleInCsv( attributes[ 'turnstile-wp-forms' ], opt.value, checked ) } )
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
                { __( 'Cloudflare Turnstile Placeholder', 'profile-builder' ) }
            </div>
        </BaseFieldEdit>
    );
}
