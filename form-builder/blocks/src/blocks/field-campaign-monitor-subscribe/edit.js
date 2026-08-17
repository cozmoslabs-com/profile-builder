import SubscribeFieldEdit from '../../components/SubscribeFieldEdit';

const CONFIG = {
    bridgeKey:     'campaignMonitor',
    listAttr:      'campaign-monitor-lists',
    hideFieldAttr: 'campaign-monitor-hide-field',
    // Campaign Monitor has no "checked by default" property.
    listLabel:     'Campaign Monitor List',
    serviceLabel:  'Campaign Monitor',
};

export default function Edit( props ) {
    return <SubscribeFieldEdit { ...props } config={ CONFIG } />;
}
