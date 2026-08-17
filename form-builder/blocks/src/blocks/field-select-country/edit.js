import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

// Country list published by the editor bridge (the same set the classic Manage
// Fields <select> uses; value = ISO-3166 alpha-2, label = localized name). The
// first entry is the '' => 'Select a Country' placeholder. Falls back to an
// empty list so a missing payload degrades to a placeholder-only control.
function getCountryOptions() {
    const fb = ( typeof window !== 'undefined' && window.wppbFb ) || {};
    const list = ( fb.selectFields && fb.selectFields.countries ) || [];
    return Array.isArray( list ) ? list : [];
}

export default function Edit( props ) {
    const { attributes, setAttributes } = props;
    const options = getCountryOptions();
    const selected = options.find( ( o ) => o.value === attributes[ 'default-option-country' ] );

    const extraPanels = (
        <PanelBody title={ __( 'Select (Country) Settings', 'profile-builder' ) }>
            <SelectControl
                label={ __( 'Default Option', 'profile-builder' ) }
                value={ attributes[ 'default-option-country' ] }
                options={ options }
                onChange={ ( val ) => setAttributes( { 'default-option-country': val } ) }
                help={ __( 'The country selected by default on the form.', 'profile-builder' ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <select disabled style={ { width: '100%' } }>
                <option>
                    { selected && selected.value
                        ? selected.label
                        : __( '(List of countries will be generated here)', 'profile-builder' ) }
                </option>
            </select>
        </BaseFieldEdit>
    );
}
