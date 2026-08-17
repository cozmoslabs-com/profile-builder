import { __ } from '@wordpress/i18n';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    return (
        <BaseFieldEdit { ...props }>
            <div style={ { padding: '10px', border: '1px dashed #ccc', backgroundColor: '#fafafa', color: '#666', fontSize: '12px' } }>
                <span className="dashicons dashicons-shield" style={ { marginRight: '5px' } } />
                { __( 'Invisible Honeypot Field (Spam Protection)', 'profile-builder' ) }
            </div>
        </BaseFieldEdit>
    );
}
