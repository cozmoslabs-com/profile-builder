/**
 * `blocks.registerBlockType` filters that re-inject cross-cutting attributes /
 * supports wiped by the block.json spread over the PHP-bootstrapped schema.
 * Must load before register-blocks.js (`addFilter` is not retroactive).
 */
import { addFilter } from '@wordpress/hooks';

const wppbFb = () => ( typeof window !== 'undefined' && window.wppbFb ) || {};

/** Merge missing attribute schemas; block.json keys win. */
const mergeMissingAttributes = ( settings, additions ) => {
    const existing = settings.attributes || {};
    const merged = { ...existing };
    let changed = false;
    for ( const [ key, schema ] of Object.entries( additions ) ) {
        if ( Object.prototype.hasOwnProperty.call( existing, key ) ) continue;
        merged[ key ] = schema;
        changed = true;
    }
    return changed ? { ...settings, attributes: merged } : settings;
};

/** `supports.multiple = false` for unique-per-form field types. */
const injectUniqueness = ( settings, name ) => {
    const cfg = wppbFb().uniqueness || {};
    const uniqueBlocks = Array.isArray( cfg.uniqueBlocks ) ? cfg.uniqueBlocks : [];
    if ( ! uniqueBlocks.includes( name ) ) return settings;
    return { ...settings, supports: { ...( settings.supports || {} ), multiple: false } };
};

/**
 * Kill Advanced panel supports (block.json spread restores them) and
 * `supports.lock` so Unlock can't clear mandatory `lock.remove`.
 */
const disableAdvancedPanel = ( settings, name ) => {
    if ( typeof name !== 'string' || ! name.startsWith( 'profile-builder/' ) ) return settings;
    return {
        ...settings,
        supports: { ...( settings.supports || {} ), customClassName: false, anchor: false, lock: false },
    };
};

/** Conditional-logic attributes for eligible field blocks. */
const injectConditionalLogic = ( settings, name ) => {
    if ( typeof name !== 'string' || ! name.startsWith( 'profile-builder/field-' ) ) return settings;
    const cfg = wppbFb().conditionalFields || {};
    const blockToFieldType = cfg.blockToFieldType || {};
    const disabled = Array.isArray( cfg.disabledFieldTypes ) ? cfg.disabledFieldTypes : [];
    const fieldType = blockToFieldType[ name ];
    if ( ! fieldType || disabled.includes( fieldType ) ) return settings;
    return mergeMissingAttributes( settings, {
        'conditional-logic-enabled': { type: 'string', default: '' },
        'conditional-logic':         { type: 'string', default: '' },
    } );
};

/** `overwrite-existing` for custom storable field types. */
const injectOverwriteExisting = ( settings, name ) => {
    if ( typeof name !== 'string' || ! name.startsWith( 'profile-builder/field-' ) ) return settings;
    const fb = wppbFb();
    const cfg = fb.metaNames || {};
    const blockToFieldType = ( fb.conditionalFields && fb.conditionalFields.blockToFieldType ) || {};
    const defaults = Array.isArray( cfg.defaultFieldTypes ) ? cfg.defaultFieldTypes : [];
    const noMeta = Array.isArray( cfg.noMetaNameFieldTypes ) ? cfg.noMetaNameFieldTypes : [];
    const fieldType = blockToFieldType[ name ];
    if ( ! fieldType || defaults.includes( fieldType ) || noMeta.includes( fieldType ) ) return settings;
    return mergeMissingAttributes( settings, { 'overwrite-existing': { type: 'string', default: 'No' } } );
};

/** JS twin of PHP `wppb_fb_block_attributes` via `wppbFb.extraAttributes`. */
const injectExtraAttributes = ( settings, name ) => {
    if ( typeof name !== 'string' || ! name.startsWith( 'profile-builder/field-' ) ) return settings;
    const fb = wppbFb();
    const extra = fb.extraAttributes || null;
    if ( ! extra ) return settings;
    const blockToFieldType = ( fb.conditionalFields && fb.conditionalFields.blockToFieldType ) || {};
    const fieldType = blockToFieldType[ name ];
    if ( ! fieldType ) return settings;
    const inject = extra[ fieldType ];
    if ( ! inject || typeof inject !== 'object' ) return settings;
    return mergeMissingAttributes( settings, inject );
};

/**
 * Hide PB blocks from the inserter outside form CPTs (`wppbFbIsFormScreen`).
 * Bundle loads on every editor; flag is printed before module load.
 */
const hideOutsideFormEditor = ( settings, name ) => {
    if ( typeof name !== 'string' || ! name.startsWith( 'profile-builder/' ) ) return settings;
    if ( typeof window !== 'undefined' && window.wppbFbIsFormScreen === true ) return settings;
    return { ...settings, supports: { ...( settings.supports || {} ), inserter: false } };
};

const TRANSFORMS = [
    hideOutsideFormEditor,
    injectUniqueness,
    disableAdvancedPanel,
    injectConditionalLogic,
    injectOverwriteExisting,
    injectExtraAttributes,
];

addFilter(
    'blocks.registerBlockType',
    'profile-builder/field-block-schema',
    ( settings, name ) => TRANSFORMS.reduce( ( acc, transform ) => transform( acc, name ), settings )
);
