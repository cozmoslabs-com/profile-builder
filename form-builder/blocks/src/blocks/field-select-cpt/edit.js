import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, SelectControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

// Public post types published by the editor bridge (the same set the classic
// Manage Fields <select> uses; value = post-type slug, label = post-type
// label). Falls back to an empty list so a missing payload degrades to an
// empty control.
function getPostTypeOptions() {
    const fb = ( typeof window !== 'undefined' && window.wppbFb ) || {};
    const list = ( fb.selectFields && fb.selectFields.postTypes ) || [];
    return Array.isArray( list ) ? list : [];
}

export default function Edit( props ) {
    const { attributes, setAttributes } = props;
    const options = getPostTypeOptions();

    const extraPanels = (
        <PanelBody title={ __( 'Select (CPT) Settings', 'profile-builder' ) }>
            <SelectControl
                label={ __( 'Show Post Type', 'profile-builder' ) }
                value={ attributes.cpt }
                options={ options }
                onChange={ ( val ) => setAttributes( { cpt: val } ) }
                help={ __( 'Posts from this post type will be displayed in the select.', 'profile-builder' ) }
            />
            <TextControl
                label={ __( 'Default Option', 'profile-builder' ) }
                value={ attributes[ 'default-option' ] }
                onChange={ ( val ) => setAttributes( { 'default-option': val } ) }
                help={ __( 'Enter the ID of the default post.', 'profile-builder' ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <select disabled style={ { width: '100%' } }>
                <option>{ __( '(List of CPT posts will be generated here)', 'profile-builder' ) }</option>
            </select>
        </BaseFieldEdit>
    );
}
