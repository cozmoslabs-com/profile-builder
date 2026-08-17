/**
 * Step Break — visual separator that splits a Profile Builder form into
 * Multi-Step Forms steps.
 *
 * Renders a full-width banner using the MSF blue palette (matches the legacy
 * break-pin color so editor and legacy admin feel like the same UI). Step
 * labels are computed from position in the top-level block tree, and tab
 * titles set in the document sidebar appear inline as a preview.
 */
import { __, sprintf } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { Notice } from '@wordpress/components';

export default function MsfStepBreakEdit( { clientId } ) {
    const blockProps = useBlockProps( { className: 'wppb-fb-msf-step-break' } );

    // Compute step labels + validity from canvas position.
    const { stepFrom, stepTo, problem, titleFrom, titleTo } = useSelect(
        ( select ) => {
            const editor = select( 'core/block-editor' );
            const core   = select( 'core' );

            // Pull the current post's MSF tab titles meta if available; show
            // them inline so users can verify their sidebar input. Failing
            // that we just label "Step N".
            let titles = [];
            try {
                const postType = select( 'core/editor' ).getCurrentPostType();
                const postId   = select( 'core/editor' ).getCurrentPostId();
                const record   = core.getEditedEntityRecord( 'postType', postType, postId );
                if ( record && record.meta && Array.isArray( record.meta.wppb_fb_msf_tab_titles ) ) {
                    titles = record.meta.wppb_fb_msf_tab_titles;
                }
            } catch ( _ ) { /* editor data store may not be ready */ }

            if ( ! editor || ! clientId ) {
                return { stepFrom: 0, stepTo: 0, problem: 'unmounted', titleFrom: '', titleTo: '' };
            }

            const rootClientId = editor.getBlockRootClientId( clientId );
            if ( rootClientId ) {
                return { stepFrom: 0, stepTo: 0, problem: 'nested', titleFrom: '', titleTo: '' };
            }

            const topLevel = editor.getBlocks();
            const idx = topLevel.findIndex( ( b ) => b.clientId === clientId );
            if ( idx < 0 ) return { stepFrom: 0, stepTo: 0, problem: 'unmounted', titleFrom: '', titleTo: '' };

            // Leading break: no preceding field — useless.
            if ( idx === 0 ) {
                return { stepFrom: 0, stepTo: 0, problem: 'leading', titleFrom: '', titleTo: '' };
            }
            // Trailing break: no following field — server strips on save.
            if ( idx === topLevel.length - 1 ) {
                return { stepFrom: 0, stepTo: 0, problem: 'trailing', titleFrom: '', titleTo: '' };
            }
            // Adjacent to another break (no field between) — duplicate.
            const prevBlock = topLevel[ idx - 1 ];
            if ( prevBlock && prevBlock.name === 'profile-builder/msf-step-break' ) {
                return { stepFrom: 0, stepTo: 0, problem: 'adjacent', titleFrom: '', titleTo: '' };
            }

            // Step number = (count of step-break blocks at or before this index).
            let breakCount = 0;
            for ( let i = 0; i <= idx; i++ ) {
                if ( topLevel[ i ] && topLevel[ i ].name === 'profile-builder/msf-step-break' ) {
                    breakCount++;
                }
            }
            const from = breakCount;
            const to   = breakCount + 1;
            return {
                stepFrom: from,
                stepTo:   to,
                problem:  null,
                titleFrom: titles[ from - 1 ] || '',
                titleTo:   titles[ to - 1 ]   || '',
            };
        },
        [ clientId ]
    );

    if ( problem ) {
        const messages = {
            leading:  __( 'Step Break placed before the first field has no effect. Move it between two fields.', 'profile-builder' ),
            trailing: __( 'Step Break placed after the last field is ignored on save. Move it between two fields.', 'profile-builder' ),
            adjacent: __( 'Two Step Breaks in a row only create one step boundary. Remove the duplicate or insert a field between them.', 'profile-builder' ),
            nested:   __( 'Step Break cannot be placed inside a Repeater. Move it to the top level of the form.', 'profile-builder' ),
            unmounted: '',
        };
        return (
            <div { ...blockProps }>
                <div className="wppb-fb-msf-step-break__divider is-inert">
                    <span className="wppb-fb-msf-step-break__line" />
                    <span className="wppb-fb-msf-step-break__core">
                        <span className="wppb-fb-msf-step-break__pill is-inert">
                            { __( 'Step Break', 'profile-builder' ) }
                        </span>
                    </span>
                    <span className="wppb-fb-msf-step-break__line" />
                </div>
                <div className="wppb-fb-msf-step-break__caption">
                    { __( 'Invalid position', 'profile-builder' ) }
                </div>
                { messages[ problem ] && (
                    <Notice status="warning" isDismissible={ false }>
                        { messages[ problem ] }
                    </Notice>
                ) }
            </div>
        );
    }

    return (
        <div { ...blockProps }>
            <div className="wppb-fb-msf-step-break__divider">
                <span className="wppb-fb-msf-step-break__line" />
                <span className="wppb-fb-msf-step-break__core">
                    <span className="wppb-fb-msf-step-break__pill">
                        <span className="wppb-fb-msf-step-break__dot is-done">{ stepFrom }</span>
                        { titleFrom || sprintf( __( 'Step %d', 'profile-builder' ), stepFrom ) }
                    </span>
                    <span className="wppb-fb-msf-step-break__arrow" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12h14M14 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </span>
                    <span className="wppb-fb-msf-step-break__pill">
                        <span className="wppb-fb-msf-step-break__dot">{ stepTo }</span>
                        { titleTo || sprintf( __( 'Step %d', 'profile-builder' ), stepTo ) }
                    </span>
                </span>
                <span className="wppb-fb-msf-step-break__line" />
            </div>
            <div className="wppb-fb-msf-step-break__caption">
                { __( 'Step break', 'profile-builder' ) }
            </div>
        </div>
    );
}
