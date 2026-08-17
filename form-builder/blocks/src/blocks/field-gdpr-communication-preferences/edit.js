import { __ } from '@wordpress/i18n';
import { PanelBody, CheckboxControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

// Fixed preference vocabulary: value => label. Must match the legacy add-on's
// front-end map (add-ons-free/gdpr-communication-preferences/front-end/
// gdpr-communication-preferences.php — $checkbox_labels) and the admin options
// order (admin/manage-fields.php: Email, Telephone, SMS, Post).
const PREFERENCES = [
    { value: 'email', label: __( 'Email', 'profile-builder' ) },
    { value: 'phone', label: __( 'Telephone', 'profile-builder' ) },
    { value: 'sms',   label: __( 'SMS', 'profile-builder' ) },
    { value: 'post',  label: __( 'Post', 'profile-builder' ) },
];

function csvList( csv ) {
    if ( ! csv ) return [];
    return csv.split( ',' ).map( ( v ) => v.trim() ).filter( Boolean );
}

function labelFor( value ) {
    const found = PREFERENCES.find( ( p ) => p.value === value );
    return found ? found.label : value;
}

export default function Edit( props ) {
    const { attributes, setAttributes } = props;
    const enabled = csvList( attributes[ 'gdpr-communication-preferences' ] );

    // Toggle membership while preserving existing order — append on enable,
    // filter on disable — so a saved custom order (e.g. from the classic editor)
    // survives instead of being rebuilt from the fixed vocabulary order. The CSV
    // order IS the front-end display order; `-sort-order` is a legacy admin-only
    // persistence aid the front-end never reads, so the block leaves it alone.
    const toggle = ( value, checked ) => {
        let list = csvList( attributes[ 'gdpr-communication-preferences' ] );
        if ( checked ) {
            if ( ! list.includes( value ) ) list.push( value );
        } else {
            list = list.filter( ( v ) => v !== value );
        }
        setAttributes( { 'gdpr-communication-preferences': list.join( ',' ) } );
    };

    const extraPanels = (
        <PanelBody title={ __( 'Communication Preferences', 'profile-builder' ) }>
            <p style={ { marginBottom: '0.75em' } }>
                { __( 'Select which communication channels users can opt into.', 'profile-builder' ) }
            </p>
            { PREFERENCES.map( ( p ) => (
                <CheckboxControl
                    key={ p.value }
                    label={ p.label }
                    checked={ enabled.includes( p.value ) }
                    onChange={ ( c ) => toggle( p.value, c ) }
                />
            ) ) }
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <ul className="wppb-fb-checkboxes" style={ { listStyle: 'none', margin: 0, padding: 0 } }>
                { enabled.length > 0 ? (
                    enabled.map( ( value ) => (
                        <li key={ value } style={ { marginBottom: '5px' } }>
                            <input type="checkbox" disabled />
                            <label style={ { marginLeft: '5px' } }>{ labelFor( value ) }</label>
                        </li>
                    ) )
                ) : (
                    <div>{ __( '(no preferences enabled)', 'profile-builder' ) }</div>
                ) }
            </ul>
        </BaseFieldEdit>
    );
}
