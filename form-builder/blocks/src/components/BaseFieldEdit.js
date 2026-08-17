import { __, sprintf } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl, SelectControl, TextareaControl, ToggleControl, Notice } from '@wordpress/components';
import { useRef, useEffect } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import CrossCuttingFieldPanels from './CrossCuttingFieldPanels';
import { useAllocateFieldId } from './useAllocateFieldId';
import { FieldSettingsFill } from './FieldSettingsSlotFill';
import { REPEATER_BLOCK_NAME } from '../lib/repeaterBlockName';

function collectBlockNames( blocks, selfClientId, out ) {
    for ( const b of blocks ) {
        if ( ! b ) continue;
        if ( b.clientId !== selfClientId ) {
            out.add( b.name );
        }
        if ( Array.isArray( b.innerBlocks ) && b.innerBlocks.length ) {
            collectBlockNames( b.innerBlocks, selfClientId, out );
        }
    }
    return out;
}

// Exclusive-group partners already on canvas (display labels).
function findExclusiveConflicts( blockName, presentNames ) {
    const fb = ( typeof window !== 'undefined' && window.wppbFb ) || {};
    const cfg = fb.uniqueness || {};
    const groups = Array.isArray( cfg.exclusiveBlockGroups ) ? cfg.exclusiveBlockGroups : [];
    const blockToFieldType = ( fb.conditionalFields && fb.conditionalFields.blockToFieldType ) || {};
    const conflicts = [];
    for ( const group of groups ) {
        if ( ! group.includes( blockName ) ) continue;
        for ( const other of group ) {
            if ( other !== blockName && presentNames.has( other ) ) {
                conflicts.push( blockToFieldType[ other ] || other );
            }
        }
    }
    return conflicts;
}

// Collect meta-names for collision checks. Skips self + subtree.
function collectMetaNamesForCollision( blocks, selfClientId, repeaterBlockName ) {
    const subMetaNames = [];
    const allMetaNames = [];
    const walk = ( list, insideRepeater ) => {
        for ( const b of list ) {
            if ( ! b || b.clientId === selfClientId ) continue;
            const meta = b.attributes && b.attributes[ 'meta-name' ];
            if ( meta ) {
                allMetaNames.push( meta );
                if ( insideRepeater ) subMetaNames.push( meta );
            }
            if ( Array.isArray( b.innerBlocks ) && b.innerBlocks.length ) {
                const childInside = insideRepeater || b.name === repeaterBlockName;
                walk( b.innerBlocks, childInside );
            }
        }
    };
    walk( blocks, false );
    return { subMetaNames, allMetaNames };
}

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;
function escapeRegex( s ) { return s.replace( REGEX_SPECIAL, '\\$&' ); }

// Runtime shape `<stem>_<setIndex>` — precompiled to avoid per-keystroke RegExps.
const INDEXED_SUFFIX_RE = /^(.+)_[0-9]+$/;

/** Mirror of wppb_fb_break_runtime_collision. Server appends `_pb` on clash. */
function detectRuntimeCollision( candidate, isSubField, subMetaNames, allMetaNames ) {
    if ( typeof candidate !== 'string' || candidate === '' ) return null;

    const candidateMatch = candidate.match( INDEXED_SUFFIX_RE );
    if ( candidateMatch ) {
        const stem = candidateMatch[ 1 ];
        for ( const sub of subMetaNames ) {
            if ( sub && sub === stem ) {
                return { direction: 'forward', conflictName: sub };
            }
        }
    }

    if ( isSubField ) {
        for ( const other of allMetaNames ) {
            if ( ! other ) continue;
            const otherMatch = other.match( INDEXED_SUFFIX_RE );
            if ( otherMatch && otherMatch[ 1 ] === candidate ) {
                return { direction: 'reverse', conflictName: other };
            }
        }
    }

    return null;
}

function getMetaNameConfig() {
    const fb = ( typeof window !== 'undefined' && window.wppbFb ) || {};
    const cfg = fb.metaNames || {};
    const cf  = fb.conditionalFields || {};
    return {
        blockToFieldType:     cf.blockToFieldType      || {},
        defaultFieldTypes:    cfg.defaultFieldTypes    || [],
        defaultMetaNames:     cfg.defaultMetaNames     || {},
        fixedMetaNameFieldTypes: cfg.fixedMetaNameFieldTypes || [],
        noMetaNameFieldTypes: cfg.noMetaNameFieldTypes || [],
        noOverwriteFieldTypes: cfg.noOverwriteFieldTypes || [],
        reservedNames:        cfg.reservedNames        || [],
        // Empty if bridge missing — warning-only; server re-validates.
        reservedSubstrings:   cfg.reservedSubstrings   || [],
        customFieldPrefix:    cfg.customFieldPrefix    || 'custom_field_',
        maxLength:            cfg.maxLength            || 255,
        uploadFieldType:      cfg.uploadFieldType      || 'Upload',
    };
}

/** Client-side meta-name checks; server still re-validates. */
function validateMetaName( value, fieldType, cfg ) {
    if ( typeof value !== 'string' ) value = '';
    if ( value === '' ) return null;

    if ( /\s/.test( value ) ) {
        return __( 'Meta key cannot contain whitespace.', 'profile-builder' );
    }
    if ( fieldType === cfg.uploadFieldType && ! /^[a-z0-9_\-]+$/.test( value ) ) {
        return __( 'Upload fields require lowercase letters, digits, underscores or hyphens only.', 'profile-builder' );
    }
    if ( value.length > cfg.maxLength ) {
        return sprintf(
            /* translators: %d: maximum number of characters */
            __( 'Meta key is too long (max %d characters).', 'profile-builder' ),
            cfg.maxLength
        );
    }
    if ( cfg.reservedNames.includes( value ) ) {
        return __( 'This meta key is reserved by WordPress and cannot be used.', 'profile-builder' );
    }
    for ( const sub of cfg.reservedSubstrings ) {
        if ( value.toLowerCase().includes( sub ) ) {
            return sprintf(
                /* translators: %s: reserved substring */
                __( '"%s" is reserved and cannot appear in a meta key.', 'profile-builder' ),
                sub
            );
        }
    }
    return null;
}

export default function BaseFieldEdit( { attributes, setAttributes, name, clientId, children, inspectorPanels = null, isSelected = false, hidePreview = false, hideLabel = false, hideDescription = false } ) {
    const cfg = getMetaNameConfig();
    const fieldType = cfg.blockToFieldType[ name ] || '';
    const isDefault       = cfg.defaultFieldTypes.includes( fieldType );
    // Fixed meta keys are shown read-only (classic parity).
    const isFixedMetaName = cfg.fixedMetaNameFieldTypes.includes( fieldType );
    const isNoMetaName    = cfg.noMetaNameFieldTypes.includes( fieldType );
    const showsMetaName   = ! isNoMetaName;
    const metaNameEditable = showsMetaName && ! isDefault && ! isFixedMetaName;
    // Overwrite toggle: storable non-default, minus classic deny list.
    const supportsOverwrite = showsMetaName && ! isDefault && ! cfg.noOverwriteFieldTypes.includes( fieldType );

    // Cross-type exclusive groups (e.g. reCAPTCHA + Turnstile). Selected only.
    const exclusiveConflicts = useSelect( ( select ) => {
        if ( ! isSelected ) return [];
        const editor = select( 'core/block-editor' );
        if ( ! editor ) return [];
        const top = editor.getBlocks();
        const present = collectBlockNames( top, clientId, new Set() );
        return findExclusiveConflicts( name, present );
    }, [ name, clientId, isSelected ] );

    // Only the selected block mounts FieldSettingsFill.
    const isBlockSelected = !! isSelected;

    const { id, 'field-title': title, 'meta-name': metaName, description, required, 'overwrite-existing': overwriteExisting } = attributes;

    const insideRepeater = useSelect( ( select ) => {
        const editor = select( 'core/block-editor' );
        if ( ! editor || ! clientId ) return false;
        const parents = editor.getBlockParents( clientId );
        for ( const parentClientId of parents ) {
            const parentBlock = editor.getBlock( parentClientId );
            if ( parentBlock && parentBlock.name === REPEATER_BLOCK_NAME ) return true;
        }
        return false;
    }, [ clientId ] );

    const runtimeCollision = useSelect( ( select ) => {
        if ( ! isSelected ) return null;
        if ( ! metaNameEditable ) return null;
        const candidate = attributes[ 'meta-name' ];
        if ( ! candidate ) return null;
        const editor = select( 'core/block-editor' );
        if ( ! editor ) return null;
        const { subMetaNames, allMetaNames } = collectMetaNamesForCollision(
            editor.getBlocks(),
            clientId,
            REPEATER_BLOCK_NAME
        );
        return detectRuntimeCollision( candidate, insideRepeater, subMetaNames, allMetaNames );
    }, [ clientId, attributes[ 'meta-name' ], metaNameEditable, insideRepeater, isSelected ] );

    // Last value the user typed (never from write-back) — for duplicate Notice.
    const userTypedMetaRef = useRef( undefined );

    // Duplicate meta-name rewrite: recover the typed value for the Notice.
    const customFieldNameRe = new RegExp( '^' + escapeRegex( cfg.customFieldPrefix ) + '\\d+$' );
    const replacedMetaName = (
        metaNameEditable &&
        overwriteExisting !== 'Yes' &&
        userTypedMetaRef.current &&
        userTypedMetaRef.current !== metaName &&
        customFieldNameRe.test( metaName || '' )
    ) ? userTypedMetaRef.current : null;

    useAllocateFieldId( id, setAttributes );

    // Baseline for mid-session rename Notice.
    const initialMetaNameRef = useRef( metaName );
    useEffect( () => {
        if ( initialMetaNameRef.current === undefined && metaName !== undefined ) {
            initialMetaNameRef.current = metaName;
        }
    }, [ metaName ] );

    const validationError = metaNameEditable ? validateMetaName( metaName, fieldType, cfg ) : null;
    const isRename = metaNameEditable && id > 0 && initialMetaNameRef.current !== undefined && metaName !== initialMetaNameRef.current && initialMetaNameRef.current !== '';

    const placeholder = metaNameEditable
        ? sprintf(
            /* translators: %s: example custom_field_? */
            __( 'auto-generated on save (e.g. %s?)', 'profile-builder' ),
            cfg.customFieldPrefix
        )
        : '';

    return (
        <div { ...useBlockProps( { className: 'wppb-fb-field-block' } ) }>
            { isBlockSelected && (
            <FieldSettingsFill>
                <PanelBody title={ __( 'Field Settings', 'profile-builder' ) }>
                    <TextControl
                        label={ __( 'Field Title', 'profile-builder' ) }
                        value={ title }
                        onChange={ ( val ) => setAttributes( { 'field-title': val } ) }
                    />

                    { showsMetaName && metaNameEditable && (
                        <>
                            <TextControl
                                label={ __( 'Meta Name', 'profile-builder' ) }
                                value={ metaName || '' }
                                onChange={ ( val ) => {
                                    userTypedMetaRef.current = val;
                                    setAttributes( { 'meta-name': val } );
                                } }
                                placeholder={ placeholder }
                                help={ validationError || __( 'The wp_usermeta key used to store this field value. Leave blank to auto-generate.', 'profile-builder' ) }
                                className={ validationError ? 'wppb-fb-meta-name-invalid' : undefined }
                            />
                            { isRename && (
                                <Notice status="warning" isDismissible={ false }>
                                    { __( 'Renaming the meta key on a saved field leaves user data under the old key. Existing entries will not be migrated automatically.', 'profile-builder' ) }
                                </Notice>
                            ) }
                            { runtimeCollision && (
                                <Notice status="warning" isDismissible={ false }>
                                    { runtimeCollision.direction === 'forward'
                                        ? sprintf(
                                            /* translators: 1: typed meta name, 2: conflicting sub-field meta name */
                                            __( '"%1$s" matches the runtime pattern of Repeater sub-field "%2$s" (which writes to keys like %2$s_1, %2$s_2 …). On save the server will store this field as "%1$s_pb" to avoid clobbering that sub-field\'s data.', 'profile-builder' ),
                                            metaName,
                                            runtimeCollision.conflictName
                                        )
                                        : sprintf(
                                            /* translators: 1: typed sub-field meta name, 2: conflicting other meta name */
                                            __( 'Sub-field "%1$s" would write to keys like %1$s_1, %1$s_2 … which conflicts with existing meta key "%2$s". On save the server will store this sub-field as "%1$s_pb" to avoid clobbering "%2$s".', 'profile-builder' ),
                                            metaName,
                                            runtimeCollision.conflictName
                                        )
                                    }
                                </Notice>
                            ) }
                            { replacedMetaName && ! runtimeCollision && (
                                <Notice status="warning" isDismissible={ false }>
                                    { sprintf(
                                        /* translators: 1: the (duplicate) meta key the user entered, 2: the auto-allocated meta key it was replaced with */
                                        __( 'The meta key "%1$s" is already used by another field, so it was replaced with "%2$s" to keep keys unique. Enable "Overwrite existing user meta" below to intentionally share this key.', 'profile-builder' ),
                                        replacedMetaName,
                                        metaName
                                    ) }
                                </Notice>
                            ) }
                        </>
                    ) }

                    { showsMetaName && ! metaNameEditable && (
                        <TextControl
                            label={ __( 'Meta Name', 'profile-builder' ) }
                            value={ metaName || cfg.defaultMetaNames[ fieldType ] || '' }
                            disabled
                            help={ isDefault
                                ? __( 'Default field — meta key is fixed and cannot be changed.', 'profile-builder' )
                                : __( 'This field type uses a fixed meta key that cannot be changed.', 'profile-builder' ) }
                            onChange={ () => {} }
                        />
                    ) }

                    { supportsOverwrite && (
                        <ToggleControl
                            label={ __( 'Overwrite existing user meta', 'profile-builder' ) }
                            checked={ overwriteExisting === 'Yes' }
                            onChange={ ( on ) => setAttributes( { 'overwrite-existing': on ? 'Yes' : 'No' } ) }
                            help={ __( 'Allow saving even if the meta key already exists in wp_usermeta. Use with care — incoming submissions will overwrite stored values.', 'profile-builder' ) }
                        />
                    ) }

                    { description !== undefined && ! hideDescription && (
                    <TextareaControl
                        label={ __( 'Description', 'profile-builder' ) }
                        value={ description }
                        onChange={ ( val ) => setAttributes( { description: val } ) }
                    />
                    ) }
                    { required !== undefined && (
                        <SelectControl
                            label={ __( 'Required', 'profile-builder' ) }
                            value={ required }
                            options={ [
                                { label: __( 'No', 'profile-builder' ), value: 'No' },
                                { label: __( 'Yes', 'profile-builder' ), value: 'Yes' },
                            ] }
                            onChange={ ( val ) => setAttributes( { required: val } ) }
                        />
                    ) }
                </PanelBody>
                { inspectorPanels }
                <CrossCuttingFieldPanels
                    attributes={ attributes }
                    setAttributes={ setAttributes }
                    insideRepeater={ insideRepeater }
                />
            </FieldSettingsFill>
            ) }

            { ! hideLabel && (
                <div className="wppb-fb-field-label">
                    { title }
                    { required === 'Yes' && <span className="wppb-fb-field-required">*</span> }
                </div>
            ) }
            { exclusiveConflicts.length > 0 && (
                <Notice status="warning" isDismissible={ false }>
                    { sprintf(
                        /* translators: %s: conflicting field type name */
                        __( 'This field cannot coexist with %s. The form will only keep one of them on save — remove the other to choose which.', 'profile-builder' ),
                        exclusiveConflicts.join( ', ' )
                    ) }
                </Notice>
            ) }
            { ! hidePreview && (
                <div className="wppb-fb-field-preview">
                    { children || <input type="text" disabled style={ { width: '100%' } } /> }
                </div>
            ) }
            { description && <div className="wppb-fb-field-desc">{ description }</div> }
            <div className="wppb-fb-field-meta">
                { fieldType && <span className="wppb-fb-field-tag">{ fieldType }</span> }
                <span className="wppb-fb-field-num">
                    { id
                        ? sprintf( /* translators: %s: field id */ __( 'Field #%s', 'profile-builder' ), id )
                        : __( 'Field #…', 'profile-builder' ) }
                </span>
            </div>
        </div>
    );
}
