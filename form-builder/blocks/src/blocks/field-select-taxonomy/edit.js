import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, SelectControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

// Public taxonomies published by the editor bridge (the same set the classic
// Manage Fields <select> uses; value = taxonomy slug, label = taxonomy label).
// Falls back to an empty list so a missing payload degrades to an empty
// control.
function getTaxonomyOptions() {
    const fb = ( typeof window !== 'undefined' && window.wppbFb ) || {};
    const list = ( fb.selectFields && fb.selectFields.taxonomies ) || [];
    return Array.isArray( list ) ? list : [];
}

export default function Edit( props ) {
    const { attributes, setAttributes } = props;
    const options = getTaxonomyOptions();

    const extraPanels = (
        <PanelBody title={ __( 'Select (Taxonomy) Settings', 'profile-builder' ) }>
            <SelectControl
                label={ __( 'Show Taxonomy Term', 'profile-builder' ) }
                value={ attributes.taxonomy }
                options={ options }
                onChange={ ( val ) => setAttributes( { taxonomy: val } ) }
                help={ __( 'Terms from this taxonomy will be displayed in the select.', 'profile-builder' ) }
            />
            <TextControl
                label={ __( 'Default Option', 'profile-builder' ) }
                value={ attributes[ 'default-option' ] }
                onChange={ ( val ) => setAttributes( { 'default-option': val } ) }
                help={ __( 'Enter the ID of the default term.', 'profile-builder' ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <select disabled style={ { width: '100%' } }>
                <option>{ __( '(List of taxonomy terms will be generated here)', 'profile-builder' ) }</option>
            </select>
        </BaseFieldEdit>
    );
}
