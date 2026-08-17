import { __ } from '@wordpress/i18n';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    return (
        <BaseFieldEdit { ...props }>
            <input type="email" disabled style={ { width: '100%' } } placeholder={ __( 'Confirm E-mail', 'profile-builder' ) } />
        </BaseFieldEdit>
    );
}
