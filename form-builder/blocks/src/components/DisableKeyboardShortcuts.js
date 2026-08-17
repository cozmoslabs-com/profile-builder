/**
 * Unregister all Gutenberg keyboard shortcuts on PB form CPTs.
 * On-screen controls keep working; only key bindings go.
 *
 * Scope: `core/keyboard-shortcuts` only. RichText formatting is internal and
 * stays. Sweep categories via `getCategoryShortcuts` (no "all names" selector);
 * re-unsubscribe on store changes until empty.
 */

import { useEffect } from '@wordpress/element';
import { useSelect, select as dataSelect, dispatch as dataDispatch, subscribe } from '@wordpress/data';
import { registerPlugin } from '@wordpress/plugins';

const PB_CPTS = [ 'wppb-rf-cpt', 'wppb-epf-cpt' ];
const STORE = 'core/keyboard-shortcuts';

// Core categories plus headroom; unknown categories return [].
const SWEEP_CATEGORIES = [
    'global', 'block', 'main', 'list-view',
    'text', 'canvas', 'editor', 'register', 'selection', 'navigation',
];

const collectShortcutNames = () => {
    const sel = dataSelect( STORE );
    if ( ! sel || typeof sel.getCategoryShortcuts !== 'function' ) return [];
    const names = new Set();
    for ( const category of SWEEP_CATEGORIES ) {
        let list;
        try { list = sel.getCategoryShortcuts( category ); } catch ( e ) { continue; }
        if ( Array.isArray( list ) ) {
            list.forEach( ( name ) => { if ( name ) names.add( name ); } );
        }
    }
    return Array.from( names );
};

// Only dispatches for names that exist — empty store → no loop.
const unregisterAllShortcuts = () => {
    const dis = dataDispatch( STORE );
    if ( ! dis || typeof dis.unregisterShortcut !== 'function' ) return 0;
    const names = collectShortcutNames();
    names.forEach( ( name ) => dis.unregisterShortcut( name ) );
    return names.length;
};

const DisableKeyboardShortcuts = () => {
    const postType = useSelect(
        ( select ) => select( 'core/editor' ).getCurrentPostType(),
        []
    );
    const isOurPostType = PB_CPTS.includes( postType );

    useEffect( () => {
        if ( ! isOurPostType ) return undefined;

        unregisterAllShortcuts();

        // Core may register after us or on remount; re-sweep until empty.
        const unsubscribe = subscribe( () => {
            unregisterAllShortcuts();
        }, STORE );

        return unsubscribe;
    }, [ isOurPostType ] );

    return null;
};

registerPlugin( 'wppb-fb-disable-keyboard-shortcuts', { render: DisableKeyboardShortcuts } );
