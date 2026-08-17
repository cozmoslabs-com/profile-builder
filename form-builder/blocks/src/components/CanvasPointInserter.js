/**
 * Route core's in-between / empty-block "+" through the full mini inserter.
 * No prop seam for `__experimentalIsQuick`; click is intercepted and our own
 * <Inserter> mounts on an invisible anchor (core's "+" unmounts on hover-end).
 * Anchor tracks the destination block each frame via DOM writes, not React state.
 */
import { Inserter } from '@wordpress/block-editor';
import { select as dataSelect, useSelect } from '@wordpress/data';
import { createPortal, useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { registerPlugin } from '@wordpress/plugins';

import { resolveMiniInserterPosition } from '../lib/miniInserterPlacement';
import { clearMiniInserterTarget, setMiniInserterTarget } from '../lib/miniInserterTarget';

const PB_CPTS = [ 'wppb-rf-cpt', 'wppb-epf-cpt' ];

const IN_BETWEEN_CLASS = 'block-editor-block-list__insertion-point-inserter';
const EMPTY_BLOCK_CLASS = 'block-editor-block-list__empty-block-inserter';
const HOST_SELECTOR = `.${ IN_BETWEEN_CLASS }, .${ EMPTY_BLOCK_CLASS }`;

/**
 * Insert destination for a "+" click (`clientId` = insert before; else append).
 *
 * @param {Element} host The "+" wrapper that was clicked.
 * @return {?Object} `{ rootClientId, clientId, isAppender }` or null.
 */
const resolveDestination = ( host ) => {
    const editor = dataSelect( 'core/block-editor' );
    if ( ! editor ) return null;

    if ( host.classList.contains( EMPTY_BLOCK_CLASS ) ) {
        const clientId = editor.getSelectedBlockClientId();
        if ( ! clientId ) return null;
        return { rootClientId: editor.getBlockRootClientId( clientId ) || undefined, clientId };
    }

    const point = editor.getBlockInsertionPoint();
    if ( ! point ) return null;
    const rootClientId = point.rootClientId || undefined;
    const clientId = ( editor.getBlockOrder( point.rootClientId ) || [] )[ point.index ];
    return clientId ? { rootClientId, clientId } : { rootClientId, isAppender: true };
};

/**
 * Destination block position in main-document coords (iframe offset added).
 * Used as a moving origin so the anchor tracks canvas scroll/reflow.
 *
 * @param {Object} destination `{ rootClientId, clientId }` from resolveDestination.
 * @return {?Object} `{ left, top }` or null when the canvas isn't reachable.
 */
const measureDestinationOrigin = ( { clientId, rootClientId } ) => {
    const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
    const doc = iframe ? iframe.contentDocument : document;
    if ( ! doc ) return null;
    const frame = iframe ? iframe.getBoundingClientRect() : { left: 0, top: 0 };

    const el =
        ( clientId && doc.querySelector( `[data-block="${ clientId }"]` ) ) ||
        ( rootClientId && doc.querySelector( `[data-block="${ rootClientId }"]` ) ) ||
        doc.querySelector( '.block-editor-block-list__layout.is-root-container' );
    if ( ! el ) return null;

    const rect = el.getBoundingClientRect();
    return { left: frame.left + rect.left, top: frame.top + rect.top };
};

/** Invisible toggle that opens its Dropdown once on mount. */
const AutoOpenToggle = ( { onToggle } ) => {
    const openedRef = useRef( false );
    useEffect( () => {
        if ( openedRef.current ) return;
        openedRef.current = true;
        onToggle();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [] );
    return <span className="wppb-fb-point-inserter__toggle" aria-hidden="true" />;
};

const CanvasPointInserter = () => {
    const postType = useSelect( ( select ) => select( 'core/editor' ).getCurrentPostType(), [] );
    const isOurPostType = PB_CPTS.includes( postType );

    const [ target, setTarget ] = useState( null );
    const close = useCallback( () => setTarget( null ), [] );
    const anchorRef = useRef( null );

    useEffect( () => {
        if ( ! isOurPostType ) return undefined;

        const onClickCapture = ( event ) => {
            const el = event.target;
            if ( ! el || typeof el.closest !== 'function' ) return;
            const host = el.closest( HOST_SELECTOR );
            if ( ! host ) return;

            const destination = resolveDestination( host );
            if ( ! destination ) return;

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const rect = host.getBoundingClientRect();
            setTarget( {
                rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                position: resolveMiniInserterPosition( rect ),
                origin: measureDestinationOrigin( destination ),
                ...destination,
            } );
        };

        // "+" popovers live in the main document; one capture listener covers both.
        document.addEventListener( 'click', onClickCapture, true );
        return () => document.removeEventListener( 'click', onClickCapture, true );
    }, [ isOurPostType ] );

    // Track destination movement with DOM writes (state would re-render each frame).
    useEffect( () => {
        if ( ! target || ! target.origin ) return undefined;

        let raf = 0;
        let applied = null;
        const sync = () => {
            raf = window.requestAnimationFrame( sync );

            const node = anchorRef.current;
            const now = measureDestinationOrigin( target );
            if ( ! node || ! now ) return;

            const dx = now.left - target.origin.left;
            const dy = now.top - target.origin.top;
            if ( applied && applied.dx === dx && applied.dy === dy ) return;
            applied = { dx, dy };

            node.style.left = `${ target.rect.left + dx }px`;
            node.style.top = `${ target.rect.top + dy }px`;
        };

        raf = window.requestAnimationFrame( sync );
        return () => window.cancelAnimationFrame( raf );
    }, [ target ] );

    useEffect( () => {
        if ( ! target ) return undefined;
        setMiniInserterTarget( target );
        return () => clearMiniInserterTarget();
    }, [ target ] );

    if ( ! isOurPostType || ! target ) return null;

    return createPortal(
        <div
            className="wppb-fb-point-inserter"
            ref={ anchorRef }
            style={ {
                left: `${ target.rect.left }px`,
                top: `${ target.rect.top }px`,
                width: `${ target.rect.width }px`,
                height: `${ target.rect.height }px`,
            } }
        >
            <Inserter
                rootClientId={ target.rootClientId }
                clientId={ target.clientId }
                isAppender={ !! target.isAppender }
                position={ target.position }
                onToggle={ ( isOpen ) => {
                    if ( ! isOpen ) close();
                } }
                onSelectOrClose={ close }
                renderToggle={ ( { onToggle } ) => <AutoOpenToggle onToggle={ onToggle } /> }
            />
        </div>,
        document.body
    );
};

registerPlugin( 'wppb-fb-canvas-point-inserter', { render: CanvasPointInserter } );

export default CanvasPointInserter;
