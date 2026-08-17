<?php
/**
 * Progress Bar ↔ Form Builder bridge.
 *
 * Virtual REST keys (`wppb_fb_progress_bar_*`) mirror nested
 * `wppb_*_progress_bar_settings`; the canvas block is injected from those settings.
 * Whole bridge is skipped when the add-on is inactive.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Loaded by wppb_fb_load_addon_integrations(); do not include directly.

// Keep the Progress Bar structural block insertable while the add-on is active.
add_filter( 'wppb_fb_enabled_structural_blocks', function ( $blocks ) {
    $blocks[] = 'profile-builder/progress-bar';
    return $blocks;
} );

/**
 * Maps virtual flat REST meta keys to legacy nested progress-bar settings keys.
 */
function wppb_pb_fb_setting_map() {
    return array(
        'wppb_fb_progress_bar_enable'           => 'enable-progress-bar',
        'wppb_fb_progress_bar_calculation_mode' => 'calculation-mode',
        'wppb_fb_progress_bar_display_options'  => 'display-options',
        'wppb_fb_progress_bar_position'         => 'position',
    );
}

/**
 * Legacy progress-bar settings meta key for a post type.
 */
function wppb_pb_fb_meta_key( $post_type ) {
    return $post_type === 'wppb-rf-cpt' ? 'wppb_rf_progress_bar_settings' : 'wppb_epf_progress_bar_settings';
}

/**
 * Allowed values per virtual key, default first. Front end compares literally — unknown values must not land in the row.
 */
function wppb_pb_fb_allowed_setting_values() {
    return array(
        'wppb_fb_progress_bar_enable'           => array( 'No', 'Yes' ),
        'wppb_fb_progress_bar_calculation_mode' => array( 'All Fields', 'Required Fields' ),
        'wppb_fb_progress_bar_display_options'  => array( 'Bar Only', 'Bar and Percentage Label' ),
        'wppb_fb_progress_bar_position'         => array( 'Top of Form', 'Bottom of Form', 'Both' ),
    );
}

/**
 * Fold unknown values down to the key's default (mirror writes unverified into legacy storage).
 */
function wppb_pb_fb_sanitize_setting( $value, $meta_key ) {
    $allowed = wppb_pb_fb_allowed_setting_values();
    if ( ! isset( $allowed[ $meta_key ] ) ) return '';

    return in_array( $value, $allowed[ $meta_key ], true ) ? $value : $allowed[ $meta_key ][0];
}

add_action( 'init', 'wppb_pb_fb_register_virtual_meta' );
function wppb_pb_fb_register_virtual_meta() {
    foreach ( array( 'wppb-rf-cpt', 'wppb-epf-cpt' ) as $post_type ) {
        foreach ( array_keys( wppb_pb_fb_setting_map() ) as $key ) {
            // Enum-sanitized + manage_options write gate (same as wppb_fb_register_virtual_meta).
            register_post_meta( $post_type, $key, array(
                'show_in_rest'      => true,
                'single'            => true,
                'type'              => 'string',
                'sanitize_callback' => 'wppb_pb_fb_sanitize_setting',
                'auth_callback'     => 'wppb_fb_virtual_meta_auth',
            ) );
        }
    }
}

/**
 * Fold flat progress-bar meta into `wppb_*_progress_bar_settings` and delete the flat row.
 */
add_action( 'added_post_meta',   'wppb_pb_fb_mirror_flat_to_nested', 10, 4 );
add_action( 'updated_post_meta', 'wppb_pb_fb_mirror_flat_to_nested', 10, 4 );
function wppb_pb_fb_mirror_flat_to_nested( $meta_id, $post_id, $meta_key, $meta_value ) {
    $post_type = get_post_type( $post_id );
    if ( ! in_array( $post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) return;

    $map = wppb_pb_fb_setting_map();
    if ( ! isset( $map[ $meta_key ] ) ) return;

    $nested_key  = $map[ $meta_key ];
    $storage_key = wppb_pb_fb_meta_key( $post_type );
    $settings    = get_post_meta( $post_id, $storage_key, true );
    if ( ! is_array( $settings ) || empty( $settings[0] ) || ! is_array( $settings[0] ) ) {
        $settings = array( 0 => array() );
    }

    $settings[0][ $nested_key ] = $meta_value;
    update_post_meta( $post_id, $storage_key, $settings );

    delete_post_meta( $post_id, $meta_key );
}

/**
 * Surface nested progress-bar settings as flat virtual meta on REST read (priority 11, after form-builder).
 */
add_filter( 'rest_prepare_wppb-rf-cpt',  'wppb_pb_fb_inject_settings_into_response', 11, 3 );
add_filter( 'rest_prepare_wppb-epf-cpt', 'wppb_pb_fb_inject_settings_into_response', 11, 3 );
function wppb_pb_fb_inject_settings_into_response( $response, $post, $request ) {
    if ( ! $response instanceof WP_REST_Response ) return $response;
    $data = $response->get_data();
    if ( ! isset( $data['meta'] ) || ! is_array( $data['meta'] ) ) {
        $data['meta'] = array();
    }

    $post_id = (int) $post->ID;
    $pb      = get_post_meta( $post_id, wppb_pb_fb_meta_key( $post->post_type ), true );
    $nested  = is_array( $pb ) && isset( $pb[0] ) && is_array( $pb[0] ) ? $pb[0] : array();

    foreach ( wppb_pb_fb_setting_map() as $flat => $nested_key ) {
        if ( isset( $nested[ $nested_key ] ) ) {
            $data['meta'][ $flat ] = $nested[ $nested_key ];
        }
    }

    $response->set_data( $data );
    return $response;
}

/**
 * Inject locked progress-bar preview blocks from settings.
 * Priority 20 — after MSF inserts step breaks so per-step bars can mirror the front end.
 * Skip leading/trailing breaks as boundaries (same as isStepBoundary() in stepBoundaries.js).
 */
add_filter( 'wppb_fb_form_blocks', 'wppb_pb_fb_inject_progress_bar_blocks', 20, 3 );
function wppb_pb_fb_inject_progress_bar_blocks( $blocks, $post_id, $post_type ) {
    if ( ! in_array( $post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) return $blocks;

    $pb_settings = get_post_meta( $post_id, wppb_pb_fb_meta_key( $post_type ), true );
    $row         = is_array( $pb_settings ) && isset( $pb_settings[0] ) ? $pb_settings[0] : array();
    if ( ( $row['enable-progress-bar'] ?? 'No' ) !== 'Yes' ) return $blocks;

    $position    = $row['position'] ?? 'Top of Form';
    $want_top    = in_array( $position, array( 'Top of Form', 'Both' ), true );
    $want_bottom = in_array( $position, array( 'Bottom of Form', 'Both' ), true );

    $make_block = function ( $context ) {
        return array(
            'blockName'    => 'profile-builder/progress-bar',
            'attrs'        => array(
                'position-context' => $context,
                'lock'             => array( 'move' => true, 'remove' => true ),
            ),
            'innerBlocks'  => array(),
            'innerHTML'    => '',
            'innerContent' => array(),
        );
    };

    $is_break = function ( $b ) {
        return is_array( $b ) && ( $b['blockName'] ?? '' ) === 'profile-builder/msf-step-break';
    };

    $out    = array();
    $blocks = array_values( $blocks );
    $last   = count( $blocks ) - 1;

    if ( $want_top ) $out[] = $make_block( 'top' );

    foreach ( $blocks as $i => $block ) {
        $is_boundary = $is_break( $block ) && $i !== 0 && $i !== $last;

        if ( $is_boundary ) {
            if ( $want_bottom ) $out[] = $make_block( 'bottom' );
            $out[] = $block;
            if ( $want_top ) $out[] = $make_block( 'top' );
        } else {
            $out[] = $block;
        }
    }

    if ( $want_bottom ) $out[] = $make_block( 'bottom' );

    return $out;
}

/**
 * Surface an `active` flag so the Progress Bar panel only runs when the add-on is on.
 */
add_action( 'enqueue_block_editor_assets', 'wppb_pb_fb_enqueue_inline_bridge', 11 );
function wppb_pb_fb_enqueue_inline_bridge() {
    $post_type = get_post_type();
    if ( ! in_array( $post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) return;
    if ( ! wp_script_is( 'wppb-form-editor-bundle', 'registered' ) ) return;

    wp_add_inline_script(
        'wppb-form-editor-bundle',
        'window.wppbFb = window.wppbFb || {}; window.wppbFb.progressBar = ' . wp_json_encode( array(
            'active' => true,
        ) ) . ';',
        'before'
    );
}
