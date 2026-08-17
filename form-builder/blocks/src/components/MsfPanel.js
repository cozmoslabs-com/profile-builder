/**
 * Multi-Step Forms document sidebar: pagination, tabs, tab titles.
 * Step count comes from `msf-step-break` blocks; meta via `wppb_fb_msf_*`.
 */
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { ToggleControl, TextControl, Notice } from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';

import { countStepBoundaries } from '../lib/stepBoundaries';

// Inner component runs the meta + block-tree hooks. Conditionally rendered by
// the outer guard so those hooks never fire on non-PB CPTs — and so the hook
// order is invariant per component (Rules of Hooks): the outer always calls
// exactly one hook, and the inner always calls its full hook set before any
// early return. Mirrors the RepeaterScopeGuard split-component pattern.
const MsfPanelInner = ( { postType } ) => {
    const [ meta, setMeta ] = useEntityProp( 'postType', postType, 'meta' );

    // Step count = (real step boundaries) + 1. Each boundary closes one step
    // and opens the next; the form always has at least one.
    //
    // `countStepBoundaries` filters injected progress bars out FIRST.     // them would mean enabling a "Top of Form" bar shifted a
    // leading step-break to index 1, so it stopped looking leading and the step
    // count jumped by one — the tab-title list gained a phantom step.
    const breakCount = useSelect( ( select ) => {
        const editor = select( 'core/block-editor' );
        if ( ! editor ) return 0;

        return countStepBoundaries( editor.getBlocks() );
    }, [] );

    // All hooks are above this guard, so it gates only the JSX (not hook order).
    if ( ! meta ) return null;

    const pagination = meta.wppb_fb_msf_pagination || '';
    const tabs       = meta.wppb_fb_msf_tabs       || '';
    const tabTitles  = Array.isArray( meta.wppb_fb_msf_tab_titles ) ? meta.wppb_fb_msf_tab_titles : [];
    const stepCount  = breakCount + 1;

    const setTitle = ( i, val ) => {
        const next = tabTitles.slice( 0, stepCount );
        while ( next.length < stepCount ) next.push( '' );
        next[ i ] = val;
        setMeta( { wppb_fb_msf_tab_titles: next } );
    };

    return (
        <PluginDocumentSettingPanel
            name="wppb-msf-settings"
            title={ __( 'Multi-Step Forms', 'profile-builder' ) }
        >
            { breakCount === 0 && (
                <Notice status="info" isDismissible={ false }>
                    { __( 'Insert a "Step Break" block between fields to split this form into steps. Pagination and tabs become active once at least one step break is in place.', 'profile-builder' ) }
                </Notice>
            ) }

            <ToggleControl
                label={ __( 'Show pagination', 'profile-builder' ) }
                checked={ pagination === 'yes' }
                onChange={ ( on ) => setMeta( { wppb_fb_msf_pagination: on ? 'yes' : 'no' } ) }
                help={ __( 'Display numeric step pagination next to the Previous / Next buttons.', 'profile-builder' ) }
            />

            <ToggleControl
                label={ __( 'Show step tabs', 'profile-builder' ) }
                checked={ tabs === 'yes' }
                onChange={ ( on ) => setMeta( { wppb_fb_msf_tabs: on ? 'yes' : 'no' } ) }
                help={ __( 'Display a tabbed step header above the form. Tab labels are configurable below.', 'profile-builder' ) }
            />

            { tabs === 'yes' && breakCount > 0 && (
                <div style={ { marginTop: '12px' } }>
                    <p style={ { fontWeight: 600, marginBottom: '8px' } }>
                        { __( 'Tab Titles', 'profile-builder' ) }
                    </p>
                    { Array.from( { length: stepCount } ).map( ( _, i ) => (
                        <TextControl
                            key={ i }
                            label={ __( 'Step', 'profile-builder' ) + ' ' + ( i + 1 ) }
                            value={ tabTitles[ i ] || '' }
                            onChange={ ( val ) => setTitle( i, val ) }
                            placeholder={ __( 'Step', 'profile-builder' ) + ' ' + ( i + 1 ) }
                        />
                    ) ) }
                </div>
            ) }
        </PluginDocumentSettingPanel>
    );
};

const MsfPanel = () => {
    const postType = useSelect( ( select ) => select( 'core/editor' ).getCurrentPostType(), [] );
    if ( ! [ 'wppb-rf-cpt', 'wppb-epf-cpt' ].includes( postType ) ) return null;
    // Add-on bridge must be present (`window.wppbFb.msf`) or REST drops the meta.
    if ( ! ( window.wppbFb && window.wppbFb.msf ) ) return null;
    return <MsfPanelInner postType={ postType } />;
};

registerPlugin( 'wppb-msf-settings-plugin', { render: MsfPanel } );
