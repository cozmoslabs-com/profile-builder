/**
 * Subscribe to core/block-editor and drive per-edit REST mirror for PB fields.
 * First sighting is capture-only; later changes schedule debounced PUTs.
 * Write-back applies sanitized server values when the user hasn't typed past them.
 */

import { useEffect, useRef } from '@wordpress/element';
import { useSelect, useDispatch, useRegistry } from '@wordpress/data';
import { registerPlugin } from '@wordpress/plugins';
import {
    scheduleAttributePersist,
    captureInitial,
    forget,
    migrate,
    registerWriteBack,
    registerSnapshotSync,
} from '../lib/persistFieldAttributes';
import { makeWriteBackHandler } from '../lib/writeBackHandler';
import { REPEATER_BLOCK_NAME as REPEATER_BLOCK } from '../lib/repeaterBlockName';

/** Collect PB field blocks with scope (`top` or `sub:<parentMetaName>`). */
function collectPbBlocks( blocks, scope, parentMetaName, out, fieldTypeMap ) {
    for ( const b of blocks ) {
        if ( ! b || ! b.name ) continue;
        const isPb = b.name.startsWith( 'profile-builder/' );
        if ( isPb && b.attributes && b.attributes.id ) {
            const fieldType = fieldTypeMap[ b.name ] || '';
            out.push( {
                clientId:   b.clientId,
                name:       b.name,
                id:         Number( b.attributes.id ),
                attributes: b.attributes,
                scope,
                fieldType,
            } );
        }
        if ( b.innerBlocks && b.innerBlocks.length ) {
            if ( b.name === REPEATER_BLOCK && b.attributes ) {
                const childScope = 'sub:' + ( b.attributes[ 'meta-name' ] || '' );
                // Skip until Repeater has a meta-name (parent option key).
                if ( b.attributes[ 'meta-name' ] ) {
                    collectPbBlocks( b.innerBlocks, childScope, b.attributes[ 'meta-name' ], out, fieldTypeMap );
                }
            } else {
                collectPbBlocks( b.innerBlocks, scope, parentMetaName, out, fieldTypeMap );
            }
        }
    }
    return out;
}

const BlockAttributeMirror = () => {
    const registry = useRegistry();
    const { updateBlockAttributes, __unstableMarkNextChangeAsNotPersistent } = useDispatch( 'core/block-editor' );

    const postType = useSelect(
        ( select ) => select( 'core/editor' ).getCurrentPostType(),
        []
    );
    const isOurPostType = [ 'wppb-rf-cpt', 'wppb-epf-cpt' ].includes( postType );

    const seenKeys = useRef( new Set() );
    const writeBackUnregs = useRef( new Map() );  // clientId → unregister fn

    useEffect( () => {
        if ( ! isOurPostType ) return undefined;

        const fieldTypeMap = ( window.wppbFb && window.wppbFb.conditionalFields && window.wppbFb.conditionalFields.blockToFieldType ) || {};

        const buildWriteBack = makeWriteBackHandler( {
            getBlock:              ( clientId ) => registry.select( 'core/block-editor' ).getBlock( clientId ),
            updateBlockAttributes,
            markNonPersistent:     typeof __unstableMarkNextChangeAsNotPersistent === 'function'
                ? __unstableMarkNextChangeAsNotPersistent
                : undefined,
        } );

        let prevBlocks = null;
        // Skip persist when attributes ref unchanged (array rebuild false positives).
        const prevAttrsRef = new Map(); // key (scope:id) → attributes object reference

        const runTick = () => {
            const blocks = registry.select( 'core/block-editor' ).getBlocks();
            if ( blocks === prevBlocks ) return;
            prevBlocks = blocks;

            const collected = collectPbBlocks( blocks, 'top', null, [], fieldTypeMap );

            // Duplicate block copies id — reset dupes to 0 for re-allocation.
            const seenIdInTick = new Set();
            const dedupClientIds = [];
            for ( const item of collected ) {
                if ( seenIdInTick.has( item.id ) ) {
                    dedupClientIds.push( item.clientId );
                } else {
                    seenIdInTick.add( item.id );
                }
            }
            if ( dedupClientIds.length > 0 ) {
                if ( typeof __unstableMarkNextChangeAsNotPersistent === 'function' ) {
                    __unstableMarkNextChangeAsNotPersistent();
                }
                for ( const clientId of dedupClientIds ) {
                    updateBlockAttributes( clientId, { id: 0 } );
                }
                return;
            }

            const presentKeys = new Set();
            for ( const item of collected ) presentKeys.add( item.scope + ':' + item.id );

            // Re-scope persister state when Repeater meta-name renames a sub key.
            const vanished = [];
            for ( const key of seenKeys.current ) {
                if ( ! presentKeys.has( key ) ) vanished.push( key );
            }
            if ( vanished.length > 0 ) {
                const appearedById = new Map();
                for ( const item of collected ) {
                    const key = item.scope + ':' + item.id;
                    if ( ! seenKeys.current.has( key ) ) appearedById.set( item.id, item );
                }
                for ( const oldKey of vanished ) {
                    const [ oldScope, oldIdStr ] = oldKey.split( /:(?=[^:]+$)/ );
                    const oldId = Number( oldIdStr );
                    const successor = appearedById.get( oldId );
                    if ( successor && successor.scope !== oldScope ) {
                        const newKey = successor.scope + ':' + successor.id;
                        migrate( oldScope, oldId, {
                            scope:     successor.scope,
                            id:        successor.id,
                            fieldType: successor.fieldType,
                            clientId:  successor.clientId,
                        } );
                        seenKeys.current.delete( oldKey );
                        seenKeys.current.add( newKey );
                        if ( prevAttrsRef.has( oldKey ) ) {
                            prevAttrsRef.set( newKey, prevAttrsRef.get( oldKey ) );
                            prevAttrsRef.delete( oldKey );
                        }
                        appearedById.delete( oldId );
                    }
                }
            }

            for ( const item of collected ) {
                const key = item.scope + ':' + item.id;

                if ( ! writeBackUnregs.current.has( item.clientId ) ) {
                    const unreg = registerWriteBack( item.clientId, buildWriteBack( item.clientId ) );
                    writeBackUnregs.current.set( item.clientId, unreg );
                }

                if ( ! seenKeys.current.has( key ) ) {
                    captureInitial( item.scope, item.id, item.attributes );
                    seenKeys.current.add( key );
                    prevAttrsRef.set( key, item.attributes );
                    continue;
                }

                if ( prevAttrsRef.get( key ) === item.attributes ) continue;
                prevAttrsRef.set( key, item.attributes );

                scheduleAttributePersist( {
                    scope:      item.scope,
                    id:         item.id,
                    fieldType:  item.fieldType,
                    clientId:   item.clientId,
                    attributes: item.attributes,
                } );
            }

            for ( const key of Array.from( seenKeys.current ) ) {
                if ( ! presentKeys.has( key ) ) {
                    const [ scope, idStr ] = key.split( /:(?=[^:]+$)/ );
                    forget( scope, Number( idStr ) );
                    seenKeys.current.delete( key );
                    prevAttrsRef.delete( key );
                }
            }
            const liveClientIds = new Set( collected.map( ( c ) => c.clientId ) );
            for ( const [ clientId, unreg ] of Array.from( writeBackUnregs.current.entries() ) ) {
                if ( ! liveClientIds.has( clientId ) ) {
                    unreg();
                    writeBackUnregs.current.delete( clientId );
                }
            }
        };

        // Coalesce store bursts into one microtask (works when tab is backgrounded).
        let pendingTick = false;
        let disposed = false;
        const scheduleTick = () => {
            if ( pendingTick ) return;
            pendingTick = true;
            Promise.resolve().then( () => {
                pendingTick = false;
                if ( ! disposed ) runTick();
            } );
        };

        runTick();
        const unsubscribe = registry.subscribe( scheduleTick );
        return () => {
            disposed = true;
            unsubscribe();
            for ( const unreg of writeBackUnregs.current.values() ) unreg();
            writeBackUnregs.current.clear();
            seenKeys.current.clear();
        };
    }, [ isOurPostType, registry, updateBlockAttributes, __unstableMarkNextChangeAsNotPersistent ] );

    return null;
};

registerPlugin( 'wppb-fb-block-attribute-mirror', { render: BlockAttributeMirror } );

export { registerSnapshotSync };
