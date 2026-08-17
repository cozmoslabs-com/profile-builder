<?php
/**
 * Virtual REST flat keys ↔ legacy nested settings. Flat rows deleted after mirror.
 * Also injects generated block markup into content.raw on REST GET.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// 1. Meta mirroring (flat -> nested)

/** Maps virtual flat REST meta keys to legacy nested settings keys. */
function wppb_fb_virtual_setting_map( $post_type ) {
    $base = array(
        'wppb_fb_redirect'         => 'redirect',
        'wppb_fb_display_messages' => 'display-messages',
        'wppb_fb_url'              => 'url',
        'wppb_fb_ajax'             => 'ajax',
    );
    if ( $post_type === 'wppb-rf-cpt' ) {
        $base['wppb_fb_set_role'] = 'set-role';
        $base['wppb_fb_automatically_log_in'] = 'automatically-log-in';
    }
    return $base;
}

/** The legacy settings meta key for a given post type. */
function wppb_fb_settings_meta_key( $post_type ) {
    return $post_type === 'wppb-rf-cpt' ? 'wppb_rf_page_settings' : 'wppb_epf_page_settings';
}

/** Folds a flat meta write into the legacy nested array, then deletes the flat row. */
add_action( 'added_post_meta',   'wppb_fb_mirror_flat_to_nested', 10, 4 );
add_action( 'updated_post_meta', 'wppb_fb_mirror_flat_to_nested', 10, 4 );
function wppb_fb_mirror_flat_to_nested( $meta_id, $post_id, $meta_key, $meta_value ) {
    $post_type = get_post_type( $post_id );
    if ( ! in_array( $post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) return;

    $map = wppb_fb_virtual_setting_map( $post_type );
    if ( ! isset( $map[ $meta_key ] ) ) return;

    $nested_key  = $map[ $meta_key ];
    $storage_key = wppb_fb_settings_meta_key( $post_type );
    $settings    = get_post_meta( $post_id, $storage_key, true );
    if ( ! is_array( $settings ) || empty( $settings[0] ) || ! is_array( $settings[0] ) ) {
        $settings = array( 0 => array() );
    }

    $settings[0][ $nested_key ] = $meta_value;
    update_post_meta( $post_id, $storage_key, $settings );

    // Delete the flat row so wp_postmeta stays clean.
    delete_post_meta( $post_id, $meta_key );
}

// 2. REST injections. Two filters, so an add-on bridge projecting its own
//    virtual meta has a published seam: block markup at priority 10, virtual
//    settings at 11, add-ons at 11+ (where the canonical content is in place).

add_filter( 'rest_prepare_wppb-rf-cpt',  'wppb_fb_inject_generated_content_block_markup',      10, 3 );
add_filter( 'rest_prepare_wppb-epf-cpt', 'wppb_fb_inject_generated_content_block_markup',      10, 3 );
add_filter( 'rest_prepare_wppb-rf-cpt',  'wppb_fb_inject_generated_content_virtual_settings',  11, 3 );
add_filter( 'rest_prepare_wppb-epf-cpt', 'wppb_fb_inject_generated_content_virtual_settings',  11, 3 );

/**
 * Injects the generated block markup into `content.raw` on REST GET (see the file
 * header — post_content itself is never persisted).
 */
function wppb_fb_inject_generated_content_block_markup( $response, $post, $request ) {
    if ( ! $response instanceof WP_REST_Response ) return $response;
    $data = $response->get_data();
    if ( ! isset( $data['id'] ) ) return $response;

    $post_id   = (int) $data['id'];
    $post_type = $post->post_type;

    $generated = wppb_fb_build_block_markup_for_form( $post_id, $post_type );
    if ( isset( $data['content'] ) && is_array( $data['content'] ) ) {
        $data['content']['raw'] = $generated;
    }

    $response->set_data( $data );
    return $response;
}

/**
 * Project legacy nested settings onto virtual flat REST meta keys so the
 * Document sidebar's `useEntityProp` sees current values.
 */
function wppb_fb_inject_generated_content_virtual_settings( $response, $post, $request ) {
    if ( ! $response instanceof WP_REST_Response ) return $response;
    $data = $response->get_data();
    if ( ! isset( $data['id'] ) ) return $response;

    $post_id   = (int) $data['id'];
    $post_type = $post->post_type;

    $settings = get_post_meta( $post_id, wppb_fb_settings_meta_key( $post_type ), true );
    $nested   = is_array( $settings ) && isset( $settings[0] ) ? $settings[0] : array();
    foreach ( wppb_fb_virtual_setting_map( $post_type ) as $flat => $nested_key ) {
        if ( isset( $nested[ $nested_key ] ) ) {
            $data['meta'][ $flat ] = $nested[ $nested_key ];
        }
    }

    // Derived, never stored: no setting-map entry, so the write mirror can't
    // round-trip it back into storage.  See wppb_fb_build_form_shortcode().
    $data['meta']['wppb_fb_form_shortcode'] = wppb_fb_build_form_shortcode( $post );

    $response->set_data( $data );
    return $response;
}

/**
 * True when this form is the configured default (by `wppb_default_form_ids`, not the flag).
 *
 * @param int|WP_Post $post
 * @return bool
 */
function wppb_fb_is_default_form( $post ) {
    $post = get_post( $post );
    if ( ! $post instanceof WP_Post ) {
        return false;
    }
    $defaults = get_option( 'wppb_default_form_ids', array() );
    $type     = ( $post->post_type === 'wppb-epf-cpt' ) ? 'edit_profile' : 'register';
    return ! empty( $defaults[ $type ] ) && (int) $defaults[ $type ] === (int) $post->ID;
}

/**
 * Embed shortcode for a form (classic metabox). '' until published; defaults omit form_name.
 */
function wppb_fb_build_form_shortcode( $post ) {
    if ( ! $post instanceof WP_Post || ! class_exists( 'Wordpress_Creation_Kit_PB' ) ) {
        return '';
    }
    if ( $post->post_status !== 'publish' ) {
        return '';
    }
    $tag = ( $post->post_type === 'wppb-epf-cpt' ) ? 'wppb-edit-profile' : 'wppb-register';
    if ( wppb_fb_is_default_form( $post ) ) {
        return '[' . $tag . ']';
    }
    $slug = trim( Wordpress_Creation_Kit_PB::wck_generate_slug( $post->post_title ) );
    if ( $slug === '' ) {
        return '';
    }
    return '[' . $tag . ' form_name="' . $slug . '"]';
}

// 3. Virtual meta registration (REST visibility for the editor)

/** Registers the virtual meta keys so `useEntityProp` can read and write them. */
add_action( 'init', 'wppb_fb_register_virtual_meta' );
function wppb_fb_register_virtual_meta() {
    // These are admin-only form settings, so the write boundary is raised to
    // `manage_options` (the gate the wppb/v1 routes use) rather than the default
    // `edit_post` meta cap an Editor holds on these CPTs — otherwise an Editor
    // could REST-write `wppb_fb_set_role=administrator` and escalate every new
    // registrant to admin.
    $meta_keys = array(
        'wppb_fb_redirect'             => 'sanitize_text_field',
        'wppb_fb_display_messages'     => 'wppb_fb_sanitize_meta_digits',
        'wppb_fb_url'                  => 'esc_url_raw',
        'wppb_fb_ajax'                 => 'sanitize_text_field',
        'wppb_fb_set_role'             => 'wppb_fb_sanitize_meta_role',
        'wppb_fb_automatically_log_in' => 'sanitize_text_field',
    );

    foreach ( array( 'wppb-rf-cpt', 'wppb-epf-cpt' ) as $post_type ) {
        foreach ( $meta_keys as $key => $sanitize_cb ) {
            register_post_meta( $post_type, $key, array(
                'show_in_rest'      => true,
                'single'            => true,
                'type'              => 'string',
                'sanitize_callback' => $sanitize_cb,
                'auth_callback'     => 'wppb_fb_virtual_meta_auth',
            ) );
        }
    }
}

/**
 * Write gate for the virtual settings meta: only administrators may set them.
 */
function wppb_fb_virtual_meta_auth() {
    return current_user_can( 'manage_options' );
}

/**
 * Sanitizer for `wppb_fb_set_role`: only allow a role slug the current user can
 * actually assign. Anything unknown collapses to '' so a rejected value can
 * never escalate a new registrant's role.
 */
function wppb_fb_sanitize_meta_role( $value ) {
    $value = sanitize_text_field( (string) $value );
    if ( $value === '' ) {
        return '';
    }
    if ( ! function_exists( 'get_editable_roles' ) ) {
        require_once ABSPATH . 'wp-admin/includes/user.php';
    }
    $editable = get_editable_roles();
    return array_key_exists( $value, $editable ) ? $value : '';
}

/** Sanitizer for numeric string meta (e.g. `wppb_fb_display_messages` seconds). */
function wppb_fb_sanitize_meta_digits( $value ) {
    return (string) absint( $value );
}
