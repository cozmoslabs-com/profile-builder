/**
 * Tooltip on greyed-out once-per-form "New Fields" inserter entries.
 * Document-level listener (sidebar + mini-inserter popovers). Only uniqueBlocks.
 */

import { useEffect, useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { registerPlugin } from '@wordpress/plugins';
import { Popover } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

const PB_CPTS = [ 'wppb-rf-cpt', 'wppb-epf-cpt' ];
const ITEM_SELECTOR = '.block-editor-block-types-list__item';
const TITLE_SELECTOR = '.block-editor-block-types-list__item-title';

/**
 * Inserter item classes for once-per-form blocks (`editor-block-list-item-{name}`).
 * Built from names; class→name reverse is ambiguous (names have dashes).
 *
 * @return {Set<string>}
 */
const uniqueItemClasses = () => {
    const names = window.wppbFb?.uniqueness?.uniqueBlocks;
    return new Set(
        Array.isArray( names )
            ? names.map( ( name ) => `editor-block-list-item-${ name.replace( '/', '-' ) }` )
            : []
    );
};

// Core marks the entry `aria-disabled` (Composite's accessibleWhenDisabled), not
// `disabled` — which is exactly why it still receives hover and focus. The
// `disabled` half is a guard in case a future version switches back.
const isDimmed = ( item ) => item.disabled || item.getAttribute( 'aria-disabled' ) === 'true';

const UniqueFieldTooltip = () => {
    const isOurPostType = useSelect(
        ( select ) => PB_CPTS.includes( select( 'core/editor' ).getCurrentPostType() ),
        []
    );
    const [ anchor, setAnchor ] = useState( null );

    useEffect( () => {
        if ( ! isOurPostType ) return undefined;

        const classes = uniqueItemClasses();
        if ( ! classes.size ) return undefined;

        const resolve = ( target ) => {
            const item = target?.closest?.( ITEM_SELECTOR );
            if ( ! item || ! isDimmed( item ) ) return null;
            return Array.from( item.classList ).some( ( cls ) => classes.has( cls ) ) ? item : null;
        };

        // `mouseover` (not `mouseenter`) so one document-level listener sees
        // every entry; it re-fires on each element the pointer enters, so
        // leaving an entry for anything else resolves to null and closes.
        const onPoint = ( event ) => setAnchor( resolve( event.target ) );
        const onLeaveWindow = () => setAnchor( null );

        document.addEventListener( 'mouseover', onPoint );
        document.addEventListener( 'focusin', onPoint );
        document.documentElement.addEventListener( 'mouseleave', onLeaveWindow );

        return () => {
            document.removeEventListener( 'mouseover', onPoint );
            document.removeEventListener( 'focusin', onPoint );
            document.documentElement.removeEventListener( 'mouseleave', onLeaveWindow );
        };
    }, [ isOurPostType ] );

    // `isConnected`: the entry can be re-rendered out from under a hover (the
    // list rebuilds whenever the canvas changes), and positioning against a
    // detached node would strand the tooltip at the top-left of the screen.
    if ( ! anchor || ! anchor.isConnected ) return null;

    const title = anchor.querySelector( TITLE_SELECTOR )?.textContent?.trim();

    return (
        <Popover
            className="wppb-fb-unique-tip"
            anchor={ anchor }
            placement="bottom"
            offset={ 8 }
            focusOnMount={ false }
            animate={ false }
        >
            { title
                ? sprintf(
                        /* translators: %s: field name, e.g. "Username". */
                        __( '“%s” is already in this form. This field can only be added once per form.', 'profile-builder' ),
                        title
                  )
                : __( 'This field is already in this form. It can only be added once per form.', 'profile-builder' ) }
        </Popover>
    );
};

registerPlugin( 'wppb-fb-unique-field-tooltip', { render: UniqueFieldTooltip } );
