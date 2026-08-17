import { __, _n, sprintf } from '@wordpress/i18n';
import {
    Button,
    PanelBody,
    Notice,
    SearchControl,
    Modal,
    Spinner,
    Tooltip,
    __experimentalToggleGroupControl as ToggleGroupControl,
    __experimentalToggleGroupControlOptionIcon as ToggleGroupControlOptionIcon,
} from '@wordpress/components';
import { useDispatch, useSelect, useRegistry, select as dataSelect, dispatch as dataDispatch } from '@wordpress/data';
import { createBlock, getBlockType } from '@wordpress/blocks';
import { registerPlugin } from '@wordpress/plugins';
import { PluginSidebar } from '@wordpress/edit-post';
import { BlockEditorProvider, BlockList, BlockIcon } from '@wordpress/block-editor';
import { createPortal, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { FieldSettingsSlot } from './FieldSettingsSlotFill';
import {
    scheduleAttributePersist,
    captureInitial,
    registerSnapshotSync,
    registerWriteBack,
    forget,
} from '../lib/persistFieldAttributes';
import { makeWriteBackHandler } from '../lib/writeBackHandler';
import { createPubsubStore } from '../lib/createPubsubStore';
import {
    getExistingFieldsSnapshot,
    setExistingFieldsSnapshot,
    useExistingFieldsSnapshot,
} from '../lib/existingFieldsSnapshot';
import { removeBlocksWithUndo } from '../lib/removeBlocksWithUndo';
import { REPEATER_BLOCK_NAME } from '../lib/repeaterBlockName';
import {
    miniInserterAllowsExistingFields,
    subscribeMiniInserterTarget,
    useMiniInserterTarget,
} from '../lib/miniInserterTarget';

const HIJACK_TAB_SELECTOR = '[role="tab"][id$="-media"]';
const HIJACK_CLASS = 'wppb-fb-existing-fields-hijacked';
const INJECT_CLASS = 'wppb-fb-existing-fields-injected';
// Hides Existing Fields tab when destination can't take an existing field.
const NO_EXISTING_FIELDS_CLASS = 'wppb-fb-no-existing-fields';
const HIJACK_TAB_LABEL = __( 'Existing Fields', 'profile-builder' );

// Field Settings PluginSidebar (registerPlugin slug + name).
const SIDEBAR_PLUGIN  = 'wppb-fb-existing-fields-sidebar';
const SIDEBAR_NAME    = 'field-settings';
const SIDEBAR_TARGET  = `${ SIDEBAR_PLUGIN }/${ SIDEBAR_NAME }`;

// Form Settings complementary area (store name uses slash; DOM id uses colon).
const DOCUMENT_SIDEBAR = 'edit-post/document';

// Try edit-post / editor / interface open APIs across Gutenberg versions.
const openSidebar = ( identifier ) => {
    const tries = [
        [ 'core/edit-post.openGeneralSidebar',                 () => dataDispatch( 'core/edit-post' ) && dataDispatch( 'core/edit-post' ).openGeneralSidebar( identifier ) ],
        [ 'core/editor.openGeneralSidebar',                    () => dataDispatch( 'core/editor'    ) && dataDispatch( 'core/editor'    ).openGeneralSidebar( identifier ) ],
        [ 'core/interface.enableComplementaryArea',            () => dataDispatch( 'core/interface' ) && dataDispatch( 'core/interface' ).enableComplementaryArea( 'core/edit-post', identifier ) ],
    ];
    const errors = [];
    for ( const [ label, fn ] of tries ) {
        try { const r = fn(); if ( r !== undefined && r !== false ) return; } catch ( e ) { errors.push( `${ label }: ${ e?.message ?? e }` ); }
    }
    if ( errors.length === tries.length ) {
        // eslint-disable-next-line no-console
        console.warn( '[wppb-fb] openSidebar: all dispatch targets failed for', identifier, errors );
    }
};

const TAB_RENAMES = [
    { selector: '[role="tab"][id$="-blocks"]',   label: __( 'New Fields', 'profile-builder' ) },
    { selector: '[role="tab"][id$="-patterns"]', label: __( 'Examples', 'profile-builder' ) },
    { selector: HIJACK_TAB_SELECTOR,              label: HIJACK_TAB_LABEL },
];

const renameTab = ( tab, label ) => {
    if ( ! tab || tab.dataset.wppbRenamed === label ) return;
    const spans = tab.querySelectorAll( 'span' );
    let renamed = false;
    for ( const span of spans ) {
        if ( span.children.length === 0 && span.textContent.trim().length > 0 ) {
            span.textContent = label;
            renamed = true;
            break;
        }
    }
    if ( ! renamed ) {
        const span = document.createElement( 'span' );
        span.textContent = label;
        tab.appendChild( span );
    }
    if ( tab.hasAttribute( 'aria-label' ) ) {
        tab.setAttribute( 'aria-label', label );
    }
    tab.dataset.wppbRenamed = label;
};

const ensurePanelTarget = ( panel ) => {
    panel.classList.add( HIJACK_CLASS );
    let injected = panel.querySelector( `.${ INJECT_CLASS }` );
    if ( ! injected ) {
        injected = document.createElement( 'div' );
        injected.className = INJECT_CLASS;
        panel.appendChild( injected );
    }
    return injected;
};

// DFS walk of PB blocks (parent before children).
const walkPbCanvasBlocks = ( blocks, visit ) => {
    for ( const b of blocks ) {
        if ( b.name && b.name.startsWith( 'profile-builder/' ) ) visit( b );
        if ( b.innerBlocks && b.innerBlocks.length ) walkPbCanvasBlocks( b.innerBlocks, visit );
    }
};

// Index canvas by field id. Map order is DFS (card sort).
const collectCanvasFields = ( blocks, map ) => {
    walkPbCanvasBlocks( blocks, ( b ) => {
        if ( b.attributes && b.attributes.id ) {
            map.set( Number( b.attributes.id ), { clientId: b.clientId, attributes: b.attributes } );
        }
    } );
};

// Card selection shared across portal list + PluginSidebar.
// parentMetaName routes sub-field VirtualFieldEdit / persister scope.
const selectionStore = createPubsubStore(
    { id: null, parentMetaName: null },
    ( a, b ) => a.id === b.id && a.parentMetaName === b.parentMetaName,
);
const setSelectedCard = ( id, parentMetaName = null ) => {
    selectionStore.set( { id, parentMetaName } );
};
const useSelectedCard = () =>
    useSyncExternalStore( selectionStore.subscribe, selectionStore.get );

// Shared existing-fields snapshot (lib/existingFieldsSnapshot).
const setSnapshot = setExistingFieldsSnapshot;
const useSnapshot = useExistingFieldsSnapshot;

const flattenSnapshot = ( entries, out = new Map() ) => {
    for ( const e of entries ) {
        out.set( e.id, e );
        if ( e.innerBlocks && e.innerBlocks.length ) flattenSnapshot( e.innerBlocks, out );
    }
    return out;
};

// Bridge `mandatoryTypes` only — empty if missing (server still enforces delete).
const MANDATORY_DEFAULT_TYPES = new Set(
    ( window.wppbFb && Array.isArray( window.wppbFb.mandatoryTypes ) )
        ? window.wppbFb.mandatoryTypes
        : []
);

// Live canvas clientIds for a manage-fields row id (Remove/Delete scrub).
const canvasClientIdsForFieldId = ( fieldId ) => {
    const target = Number( fieldId );
    const out = [];
    walkPbCanvasBlocks( dataSelect( 'core/block-editor' ).getBlocks(), ( b ) => {
        if ( b.attributes && b.attributes.id && Number( b.attributes.id ) === target ) {
            out.push( b.clientId );
        }
    } );
    return out;
};

// Required when type declares the attr and value is 'Yes'.
const supportsRequired = ( blockName ) => {
    const type = blockName ? getBlockType( blockName ) : null;
    return !! ( type && type.attributes && type.attributes.required );
};
const isRequiredField = ( field ) =>
    supportsRequired( field.blockName ) &&
    String( ( field.attributes && field.attributes.required ) || '' ).toLowerCase() === 'yes';

// Card title + required asterisk (shared by top-level and sub-field cards).
const FieldTitle = ( { field, children } ) => (
    <div className="wppb-fb-existing-fields__title">
        { field.title || __( '(Untitled)', 'profile-builder' ) }
        { isRequiredField( field ) && (
            <span
                className="wppb-fb-existing-fields__required"
                title={ __( 'Required field', 'profile-builder' ) }
            >
                *
            </span>
        ) }
        { children }
    </div>
);

// Field Type / Meta Name / ID rows (shared card body).
const FieldMeta = ( { field } ) => (
    <>
        <div className="wppb-fb-existing-fields__row">
            <span className="wppb-fb-existing-fields__label">{ __( 'Field Type:', 'profile-builder' ) }</span>
            <span className="wppb-fb-existing-fields__type">{ field.fieldType }</span>
        </div>
        <div className="wppb-fb-existing-fields__row">
            <span className="wppb-fb-existing-fields__label">{ __( 'Meta Name:', 'profile-builder' ) }</span>
            <span className="wppb-fb-existing-fields__meta">{ field.metaName || '—' }</span>
        </div>
        <div className="wppb-fb-existing-fields__row">
            <span className="wppb-fb-existing-fields__label">{ __( 'ID:', 'profile-builder' ) }</span>
            <span className="wppb-fb-existing-fields__id">{ field.id }</span>
        </div>
    </>
);

const FILTER_ALL   = 'all';
const FILTER_IN    = 'in';
const FILTER_NOTIN = 'notin';

// Inline SVG; fill via style — button CSS overrides fill="none".
const FilterAllIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" style={ { fill: 'none' } } aria-hidden="true" focusable="false">
        <line x1="4" y1="7"  x2="20" y2="7"  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
);
const FilterInFormIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" style={ { fill: 'none' } } aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8.5 12l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
const FilterNotInFormIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" style={ { fill: 'none' } } aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 8.5v7M8.5 12h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
);

// Scroll card into view below sticky search/filter toolbar.
const scrollCardIntoView = ( card ) => {
    const scroller = card.closest( '.block-editor-tabbed-sidebar__tabpanel' );
    if ( ! scroller ) {
        card.scrollIntoView( { block: 'nearest' } );
        return;
    }
    const toolbar   = scroller.querySelector( '.wppb-fb-existing-fields__toolbar' );
    const stickyH   = toolbar ? toolbar.offsetHeight : 0;
    const cardRect  = card.getBoundingClientRect();
    const scrRect   = scroller.getBoundingClientRect();
    const margin    = 8;
    const topGap    = cardRect.top - ( scrRect.top + stickyH ); // < 0 → hidden above (behind the sticky toolbar)
    const bottomGap = cardRect.bottom - scrRect.bottom;         // > 0 → hidden below the fold
    if ( topGap < 0 ) {
        scroller.scrollTop += topGap - margin;
    } else if ( bottomGap > 0 ) {
        scroller.scrollTop += bottomGap + margin;
    }
};

// Dismiss mini-inserter popover via Escape (Dropdown useDialog).
const closeEnclosingPopover = ( el ) => {
    const popover = el && el.closest( '.components-popover' );
    if ( ! popover ) return;
    popover.dispatchEvent(
        new KeyboardEvent( 'keydown', { key: 'Escape', keyCode: 27, bubbles: true, cancelable: true } )
    );
};

// Existing Fields list. inMiniInserter → insert at published target; no save refetch.
const ExistingFieldsList = ( { inMiniInserter = false } ) => {
    const {
        insertBlock,
        updateBlockAttributes,
        selectBlock,
        clearSelectedBlock,
        removeBlocks,
        __unstableMarkNextChangeAsNotPersistent,
    } = useDispatch( 'core/block-editor' );

    const snapshot           = useSnapshot();
    const miniInserterTarget = useMiniInserterTarget();
    const selectedCard       = useSelectedCard();
    const selectedCardId         = selectedCard.id;
    const selectedCardParentMeta = selectedCard.parentMetaName;
    const [ deletingId, setDeletingId ] = useState( null );
    const [ searchTerm, setSearchTerm ] = useState( '' );
    const [ filterMode, setFilterMode ] = useState( FILTER_ALL );

    // Debounced search for filter/sort.
    const [ deferredTerm, setDeferredTerm ] = useState( '' );
    useEffect( () => {
        const t = setTimeout( () => setDeferredTerm( searchTerm ), 150 );
        return () => clearTimeout( t );
    }, [ searchTerm ] );

    // Delete confirmation modal (+ cross-form usage lookup).
    const [ pendingDelete, setPendingDelete ] = useState( null );
    const [ usage, setUsage ] = useState( { loading: false, forms: null, error: false } );
    const [ deleteError, setDeleteError ] = useState( null );
    // Ignore stale usage responses when another delete was opened.
    const pendingDeleteReqRef = useRef( null );

    // Refetch after real save (new ids / sanitized meta-names).
    const { isSaving, isAutosaving, selectedBlockClientId, selectedBlockAttrs, currentPostId } = useSelect( ( select ) => {
        const editor     = select( 'core/editor' );
        const blocks     = select( 'core/block-editor' );
        const selectedId = blocks.getSelectedBlockClientId();
        const block      = selectedId ? blocks.getBlock( selectedId ) : null;
        return {
            isSaving:               editor.isSavingPost(),
            isAutosaving:           editor.isAutosavingPost(),
            selectedBlockClientId:  selectedId,
            selectedBlockAttrs:     block ? block.attributes : null,
            currentPostId:          editor.getCurrentPostId(),
        };
    }, [] );

    // Canvas block selection wins over card-only selection.
    const selectedBlockFieldId = ( selectedBlockClientId && selectedBlockAttrs && selectedBlockAttrs.id )
        ? Number( selectedBlockAttrs.id )
        : null;
    useEffect( () => {
        if ( selectedBlockFieldId !== null && selectedCardId !== null ) {
            setSelectedCard( null );
        }
    }, [ selectedBlockFieldId, selectedCardId ] );

    const effectiveSelectedId = selectedBlockFieldId !== null ? selectedBlockFieldId : selectedCardId;

    useEffect( () => {
        // Docked sidebar only — don't scroll a mini inserter.
        if ( inMiniInserter ) return undefined;
        if ( effectiveSelectedId === null || effectiveSelectedId === undefined ) return undefined;

        // Retry ~30 frames: offsetParent null may mean not laid out yet.
        let frame = 0;
        let tries = 0;
        const MAX_TRIES = 30;
        const attempt = () => {
            const card = document.querySelector(
                '.wppb-fb-existing-fields:not(.is-mini) .wppb-fb-existing-fields__card.is-selected'
            );
            if ( card && card.offsetParent !== null ) {
                scrollCardIntoView( card );
                return;
            }
            if ( ++tries >= MAX_TRIES ) return;
            frame = window.requestAnimationFrame( attempt );
        };
        frame = window.requestAnimationFrame( attempt );
        return () => window.cancelAnimationFrame( frame );
    }, [ effectiveSelectedId, inMiniInserter ] );

    const wasRealSaving = useRef( false );
    useEffect( () => {
        // Docked copy only — avoid duplicate refetch from an open mini inserter.
        if ( inMiniInserter ) return;
        const realSavingNow = isSaving && ! isAutosaving;
        if ( wasRealSaving.current && ! isSaving ) {
            apiFetch( { path: '/wppb/v1/existing-fields' } )
                .then( ( data ) => {
                    if ( ! data || ! Array.isArray( data.fields ) ) return;
                    setSnapshot( data.fields );

                    // Write sanitized server values back onto canvas blocks.
                    const byId = flattenSnapshot( data.fields );
                    walkPbCanvasBlocks( dataSelect( 'core/block-editor' ).getBlocks(), ( b ) => {
                        if ( ! b.attributes || ! b.attributes.id ) return;
                        const field = byId.get( Number( b.attributes.id ) );
                        if ( ! field || b.attributes[ 'meta-name' ] === field.metaName ) return;
                        if ( typeof __unstableMarkNextChangeAsNotPersistent === 'function' ) {
                            __unstableMarkNextChangeAsNotPersistent();
                        }
                        updateBlockAttributes( b.clientId, { 'meta-name': field.metaName } );
                    } );
                } )
                .catch( () => { /* keep prior snapshot */ } );
        }
        wasRealSaving.current = realSavingNow;
    }, [ isSaving, isAutosaving ] );

    const canvasBlocks = useSelect( ( select ) => select( 'core/block-editor' ).getBlocks(), [] );

    // Merge live title/meta-name over snapshot; index by field id.
    const { fields, canvasById, canvasOrder } = useMemo( () => {
        const canvas = new Map();
        collectCanvasFields( canvasBlocks, canvas );

        // DFS canvas order drives card / sub-field sort.
        const order = new Map();
        let pos = 0;
        for ( const id of canvas.keys() ) order.set( id, pos++ );

        const merged = snapshot.map( ( field ) => {
            const live = canvas.get( field.id );
            if ( ! live ) return field;
            const { id: _ignored, ...liveAttrs } = live.attributes;
            return {
                ...field,
                title:    liveAttrs[ 'field-title' ] !== undefined ? liveAttrs[ 'field-title' ] : field.title,
                metaName: liveAttrs[ 'meta-name' ]   !== undefined ? liveAttrs[ 'meta-name' ]   : field.metaName,
                attributes: { ...field.attributes, ...liveAttrs },
            };
        } );

        return { fields: merged, canvasById: canvas, canvasOrder: order };
    }, [ canvasBlocks, snapshot ] );

    // Rebuild Repeater innerBlocks recursively for insert.
    const buildBlockFromEntry = ( entry ) => {
        const inner = ( entry.innerBlocks || [] ).map( buildBlockFromEntry );
        return createBlock(
            entry.blockName,
            { id: entry.id, ...entry.attributes },
            inner
        );
    };

    const onInsert = ( e, field ) => {
        e.stopPropagation();
        const button = e.currentTarget;
        // Mini inserter: insert at published destination (clientId = before).
        let rootClientId;
        let index;
        if ( inMiniInserter ) {
            rootClientId = miniInserterTarget.rootClientId;
            if ( miniInserterTarget.clientId && ! miniInserterTarget.isAppender ) {
                const at = dataSelect( 'core/block-editor' ).getBlockIndex( miniInserterTarget.clientId );
                if ( at >= 0 ) index = at;
            }
        }
        insertBlock( buildBlockFromEntry( field ), index, rootClientId );
        if ( inMiniInserter ) closeEnclosingPopover( button );
    };

    // Remove from this form only; snackbar Undo (global undo is off).
    const onRemove = ( e, field ) => {
        e.stopPropagation();
        const clientIds = canvasClientIdsForFieldId( field.id );
        if ( clientIds.length > 0 ) {
            removeBlocksWithUndo( clientIds, {
                select:   dataSelect,
                dispatch: dataDispatch,
                message:  sprintf(
                    // translators: %s: field title.
                    __( '%s removed from this form.', 'profile-builder' ),
                    field.title || field.fieldType
                ),
            } );
        }
    };

    // Delete step 1: confirm + cross-form usage lookup.
    const onDeleteClick = ( e, field ) => {
        e.stopPropagation();
        setDeleteError( null );
        setPendingDelete( field );
        pendingDeleteReqRef.current = field.id;   // mark the in-flight lookup
        setUsage( { loading: true, forms: null, error: false } );
        apiFetch( { path: `/wppb/v1/existing-fields/${ field.id }/usage` } )
            .then( ( data ) => {
                if ( pendingDeleteReqRef.current !== field.id ) return; // stale — a newer delete opened / cancelled
                const forms = ( data && Array.isArray( data.forms ) ) ? data.forms : [];
                setUsage( { loading: false, forms, error: false } );
            } )
            .catch( () => {
                if ( pendingDeleteReqRef.current !== field.id ) return; // stale
                setUsage( { loading: false, forms: [], error: true } );
            } );
    };

    // Delete cancel (no-op if delete in flight).
    const cancelDelete = () => {
        if ( deletingId !== null ) return;
        pendingDeleteReqRef.current = null;       // invalidate any in-flight lookup
        setPendingDelete( null );
        setUsage( { loading: false, forms: null, error: false } );
        setDeleteError( null );
    };

    // Delete step 2: DELETE endpoint + scrub canvas blocks.
    const confirmDelete = () => {
        const field = pendingDelete;
        if ( ! field ) return;

        setDeleteError( null );
        setDeletingId( field.id );

        // Drop queued PUTs first so upsert can't recreate the row.
        forget( 'top', field.id );

        apiFetch( {
            path:   `/wppb/v1/existing-fields/${ field.id }`,
            method: 'DELETE',
        } )
            .then( () => {
                const next = getExistingFieldsSnapshot().filter( ( entry ) => entry.id !== field.id );
                setSnapshot( next );

                // Scrub canvas blocks so save doesn't recreate the row.
                const clientIds = canvasClientIdsForFieldId( field.id );
                if ( clientIds.length > 0 ) {
                    removeBlocks( clientIds );
                }

                if ( selectedCardId === field.id ) {
                    setSelectedCard( null );
                }

                setPendingDelete( null );
                setUsage( { loading: false, forms: null, error: false } );
            } )
            .catch( ( err ) => {
                const msg = ( err && err.message ) || __( 'Failed to delete the field.', 'profile-builder' );
                setDeleteError( msg );
            } )
            .finally( () => setDeletingId( null ) );
    };

    // Card click: select canvas block or card-only; open Field Settings.
    const onCardClick = ( field, parentMetaName = null ) => {
        const live = canvasById.get( field.id );
        if ( live && live.clientId ) {
            selectBlock( live.clientId );
            setSelectedCard( null );
        } else {
            clearSelectedBlock();
            setSelectedCard( field.id, parentMetaName );
        }
        openSidebar( SIDEBAR_TARGET );
    };

    const normalizedQuery = deferredTerm.trim().toLowerCase();

    // Filter/sort: query match (incl. sub-fields); in-form first in canvas order.
    const visibleFields = useMemo( () => {
        const matchesQuery = ( field ) => {
            if ( ! normalizedQuery ) return true;
            const haystacks = [ field.title, field.fieldType, field.metaName ];
            if ( Array.isArray( field.innerBlocks ) ) {
                for ( const sub of field.innerBlocks ) {
                    haystacks.push( sub.title, sub.fieldType, sub.metaName );
                }
            }
            return haystacks.some(
                ( value ) => typeof value === 'string' && value.toLowerCase().includes( normalizedQuery )
            );
        };
        const matchesFilter = ( field ) => {
            if ( filterMode === FILTER_IN )    return canvasById.has( field.id );
            if ( filterMode === FILTER_NOTIN ) return ! canvasById.has( field.id );
            return true;
        };
        return fields
            .filter( ( field ) => matchesQuery( field ) && matchesFilter( field ) )
            .sort( ( a, b ) => {
                const aIn = canvasById.has( a.id );
                const bIn = canvasById.has( b.id );
                if ( aIn && bIn ) return canvasOrder.get( a.id ) - canvasOrder.get( b.id );
                return ( bIn ? 1 : 0 ) - ( aIn ? 1 : 0 );
            } );
    }, [ fields, canvasById, canvasOrder, normalizedQuery, filterMode ] );

    // Sub-field card: selectable, not independently insertable/deletable.
    const renderSubFieldCard = ( subField, parentMetaName ) => {
        const isUsed     = canvasById.has( subField.id );
        const isSelected = effectiveSelectedId === subField.id;
        const classes = [
            'wppb-fb-existing-fields__card',
            'is-subfield',
            isUsed     ? 'is-in-form'  : '',
            isSelected ? 'is-selected' : '',
        ].filter( Boolean ).join( ' ' );
        return (
            <li
                key={ subField.id }
                className={ classes }
                role="button"
                tabIndex={ 0 }
                aria-pressed={ isSelected || undefined }
                onClick={ ( e ) => {
                    e.stopPropagation();
                    onCardClick( subField, parentMetaName );
                } }
                onKeyDown={ ( e ) => {
                    if ( e.key === 'Enter' || e.key === ' ' ) {
                        e.preventDefault();
                        e.stopPropagation();
                        onCardClick( subField, parentMetaName );
                    }
                } }
            >
                <div className="wppb-fb-existing-fields__body">
                    <FieldTitle field={ subField } />
                    <FieldMeta field={ subField } />
                </div>
            </li>
        );
    };

    return (
        <>
            { /* Sticky search + filter toolbar. */ }
            <div className="wppb-fb-existing-fields__toolbar">
                <SearchControl
                    __nextHasNoMarginBottom
                    className="block-editor-inserter__search"
                    value={ searchTerm }
                    onChange={ setSearchTerm }
                    label={ __( 'Search', 'profile-builder' ) }
                    placeholder={ __( 'Search', 'profile-builder' ) }
                />
                { /* Padding inset so isBlock control aligns with search. */ }
                <div className="wppb-fb-existing-fields__filter">
                    <ToggleGroupControl
                        __nextHasNoMarginBottom
                        isBlock
                        hideLabelFromVision
                        label={ __( 'Filter fields', 'profile-builder' ) }
                        value={ filterMode }
                        onChange={ ( value ) => setFilterMode( value || FILTER_ALL ) }
                    >
                        <ToggleGroupControlOptionIcon
                            value={ FILTER_ALL }
                            icon={ FilterAllIcon }
                            label={ __( 'All fields', 'profile-builder' ) }
                        />
                        <ToggleGroupControlOptionIcon
                            value={ FILTER_IN }
                            icon={ FilterInFormIcon }
                            label={ __( 'In this form', 'profile-builder' ) }
                        />
                        <ToggleGroupControlOptionIcon
                            value={ FILTER_NOTIN }
                            icon={ FilterNotInFormIcon }
                            label={ __( 'Not in this form', 'profile-builder' ) }
                        />
                    </ToggleGroupControl>
                </div>
            </div>
            { visibleFields.length === 0 ? (
                /* Match New Fields empty-state styling. */
                <div className="block-editor-inserter__no-results">
                    <p>
                        { normalizedQuery
                            ? __( 'No results found.', 'profile-builder' )
                            : filterMode === FILTER_IN
                                ? __( 'No fields are in this form yet.', 'profile-builder' )
                                : filterMode === FILTER_NOTIN
                                    ? __( 'All fields are already in this form.', 'profile-builder' )
                                    : __( 'No existing fields found.', 'profile-builder' ) }
                    </p>
                </div>
            ) : (
        <ul className="wppb-fb-existing-fields__list">
            { visibleFields.map( ( field ) => {
                const isUsed         = canvasById.has( field.id );
                const isSelected     = effectiveSelectedId === field.id;
                const isRepeater     = field.fieldType === 'Repeater';
                const subFields      = Array.isArray( field.innerBlocks ) ? field.innerBlocks : [];
                const hasSubFields   = isRepeater && field.metaName && subFields.length > 0;
                const subFieldCount  = subFields.length;
                // Order in-form Repeater sub-cards to match canvas.
                const orderedSubFields = ( isUsed && subFieldCount )
                    ? [ ...subFields ].sort( ( a, b ) =>
                        ( canvasOrder.has( a.id ) ? canvasOrder.get( a.id ) : Infinity ) -
                        ( canvasOrder.has( b.id ) ? canvasOrder.get( b.id ) : Infinity )
                    )
                    : subFields;
                // Expand sub-cards when parent Repeater is selected or in-form.
                const subFieldIds      = subFields.map( ( s ) => s.id );
                const selectedSubFieldOnCanvas = selectedBlockFieldId !== null && subFieldIds.includes( selectedBlockFieldId );
                const selectedSubFieldCard     = selectedCardParentMeta && selectedCardParentMeta === field.metaName;
                const isExpanded       = hasSubFields && ( isSelected || selectedSubFieldOnCanvas || selectedSubFieldCard );
                const classes = [
                    'wppb-fb-existing-fields__card',
                    isRepeater    ? 'is-repeater' : '',
                    isExpanded    ? 'is-expanded' : '',
                    isUsed        ? 'is-in-form'  : '',
                    isSelected    ? 'is-selected' : '',
                ].filter( Boolean ).join( ' ' );
                return (
                <li
                    key={ field.id }
                    className={ classes }
                >
                    <div
                        className="wppb-fb-existing-fields__card-main"
                        role="button"
                        tabIndex={ 0 }
                        aria-pressed={ isSelected || undefined }
                        aria-expanded={ hasSubFields ? isExpanded : undefined }
                        onClick={ () => onCardClick( field ) }
                        onKeyDown={ ( e ) => {
                            if ( e.key === 'Enter' || e.key === ' ' ) {
                                e.preventDefault();
                                onCardClick( field );
                            }
                        } }
                    >
                        <div className="wppb-fb-existing-fields__body">
                            <div className="wppb-fb-existing-fields__header">
                                <FieldTitle field={ field }>
                                    { isRepeater && subFieldCount > 0 && (
                                        <span
                                            className="wppb-fb-existing-fields__subfield-count"
                                            title={ sprintf(
                                                /* translators: %d: number of sub-fields */
                                                _n( '%d sub-field', '%d sub-fields', subFieldCount, 'profile-builder' ),
                                                subFieldCount
                                            ) }
                                        >
                                            { subFieldCount }
                                        </span>
                                    ) }
                                </FieldTitle>
                                { /* Actions live in the title row, revealed on
                                     hover / selection (CSS). Delete (red text)
                                     sits left of the Insert/Remove outlined button. */ }
                                <div className="wppb-fb-existing-fields__actions">
                                    { /* Hover tooltips convey what the button
                                         labels don't: Remove is form-scoped and
                                         reversible, Delete is global and permanent,
                                         Insert reuses this field rather than
                                         creating a new one. `text` is the hover
                                         description; the field-specific `aria-label`
                                         stays on the button as the accessible name. */ }
                                    { /* No Delete in the mini inserter: that
                                         popover is for finding and inserting, and
                                         a global, permanent, un-undoable action
                                         doesn't belong one stray click away from
                                         Insert on a card list this dense. Gated in
                                         JS rather than CSS-hidden so the popover
                                         carries no invisible-but-focusable
                                         destructive button. Deleting a field is
                                         the docked panel's job. */ }
                                    { ! inMiniInserter && ! MANDATORY_DEFAULT_TYPES.has( field.fieldType ) && (
                                        <Tooltip text={ __( 'Permanently delete this field from every form. This cannot be undone.', 'profile-builder' ) }>
                                            <Button
                                                variant="tertiary"
                                                size="small"
                                                isDestructive
                                                isBusy={ deletingId === field.id }
                                                disabled={ deletingId !== null }
                                                onClick={ ( e ) => onDeleteClick( e, field ) }
                                                aria-label={
                                                    /* translators: %s: field title */
                                                    __( 'Delete %s', 'profile-builder' ).replace( '%s', field.title || field.fieldType )
                                                }
                                            >
                                                { __( 'Delete', 'profile-builder' ) }
                                            </Button>
                                        </Tooltip>
                                    ) }
                                    { /* In form → Remove (scrubs the block from
                                         this form), except mandatory default types
                                         (Username / E-mail / Password) which show no
                                         button. Not in form → Insert. */ }
                                    { ! isUsed ? (
                                        <Tooltip text={ __( 'Add this existing field to the current form.', 'profile-builder' ) }>
                                            <Button
                                                variant="secondary"
                                                size="small"
                                                onClick={ ( e ) => onInsert( e, field ) }
                                                aria-label={
                                                    /* translators: %s: field title */
                                                    __( 'Insert %s', 'profile-builder' ).replace( '%s', field.title || field.fieldType )
                                                }
                                            >
                                                { __( 'Insert', 'profile-builder' ) }
                                            </Button>
                                        </Tooltip>
                                    ) : ( ! MANDATORY_DEFAULT_TYPES.has( field.fieldType ) && (
                                        <Tooltip text={ __( 'Remove this field from this form only. It stays available to add again and is not deleted.', 'profile-builder' ) }>
                                            <Button
                                                variant="secondary"
                                                size="small"
                                                onClick={ ( e ) => onRemove( e, field ) }
                                                aria-label={
                                                    /* translators: %s: field title */
                                                    __( 'Remove %s from this form', 'profile-builder' ).replace( '%s', field.title || field.fieldType )
                                                }
                                            >
                                                { __( 'Remove', 'profile-builder' ) }
                                            </Button>
                                        </Tooltip>
                                    ) ) }
                                </div>
                            </div>
                            <FieldMeta field={ field } />
                        </div>
                    </div>
                    { isExpanded && (
                        <ul className="wppb-fb-existing-fields__subfields">
                            { orderedSubFields.map( ( sub ) => renderSubFieldCard( sub, field.metaName ) ) }
                        </ul>
                    ) }
                </li>
                );
            } ) }
        </ul>
            ) }
            { pendingDelete && (
                <DeleteConfirmModal
                    field={ pendingDelete }
                    usage={ usage }
                    currentPostId={ currentPostId }
                    isDeleting={ deletingId !== null }
                    error={ deleteError }
                    onCancel={ cancelDelete }
                    onConfirm={ confirmDelete }
                />
            ) }
        </>
    );
};

// Delete confirmation modal with cross-form usage warning.
const DeleteConfirmModal = ( { field, usage, currentPostId, isDeleting, error, onCancel, onConfirm } ) => {
    const label      = field.title || field.fieldType;
    const otherForms = ( usage.forms || [] ).filter(
        ( f ) => Number( f.id ) !== Number( currentPostId )
    );

    return (
        <Modal
            title={ __( 'Delete field', 'profile-builder' ) }
            className="wppb-fb-delete-confirm"
            onRequestClose={ onCancel }
            shouldCloseOnClickOutside={ ! isDeleting }
            shouldCloseOnEsc={ ! isDeleting }
        >
            <p className="wppb-fb-delete-confirm__message">
                { sprintf(
                    /* translators: %s: field title or type */
                    __( 'Delete the field “%s”? This removes it from every form that uses it and cannot be undone.', 'profile-builder' ),
                    label
                ) }
            </p>

            { usage.loading && (
                <p className="wppb-fb-delete-confirm__checking">
                    <Spinner />
                    { __( 'Checking which other forms use this field…', 'profile-builder' ) }
                </p>
            ) }

            { ! usage.loading && otherForms.length > 0 && (
                /* Alert-style callout (custom div, not a Gutenberg <Notice>, for
                   full control of the amber treatment: cream fill, thick left
                   rail, bold lead-in, divided list of the OTHER forms the field
                   lives on). Keeps the `__usage` hook for tests. */
                <div className="wppb-fb-delete-confirm__usage" role="alert">
                    <p className="wppb-fb-delete-confirm__usage-lead">
                        <strong>
                            { sprintf(
                                /* translators: %d: number of other forms */
                                _n(
                                    'This field is used on %d other form.',
                                    'This field is used on %d other forms.',
                                    otherForms.length,
                                    'profile-builder'
                                ),
                                otherForms.length
                            ) }
                        </strong>
                        { ' ' }
                        { __( 'Deleting it will also remove it from:', 'profile-builder' ) }
                    </p>
                    <ul className="wppb-fb-delete-confirm__forms">
                        { otherForms.map( ( f ) => (
                            <li key={ f.id }>{ f.title }</li>
                        ) ) }
                    </ul>
                </div>
            ) }

            { ! usage.loading && usage.error && (
                <Notice status="warning" isDismissible={ false }>
                    { __( 'Could not check which other forms use this field. It will still be removed from every form on delete.', 'profile-builder' ) }
                </Notice>
            ) }

            { error && (
                <Notice status="error" isDismissible={ false }>
                    { error }
                </Notice>
            ) }

            <div className="wppb-fb-delete-confirm__actions">
                <Button
                    variant="tertiary"
                    onClick={ onCancel }
                    disabled={ isDeleting }
                >
                    { __( 'Cancel', 'profile-builder' ) }
                </Button>
                <Button
                    variant="primary"
                    isDestructive
                    className="wppb-fb-delete-confirm__confirm"
                    onClick={ onConfirm }
                    isBusy={ isDeleting }
                    disabled={ isDeleting || usage.loading }
                >
                    { __( 'Delete field', 'profile-builder' ) }
                </Button>
            </div>
        </Modal>
    );
};

// Portal Existing Fields into every Media tab (docked + mini inserters).
const ExistingFieldsPanel = () => {
    const postType = useSelect(
        ( select ) => select( 'core/editor' ).getCurrentPostType(),
        []
    );
    const [ targets, setTargets ] = useState( [] );
    const isOurPostType = [ 'wppb-rf-cpt', 'wppb-epf-cpt' ].includes( postType );

    // Ref mirrors targets for the observer effect (avoids stale closure).
    const targetsRef = useRef( [] );
    const applyTargets = useCallback( ( next ) => {
        const prev = targetsRef.current;
        if ( prev.length === next.length && prev.every( ( el, i ) => el === next[ i ] ) ) return;
        targetsRef.current = next;
        setTargets( next );
    }, [] );

    useEffect( () => {
        if ( ! isOurPostType ) return undefined;

        const sync = () => {
            for ( const { selector, label } of TAB_RENAMES ) {
                for ( const tab of document.querySelectorAll( selector ) ) {
                    renameTab( tab, label );
                }
            }

            const next = [];
            for ( const mediaTab of document.querySelectorAll( HIJACK_TAB_SELECTOR ) ) {
                // Reorder: place Existing Fields (the hijacked Media tab) before
                // Examples (Patterns) — within THIS instance's tab strip only.
                const patternsTab = mediaTab.parentNode
                    ? mediaTab.parentNode.querySelector( '[role="tab"][id$="-patterns"]' )
                    : null;
                if (
                    patternsTab &&
                    patternsTab.parentNode === mediaTab.parentNode &&
                    ( patternsTab.compareDocumentPosition( mediaTab ) & Node.DOCUMENT_POSITION_FOLLOWING )
                ) {
                    patternsTab.parentNode.insertBefore( mediaTab, patternsTab );
                }

                const panelId = mediaTab.getAttribute( 'aria-controls' );
                const panel = panelId ? document.getElementById( panelId ) : null;
                if ( ! panel ) continue;

                // Claim the panel immediately (hijack class + target div) so the
                // real Media-tab content is hidden from the first frame...
                const injected = ensurePanelTarget( panel );

                const popover = panel.closest( '.block-editor-inserter__popover' );

                // Mark popovers that can't take existing fields (CSS hides the tab).
                if ( popover ) {
                    const allowed = miniInserterAllowsExistingFields();
                    popover.classList.toggle( NO_EXISTING_FIELDS_CLASS, ! allowed );
                    if ( ! allowed ) continue;
                }

                // Lazy-mount card list in mini inserter (docked always mounts).
                if ( popover && panel.hasAttribute( 'hidden' ) ) {
                    continue;
                }
                next.push( injected );
            }
            applyTargets( next );
        };

        // Coalesce a burst of Gutenberg DOM mutations into a single sync per
        // animation frame. Undebounced, the observer ran sync (several
        // querySelectors) on every mutation batch on the typing→paint path (INP).
        let frame = 0;
        const scheduleSync = () => {
            if ( frame ) return;
            frame = window.requestAnimationFrame( () => {
                frame = 0;
                sync();
            } );
        };

        sync();
        const observer = new MutationObserver( scheduleSync );
        // Observe document.body — mini inserter popovers portal outside the skeleton.
        observer.observe( document.body, {
            attributeFilter: [ 'hidden' ],
            attributes: true,
            childList: true,
            subtree: true,
        } );
        // Re-sync when destination store changes (may race popover mount).
        const unsubscribeTarget = subscribeMiniInserterTarget( scheduleSync );

        return () => {
            observer.disconnect();
            unsubscribeTarget();
            if ( frame ) window.cancelAnimationFrame( frame );
        };
    }, [ isOurPostType, applyTargets ] );

    if ( ! isOurPostType || targets.length === 0 ) return null;

    return targets.map( ( target, i ) => {
        // A target inside an inserter popover is a mini inserter: its Insert
        // must land in the container that opened it, and inserting should
        // dismiss the popover (the docked sidebar list stays open, as before).
        const inPopover = !! target.closest( '.block-editor-inserter__popover' );
        // Key off the owning tab panel's id (`tabs-N-media-view`), not the array
        // index: the popover instance comes and goes, and an index key would let
        // React reuse the docked list's subtree for it (and vice versa).
        const key = ( target.parentElement && target.parentElement.id ) || `wppb-fb-existing-fields-${ i }`;
        return createPortal(
            <div className={ `wppb-fb-existing-fields${ inPopover ? ' is-mini' : '' }` }>
                <ExistingFieldsList inMiniInserter={ inPopover } />
            </div>,
            target,
            key
        );
    } );
};

registerPlugin( 'wppb-fb-existing-fields', { render: ExistingFieldsPanel } );

// PluginSidebar for cards with no canvas block (VirtualFieldEdit).

// Select the virtual block in the inner BlockEditorProvider registry.
const SelectVirtualBlock = ( { clientId } ) => {
    const registry = useRegistry();
    useEffect( () => {
        if ( ! clientId ) return;
        registry.dispatch( 'core/block-editor' ).selectBlock( clientId );
    }, [ clientId, registry ] );
    return null;
};

// Write-back sanitized values into the virtual block.
const VirtualWriteBackBridge = ( { clientId } ) => {
    const registry = useRegistry();
    useEffect( () => {
        if ( ! clientId ) return undefined;
        const innerSelect   = registry.select( 'core/block-editor' );
        const innerDispatch = registry.dispatch( 'core/block-editor' );
        const handler = makeWriteBackHandler( {
            getBlock:              ( id ) => innerSelect.getBlock( id ),
            updateBlockAttributes: innerDispatch.updateBlockAttributes,
            markNonPersistent:     typeof innerDispatch.__unstableMarkNextChangeAsNotPersistent === 'function'
                ? innerDispatch.__unstableMarkNextChangeAsNotPersistent
                : undefined,
        } );
        const unreg = registerWriteBack( clientId, handler( clientId ) );
        return unreg;
    }, [ clientId, registry ] );
    return null;
};

// Build the hidden BlockEditorProvider tree for a card (sub-field wraps Repeater).
const buildInitialBlocks = ( field, scope, parentMetaName, parentRepeaterId ) => {
    try {
        const blockType = getBlockType( field.blockName );
        if ( ! blockType ) return { blocks: [], targetClientId: null };

        const buildInner = ( entry ) => createBlock(
            entry.blockName,
            { id: entry.id, ...( entry.attributes || {} ) },
            ( entry.innerBlocks || [] ).map( buildInner )
        );
        const childInner = ( field.innerBlocks || [] ).map( buildInner );
        const fieldBlock = createBlock(
            field.blockName,
            {
                id:           field.id,
                'field-title': field.title,
                'meta-name':   field.metaName,
                ...( field.attributes || {} ),
            },
            childInner
        );

        if ( scope === 'top' ) {
            return { blocks: [ fieldBlock ], targetClientId: fieldBlock.clientId };
        }

        // Sub-field: wrap in a synthetic Repeater ancestor.
        const repeaterAttrs = {
            id:          parentRepeaterId > 0 ? parentRepeaterId : 0,
            'meta-name': parentMetaName,
        };
        const wrapper = createBlock( REPEATER_BLOCK_NAME, repeaterAttrs, [ fieldBlock ] );
        return { blocks: [ wrapper ], targetClientId: fieldBlock.clientId };
    } catch ( e ) {
        // Catch createBlock errors so a bad row doesn't kill the panel.
        console.warn(
            '[wppb-fb] buildInitialBlocks: createBlock failed for',
            { blockName: field?.blockName, fieldType: field?.fieldType, id: field?.id, scope, parentMetaName },
            e
        );
        return { blocks: [], targetClientId: null };
    }
};

// Resolve the target sub-field block inside the wrapper for sub-field mode.
const findBlockByClientId = ( blocks, targetClientId ) => {
    for ( const b of blocks ) {
        if ( b.clientId === targetClientId ) return b;
        if ( b.innerBlocks && b.innerBlocks.length ) {
            const hit = findBlockByClientId( b.innerBlocks, targetClientId );
            if ( hit ) return hit;
        }
    }
    return null;
};

const VirtualFieldEdit = ( { field, scope = 'top', parentMetaName = null, parentRepeaterId = 0, onPatch } ) => {
    const persistScope = scope === 'sub' ? `sub:${ parentMetaName }` : 'top';

    // Build the initial in-memory tree once per (field, scope). useMemo recreates
    // on swap so a fresh clientId pair gets a clean baseline. Sub mode wraps the
    // field in a synthetic Repeater ancestor — see buildInitialBlocks.
    const { initialBlocks, initialTargetClientId } = useMemo( () => {
        const built = buildInitialBlocks( field, scope, parentMetaName, parentRepeaterId );
        return { initialBlocks: built.blocks, initialTargetClientId: built.targetClientId };
    }, [ field.id, field.blockName, scope, parentMetaName, parentRepeaterId ] );

    const [ blocks, setBlocks ] = useState( initialBlocks );
    const targetClientIdRef = useRef( initialTargetClientId );

    // Reset blocks when the field / scope changes.
    useEffect( () => {
        setBlocks( initialBlocks );
        targetClientIdRef.current = initialTargetClientId;
    }, [ initialBlocks, initialTargetClientId ] );

    // Capture initial baseline once per (field, clientId, scope) so the
    // persister's first diff doesn't false-positive on the seeded attributes.
    const baselineCapturedRef = useRef( null );
    useEffect( () => {
        if ( blocks.length === 0 || ! targetClientIdRef.current ) return;
        const target = findBlockByClientId( blocks, targetClientIdRef.current );
        if ( ! target ) return;
        const captureKey = persistScope + ':' + field.id + ':' + target.clientId;
        if ( baselineCapturedRef.current === captureKey ) return;
        captureInitial( persistScope, field.id, target.attributes );
        baselineCapturedRef.current = captureKey;
    }, [ blocks, field.id, persistScope ] );

    const onChange = useCallback( ( newBlocks ) => {
        setBlocks( newBlocks );
        if ( newBlocks.length === 0 || ! targetClientIdRef.current ) return;
        const target = findBlockByClientId( newBlocks, targetClientIdRef.current );
        if ( ! target ) return;

        scheduleAttributePersist( {
            scope:      persistScope,
            id:         field.id,
            fieldType:  field.fieldType,
            clientId:   target.clientId,
            attributes: target.attributes,
        } );

        if ( onPatch ) onPatch( target.attributes );
    }, [ field.id, field.fieldType, persistScope, onPatch ] );

    if ( blocks.length === 0 || ! targetClientIdRef.current ) {
        return (
            <PanelBody title={ __( 'Field Settings', 'profile-builder' ) }>
                <Notice status="warning" isDismissible={ false }>
                    { __( 'Unable to render settings for this field type.', 'profile-builder' ) }
                </Notice>
            </PanelBody>
        );
    }

    return (
        <div className="wppb-fb-virtual-field-edit" aria-hidden="true">
            <BlockEditorProvider
                value={ blocks }
                onChange={ onChange }
                onInput={ onChange }
                settings={ {} }
            >
                <SelectVirtualBlock clientId={ targetClientIdRef.current } />
                <VirtualWriteBackBridge clientId={ targetClientIdRef.current } />
                <BlockList />
            </BlockEditorProvider>
        </div>
    );
};

// Register snapshot sync once so PUTs update the card list.
registerSnapshotSync( ( fieldEntry, scope ) => {
    if ( scope === 'top' ) {
        const next = getExistingFieldsSnapshot().map( ( entry ) => entry.id === fieldEntry.id ? fieldEntry : entry );
        if ( ! next.some( ( e ) => e.id === fieldEntry.id ) ) next.push( fieldEntry );
        setSnapshot( next );
        return;
    }
    if ( typeof scope === 'string' && scope.startsWith( 'sub:' ) ) {
        const parentMeta = scope.slice( 4 );
        const next = getExistingFieldsSnapshot().map( ( entry ) => {
            if ( entry.fieldType !== 'Repeater' || entry.metaName !== parentMeta ) return entry;
            const inner = Array.isArray( entry.innerBlocks ) ? entry.innerBlocks.slice() : [];
            const idx = inner.findIndex( ( s ) => s.id === fieldEntry.id );
            if ( idx >= 0 ) inner[ idx ] = fieldEntry;
            else inner.push( fieldEntry );
            return { ...entry, innerBlocks: inner };
        } );
        setSnapshot( next );
    }
} );

// Lightweight BlockCard stand-in (native pulls unwanted inspector chrome).
const FieldTypeCard = ( { blockType } ) => {
    if ( ! blockType ) return null;
    return (
        <div className="wppb-fb-field-type-card">
            <span className="wppb-fb-field-type-card__icon">
                <BlockIcon icon={ blockType.icon } showColors />
            </span>
            <div className="wppb-fb-field-type-card__content">
                <h2 className="wppb-fb-field-type-card__title">{ blockType.title }</h2>
                { blockType.description && (
                    <span className="wppb-fb-field-type-card__description">{ blockType.description }</span>
                ) }
            </div>
        </div>
    );
};

const FieldSettingsSidebarContents = () => {
    const { id: selectedCardId, parentMetaName: selectedCardParentMeta } = useSelectedCard();
    const snapshot = useSnapshot();

    // In-form: canvas Edit already fills the slot; skip VirtualFieldEdit.
    const selectedBlockName = useSelect( ( select ) => {
        const blocks = select( 'core/block-editor' );
        const id = blocks.getSelectedBlockClientId();
        const block = id ? blocks.getBlock( id ) : null;
        return block ? block.name : null;
    }, [] );
    const isPbBlockSelected = !! ( selectedBlockName && selectedBlockName.startsWith( 'profile-builder/' ) );

    // Resolve card entry (+ parent Repeater for sub-fields).
    const { field, parentRepeater } = useMemo( () => {
        if ( selectedCardId === null ) return { field: null, parentRepeater: null };
        if ( selectedCardParentMeta ) {
            const parent = snapshot.find( ( entry ) =>
                entry.fieldType === 'Repeater' && entry.metaName === selectedCardParentMeta
            ) || null;
            if ( ! parent ) return { field: null, parentRepeater: null };
            const sub = ( parent.innerBlocks || [] ).find( ( s ) => s.id === selectedCardId ) || null;
            return { field: sub, parentRepeater: parent };
        }
        const top = snapshot.find( ( entry ) => entry.id === selectedCardId ) || null;
        return { field: top, parentRepeater: null };
    }, [ selectedCardId, selectedCardParentMeta, snapshot ] );

    // Block selected on canvas — the block's edit() Fill already targets
    // FieldSettingsSlot.
    if ( isPbBlockSelected ) {
        const blockType = selectedBlockName ? getBlockType( selectedBlockName ) : null;
        return (
            <>
                <FieldTypeCard blockType={ blockType } />
                <FieldSettingsSlot bubblesVirtually />
            </>
        );
    }

    // No card and no block selected.
    if ( ! field ) {
        return (
            <PanelBody title={ __( 'Field Settings', 'profile-builder' ) }>
                <p>{ __( 'Select a field from the Existing Fields list or click a field block on the canvas to edit its settings.', 'profile-builder' ) }</p>
            </PanelBody>
        );
    }

    // Not-in-form card: VirtualFieldEdit + per-edit persist.
    const cardBlockType = field.blockName ? getBlockType( field.blockName ) : null;
    const isSubFieldEdit = !! selectedCardParentMeta && !! parentRepeater;
    const hint = isSubFieldEdit
        ? sprintf(
            /* translators: %s: parent Repeater title or meta-name */
            __( 'Sub-field of Repeater "%s". Edits here update the global sub-field definition.', 'profile-builder' ),
            ( parentRepeater.title || parentRepeater.metaName )
        )
        : __( 'This field is not in the current form. Edits here update the global field definition and apply wherever the field is used.', 'profile-builder' );

    return (
        <>
            <FieldTypeCard blockType={ cardBlockType } />
            <p className="wppb-fb-field-settings__hint">
                { hint }
            </p>
            <VirtualFieldEdit
                field={ field }
                scope={ isSubFieldEdit ? 'sub' : 'top' }
                parentMetaName={ isSubFieldEdit ? selectedCardParentMeta : null }
                parentRepeaterId={ isSubFieldEdit && parentRepeater ? parentRepeater.id : 0 }
            />
            <FieldSettingsSlot bubblesVirtually />
        </>
    );
};

// Pin complementary area to Field Settings when a PB block/card is selected;
// otherwise Document sidebar. Never closable.
const FieldSettingsAutoOpener = () => {
    const { selectedBlockClientId, selectedBlockName } = useSelect( ( select ) => {
        const blocks = select( 'core/block-editor' );
        const id = blocks.getSelectedBlockClientId();
        const block = id ? blocks.getBlock( id ) : null;
        return {
            selectedBlockClientId: id,
            selectedBlockName:     block ? block.name : null,
        };
    }, [] );

    const { id: selectedCardId } = useSelectedCard();

    const isPbBlockSelected = !! ( selectedBlockClientId && selectedBlockName && selectedBlockName.startsWith( 'profile-builder/' ) );
    const isPbCardSelected  = selectedCardId !== null && selectedCardId !== undefined;
    const isPbSelected      = isPbBlockSelected || isPbCardSelected;

    // The complementary area is a pure function of selection.
    const desiredSidebar = isPbSelected ? SIDEBAR_TARGET : DOCUMENT_SIDEBAR;

    const activeSidebar = useSelect( ( select ) => {
        const ed = select( 'core/edit-post' );
        return ed && typeof ed.getActiveGeneralSidebarName === 'function'
            ? ed.getActiveGeneralSidebarName()
            : null;
    }, [] );

    useEffect( () => {
        if ( activeSidebar === desiredSidebar ) return;

        // Microtask: win race against core's complementary-area reset.
        queueMicrotask( () => {
            const ed = dataSelect( 'core/edit-post' );
            const active = ed && typeof ed.getActiveGeneralSidebarName === 'function'
                ? ed.getActiveGeneralSidebarName()
                : null;
            if ( active !== desiredSidebar ) openSidebar( desiredSidebar );
        } );
    }, [ desiredSidebar, activeSidebar ] );

    return null;
};

// Auto-switch to Existing Fields when an in-form canvas block is clicked.
const activateExistingFieldsTab = () => {
    const tab = document.querySelector( HIJACK_TAB_SELECTOR );
    if ( ! tab ) return;
    // Don't fight the user's own tab choice / avoid a redundant click.
    if ( tab.getAttribute( 'aria-selected' ) === 'true' ) return;
    tab.click();
};

const collectPbClientIds = ( blocks, out ) => {
    for ( const b of blocks ) {
        if ( b.name && b.name.startsWith( 'profile-builder/' ) ) out.add( b.clientId );
        if ( b.innerBlocks && b.innerBlocks.length ) collectPbClientIds( b.innerBlocks, out );
    }
    return out;
};

const ExistingFieldsTabAutoSwitch = () => {
    const selectedPbClientId = useSelect( ( select ) => {
        const be    = select( 'core/block-editor' );
        const id    = be.getSelectedBlockClientId();
        const block = id ? be.getBlock( id ) : null;
        return ( block && block.name && block.name.startsWith( 'profile-builder/' ) ) ? id : null;
    }, [] );

    const canvasBlocks = useSelect( ( select ) => select( 'core/block-editor' ).getBlocks(), [] );

    // PB-block clientIds known as of the last canvas snapshot. `null` until the
    // first canvas effect runs, so a selection already present at page load
    // never triggers a switch.
    const knownClientIdsRef = useRef( null );

    // Selection effect — declared BEFORE the canvas-tracking effect so that when
    // a block is just inserted (canvas tree + selection change in one dispatch),
    // this runs against the PRE-insert set and correctly skips it.
    useEffect( () => {
        if ( ! selectedPbClientId ) return;
        if ( knownClientIdsRef.current && knownClientIdsRef.current.has( selectedPbClientId ) ) {
            activateExistingFieldsTab();
        }
    }, [ selectedPbClientId ] );

    // Keep the known-clientId set current. Runs after the selection effect.
    useEffect( () => {
        knownClientIdsRef.current = collectPbClientIds( canvasBlocks, new Set() );
    }, [ canvasBlocks ] );

    return null;
};

// Clear card-only selection on empty-canvas click.
const DeselectCardOnCanvasClick = () => {
    const { id: selectedCardId } = useSelectedCard();

    useEffect( () => {
        if ( selectedCardId === null || selectedCardId === undefined ) return undefined;

        const clearIfEmptySpace = ( isIframe ) => ( e ) => {
            const t = e.target;
            if ( ! t || typeof t.closest !== 'function' ) return;
            // A click on an actual block selects it — ExistingFieldsList's
            // store-driven effect clears the card then. Leave it alone.
            if ( t.closest( '[data-block], .wp-block' ) ) return;
            // Inside the iframed canvas, everything that isn't a block is the
            // form's empty space. In the non-iframed fallback, restrict to the
            // editor writing surface so clicks on surrounding chrome don't deselect.
            if ( isIframe || t.closest( '.block-editor-writing-flow, .block-editor-block-list__layout, .editor-styles-wrapper' ) ) {
                setSelectedCard( null );
            }
        };

        const detachers = [];
        // pointerdown: core padding appender stops mousedown.
        const attach = ( doc, isIframe ) => {
            if ( ! doc ) return;
            const handler = clearIfEmptySpace( isIframe );
            doc.addEventListener( 'pointerdown', handler, true );
            detachers.push( () => doc.removeEventListener( 'pointerdown', handler, true ) );
        };

        attach( document, false );
        const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
        if ( iframe ) {
            // contentDocument is same-origin (the editor canvas); guard anyway.
            try { attach( iframe.contentDocument, true ); } catch ( err ) { /* ignore */ }
        }

        return () => detachers.forEach( ( off ) => off() );
    }, [ selectedCardId ] );

    return null;
};

const FieldSettingsSidebar = () => {
    const postType = useSelect(
        ( select ) => select( 'core/editor' ).getCurrentPostType(),
        []
    );
    const isOurPostType = [ 'wppb-rf-cpt', 'wppb-epf-cpt' ].includes( postType );
    if ( ! isOurPostType ) return null;

    return (
        <>
            <FieldSettingsAutoOpener />
            <ExistingFieldsTabAutoSwitch />
            <DeselectCardOnCanvasClick />
            <PluginSidebar
                name={ SIDEBAR_NAME }
                title={ __( 'Field Settings', 'profile-builder' ) }
                icon="forms"
                className="wppb-fb-field-settings-sidebar"
                isPinnable={ false }
            >
                <FieldSettingsSidebarContents />
            </PluginSidebar>
        </>
    );
};

registerPlugin( 'wppb-fb-existing-fields-sidebar', { render: FieldSettingsSidebar } );
