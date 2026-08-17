/**
 * Progress Bar canvas preview (sample 42% fill; front-end classes from progress-bar.php).
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';

const SAMPLE_PERCENT = 42;

export default function ProgressBarEdit( { attributes } ) {
    const positionContext = attributes[ 'position-context' ] || 'top';

    const blockProps = useBlockProps( {
        className: `wppb-fb-progress-bar wppb-fb-progress-bar--${ positionContext }`,
    } );

    const { calculationMode, displayOptions } = useSelect( ( select ) => {
        try {
            const postType = select( 'core/editor' ).getCurrentPostType();
            const postId   = select( 'core/editor' ).getCurrentPostId();
            const record   = select( 'core' ).getEditedEntityRecord( 'postType', postType, postId );
            const meta     = ( record && record.meta ) || {};
            return {
                calculationMode: meta.wppb_fb_progress_bar_calculation_mode || 'All Fields',
                displayOptions:  meta.wppb_fb_progress_bar_display_options  || 'Bar Only',
            };
        } catch ( _ ) {
            return { calculationMode: 'All Fields', displayOptions: 'Bar Only' };
        }
    }, [] );

    const showPercentage = displayOptions === 'Bar and Percentage Label';
    const positionLabel  = positionContext === 'top'
        ? __( 'Top of Form', 'profile-builder' )
        : __( 'Bottom of Form', 'profile-builder' );

    return (
        <div { ...blockProps }>
            <div className="wppb-fb-progress-bar__chrome">
                <span className="wppb-fb-progress-bar__badge">
                    { __( 'Progress Bar', 'profile-builder' ) }
                </span>
                <span className="wppb-fb-progress-bar__meta">
                    { positionLabel }
                    { ' · ' }
                    { calculationMode }
                </span>
            </div>
            <div className={ `wppb-progress-bar-container ${ positionContext }` }>
                <div
                    className="wppb-progress-bar-fill"
                    style={ { width: `${ SAMPLE_PERCENT }%` } }
                />
                { showPercentage && (
                    <div className="wppb-progress-bar-text">
                        <span>{ SAMPLE_PERCENT }%</span>
                    </div>
                ) }
            </div>
        </div>
    );
}
