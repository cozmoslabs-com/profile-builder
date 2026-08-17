/**
 * Remove field blocks with a snackbar Undo (global undo stays off; attribute
 * edits are mirrored server-side). Re-insert on Undo in ascending index order.
 *
 * @param {string[]|string} clientIds
 * @param {Object}          [options]
 * @param {string}          [options.message]
 * @param {Function}        [options.select]
 * @param {Function}        [options.dispatch]
 */

import { select as defaultSelect, dispatch as defaultDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

export function removeBlocksWithUndo( clientIds, options = {} ) {
    const select   = options.select || defaultSelect;
    const dispatch = options.dispatch || defaultDispatch;

    const ids = ( Array.isArray( clientIds ) ? clientIds : [ clientIds ] ).filter( Boolean );
    if ( ! ids.length ) return;

    const editor = select( 'core/block-editor' );
    const { removeBlocks, insertBlock } = dispatch( 'core/block-editor' );
    if ( ! editor ) return;

    const snapshots = ids
        .map( ( clientId ) => ( {
            block:        editor.getBlock( clientId ),
            rootClientId: editor.getBlockRootClientId( clientId ) || '',
            index:        editor.getBlockIndex( clientId ),
        } ) )
        .filter( ( snapshot ) => !! snapshot.block )
        .sort( ( a, b ) => a.index - b.index );

    removeBlocks( ids );

    const notices = dispatch( 'core/notices' );
    if ( ! notices || ! snapshots.length ) {
        return;
    }

    const message = options.message || __( 'Field removed from this form.', 'profile-builder' );

    notices.createInfoNotice( message, {
        type:    'snackbar',
        actions: [
            {
                label:   __( 'Undo', 'profile-builder' ),
                onClick: () => {
                    snapshots.forEach( ( { block, index, rootClientId } ) => {
                        insertBlock( block, index, rootClientId || undefined );
                    } );
                },
            },
        ],
    } );
}
