/**
 * Shared rule for multi-step boundaries: drop progress bars first, then a
 * break counts only with a non-bar block on both sides. Keep in sync with the
 * PHP injector `wppb_pb_fb_inject_progress_bar_blocks()`.
 */

export const STEP_BREAK_BLOCK   = 'profile-builder/msf-step-break';
export const PROGRESS_BAR_BLOCK = 'profile-builder/progress-bar';

/** Drop injected progress bars from a top-level list. */
export function withoutProgressBars( blocks ) {
    return ( blocks || [] ).filter( ( b ) => b && b.name !== PROGRESS_BAR_BLOCK );
}

/** True when index is a real step boundary (not leading/trailing). */
export function isStepBoundary( nonBarBlocks, index ) {
    const block = nonBarBlocks[ index ];
    if ( ! block || block.name !== STEP_BREAK_BLOCK ) return false;

    return index !== 0 && index !== nonBarBlocks.length - 1;
}

/** Real step-boundary count (bars filtered). Step count = this + 1. */
export function countStepBoundaries( blocks ) {
    const nonBar = withoutProgressBars( blocks );

    let n = 0;
    for ( let i = 0; i < nonBar.length; i++ ) {
        if ( isStepBoundary( nonBar, i ) ) n++;
    }
    return n;
}
