/**
 * Shared editor for Woo Billing / Shipping address blocks. Each block passes
 * a `config` (fieldsKey, csvAttr, nameAttr, sortAttr, panelTitle).
 *
 * UI and storage match the classic Manage Fields `woocheckbox` shape (CSV of
 * included keys + `required_<key>` markers; empty CSV = all with defaults).
 * `sortAttr` keeps full row order including excluded keys.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { useRef, useState } from '@wordpress/element';
import BaseFieldEdit from './BaseFieldEdit';

const REQ = 'required_';

function csvList( csv ) {
    if ( ! csv ) return [];
    return csv.split( ',' ).map( ( v ) => v.trim() ).filter( Boolean );
}

// Parse csvAttr → { included, required }. Tokens starting with `required_` mark required.
function parseFields( csv, allKeys ) {
    const required = new Set();
    const included = new Set();
    for ( const t of csvList( csv ) ) {
        if ( t.indexOf( REQ ) === 0 ) {
            required.add( t.slice( REQ.length ) );
        } else if ( allKeys.includes( t ) ) {
            included.add( t );
        }
    }
    return { included, required };
}

// sortAttr keys first, then remaining defaults. Drops `required_` / unknown keys.
function reconstructRowOrder( sortStr, allKeys ) {
    const seen = new Set();
    const out = [];
    for ( const t of csvList( sortStr ) ) {
        if ( t.indexOf( REQ ) === 0 ) continue;
        if ( allKeys.includes( t ) && ! seen.has( t ) ) {
            seen.add( t );
            out.push( t );
        }
    }
    for ( const k of allKeys ) {
        if ( ! seen.has( k ) ) out.push( k );
    }
    return out;
}

// Included keys in row order, with `required_<key>` markers.
function buildCsv( order, includedSet, requiredSet ) {
    const out = [];
    for ( const key of order ) {
        if ( ! includedSet.has( key ) ) continue;
        out.push( key );
        if ( requiredSet.has( key ) ) out.push( REQ + key );
    }
    return out.join( ',' );
}

// Classic-compatible full row order (comma-space keys).
function serializeOrder( order ) {
    return order.length ? order.join( ', ' ) : '';
}

export default function WooAddressFieldEdit( props ) {
    const { config, ...blockProps } = props;
    const { attributes, setAttributes } = props;

    const dragKeyRef = useRef( null );
    const [ dragOverKey, setDragOverKey ] = useState( null );

    const fb = ( typeof window !== 'undefined' && window.wppbFb ) || {};
    const woo = fb.woocommerce || {};
    const subFields = Array.isArray( woo[ config.fieldsKey ] ) ? woo[ config.fieldsKey ] : [];
    const allKeys = subFields.map( ( f ) => f.key );
    const byKey = ( key ) => subFields.find( ( f ) => f.key === key );

    // Unchecking Country also unchecks State (classic parity).
    const countryKey = allKeys.find( ( k ) => k.endsWith( '_country' ) );
    const stateKey = allKeys.find( ( k ) => k.endsWith( '_state' ) );

    const rowOrder = reconstructRowOrder( attributes[ config.sortAttr ] || '', allKeys );

    const csv = attributes[ config.csvAttr ] || '';
    const parsed = csv === ''
        // Empty CSV = all included with default-required.
        ? {
            included: new Set( allKeys ),
            required: new Set( subFields.filter( ( f ) => f.required === 'Yes' ).map( ( f ) => f.key ) ),
        }
        : parseFields( csv, allKeys );

    let names = {};
    try { names = JSON.parse( attributes[ config.nameAttr ] || '{}' ) || {}; } catch ( e ) { names = {}; }

    const commit = ( includedSet, requiredSet, nameMap ) => setAttributes( {
        [ config.csvAttr ]: buildCsv( rowOrder, includedSet, requiredSet ),
        [ config.nameAttr ]: JSON.stringify( nameMap ),
    } );

    const commitOrder = ( order ) => setAttributes( {
        [ config.sortAttr ]: serializeOrder( order ),
        [ config.csvAttr ]: buildCsv( order, parsed.included, parsed.required ),
    } );

    const toggleInclude = ( key, on ) => {
        const included = new Set( parsed.included );
        const required = new Set( parsed.required );
        if ( on ) {
            included.add( key );
        } else {
            included.delete( key );
            required.delete( key );
            if ( key === countryKey && stateKey ) {
                included.delete( stateKey );
                required.delete( stateKey );
            }
        }
        commit( included, required, names );
    };

    const toggleRequired = ( key, on ) => {
        const required = new Set( parsed.required );
        if ( on ) { required.add( key ); } else { required.delete( key ); }
        commit( parsed.included, required, names );
    };

    const setName = ( key, val ) => {
        const nameMap = { ...names };
        if ( val ) { nameMap[ key ] = val; } else { delete nameMap[ key ]; }
        commit( parsed.included, parsed.required, nameMap );
    };

    const isIncluded = ( key ) => parsed.included.has( key );

    // Drag from the handle only so the label input stays selectable.
    const onHandleDragStart = ( key ) => ( e ) => {
        dragKeyRef.current = key;
        e.stopPropagation();
        try {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData( 'text/plain', key );
        } catch ( _ ) { /* older browsers */ }
        const row = e.currentTarget.closest( '.wppb-fb-woo-fields__row' );
        if ( row && e.dataTransfer.setDragImage ) {
            e.dataTransfer.setDragImage( row, 10, 10 );
        }
    };

    const onHandleDragEnd = () => {
        dragKeyRef.current = null;
        setDragOverKey( null );
    };

    const onRowDragOver = ( key ) => ( e ) => {
        if ( dragKeyRef.current == null ) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if ( dragOverKey !== key ) setDragOverKey( key );
    };

    const onRowDrop = ( targetKey ) => ( e ) => {
        e.preventDefault();
        e.stopPropagation();
        const src = dragKeyRef.current;
        dragKeyRef.current = null;
        setDragOverKey( null );
        if ( ! src || src === targetKey ) return;
        const next = rowOrder.slice();
        const from = next.indexOf( src );
        if ( from < 0 ) return;
        next.splice( from, 1 );
        const to = next.indexOf( targetKey );
        if ( to < 0 ) return;
        next.splice( to, 0, src );
        commitOrder( next );
    };

    const panel = (
        <PanelBody title={ config.panelTitle }>
            { subFields.length === 0 ? (
                <p>{ __( 'WooCommerce field list unavailable — activate the WooCommerce integration.', 'profile-builder' ) }</p>
            ) : (
                <div className="wppb-fb-woo-fields">
                    <div className="wppb-fb-woo-fields__head">
                        <span className="wppb-fb-woo-fields__head-name">{ __( 'Field Name', 'profile-builder' ) }</span>
                        <span className="wppb-fb-woo-fields__head-req">{ __( 'Required', 'profile-builder' ) }</span>
                    </div>
                    { rowOrder.map( ( key ) => {
                        const f = byKey( key );
                        if ( ! f ) return null;
                        const included = isIncluded( key );
                        const rowClass = [
                            'wppb-fb-woo-fields__row',
                            included ? 'is-included' : '',
                            dragOverKey === key ? 'is-drag-over' : '',
                        ].filter( Boolean ).join( ' ' );
                        return (
                            <div
                                key={ key }
                                className={ rowClass }
                                onDragOver={ onRowDragOver( key ) }
                                onDrop={ onRowDrop( key ) }
                            >
                                <span
                                    className="wppb-fb-woo-fields__handle"
                                    draggable={ true }
                                    onDragStart={ onHandleDragStart( key ) }
                                    onDragEnd={ onHandleDragEnd }
                                    role="button"
                                    aria-label={ __( 'Drag to reorder', 'profile-builder' ) }
                                    title={ __( 'Drag to reorder', 'profile-builder' ) }
                                >
                                    <span className="dashicons dashicons-menu" aria-hidden="true"></span>
                                </span>
                                <input
                                    type="checkbox"
                                    className="wppb-fb-woo-fields__include"
                                    checked={ included }
                                    aria-label={ f.label }
                                    onChange={ ( e ) => toggleInclude( key, e.target.checked ) }
                                />
                                <div className="wppb-fb-woo-fields__name">
                                    <input
                                        type="text"
                                        value={ names[ key ] != null ? names[ key ] : '' }
                                        placeholder={ f.label }
                                        disabled={ ! included }
                                        title={ __( 'Click to rename', 'profile-builder' ) }
                                        onChange={ ( e ) => setName( key, e.target.value ) }
                                    />
                                    <span className="dashicons dashicons-edit" aria-hidden="true"></span>
                                </div>
                                <span className="wppb-fb-woo-fields__req-cell">
                                    <input
                                        type="checkbox"
                                        className="wppb-fb-woo-fields__req"
                                        checked={ parsed.required.has( key ) }
                                        disabled={ ! included }
                                        aria-label={ `${ f.label } — ${ __( 'required', 'profile-builder' ) }` }
                                        onChange={ ( e ) => toggleRequired( key, e.target.checked ) }
                                    />
                                </span>
                            </div>
                        );
                    } ) }
                </div>
            ) }
        </PanelBody>
    );

    const orderedIncluded = rowOrder.filter( ( k ) => parsed.included.has( k ) );

    return (
        <BaseFieldEdit { ...blockProps } inspectorPanels={ panel } hideDescription>
            <div className="wppb-fb-woo-address">
                { orderedIncluded.length > 0 ? (
                    orderedIncluded.map( ( key ) => {
                        const f = byKey( key );
                        const label = names[ key ] || ( f ? f.label : key );
                        return (
                            <div className="wppb-fb-woo-address__field" key={ key }>
                                <label className="wppb-fb-woo-address__label">
                                    { label }
                                    { parsed.required.has( key ) && (
                                        <span className="wppb-fb-field-required">*</span>
                                    ) }
                                </label>
                                <input type="text" disabled />
                            </div>
                        );
                    } )
                ) : (
                    <div>{ __( '(no fields selected)', 'profile-builder' ) }</div>
                ) }
            </div>
        </BaseFieldEdit>
    );
}
