/**
 * Pick mini-inserter `position` before mount. Core's size middleware clamps to
 * the initial side and blocks flip, so decide top vs bottom from the anchor rect.
 */

/** Popover's own viewport inset, `OVERFLOW_PADDING` in @wordpress/components. */
const OVERFLOW_PADDING = 8;

/** Comfortable height below the anchor before preferring top. */
const COMFORTABLE_HEIGHT = 520;

/**
 * Element rect in main-document viewport coords (adds iframe offset when needed).
 *
 * @param {?Element} element
 * @return {?Object} `{ top, bottom, left, right, width, height }`, or null.
 */
export const mainDocumentRect = ( element ) => {
    if ( ! element ) return null;

    const rect = element.getBoundingClientRect();
    const frame = element.ownerDocument?.defaultView?.frameElement;
    if ( ! frame ) {
        return rect;
    }

    const frameRect = frame.getBoundingClientRect();
    return {
        top: rect.top + frameRect.top,
        bottom: rect.bottom + frameRect.top,
        left: rect.left + frameRect.left,
        right: rect.right + frameRect.left,
        width: rect.width,
        height: rect.height,
    };
};

/**
 * `'top center'` when below is short and above is larger; else `'bottom center'`.
 *
 * @param {?Object} rect Anchor rect in main-document viewport coordinates.
 * @return {string}
 */
export const resolveMiniInserterPosition = ( rect ) => {
    if ( ! rect ) return 'bottom center';

    const below = window.innerHeight - rect.bottom - OVERFLOW_PADDING;
    const above = rect.top - OVERFLOW_PADDING;

    return below < Math.min( COMFORTABLE_HEIGHT, above ) ? 'top center' : 'bottom center';
};

/**
 * `resolveMiniInserterPosition` straight from the anchor element.
 *
 * @param {?Element} element
 * @return {string} `'top center'` or `'bottom center'`.
 */
export const resolveMiniInserterPositionFor = ( element ) =>
    resolveMiniInserterPosition( mainDocumentRect( element ) );
