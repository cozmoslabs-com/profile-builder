import SubscribeFieldEdit from '../../components/SubscribeFieldEdit';

const CONFIG = {
    bridgeKey:          'mailpoet',
    listAttr:           'mailpoet-lists',
    hideFieldAttr:      'mailpoet-hide-field',
    defaultCheckedAttr: 'mailpoet-default-checked',
    listLabel:          'MailPoet List',
    serviceLabel:       'MailPoet',
};

export default function Edit( props ) {
    return <SubscribeFieldEdit { ...props } config={ CONFIG } />;
}
