/**
 * Repeater block name from the bridge, with literal fallback off PB form screens.
 */
export const REPEATER_BLOCK_NAME =
    ( typeof window !== 'undefined' && window.wppbFb && window.wppbFb.repeater && window.wppbFb.repeater.parentBlockName )
    || 'profile-builder/field-repeater';
