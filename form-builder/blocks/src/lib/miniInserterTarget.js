/**
 * Open mini-inserter destination store.
 * Existing Fields inserts here instead of appending to the root list.
 */
import { select as dataSelect } from '@wordpress/data';
import { useSyncExternalStore } from '@wordpress/element';

import { createPubsubStore } from './createPubsubStore';
import { REPEATER_BLOCK_NAME as REPEATER_BLOCK } from './repeaterBlockName';

const CLOSED = { open: false, rootClientId: undefined, clientId: undefined, isAppender: false };

const store = createPubsubStore(
    CLOSED,
    ( a, b ) =>
        a.open === b.open &&
        a.rootClientId === b.rootClientId &&
        a.clientId === b.clientId &&
        a.isAppender === b.isAppender,
);

/**
 * Called when a mini inserter popover opens.
 *
 * @param {Object} destination
 * @param {string} [destination.rootClientId] Container to insert into (undefined = root list).
 * @param {string} [destination.clientId]     Insert BEFORE this block (core's in-between semantics).
 * @param {boolean} [destination.isAppender]  Append to the end of `rootClientId`.
 */
export const setMiniInserterTarget = ( { rootClientId, clientId, isAppender } = {} ) =>
    store.set( { open: true, rootClientId, clientId, isAppender: !! isAppender } );

/** Called when the mini inserter popover closes. */
export const clearMiniInserterTarget = () => store.set( CLOSED );

/** Read the destination reactively (React components). */
export const useMiniInserterTarget = () => useSyncExternalStore( store.subscribe, store.get );

/** Read the destination imperatively (DOM sync code). */
export const getMiniInserterTarget = () => store.get();

/** Re-run on destination changes (DOM sync code). Returns an unsubscribe fn. */
export const subscribeMiniInserterTarget = ( listener ) => store.subscribe( listener );

/**
 * False when the destination is inside a Repeater (existing fields can't be
 * sub-fields). Driven by destination, not a per-caller flag.
 */
export const miniInserterAllowsExistingFields = () => {
    const { rootClientId } = store.get();
    if ( ! rootClientId ) return true;
    const editor = dataSelect( 'core/block-editor' );
    if ( editor.getBlockName( rootClientId ) === REPEATER_BLOCK ) return false;
    const parents = editor.getBlockParents( rootClientId ) || [];
    return ! parents.some( ( id ) => editor.getBlockName( id ) === REPEATER_BLOCK );
};
