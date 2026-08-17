import { __ } from '@wordpress/i18n';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    return (
        <BaseFieldEdit { ...props }>
            <div style={ { padding: '10px', border: '1px dashed #ccc', backgroundColor: '#fafafa', color: '#666', fontSize: '12px' } }>
                <span className="dashicons dashicons-admin-site" style={ { marginRight: '5px' } } />
                { __( 'Blog Details Fields (Multisite)', 'profile-builder' ) }
            </div>
        </BaseFieldEdit>
    );
}
