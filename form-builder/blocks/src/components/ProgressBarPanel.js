/**
 * Progress Bar document sidebar panel + live canvas reconciler.
 * Gated on `window.wppbFb.progressBar.active`.
 */

import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { SelectControl, ToggleControl } from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect, useDispatch, select as dataSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { createBlock } from '@wordpress/blocks';

import {
    PROGRESS_BAR_BLOCK,
    isStepBoundary,
    withoutProgressBars,
} from '../lib/stepBoundaries';

/**
 * Desired bar slots for position setting. Uses shared `isStepBoundary()`.
 * Returns `{ context, before }` (`before` null = append).
 */
function computeDesiredPlan( nonBarBlocks, position ) {
    const wantTop    = position === 'Top of Form'    || position === 'Both';
    const wantBottom = position === 'Bottom of Form' || position === 'Both';
    const plan = [];

    if ( wantTop ) {
        const beforeId = nonBarBlocks.length > 0 ? nonBarBlocks[ 0 ].clientId : null;
        plan.push( { context: 'top', before: beforeId } );
    }

    for ( let i = 0; i < nonBarBlocks.length; i++ ) {
        const b = nonBarBlocks[ i ];
        if ( ! isStepBoundary( nonBarBlocks, i ) ) continue;
        if ( wantBottom ) {
            plan.push( { context: 'bottom', before: b.clientId } );
        }
        if ( wantTop ) {
            const nextId = ( i + 1 < nonBarBlocks.length ) ? nonBarBlocks[ i + 1 ].clientId : null;
            plan.push( { context: 'top', before: nextId } );
        }
    }

    if ( wantBottom ) {
        plan.push( { context: 'bottom', before: null } );
    }

    return plan;
}

/**
 * Pair existing bars to plan slots by matching `position-context`.
 * Context changes are remove + insert. Returns `{ removes, inserts }`.
 */
function diffPlan( allBlocks, plan ) {
    const removes = [];
    const inserts = [];
    let planIdx = 0;

    const canvasItems = allBlocks.map( ( b ) => ( {
        clientId: b.clientId,
        name:     b.name,
        context:  b.attributes && b.attributes[ 'position-context' ],
    } ) );

    const findBarsBefore = ( startIdx ) => {
        const out = [];
        for ( let j = startIdx - 1; j >= 0; j-- ) {
            if ( canvasItems[ j ].name !== PROGRESS_BAR_BLOCK ) break;
            out.unshift( canvasItems[ j ] );
        }
        return out;
    };

    const consumedBars = new Set();

    for ( ; planIdx < plan.length; planIdx++ ) {
        const slot = plan[ planIdx ];

        if ( slot.before === null ) break;

        const anchorIdx = canvasItems.findIndex( ( c ) => c.clientId === slot.before );
        if ( anchorIdx < 0 ) {
            inserts.push( { context: slot.context, beforeNonBarClientId: slot.before } );
            continue;
        }

        const candidateBars = findBarsBefore( anchorIdx ).filter( ( c ) => ! consumedBars.has( c.clientId ) );
        const match = candidateBars.find( ( c ) => c.context === slot.context );
        if ( match ) {
            consumedBars.add( match.clientId );
        } else {
            inserts.push( { context: slot.context, beforeNonBarClientId: slot.before } );
        }
    }

    const endSlots = plan.slice( planIdx );
    if ( endSlots.length > 0 ) {
        let lastNonBarIdx = -1;
        for ( let i = canvasItems.length - 1; i >= 0; i-- ) {
            if ( canvasItems[ i ].name !== PROGRESS_BAR_BLOCK ) { lastNonBarIdx = i; break; }
        }
        const trailingBars = [];
        for ( let i = lastNonBarIdx + 1; i < canvasItems.length; i++ ) {
            if ( canvasItems[ i ].name === PROGRESS_BAR_BLOCK && ! consumedBars.has( canvasItems[ i ].clientId ) ) {
                trailingBars.push( canvasItems[ i ] );
            }
        }
        for ( const slot of endSlots ) {
            const match = trailingBars.find( ( c ) => c.context === slot.context && ! consumedBars.has( c.clientId ) );
            if ( match ) {
                consumedBars.add( match.clientId );
            } else {
                inserts.push( { context: slot.context, beforeNonBarClientId: null } );
            }
        }
    }

    for ( const c of canvasItems ) {
        if ( c.name === PROGRESS_BAR_BLOCK && ! consumedBars.has( c.clientId ) ) {
            removes.push( c.clientId );
        }
    }

    return { removes, inserts };
}

/**
 * Keep canvas bars in sync with settings via positional diff.
 * Fingerprint ignores bars so our own mutations don't loop.
 */
function useProgressBarReconciler( enabled, position ) {
    const treeFingerprint = useSelect(
        ( select ) => withoutProgressBars( select( 'core/block-editor' ).getBlocks() )
            .map( ( b ) => `${ b.name }:${ b.clientId }` )
            .join( '|' ),
        []
    );
    const { insertBlock, removeBlock, updateBlockAttributes } = useDispatch( 'core/block-editor' );

    useEffect( () => {
        // Unlock first — `lock.remove` makes plain removeBlock a no-op.
        const removeLockedBlock = ( clientId ) => {
            updateBlockAttributes( clientId, { lock: {} } );
            removeBlock( clientId, false );
        };

        const allBlocks   = dataSelect( 'core/block-editor' ).getBlocks();
        const nonBar      = withoutProgressBars( allBlocks );

        if ( ! enabled ) {
            for ( const b of allBlocks ) {
                if ( b.name === PROGRESS_BAR_BLOCK ) removeLockedBlock( b.clientId );
            }
            return;
        }

        const plan       = computeDesiredPlan( nonBar, position );
        const { removes, inserts } = diffPlan( allBlocks, plan );

        for ( const clientId of removes ) {
            removeLockedBlock( clientId );
        }

        for ( const slot of inserts ) {
            const currentBlocks = dataSelect( 'core/block-editor' ).getBlocks();
            let idx = currentBlocks.length;
            if ( slot.beforeNonBarClientId !== null ) {
                idx = currentBlocks.findIndex( ( b ) => b.clientId === slot.beforeNonBarClientId );
                if ( idx < 0 ) idx = currentBlocks.length;
            }
            insertBlock(
                createBlock( PROGRESS_BAR_BLOCK, {
                    'position-context': slot.context,
                    lock: { move: true, remove: true },
                } ),
                idx,
                undefined,
                false
            );
        }
    }, [ enabled, position, treeFingerprint, insertBlock, removeBlock, updateBlockAttributes ] );
}

/**
 * Split across components so hook count never changes when meta resolves late.
 */
const ProgressBarPanel = () => {
    const postType = useSelect( ( select ) => select( 'core/editor' ).getCurrentPostType(), [] );
    if ( ! [ 'wppb-rf-cpt', 'wppb-epf-cpt' ].includes( postType ) ) return null;
    if ( ! ( window.wppbFb && window.wppbFb.progressBar && window.wppbFb.progressBar.active ) ) return null;

    return <ProgressBarPanelInner postType={ postType } />;
};

const ProgressBarPanelInner = ( { postType } ) => {
    const [ meta, setMeta ] = useEntityProp( 'postType', postType, 'meta' );
    if ( ! meta ) return null;

    return <ProgressBarPanelBody meta={ meta } setMeta={ setMeta } />;
};

const ProgressBarPanelBody = ( { meta, setMeta } ) => {
    const enabled  = meta.wppb_fb_progress_bar_enable === 'Yes';
    const position = meta.wppb_fb_progress_bar_position || 'Top of Form';

    useProgressBarReconciler( enabled, position );

    return (
        <PluginDocumentSettingPanel
            name="wppb-progress-bar-settings"
            title={ __( 'Progress Bar', 'profile-builder' ) }
        >
            <ToggleControl
                label={ __( 'Enable Progress Bar', 'profile-builder' ) }
                checked={ enabled }
                onChange={ ( val ) => setMeta( { wppb_fb_progress_bar_enable: val ? 'Yes' : 'No' } ) }
                help={ __( 'Show a completion progress bar on the form.', 'profile-builder' ) }
            />

            { enabled && (
                <>
                    <SelectControl
                        label={ __( 'Calculation Mode', 'profile-builder' ) }
                        value={ meta.wppb_fb_progress_bar_calculation_mode || 'All Fields' }
                        options={ [
                            { label: __( 'All Fields', 'profile-builder' ),      value: 'All Fields' },
                            { label: __( 'Required Fields', 'profile-builder' ), value: 'Required Fields' },
                        ] }
                        onChange={ ( val ) => setMeta( { wppb_fb_progress_bar_calculation_mode: val } ) }
                        help={ __( 'Choose how progress is calculated.', 'profile-builder' ) }
                    />
                    <SelectControl
                        label={ __( 'Style / Display Options', 'profile-builder' ) }
                        value={ meta.wppb_fb_progress_bar_display_options || 'Bar Only' }
                        options={ [
                            { label: __( 'Bar Only', 'profile-builder' ),                  value: 'Bar Only' },
                            { label: __( 'Bar and Percentage Label', 'profile-builder' ),  value: 'Bar and Percentage Label' },
                        ] }
                        onChange={ ( val ) => setMeta( { wppb_fb_progress_bar_display_options: val } ) }
                    />
                    <SelectControl
                        label={ __( 'Position', 'profile-builder' ) }
                        value={ meta.wppb_fb_progress_bar_position || 'Top of Form' }
                        options={ [
                            { label: __( 'Top of Form', 'profile-builder' ),    value: 'Top of Form' },
                            { label: __( 'Bottom of Form', 'profile-builder' ), value: 'Bottom of Form' },
                            { label: __( 'Both', 'profile-builder' ),           value: 'Both' },
                        ] }
                        onChange={ ( val ) => setMeta( { wppb_fb_progress_bar_position: val } ) }
                        help={ __( 'Where to display the progress bar.', 'profile-builder' ) }
                    />
                </>
            ) }
        </PluginDocumentSettingPanel>
    );
};

registerPlugin( 'wppb-progress-bar-settings-plugin', {
    render: ProgressBarPanel,
} );
