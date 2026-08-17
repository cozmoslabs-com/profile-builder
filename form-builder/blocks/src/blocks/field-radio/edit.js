import { __ } from '@wordpress/i18n';
import OptionsFieldEdit from '../../components/OptionsFieldEdit';

export default function Edit( props ) {
    return (
        <OptionsFieldEdit
            { ...props }
            panelTitle={ __( 'Radio Settings', 'profile-builder' ) }
            previewType="radio"
        />
    );
}
