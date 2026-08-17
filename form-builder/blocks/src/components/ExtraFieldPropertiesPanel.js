/**
 * Inspector panel for add-on field controls from `window.wppbFb.extraControls`.
 * Renders only descriptors whose attribute is on this block's schema.
 * `hideInsideRepeater` suppresses controls that classic strips from sub-fields.
 */
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function ExtraFieldPropertiesPanel( { attributes, setAttributes, insideRepeater = false } ) {
    const fb = ( typeof window !== 'undefined' && window.wppbFb ) || {};
    const controls = Array.isArray( fb.extraControls ) ? fb.extraControls : [];

    // De-dupe by attribute (last wins); skip attrs not on this block.
    const seen = new Set();
    const applicable = [];
    for ( let i = controls.length - 1; i >= 0; i-- ) {
        const c = controls[ i ];
        if ( ! c || ! c.attribute || seen.has( c.attribute ) ) continue;
        if ( ! Object.prototype.hasOwnProperty.call( attributes, c.attribute ) ) continue;
        if ( insideRepeater && c.hideInsideRepeater ) continue;
        seen.add( c.attribute );
        applicable.unshift( c );
    }
    if ( applicable.length === 0 ) return null;

    return (
        <PanelBody title={ __( 'Additional Settings', 'profile-builder' ) } initialOpen={ false }>
            { applicable.map( ( c ) => {
                if ( c.control === 'toggle' ) {
                    const onValue = c.onValue != null ? c.onValue : 'Yes';
                    const offValue = c.offValue != null ? c.offValue : 'No';
                    return (
                        <ToggleControl
                            key={ c.attribute }
                            label={ c.label || c.attribute }
                            help={ c.help || undefined }
                            checked={ attributes[ c.attribute ] === onValue }
                            onChange={ ( on ) => setAttributes( { [ c.attribute ]: on ? onValue : offValue } ) }
                        />
                    );
                }
                return (
                    <TextControl
                        key={ c.attribute }
                        label={ c.label || c.attribute }
                        help={ c.help || undefined }
                        type={ c.control === 'number' ? 'number' : 'text' }
                        value={ attributes[ c.attribute ] != null ? attributes[ c.attribute ] : '' }
                        onChange={ ( val ) => setAttributes( { [ c.attribute ]: val } ) }
                    />
                );
            } ) }
        </PanelBody>
    );
}
