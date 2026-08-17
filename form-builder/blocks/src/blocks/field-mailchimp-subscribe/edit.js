import SubscribeFieldEdit from '../../components/SubscribeFieldEdit';

const CONFIG = {
    bridgeKey:          'mailchimp',
    listAttr:           'mailchimp-lists',
    hideFieldAttr:      'mailchimp-hide-field',
    defaultCheckedAttr: 'mailchimp-default-checked',
    listLabel:          'MailChimp List',
    serviceLabel:       'MailChimp',
};

export default function Edit( props ) {
    return <SubscribeFieldEdit { ...props } config={ CONFIG } />;
}
