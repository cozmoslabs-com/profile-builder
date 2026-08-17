import { __ } from '@wordpress/i18n';
import OptionsFieldEdit from '../../components/OptionsFieldEdit';

export default function Edit( props ) {
    return (
        <OptionsFieldEdit
            { ...props }
            panelTitle={ __( 'Select2 Settings', 'profile-builder' ) }
            previewType="select"
        />
    );
}
