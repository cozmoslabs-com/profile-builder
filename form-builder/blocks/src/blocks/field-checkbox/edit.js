import { __ } from '@wordpress/i18n';
import OptionsFieldEdit from '../../components/OptionsFieldEdit';

export default function Edit( props ) {
    return (
        <OptionsFieldEdit
            { ...props }
            panelTitle={ __( 'Checkbox Settings', 'profile-builder' ) }
            previewType="checkbox"
            defaultValueAttr="default-options"
            showDefaultHelp
        />
    );
}
