import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

// Currency list published by the editor bridge (the same set the classic Manage
// Fields <select> uses; value = ISO-4217 code, label = localized name). The
// first entry is a "no default" placeholder. Falls back to an empty list so a
// missing payload degrades to a placeholder-only control.
function getCurrencyOptions() {
    const fb = ( typeof window !== 'undefined' && window.wppbFb ) || {};
    const list = ( fb.selectFields && fb.selectFields.currencies ) || [];
    return Array.isArray( list ) ? list : [];
}

export default function Edit( props ) {
    const { attributes, setAttributes } = props;
    const options = getCurrencyOptions();
    const selected = options.find( ( o ) => o.value === attributes[ 'default-option-currency' ] );

    const extraPanels = (
        <PanelBody title={ __( 'Select (Currency) Settings', 'profile-builder' ) }>
            <SelectControl
                label={ __( 'Default Option', 'profile-builder' ) }
                value={ attributes[ 'default-option-currency' ] }
                options={ options }
                onChange={ ( val ) => setAttributes( { 'default-option-currency': val } ) }
                help={ __( 'The currency selected by default on the form.', 'profile-builder' ) }
            />
            <SelectControl
                label={ __( 'Show Currency Symbol', 'profile-builder' ) }
                value={ attributes[ 'show-currency-symbol' ] }
                options={ [
                    { label: __( 'No', 'profile-builder' ), value: 'No' },
                    { label: __( 'Yes', 'profile-builder' ), value: 'Yes' },
                ] }
                onChange={ ( val ) => setAttributes( { 'show-currency-symbol': val } ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <select disabled style={ { width: '100%' } }>
                <option>
                    { selected && selected.value
                        ? selected.label
                        : __( '(List of currencies will be generated here)', 'profile-builder' ) }
                </option>
            </select>
        </BaseFieldEdit>
    );
}
