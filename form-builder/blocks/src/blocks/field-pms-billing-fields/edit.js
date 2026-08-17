/**
 * PMS Billing Fields editor. `pms-billing-fields` is comma-space CSV in display order;
 * empty = all. Bridge: window.wppbFb.pms (Tax/Invoice add-ons).
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, CheckboxControl, Notice, ExternalLink } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

function csvList( csv ) {
    if ( ! csv ) return [];
    return csv.split( ',' ).map( ( v ) => v.trim() ).filter( Boolean );
}

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const fb = ( typeof window !== 'undefined' && window.wppbFb ) || {};
    const pms = fb.pms || {};
    const billingFields = Array.isArray( pms.billingFields ) ? pms.billingFields : [];
    const addonsUrl = pms.addonsUrl || '';

    const enabled = csvList( attributes[ 'pms-billing-fields' ] );

    const toggle = ( value, checked ) => {
        let list = csvList( attributes[ 'pms-billing-fields' ] );
        if ( checked ) {
            if ( ! list.includes( value ) ) list.push( value );
        } else {
            list = list.filter( ( v ) => v !== value );
        }
        setAttributes( { 'pms-billing-fields': list.join( ', ' ) } );
    };

    const labelFor = ( value ) => {
        const found = billingFields.find( ( f ) => String( f.value ) === String( value ) );
        return found ? found.label : value;
    };

    // Which values render in the preview: the selected ones, or (when none are
    // selected) all available fields — matching the front-end default.
    const previewValues = enabled.length > 0 ? enabled : billingFields.map( ( f ) => String( f.value ) );

    const extraPanels = (
        <PanelBody title={ __( 'Billing Fields', 'profile-builder' ) }>
            { billingFields.length > 0 ? (
                <>
                    <p style={ { marginBottom: '0.75em' } }>
                        { __( 'Select which billing fields to display. Leave all unchecked to display every available billing field.', 'profile-builder' ) }
                    </p>
                    { billingFields.map( ( f ) => (
                        <CheckboxControl
                            key={ String( f.value ) }
                            label={ f.label }
                            checked={ enabled.includes( String( f.value ) ) }
                            onChange={ ( c ) => toggle( String( f.value ), c ) }
                        />
                    ) ) }
                </>
            ) : (
                <Notice status="warning" isDismissible={ false }>
                    { __( 'No billing fields are available. Activate the Tax and/or Invoice add-ons.', 'profile-builder' ) }
                    { addonsUrl && ' ' }
                    { addonsUrl && (
                        <ExternalLink href={ addonsUrl }>
                            { __( 'Paid Member Subscriptions add-ons', 'profile-builder' ) }
                        </ExternalLink>
                    ) }
                </Notice>
            ) }
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels } hideDescription>
            <Notice status="info" isDismissible={ false }>
                { __( 'Billing Fields only appear on Edit Profile forms.', 'profile-builder' ) }
            </Notice>
            <ul className="wppb-fb-checkboxes" style={ { listStyle: 'none', margin: 0, padding: 0 } }>
                { previewValues.length > 0 ? (
                    previewValues.map( ( value ) => (
                        <li key={ value } style={ { marginBottom: '5px' } }>
                            <label>{ labelFor( value ) }</label>
                            <input type="text" disabled style={ { display: 'block', width: '100%' } } />
                        </li>
                    ) )
                ) : (
                    <div>{ __( '(no billing fields available)', 'profile-builder' ) }</div>
                ) }
            </ul>
        </BaseFieldEdit>
    );
}
