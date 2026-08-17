import { __, sprintf } from '@wordpress/i18n';
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';
import {
    PanelBody,
    TextControl,
    TextareaControl,
    CheckboxControl,
    BaseControl,
} from '@wordpress/components';
import { useMemo } from '@wordpress/element';
import { useAllocateFieldId } from '../../components/useAllocateFieldId';
import { FieldSettingsFill } from '../../components/FieldSettingsSlotFill';
import CrossCuttingFieldPanels from '../../components/CrossCuttingFieldPanels';
import AddFieldButton from '../../components/AddFieldButton';

const LIMIT_MESSAGE_DEFAULT = 'The maximum number of fields has been reached.';

/**
 * Decode the legacy rpf-role-limit JSON shape:
 *   {"rules":[{"role":"subscriber","value":"5"}, …]}
 *
 * Returns a flat { role => stringValue } map for editor UI consumption.
 * Tolerant of missing / malformed input — returns an empty object.
 */
function decodeRoleLimitRules( raw ) {
    if ( ! raw ) return {};
    try {
        const parsed = JSON.parse( raw );
        if ( ! parsed || ! Array.isArray( parsed.rules ) ) return {};
        return parsed.rules.reduce( ( acc, rule ) => {
            if ( rule && typeof rule.role === 'string' ) {
                acc[ rule.role ] = String( rule.value ?? '' );
            }
            return acc;
        }, {} );
    } catch ( _ ) {
        return {};
    }
}

/**
 * Re-encode a { role => stringValue } map into the legacy JSON shape.
 * Returns an empty string when no rules survive — matches the legacy
 * "no rules set" sentinel that the front-end short-circuits on.
 */
function encodeRoleLimitRules( ruleMap ) {
    const rules = Object.entries( ruleMap )
        .filter( ( [ , value ] ) => value !== '' && value !== undefined )
        .map( ( [ role, value ] ) => ( { role, value: String( value ) } ) );
    return rules.length ? JSON.stringify( { rules } ) : '';
}

export default function Edit( { attributes, setAttributes, clientId, isSelected = false } ) {
    const {
        id,
        'field-title': title,
        description,
        required,
        'rpf-enable-limit': enableLimit,
        'rpf-limit': limit,
        'rpf-limit-reached-message': limitReachedMessage,
        'rpf-role-limit': roleLimitJson,
    } = attributes;

    // Same selection gate as BaseFieldEdit — only the selected block's Fill
    // populates the Field Settings PluginSidebar slot. Gutenberg passes
    // isSelected for real blocks; VirtualFieldEdit (Existing Fields panel)
    // passes it explicitly for not-in-form previews.
    const isBlockSelected = !! isSelected;

    // Allowed sub-field blocks come from the server bridge — registry minus
    // wppb_rpf_manage_fields_get_excluded_fields(). Fallback to a single safe
    // type if the bridge isn't loaded (e.g. add-on disabled mid-session).
    const repeaterBridge = ( window.wppbFb && window.wppbFb.repeater ) || {};
    const ALLOWED_BLOCKS = ( Array.isArray( repeaterBridge.allowedBlocks ) && repeaterBridge.allowedBlocks.length )
        ? repeaterBridge.allowedBlocks
        : [ 'profile-builder/field-input' ];
    const limitEnabled = enableLimit === 'yes';

    // ID handshake — see BaseFieldEdit for rationale.
    useAllocateFieldId( id, setAttributes );

    // Role list from the form-builder bridge (window.wppbFb.formSettings.roles).
    // Strip the "Default Role" sentinel — it's a registration-form Set-Role
    // option, not a real role, and per-role limits don't apply to it.
    const allRoles = useMemo( () => {
        const bridge = ( window.wppbFb && window.wppbFb.formSettings && window.wppbFb.formSettings.roles ) || [];
        return bridge.filter( ( opt ) => opt.value !== 'default role' );
    }, [] );

    const roleLimitMap = useMemo( () => decodeRoleLimitRules( roleLimitJson ), [ roleLimitJson ] );

    const setRoleLimit = ( roleSlug, value ) => {
        const next = { ...roleLimitMap, [ roleSlug ]: value };
        setAttributes( { 'rpf-role-limit': encodeRoleLimitRules( next ) } );
    };

    return (
        <div { ...useBlockProps( { className: 'wppb-fb-field-block wppb-fb-repeater-block' } ) }>
            { isBlockSelected && (
            <FieldSettingsFill>
                <PanelBody title={ __( 'Repeater Settings', 'profile-builder' ) }>
                    <TextControl
                        label={ __( 'Field Title', 'profile-builder' ) }
                        value={ title }
                        onChange={ ( val ) => setAttributes( { 'field-title': val } ) }
                    />
                    { /* No `rpf-button` control by design.
                         The classic `.row-rpf-button` row is not a stored label —
                         it's a WCK custom type that renders an "Edit field group"
                         button opening the sub-field iframe
                         (add-ons/repeater-field/admin/repeater-manage-fields.php:280-285),
                         and nothing on the front end ever reads the key. The
                         InnerBlocks canvas below plus "Add sub-field" IS that
                         affordance here, so the attribute was dropped from
                         block.json rather than given a control that would store a
                         value no renderer consumes. */ }
                </PanelBody>

                <PanelBody title={ __( 'Limit', 'profile-builder' ) } initialOpen={ false }>
                    <CheckboxControl
                        label={ __( 'Enable limit', 'profile-builder' ) }
                        checked={ limitEnabled }
                        onChange={ ( checked ) => setAttributes( { 'rpf-enable-limit': checked ? 'yes' : '' } ) }
                        help={ __( 'Enable a limit on how many repeater groups users can add on the front-end.', 'profile-builder' ) }
                    />
                    { limitEnabled && (
                        <>
                            <TextControl
                                label={ __( 'General Limit', 'profile-builder' ) }
                                type="number"
                                min={ 0 }
                                step={ 1 }
                                value={ limit ?? '0' }
                                onChange={ ( val ) => setAttributes( { 'rpf-limit': val } ) }
                                help={ __( 'Default limit for this repeater group. Leave 0 for unlimited.', 'profile-builder' ) }
                            />
                            <TextareaControl
                                label={ __( 'Limit Reached Message', 'profile-builder' ) }
                                value={ limitReachedMessage }
                                placeholder={ __( LIMIT_MESSAGE_DEFAULT, 'profile-builder' ) }
                                onChange={ ( val ) => setAttributes( { 'rpf-limit-reached-message': val } ) }
                                help={ __( 'Popup message shown when the limit is reached.', 'profile-builder' ) }
                            />
                            <BaseControl
                                label={ __( 'Limit per Role', 'profile-builder' ) }
                                help={ __( 'Override the general limit for specific roles. Leave 0 for unlimited.', 'profile-builder' ) }
                            >
                                { allRoles.length === 0 && (
                                    <em>{ __( 'No roles available.', 'profile-builder' ) }</em>
                                ) }
                                { allRoles.map( ( role ) => (
                                    <TextControl
                                        key={ role.value }
                                        label={ role.label }
                                        type="number"
                                        min={ 0 }
                                        step={ 1 }
                                        value={ roleLimitMap[ role.value ] ?? '' }
                                        onChange={ ( val ) => setRoleLimit( role.value, val ) }
                                    />
                                ) ) }
                            </BaseControl>
                        </>
                    ) }
                </PanelBody>

                { /* Conditional Logic / Field Visibility / admin-approval /
                     add-on properties. This block hosts its own Fill instead of
                     routing through BaseFieldEdit (it needs bespoke container
                     markup for the InnerBlocks), which used to mean the
                     cross-cutting panels were unreachable on a Repeater even
                     though the attributes were injected and mirrored for it
                     server-side. A top-level Repeater is
                     never nested (the parent's allowedBlocks forbid it), so
                     insideRepeater is constant false. */ }
                <CrossCuttingFieldPanels
                    attributes={ attributes }
                    setAttributes={ setAttributes }
                    insideRepeater={ false }
                />
            </FieldSettingsFill>
            ) }

            <div className="wppb-fb-repeater-block__head">
                <span className="wppb-fb-repeater-block__icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
                        <rect x="3" y="14" width="18" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                </span>
                <span className="wppb-fb-repeater-block__title">
                    { title || __( 'Repeater', 'profile-builder' ) }
                    { required === 'Yes' && <span className="wppb-fb-field-required">*</span> }
                </span>
                <span className="wppb-fb-repeater-block__meta">
                    <span className="wppb-fb-field-tag">{ __( 'Repeater', 'profile-builder' ) }</span>
                    <span className="wppb-fb-field-num">
                        { id
                            ? sprintf( /* translators: %s: field id */ __( 'Field #%s', 'profile-builder' ), id )
                            : __( 'Field #…', 'profile-builder' ) }
                    </span>
                </span>
            </div>

            { description && <div className="wppb-fb-repeater-block__desc">{ description }</div> }

            <div className="wppb-fb-repeater-block__hint">
                { __( 'Sub-fields are scoped to this Repeater — add new fields using the inserter inside this box. They can\'t be dragged in or out.', 'profile-builder' ) }
            </div>

            <div className="wppb-fb-repeater-block__body">
                <InnerBlocks
                    allowedBlocks={ ALLOWED_BLOCKS }
                    template={ [ [ 'profile-builder/field-input' ] ] }
                    renderAppender={ () => null }
                />
                { /* Same mini inserter as everywhere else. Its "Existing Fields"
                     tab is hidden automatically because the destination is inside
                     a Repeater — sub-fields live in the per-Repeater option, not
                     wppb_manage_fields, so an existing top-level field can't be
                     reused as one. See lib/miniInserterTarget.js. */ }
                <AddFieldButton rootClientId={ clientId } label={ __( 'Add sub-field', 'profile-builder' ) } />
            </div>
        </div>
    );
}
