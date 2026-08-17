<?php
/**
 * Field Visibility ↔ Form Builder bridge.
 *
 * Injects visibility / user-role / location attributes into field blocks and
 * publishes editor UI data. Keys already round-trip via optional_addon_properties.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Loaded by wppb_fb_load_addon_integrations(); do not include directly.

/**
 * Field types that get visibility attributes (labels from the legacy allowlist).
 * Repeater is excluded — see wppb_fv_fb_unsupported_field_types().
 *
 * @return string[]
 */
function wppb_fv_fb_supported_field_types() {
    if ( ! function_exists( 'wppb_in_field_visibility_get_extra_fields' ) ) return array();

    return array_values( array_diff(
        array_values( wppb_in_field_visibility_get_extra_fields() ),
        wppb_fv_fb_unsupported_field_types()
    ) );
}

/**
 * Match classic: no visibility UI on Repeater (legacy script overwrite of fields['Repeater']).
 *
 * @return string[]
 */
function wppb_fv_fb_unsupported_field_types() {
    return apply_filters( 'wppb_fv_fb_unsupported_field_types', array( 'Repeater' ) );
}

/**
 * Strip visibility keys from Repeater sub-fields (classic unsupported; panel hidden via insideRepeater).
 */
add_filter( 'wppb_fb_repeater_subfield_stripped_attrs', 'wppb_fv_fb_strip_subfield_attrs' );
function wppb_fv_fb_strip_subfield_attrs( $stripped ) {
    $stripped[] = 'visibility';
    $stripped[] = 'user-role-visibility';
    $stripped[] = 'location-visibility';
    return $stripped;
}

/**
 * Inject the three visibility attributes. Defaults match legacy WCK ("all").
 */
add_filter( 'wppb_fb_block_attributes', 'wppb_fv_fb_inject_block_attributes', 10, 3 );
function wppb_fv_fb_inject_block_attributes( $attributes, $field_type, $context ) {
    if ( ! in_array( $field_type, wppb_fv_fb_supported_field_types(), true ) ) {
        return $attributes;
    }
    if ( ! isset( $attributes['visibility'] ) ) {
        $attributes['visibility'] = array( 'type' => 'string', 'default' => 'all' );
    }
    if ( ! isset( $attributes['user-role-visibility'] ) ) {
        $attributes['user-role-visibility'] = array( 'type' => 'string', 'default' => 'all' );
    }
    if ( ! isset( $attributes['location-visibility'] ) ) {
        $attributes['location-visibility'] = array( 'type' => 'string', 'default' => 'all' );
    }
    return $attributes;
}

/**
 * Publish editor payloads for extraAttributes + FieldVisibilityPanel.
 */
add_action( 'wppb_fb_enqueue_editor_assets_late', 'wppb_fv_fb_enqueue_editor_payload' );
function wppb_fv_fb_enqueue_editor_payload() {
    $supported_types = wppb_fv_fb_supported_field_types();
    if ( empty( $supported_types ) ) return;

    $extra_attrs = array();
    $attr_schema = array(
        'visibility'           => array( 'type' => 'string', 'default' => 'all' ),
        'user-role-visibility' => array( 'type' => 'string', 'default' => 'all' ),
        'location-visibility'  => array( 'type' => 'string', 'default' => 'all' ),
    );
    foreach ( $supported_types as $field_type ) {
        $extra_attrs[ $field_type ] = $attr_schema;
    }

    wppb_fb_extra_attributes_inline_script( $extra_attrs );

    // Roles must come from the server — the editor has no other live source.
    global $wp_roles;
    $user_roles = array();
    if ( isset( $wp_roles ) && ! empty( $wp_roles->roles ) ) {
        foreach ( $wp_roles->roles as $slug => $role ) {
            $user_roles[ $slug ] = stripslashes( $role['name'] );
        }
    }

    $payload = array(
        'userRoles' => $user_roles,
        'locations' => array(
            'back_end'     => __( 'WordPress Edit Profile Form (back-end)', 'profile-builder' ),
            'register'     => __( 'Register Forms Front-End', 'profile-builder' ),
            'edit_profile' => __( 'Edit Profile Forms Front-End', 'profile-builder' ),
        ),
        'visibilityOptions' => array(
            'all'         => __( 'All', 'profile-builder' ),
            'admin_only'  => __( 'Admin Only', 'profile-builder' ),
            'user_locked' => __( 'User Locked', 'profile-builder' ),
        ),
    );

    wp_add_inline_script(
        'wppb-form-editor-bundle',
        'window.wppbFb = window.wppbFb || {}; window.wppbFb.fieldVisibility = ' . wp_json_encode( $payload ) . ';',
        'before'
    );
}
