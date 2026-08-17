/**
 * Toolbar Delete button on PB form CPTs (replaces Options ⋮; CSS hides the menu).
 * Form-only remove — global row stays. Hidden for mandatoryTypes / !canRemoveBlock.
 */

import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { BlockControls } from '@wordpress/block-editor';
import { ToolbarGroup, ToolbarButton } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { removeBlocksWithUndo } from '../lib/removeBlocksWithUndo';

// Mandatory default field types whose Delete affordance must never appear —
// same source and fallback as the Existing Fields panel's MANDATORY_DEFAULT_TYPES
// (window.wppbFb.mandatoryTypes, populated by the inline-script bridge before
// this bundle inits). Falls back to the hardcoded triple if the bridge is absent.
const MANDATORY_FIELD_TYPES = new Set(
    ( typeof window !== 'undefined' && window.wppbFb &&
      Array.isArray( window.wppbFb.mandatoryTypes ) && window.wppbFb.mandatoryTypes.length )
        ? window.wppbFb.mandatoryTypes
        : [ 'Default - Username', 'Default - E-mail', 'Default - Password' ]
);

// Resolve a block name to its PB field-type label via the canonical
// blockToFieldType map (single home under conditionalFields), then test for a
// mandatory type. Read lazily (not memoized at module load) so it tracks the
// bridge like BaseFieldEdit's getMetaNameConfig() does.
function isMandatoryFieldType( blockName ) {
    const fb = ( typeof window !== 'undefined' && window.wppbFb ) || {};
    const map = ( fb.conditionalFields && fb.conditionalFields.blockToFieldType ) || {};
    return MANDATORY_FIELD_TYPES.has( map[ blockName ] );
}

// Inline trash glyph — matches the FormPreviewButton convention of inlining
// SVGs (fill via inline style, which also beats Gutenberg's block-icon
// `svg { fill: currentColor }` override) instead of a @wordpress/icons
// dependency that would pull the package into the bundle.
const TrashIcon = () => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
    >
        <path
            style={ { fill: 'currentColor' } }
            d="M9 3h6v2h5v2H4V5h5V3zm-3 6h2v9H6V9zm5 0h2v9h-2V9zm5 0h2v9h-2V9zM5 7h14l-1 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 7z"
        />
    </svg>
);

function DeleteToolbarControl( { clientId } ) {
    const canRemove = useSelect(
        ( select ) => select( 'core/block-editor' ).canRemoveBlock( clientId ),
        [ clientId ]
    );

    if ( ! canRemove ) return null;

    return (
        <BlockControls>
            <ToolbarGroup>
                <ToolbarButton
                    icon={ <TrashIcon /> }
                    label={ __( 'Remove field', 'profile-builder' ) }
                    // Snackbar-Undo instead of a silent removeBlock: global
                    // undo is disabled in this editor, so this is the only
                    // in-session recovery path.
                    onClick={ () => removeBlocksWithUndo( [ clientId ] ) }
                />
            </ToolbarGroup>
        </BlockControls>
    );
}

const withDeleteToolbarButton = ( BlockEdit ) => ( props ) => {
    const { name, isSelected, clientId } = props;
    const isPbBlock = typeof name === 'string' && name.startsWith( 'profile-builder/' );
    // Field-type gate: never add the Delete button to a mandatory field. Cheap,
    // hook-free, so it's evaluated here in the wrapper rather than inside
    // DeleteToolbarControl (which then never mounts for mandatory fields).
    const showDelete = isPbBlock && isSelected && ! isMandatoryFieldType( name );

    return (
        <>
            <BlockEdit { ...props } />
            { showDelete && <DeleteToolbarControl clientId={ clientId } /> }
        </>
    );
};

// editor.BlockEdit filters apply at render time (not registration time), so —
// unlike the blocks.registerBlockType filters at the top of index.js — this
// import's position relative to the block imports is not load-bearing.
addFilter(
    'editor.BlockEdit',
    'profile-builder/block-toolbar-delete',
    withDeleteToolbarButton
);
