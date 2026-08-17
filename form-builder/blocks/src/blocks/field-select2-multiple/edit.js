import { __ } from '@wordpress/i18n';
import { SelectControl, TextControl } from '@wordpress/components';
import OptionsFieldEdit from '../../components/OptionsFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraControls = (
        <>
            <SelectControl
                label={ __( 'Allow Tags', 'profile-builder' ) }
                value={ attributes[ 'select2-multiple-tags' ] }
                options={ [
                    { label: __( 'No', 'profile-builder' ), value: 'no' },
                    { label: __( 'Yes', 'profile-builder' ), value: 'yes' },
                ] }
                onChange={ ( val ) => setAttributes( { 'select2-multiple-tags': val } ) }
            />
            <TextControl
                label={ __( 'Limit', 'profile-builder' ) }
                value={ attributes[ 'select2-multiple-limit' ] }
                onChange={ ( val ) => setAttributes( { 'select2-multiple-limit': val } ) }
                help={ __( 'Limit the number of selections.', 'profile-builder' ) }
            />
        </>
    );

    return (
        <OptionsFieldEdit
            { ...props }
            panelTitle={ __( 'Select2 (Multiple) Settings', 'profile-builder' ) }
            previewType="select-multiple"
            defaultValueAttr="default-options"
            showDefaultHelp
            extraControls={ extraControls }
        />
    );
}
