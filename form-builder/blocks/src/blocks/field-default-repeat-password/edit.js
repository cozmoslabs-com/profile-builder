import { __ } from '@wordpress/i18n';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    return (
        <BaseFieldEdit { ...props }>
            <input type="password" disabled style={ { width: '100%' } } placeholder={ __( 'Repeat Password', 'profile-builder' ) } />
        </BaseFieldEdit>
    );
}
