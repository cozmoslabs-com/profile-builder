import { __ } from '@wordpress/i18n';
import WooAddressFieldEdit from '../../components/WooAddressFieldEdit';

const CONFIG = {
    fieldsKey:  'billingFields',
    csvAttr:    'woo-billing-fields',
    nameAttr:   'woo-billing-fields-name',
    sortAttr:   'woo-billing-fields-sort-order',
    panelTitle: __( 'Billing Fields', 'profile-builder' ),
};

export default function Edit( props ) {
    return <WooAddressFieldEdit { ...props } config={ CONFIG } />;
}
