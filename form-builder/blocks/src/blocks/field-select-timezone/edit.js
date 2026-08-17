import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

// Timezone list published by the editor bridge (the same GMT-label set the
// classic Manage Fields <select> uses; the string is BOTH value and label —
// the front end emits <option value="$tz">$tz</option>). The first entry is a
// "no default" placeholder. Falls back to an empty list so a missing payload
// degrades to a placeholder-only control.
function getTimezoneOptions() {
    const fb = ( typeof window !== 'undefined' && window.wppbFb ) || {};
    const list = ( fb.selectFields && fb.selectFields.timezones ) || [];
    return Array.isArray( list ) ? list : [];
}

export default function Edit( props ) {
    const { attributes, setAttributes } = props;
    const options = getTimezoneOptions();
    const selected = options.find( ( o ) => o.value === attributes[ 'default-option-timezone' ] );

    const extraPanels = (
        <PanelBody title={ __( 'Select (Timezone) Settings', 'profile-builder' ) }>
            <SelectControl
                label={ __( 'Default Option', 'profile-builder' ) }
                value={ attributes[ 'default-option-timezone' ] }
                options={ options }
                onChange={ ( val ) => setAttributes( { 'default-option-timezone': val } ) }
                help={ __( 'The timezone selected by default on the form.', 'profile-builder' ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <select disabled style={ { width: '100%' } }>
                <option>
                    { selected && selected.value
                        ? selected.label
                        : __( '(List of timezones will be generated here)', 'profile-builder' ) }
                </option>
            </select>
        </BaseFieldEdit>
    );
}
