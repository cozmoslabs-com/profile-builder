import { __ } from '@wordpress/i18n';
import OptionsFieldEdit from '../../components/OptionsFieldEdit';

export default function Edit( props ) {
    return (
        <OptionsFieldEdit
            { ...props }
            panelTitle={ __( 'Select (Multiple) Settings', 'profile-builder' ) }
            previewType="select-multiple"
            defaultValueAttr="default-options"
            showDefaultHelp
        />
    );
}
