/**
 * Seed mandatory fields on new Registration forms when the canvas opens empty.
 * Server seeding covers REST; `setupEditor` paints from bootstrapped content and
 * skips that refresh for a clean new post.
 *
 * Gates: RF only, zero blocks, once per session, `post_status === 'auto-draft'`.
 * Not `isCleanNewPost()` — REST can populate `content.raw` and mark an untouched
 * post dirty.
 */

import { registerPlugin } from '@wordpress/plugins';
import { useSelect, useDispatch } from '@wordpress/data';
import { useEffect, useRef } from '@wordpress/element';
import { createBlock } from '@wordpress/blocks';

import { getExistingFieldsSnapshot } from '../lib/existingFieldsSnapshot';

// Bridge is source of truth; fallback fails closed (seed nothing if missing).
const MANDATORY_FIELD_TYPES_IN_ORDER = (
    typeof window !== 'undefined'
    && window.wppbFb
    && Array.isArray( window.wppbFb.mandatoryTypes )
    && window.wppbFb.mandatoryTypes.length
)
    ? window.wppbFb.mandatoryTypes
    : [ 'Default - Username', 'Default - E-mail', 'Default - Password' ];

function useAutoSeedRegistrationForm() {
    const postType   = useSelect( ( select ) => select( 'core/editor' ).getCurrentPostType(), [] );
    const postStatus = useSelect( ( select ) => select( 'core/editor' ).getEditedPostAttribute( 'status' ), [] );
    const blockCount = useSelect( ( select ) => select( 'core/block-editor' ).getBlocks().length, [] );
    const { insertBlocks, __unstableMarkNextChangeAsNotPersistent } = useDispatch( 'core/block-editor' );
    const seededRef = useRef( false );

    useEffect( () => {
        if ( seededRef.current ) return;
        if ( postType !== 'wppb-rf-cpt' ) return;
        if ( postStatus !== 'auto-draft' ) return;
        if ( blockCount !== 0 ) return;

        const fieldsBridge = getExistingFieldsSnapshot();
        if ( ! fieldsBridge.length ) return;

        const byType = new Map();
        for ( const f of fieldsBridge ) {
            if ( f && f.fieldType && ! byType.has( f.fieldType ) ) {
                byType.set( f.fieldType, f );
            }
        }

        const toInsert = [];
        for ( const type of MANDATORY_FIELD_TYPES_IN_ORDER ) {
            const entry = byType.get( type );
            if ( ! entry ) continue;
            toInsert.push(
                createBlock( entry.blockName, {
                    ...( entry.attributes || {} ),
                    id: entry.id,
                    lock: { remove: true },
                } )
            );
        }

        if ( ! toInsert.length ) return;

        // Non-persistent: opening a new form must not count as unsaved edits.
        seededRef.current = true;
        if ( typeof __unstableMarkNextChangeAsNotPersistent === 'function' ) {
            __unstableMarkNextChangeAsNotPersistent();
        }
        insertBlocks( toInsert, 0, undefined, false );
    }, [ postType, postStatus, blockCount ] );
}

const AutoSeedRegistrationForm = () => {
    useAutoSeedRegistrationForm();
    return null;
};

registerPlugin( 'wppb-auto-seed-registration-form', {
    render: AutoSeedRegistrationForm,
} );
