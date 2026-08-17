/**
 * Live snapshot of global `wppb_manage_fields` for Existing Fields + Conditional Logic.
 * Seeded from the bridge; refreshed by post-save GET and per-edit PUT sync.
 */
import { useSyncExternalStore } from '@wordpress/element';

import { createPubsubStore } from './createPubsubStore';

const store = createPubsubStore(
    ( window.wppbFb && window.wppbFb.existingFields && window.wppbFb.existingFields.fields ) || [],
);

/** Replace the snapshot (post-save refetch, per-edit PUT reconcile, delete). */
export const setExistingFieldsSnapshot = ( next ) => store.set( next );

/** Read imperatively (store-mutating callbacks outside React). */
export const getExistingFieldsSnapshot = () => store.get();

/** Read reactively (React components). */
export const useExistingFieldsSnapshot = () =>
    useSyncExternalStore( store.subscribe, store.get );
