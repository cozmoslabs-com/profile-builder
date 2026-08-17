/**
 * Subscription Plans field editor. Storage matches classic manage-fields keys
 * (`subscription-plans` CSV, sort-order, selected). Plans from `window.wppbFb.pms`.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, Notice, ExternalLink } from '@wordpress/components';
import { useRef, useState } from '@wordpress/element';
import BaseFieldEdit from '../../components/BaseFieldEdit';

function csvList( csv ) {
    if ( ! csv ) return [];
    return csv.split( ',' ).map( ( v ) => v.trim() ).filter( Boolean );
}

// sort-order first, then remaining bridge defaults; drop unknown values.
function reconstructRowOrder( sortStr, allValues ) {
    const seen = new Set();
    const out = [];
    for ( const v of csvList( sortStr ) ) {
        if ( allValues.includes( v ) && ! seen.has( v ) ) {
            seen.add( v );
            out.push( v );
        }
    }
    for ( const v of allValues ) {
        if ( ! seen.has( v ) ) out.push( v );
    }
    return out;
}

// Classic leading `, ` + comma-space list.
function serializeOrder( order ) {
    return order.length ? ', ' + order.join( ', ' ) : '';
}

function buildSelectedCsv( order, checkedSet ) {
    return order.filter( ( v ) => checkedSet.has( v ) ).join( ', ' );
}

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const dragValRef = useRef( null );
    const [ dragOverVal, setDragOverVal ] = useState( null );

    const fb = ( typeof window !== 'undefined' && window.wppbFb ) || {};
    const pms = fb.pms || {};
    const plans = Array.isArray( pms.subscriptionPlans ) ? pms.subscriptionPlans : [];
    const planSelectOptions = Array.isArray( pms.subscriptionPlanSelect ) ? pms.subscriptionPlanSelect : [];
    const plansUrl = pms.subscriptionsUrl || '';

    const allValues = plans.map( ( p ) => String( p.value ) );
    const planFor = ( value ) => plans.find( ( p ) => String( p.value ) === String( value ) );
    const labelFor = ( value ) => {
        const found = planFor( value );
        return found ? found.label : value;
    };

    const rowOrder = reconstructRowOrder( attributes[ 'subscription-plans-sort-order' ] || '', allValues );
    const checked = new Set( csvList( attributes[ 'subscription-plans' ] ) );

    const toggle = ( value, on ) => {
        const next = new Set( checked );
        if ( on ) { next.add( value ); } else { next.delete( value ); }
        setAttributes( { 'subscription-plans': buildSelectedCsv( rowOrder, next ) } );
    };

    const commitOrder = ( order ) => setAttributes( {
        'subscription-plans-sort-order': serializeOrder( order ),
        'subscription-plans': buildSelectedCsv( order, checked ),
    } );

    // Drag from handle only so checkbox/label stay clickable.
    const onHandleDragStart = ( value ) => ( e ) => {
        dragValRef.current = value;
        e.stopPropagation();
        try {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData( 'text/plain', value );
        } catch ( _ ) { /* older browsers */ }
        const row = e.currentTarget.closest( '.wppb-fb-pms-plans__row' );
        if ( row && e.dataTransfer.setDragImage ) {
            e.dataTransfer.setDragImage( row, 10, 10 );
        }
    };
    const onHandleDragEnd = () => { dragValRef.current = null; setDragOverVal( null ); };
    const onRowDragOver = ( value ) => ( e ) => {
        if ( dragValRef.current == null ) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if ( dragOverVal !== value ) setDragOverVal( value );
    };
    const onRowDrop = ( targetVal ) => ( e ) => {
        e.preventDefault();
        e.stopPropagation();
        const src = dragValRef.current;
        dragValRef.current = null;
        setDragOverVal( null );
        if ( ! src || src === targetVal ) return;
        const next = rowOrder.slice();
        const from = next.indexOf( src );
        if ( from < 0 ) return;
        next.splice( from, 1 );
        const to = next.indexOf( targetVal );
        if ( to < 0 ) return;
        next.splice( to, 0, src );
        commitOrder( next );
    };

    const extraPanels = (
        <PanelBody title={ __( 'Subscription Plans', 'profile-builder' ) }>
            { plans.length > 0 ? (
                <>
                    <p style={ { marginBottom: '0.75em' } }>
                        { __( 'Select which plans to show, and drag to reorder. Leave all unchecked to show every plan.', 'profile-builder' ) }
                    </p>
                    <div className="wppb-fb-pms-plans">
                        { rowOrder.map( ( value ) => {
                            const rowClass = [
                                'wppb-fb-pms-plans__row',
                                dragOverVal === value ? 'is-drag-over' : '',
                            ].filter( Boolean ).join( ' ' );
                            return (
                                <div
                                    key={ value }
                                    className={ rowClass }
                                    onDragOver={ onRowDragOver( value ) }
                                    onDrop={ onRowDrop( value ) }
                                >
                                    <span
                                        className="wppb-fb-pms-plans__handle"
                                        draggable={ true }
                                        onDragStart={ onHandleDragStart( value ) }
                                        onDragEnd={ onHandleDragEnd }
                                        role="button"
                                        aria-label={ __( 'Drag to reorder', 'profile-builder' ) }
                                        title={ __( 'Drag to reorder', 'profile-builder' ) }
                                    >
                                        <span className="dashicons dashicons-menu" aria-hidden="true"></span>
                                    </span>
                                    <input
                                        type="checkbox"
                                        className="wppb-fb-pms-plans__check"
                                        checked={ checked.has( value ) }
                                        aria-label={ labelFor( value ) }
                                        onChange={ ( e ) => toggle( value, e.target.checked ) }
                                    />
                                    <span className="wppb-fb-pms-plans__label">{ labelFor( value ) }</span>
                                </div>
                            );
                        } ) }
                    </div>
                    { planSelectOptions.length > 1 && (
                        <SelectControl
                            label={ __( 'Selected Subscription Plan', 'profile-builder' ) }
                            value={ attributes[ 'subscription-plan-selected' ] || '-1' }
                            options={ planSelectOptions }
                            onChange={ ( val ) => setAttributes( { 'subscription-plan-selected': val } ) }
                            help={ __( 'The plan selected by default when the form loads.', 'profile-builder' ) }
                            __nextHasNoMarginBottom
                        />
                    ) }
                </>
            ) : (
                <Notice status="warning" isDismissible={ false }>
                    { __( 'No active subscription plans found.', 'profile-builder' ) }
                    { plansUrl && ' ' }
                    { plansUrl && (
                        <ExternalLink href={ plansUrl }>
                            { __( 'Create a subscription plan', 'profile-builder' ) }
                        </ExternalLink>
                    ) }
                </Notice>
            ) }
        </PanelBody>
    );

    // Empty / `all` → every plan; else checked in row order.
    const selectedInOrder = rowOrder.filter( ( v ) => checked.has( v ) && v !== 'all' );
    const showAll = checked.has( 'all' ) || checked.size === 0;
    const previewValues = showAll
        ? rowOrder.filter( ( v ) => v !== 'all' )
        : selectedInOrder;

    // Single plan → no radio (front end uses hidden input).
    const isSinglePlan = previewValues.length === 1;

    // ''/'0' → first plan; '-1' → none (PHP absint quirks).
    const selectedPlan = String( attributes[ 'subscription-plan-selected' ] ?? '' );
    const checkedValue = selectedPlan === '' || selectedPlan === '0'
        ? previewValues[ 0 ] || ''
        : selectedPlan;

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <div className="wppb-fb-pms-plans-preview">
                { previewValues.length > 0 ? (
                    previewValues.map( ( value ) => {
                        const plan = planFor( value ) || {};
                        return (
                            <div
                                key={ value }
                                className={ [ 'wppb-fb-pms-plan', isSinglePlan ? 'is-single' : '' ].filter( Boolean ).join( ' ' ) }
                            >
                                <div className="wppb-fb-pms-plan__row">
                                    { ! isSinglePlan && (
                                        <input
                                            type="radio"
                                            disabled
                                            readOnly
                                            checked={ String( checkedValue ) === String( value ) }
                                        />
                                    ) }
                                    <span className="wppb-fb-pms-plan__name">{ labelFor( value ) }</span>
                                    { plan.price && (
                                        <span className="wppb-fb-pms-plan__price">{ plan.price }</span>
                                    ) }
                                    { plan.trial && (
                                        <span className="wppb-fb-pms-plan__trial">{ plan.trial }</span>
                                    ) }
                                    { plan.signUpFee && (
                                        <span className="wppb-fb-pms-plan__fee">{ plan.signUpFee }</span>
                                    ) }
                                </div>
                                { plan.description && (
                                    <div className="wppb-fb-pms-plan__desc">{ plan.description }</div>
                                ) }
                            </div>
                        );
                    } )
                ) : (
                    <div className="wppb-fb-pms-plans-preview__empty">
                        { __( '(no subscription plans available)', 'profile-builder' ) }
                    </div>
                ) }
            </div>
        </BaseFieldEdit>
    );
}
