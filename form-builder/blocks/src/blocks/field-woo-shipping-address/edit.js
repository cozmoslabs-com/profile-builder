import { __ } from '@wordpress/i18n';
import WooAddressFieldEdit from '../../components/WooAddressFieldEdit';

const CONFIG = {
    fieldsKey:  'shippingFields',
    csvAttr:    'woo-shipping-fields',
    nameAttr:   'woo-shipping-fields-name',
    sortAttr:   'woo-shipping-fields-sort-order',
    panelTitle: __( 'Shipping Fields', 'profile-builder' ),
};

export default function Edit( props ) {
    return <WooAddressFieldEdit { ...props } config={ CONFIG } />;
}
