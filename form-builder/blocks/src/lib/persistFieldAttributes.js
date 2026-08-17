/**
 * Shared per-edit attribute persister for canvas + VirtualFieldEdit.
 * Identity is `(scope, id)` — top vs Repeater sub scopes never share timers.
 * Diff is against full `lastSent`, not the previous patch.
 */

import apiFetch from '@wordpress/api-fetch';
import { dispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

const DEBOUNCE_MS = 500;
const MAX_PUT_RETRIES = 5;

// Don't echo `conditional-logic` write-backs — server prunes empty rules and
// that would wipe a half-filled rule the user is still editing.
const WRITE_BACK_EXCLUDED_KEYS = new Set( [ 'conditional-logic' ] );

const debounceTimers = new Map();   // key → timeout handle
const lastSent       = new Map();   // key → { ...full attribute snapshot }
const pendingPatches = new Map();   // key → accumulated patch awaiting the next debounce flush
const retryCounts    = new Map();   // key → consecutive failed-PUT attempts
const pendingMeta    = new Map();   // key → { scope, id, fieldType, clientId } for an unload flush

/** Surface a persist failure (VirtualFieldEdit has no form-save fallback). */
function noticePersistFailure() {
    const notices = dispatch( 'core/notices' );
    if ( ! notices || typeof notices.createErrorNotice !== 'function' ) return;
    notices.createErrorNotice(
        __(
            'Profile Builder could not save one or more field settings. Check your connection, then re-apply the change or save the form to retry.',
            'profile-builder'
        ),
        { id: 'wppb-fb-persist-failed', isDismissible: true }
    );
}

/** Flush queued patches on pagehide (debounce would lose them on navigate). */
export function flushAllPendingPersists() {
    for ( const key of Array.from( pendingPatches.keys() ) ) {
        const patch = pendingPatches.get( key );
        const meta  = pendingMeta.get( key );
        pendingPatches.delete( key );
        if ( debounceTimers.has( key ) ) {
            clearTimeout( debounceTimers.get( key ) );
            debounceTimers.delete( key );
        }
        if ( ! meta || ! patch || Object.keys( patch ).length === 0 ) continue;
        flushPut( { ...meta, patch }, true );
    }
}

let unloadFlushBound = false;
function bindUnloadFlush() {
    if ( unloadFlushBound || typeof window === 'undefined' ) return;
    unloadFlushBound = true;
    window.addEventListener( 'pagehide', flushAllPendingPersists );
}

let snapshotSync = null;
export function registerSnapshotSync( fn ) {
    snapshotSync = fn;
    return () => { if ( snapshotSync === fn ) snapshotSync = null; };
}

const writeBackHandlers = new Map();
export function registerWriteBack( clientId, fn ) {
    writeBackHandlers.set( clientId, fn );
    return () => { writeBackHandlers.delete( clientId ); };
}

function keyFor( scope, id ) {
    return scope + ':' + id;
}

/**
 * Capture the initial attribute state of a block without scheduling a PUT.
 * Called by the mirror's first walk after editor mount so the diff baseline
 * matches what the server already has.
 */
export function captureInitial( scope, id, attributes ) {
    lastSent.set( keyFor( scope, id ), { ...attributes } );
}

/**
 * Forget the cached state for a key. Called when a block is removed from
 * canvas so its identity can be reused without false-positive diffs if the
 * id is later assigned to a different block.
 */
export function forget( scope, id ) {
    const key = keyFor( scope, id );
    if ( debounceTimers.has( key ) ) {
        clearTimeout( debounceTimers.get( key ) );
        debounceTimers.delete( key );
    }
    lastSent.delete( key );
    pendingPatches.delete( key );
    retryCounts.delete( key );
    pendingMeta.delete( key );
}

/** Arm debounce/retry timer that drains pendingPatches into flushPut. */
function armFlushTimer( key, meta, delay ) {
    bindUnloadFlush();
    pendingMeta.set( key, { scope: meta.scope, id: meta.id, fieldType: meta.fieldType, clientId: meta.clientId } );
    if ( debounceTimers.has( key ) ) clearTimeout( debounceTimers.get( key ) );
    debounceTimers.set( key, setTimeout( () => {
        debounceTimers.delete( key );
        const flushPatch = pendingPatches.get( key );
        pendingPatches.delete( key );
        if ( ! flushPatch || Object.keys( flushPatch ).length === 0 ) return;
        flushPut( { ...meta, patch: flushPatch } );
    }, delay ) );
}

/**
 * Move persister state when a key migrates (Repeater meta-name rename).
 * Do not `forget` — that drops pending patches and resets the baseline.
 */
export function migrate( fromScope, fromId, toMeta ) {
    const fromKey = keyFor( fromScope, fromId );
    const toKey   = keyFor( toMeta.scope, toMeta.id );
    if ( fromKey === toKey ) return;

    if ( lastSent.has( fromKey ) ) {
        lastSent.set( toKey, lastSent.get( fromKey ) );
        lastSent.delete( fromKey );
    }
    if ( pendingPatches.has( fromKey ) ) {
        const carried  = pendingPatches.get( fromKey );
        const existing = pendingPatches.get( toKey ) || {};
        pendingPatches.set( toKey, { ...carried, ...existing } );
        pendingPatches.delete( fromKey );
    }
    if ( retryCounts.has( fromKey ) ) {
        retryCounts.set( toKey, retryCounts.get( fromKey ) );
        retryCounts.delete( fromKey );
    }
    if ( debounceTimers.has( fromKey ) ) {
        clearTimeout( debounceTimers.get( fromKey ) );
        debounceTimers.delete( fromKey );
    }

    const pend = pendingPatches.get( toKey );
    if ( pend && Object.keys( pend ).length > 0 ) {
        armFlushTimer( toKey, toMeta, DEBOUNCE_MS );
    }
}

/** Schedule a debounced REST PUT for an attribute change. */
export function scheduleAttributePersist( { scope, id, fieldType, clientId, attributes } ) {
    if ( ! id || id <= 0 ) return;
    if ( ! scope || ! attributes ) return;

    const key  = keyFor( scope, id );
    const prev = lastSent.get( key );

    // First time we see this id at this scope: capture baseline, no PUT.
    if ( ! prev ) {
        lastSent.set( key, { ...attributes } );
        return;
    }

    // Compute the patch.
    const patch = {};
    for ( const k of Object.keys( attributes ) ) {
        if ( k === 'id' || k === 'field' ) continue;
        if ( attributes[ k ] !== prev[ k ] ) {
            patch[ k ] = attributes[ k ];
        }
    }
    if ( Object.keys( patch ).length === 0 ) return;

    // Advance lastSent so a fast follow-up diffs against the in-flight value.
    lastSent.set( key, { ...prev, ...patch } );

    // Merge into pendingPatches; timer flush sends one PUT.
    const pending = pendingPatches.get( key ) || {};
    Object.assign( pending, patch );
    pendingPatches.set( key, pending );

    // A fresh edit means we're out of failure-retry backoff — full budget again.
    retryCounts.delete( key );

    armFlushTimer( key, { scope, id, fieldType, clientId }, DEBOUNCE_MS );
}

function flushPut( { scope, id, fieldType, clientId, patch }, keepalive = false ) {
    const key  = keyFor( scope, id );
    const path = scope === 'top'
        ? `/wppb/v1/existing-fields/${ id }`
        : `/wppb/v1/existing-fields/sub/${ encodeURIComponent( scope.slice( 4 ) ) }/${ id }`;

    const body = { attributes: patch };
    if ( fieldType ) body.field = fieldType;

    const request = { path, method: 'PUT', data: body };
    // Unload flush: apiFetch forwards unknown options to window.fetch, so this
    // lets the request survive the document being torn down.
    if ( keepalive ) request.keepalive = true;

    apiFetch( request )
        .then( ( response ) => {
            if ( ! response || ! response.field ) return;

            const canonical = response.field.attributes || {};
            const sentPatch = patch;

            // Write back only keys the server changed that the user hasn't typed past.
            const sanitizedDiff = {};
            for ( const k of Object.keys( sentPatch ) ) {
                if ( WRITE_BACK_EXCLUDED_KEYS.has( k ) ) continue;
                if ( canonical[ k ] !== undefined && canonical[ k ] !== sentPatch[ k ] ) {
                    sanitizedDiff[ k ] = canonical[ k ];
                }
            }
            // Also surface meta-name even when not in the sent patch — the
            // server might have auto-generated it on first upsert.
            if (
                response.field.metaName !== undefined &&
                sentPatch[ 'meta-name' ] === undefined &&
                ( ! lastSent.get( key ) || lastSent.get( key )[ 'meta-name' ] !== response.field.metaName )
            ) {
                sanitizedDiff[ 'meta-name' ] = response.field.metaName;
            }

            // This PUT succeeded, so clear any failure-retry state for the key.
            retryCounts.delete( key );

            // Advance lastSent to the server's canonical state for every
            // key it touched. Keeps future diffs honest.
            const merged = { ...( lastSent.get( key ) || {} ), ...canonical };
            if ( response.field.metaName !== undefined ) merged[ 'meta-name' ] = response.field.metaName;
            // Re-queue edits that landed during the in-flight PUT.
            const pendingNow = pendingPatches.get( key );
            if ( pendingNow ) Object.assign( merged, pendingNow );
            lastSent.set( key, merged );

            if ( Object.keys( sanitizedDiff ).length > 0 ) {
                const writeBack = writeBackHandlers.get( clientId );
                if ( writeBack ) writeBack( sanitizedDiff, sentPatch );
            }

            if ( snapshotSync ) snapshotSync( response.field, scope );
        } )
        .catch( ( err ) => {
            // eslint-disable-next-line no-console
            console.warn( '[wppb-fb] attribute persist failed', { path, patch, err } );

            // On failure, roll optimistic lastSent back for the failed keys.
            const attempts = ( retryCounts.get( key ) || 0 ) + 1;
            if ( attempts > MAX_PUT_RETRIES ) {
                // Give up after retries: restore lastSent for failed keys and notice.
                const baseline = lastSent.get( key );
                if ( baseline ) {
                    for ( const k of Object.keys( patch ) ) delete baseline[ k ];
                    lastSent.set( key, baseline );
                }
                retryCounts.delete( key );
                noticePersistFailure();
                return;
            }
            retryCounts.set( key, attempts );

            // Merge the failed patch UNDER anything queued since (a newer edit's
            // value for the same key must win), then re-arm.
            const requeued = pendingPatches.get( key ) || {};
            pendingPatches.set( key, { ...patch, ...requeued } );
            armFlushTimer( key, { scope, id, fieldType, clientId }, DEBOUNCE_MS * attempts );
        } );
}
