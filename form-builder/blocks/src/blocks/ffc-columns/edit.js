/**
 * Form Fields in Columns — wrapper block.
 *
 * Holds field blocks as InnerBlocks. The legacy frontend's `.ffc-wrapper`
 * flex layout is mirrored in the editor preview so what you see matches
 * what renders. `allowedBlocks` is computed from the field-registry shadow
 * (exposed via window.wppbFb.ffc) minus the disallowed types.
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';
import { Notice } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import AddFieldButton from '../../components/AddFieldButton';
import { REPEATER_BLOCK_NAME } from '../../lib/repeaterBlockName';

const PB_FIELD_PREFIX = 'profile-builder/field-';

function getAllowedBlocks() {
    const cfg = ( typeof window !== 'undefined' && window.wppbFb && window.wppbFb.ffc ) || {};
    if ( Array.isArray( cfg.allowedBlocks ) && cfg.allowedBlocks.length ) {
        return cfg.allowedBlocks;
    }
    return [];
}

export default function FfcColumnsEdit( { clientId } ) {
    const blockProps = useBlockProps( { className: 'wppb-fb-ffc-columns' } );

    // Disallow nesting inside Repeater (and any other unsupported parent).
    const problem = useSelect( ( select ) => {
        const editor = select( 'core/block-editor' );
        if ( ! editor || ! clientId ) return null;

        const rootClientId = editor.getBlockRootClientId( clientId );
        if ( rootClientId ) {
            const parent = editor.getBlock( rootClientId );
            if ( parent && parent.name === REPEATER_BLOCK_NAME ) {
                return 'in-repeater';
            }
            return 'nested';
        }
        return null;
    }, [ clientId ] );

    const childCount = useSelect( ( select ) => {
        const editor = select( 'core/block-editor' );
        if ( ! editor || ! clientId ) return 0;
        return editor.getBlock( clientId )?.innerBlocks?.length || 0;
    }, [ clientId ] );

    const colsTab = (
        <span className="wppb-fb-ffc-columns__tab">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="4" width="7" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                <rect x="14" y="4" width="7" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            { __( 'Columns', 'profile-builder' ) }
        </span>
    );

    if ( problem ) {
        return (
            <div { ...blockProps } className={ `${ blockProps.className } is-invalid` }>
                { colsTab }
                <Notice status="warning" isDismissible={ false }>
                    { problem === 'in-repeater'
                        ? __( 'Columns cannot be placed inside a Repeater. Move it to the top level of the form.', 'profile-builder' )
                        : __( 'Columns must be placed at the top level of the form, not nested inside another block.', 'profile-builder' ) }
                </Notice>
            </div>
        );
    }

    return (
        <div { ...blockProps }>
            { colsTab }
            <div className="wppb-fb-ffc-columns__row">
                <InnerBlocks
                    allowedBlocks={ getAllowedBlocks() }
                    template={ [] }
                    templateLock={ false }
                    orientation="horizontal"
                    renderAppender={ () => null }
                />
            </div>
            <AddFieldButton rootClientId={ clientId } label={ __( 'Add field', 'profile-builder' ) } />
            { childCount < 2 && (
                <p className="wppb-fb-ffc-columns__hint">
                    { __( 'Add 2 or more fields to form a column row', 'profile-builder' ) }
                </p>
            ) }
        </div>
    );
}
