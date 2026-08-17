<?php
/**
 * Multi-Step Forms ↔ Form Builder bridge.
 *
 * Harvests step-break blocks into `wppb_msf_break_points` on save, reinjects them
 * on REST read, and mirrors pagination/tabs/tab-titles via virtual `wppb_fb_msf_*` keys.
 * All forms write post meta; option-level data migrates once at the bottom of this file.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Loaded by wppb_fb_load_addon_integrations(); do not include directly.

// Keep the Step Break structural block in the inserter while MSF is active.
add_filter( 'wppb_fb_enabled_structural_blocks', function ( $blocks ) {
    $blocks[] = 'profile-builder/msf-step-break';
    return $blocks;
} );

/**
 * Per-save state by post_id: break-point id set + last flattened top-level field id.
 */
function &wppb_msf_fb_state() {
    static $state = array();
    return $state;
}

add_action( 'wppb_fb_field_flattened', 'wppb_msf_fb_track_last_field', 10, 4 );
function wppb_msf_fb_track_last_field( $field_id, $attrs, $field_type, $context ) {
    if ( ! empty( $context['is_subfield'] ) ) return;
    if ( empty( $context['post_id'] ) ) return;

    $state = &wppb_msf_fb_state();
    $post_id = (int) $context['post_id'];
    if ( ! isset( $state[ $post_id ] ) ) {
        $state[ $post_id ] = array( 'points' => array(), 'last_id' => 0 );
    }
    $state[ $post_id ]['last_id'] = (int) $field_id;
}

/** Mark the preceding top-level field when a step-break is walked. */
add_action( 'wppb_fb_pb_block_walked', 'wppb_msf_fb_detect_step_break', 10, 2 );
function wppb_msf_fb_detect_step_break( $block, $context ) {
    if ( empty( $block['blockName'] ) || $block['blockName'] !== 'profile-builder/msf-step-break' ) return;
    if ( ! empty( $context['is_subfield'] ) ) return;
    if ( empty( $context['post_id'] ) ) return;

    $state = &wppb_msf_fb_state();
    $post_id = (int) $context['post_id'];
    if ( ! isset( $state[ $post_id ] ) ) {
        $state[ $post_id ] = array( 'points' => array(), 'last_id' => 0 );
    }

    // Leading step-break with no preceding field — no-op.
    if ( $state[ $post_id ]['last_id'] > 0 ) {
        $id = $state[ $post_id ]['last_id'];
        $state[ $post_id ]['points'][ $id ] = $id;
    }
}

/**
 * Flush break-points to post meta. Strip the last field id — legacy forbids a break on the final field.
 */
add_action( 'wppb_fb_post_project', 'wppb_msf_fb_flush_break_points', 10, 3 );
function wppb_msf_fb_flush_break_points( $post_id, $post, $context ) {
    $state = &wppb_msf_fb_state();
    $entry = isset( $state[ $post_id ] ) ? $state[ $post_id ] : array( 'points' => array(), 'last_id' => 0 );
    $points = $entry['points'];

    if ( ! empty( $points ) ) {
        $meta_key = $post->post_type === 'wppb-rf-cpt' ? 'wppb_rf_fields' : 'wppb_epf_fields';
        $ordered  = get_post_meta( $post_id, $meta_key, true );
        if ( is_array( $ordered ) && ! empty( $ordered ) ) {
            $last = end( $ordered );
            if ( is_array( $last ) && isset( $last['id'] ) ) {
                unset( $points[ (int) $last['id'] ] );
            }
        }
    }

    if ( empty( $points ) ) {
        delete_post_meta( $post_id, 'wppb_msf_break_points' );
    } else {
        update_post_meta( $post_id, 'wppb_msf_break_points', $points );
    }

    unset( $state[ $post_id ] );
}

/** Inject msf-step-break blocks after fields listed in wppb_msf_break_points. */
add_filter( 'wppb_fb_form_blocks', 'wppb_msf_fb_inject_step_break_blocks', 10, 3 );
function wppb_msf_fb_inject_step_break_blocks( $blocks, $post_id, $post_type ) {
    if ( ! in_array( $post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) return $blocks;
    $bp = get_post_meta( $post_id, 'wppb_msf_break_points', true );
    if ( ! is_array( $bp ) || empty( $bp ) ) return $blocks;

    $separator = array(
        'blockName'    => 'profile-builder/msf-step-break',
        'attrs'        => array(),
        'innerBlocks'  => array(),
        'innerHTML'    => '',
        'innerContent' => array(),
    );

    $out = array();
    $last_index = count( $blocks ) - 1;
    foreach ( $blocks as $i => $block ) {
        $out[] = $block;
        if ( $i === $last_index ) continue;
        $id = isset( $block['attrs']['id'] ) ? (int) $block['attrs']['id'] : 0;
        if ( $id > 0 && isset( $bp[ $id ] ) ) {
            $out[] = $separator;
        }
    }
    return $out;
}

/**
 * Virtual REST keys → legacy storage. nested_key null means write the value to storage directly.
 */
function wppb_msf_fb_virtual_keys() {
    return array(
        'wppb_fb_msf_pagination' => array( 'storage' => 'wppb_msf_post_options', 'nested_key' => 'msf-pagination' ),
        'wppb_fb_msf_tabs'       => array( 'storage' => 'wppb_msf_post_options', 'nested_key' => 'msf-tabs' ),
        'wppb_fb_msf_tab_titles' => array( 'storage' => 'wppb_msf_tab_titles',   'nested_key' => null ),
    );
}

/** Normalize to 'yes'/'no' — legacy renderer compares against the literal 'yes'. */

function wppb_msf_fb_sanitize_yes_no( $value ) {
    return $value === 'yes' ? 'yes' : 'no';
}

/** Sanitize tab-titles array (dense indices). */

function wppb_msf_fb_sanitize_tab_titles( $value ) {
    if ( is_string( $value ) ) {
        $decoded = json_decode( $value, true );
        $value   = is_array( $decoded ) ? $decoded : array();
    }
    if ( ! is_array( $value ) ) return array();

    $out = array();
    foreach ( $value as $i => $title ) {
        $out[ (int) $i ] = is_string( $title ) ? sanitize_text_field( $title ) : '';
    }
    return $out;
}

add_action( 'init', 'wppb_msf_fb_register_virtual_meta' );
function wppb_msf_fb_register_virtual_meta() {
    foreach ( array( 'wppb-rf-cpt', 'wppb-epf-cpt' ) as $post_type ) {
        // manage_options write gate — mirror folds into unvalidated legacy storage.
        register_post_meta( $post_type, 'wppb_fb_msf_pagination', array(
            'show_in_rest' => true, 'single' => true, 'type' => 'string',
            'sanitize_callback' => 'wppb_msf_fb_sanitize_yes_no',
            'auth_callback'     => 'wppb_fb_virtual_meta_auth',
        ) );
        register_post_meta( $post_type, 'wppb_fb_msf_tabs', array(
            'show_in_rest' => true, 'single' => true, 'type' => 'string',
            'sanitize_callback' => 'wppb_msf_fb_sanitize_yes_no',
            'auth_callback'     => 'wppb_fb_virtual_meta_auth',
        ) );
        register_post_meta( $post_type, 'wppb_fb_msf_tab_titles', array(
            'show_in_rest' => array(
                'schema' => array(
                    'type'  => 'array',
                    'items' => array( 'type' => 'string' ),
                ),
            ),
            'single' => true,
            'type'   => 'array',
            'sanitize_callback' => 'wppb_msf_fb_sanitize_tab_titles',
            'auth_callback'     => 'wppb_fb_virtual_meta_auth',
        ) );
    }
}

/** Fold flat wppb_fb_msf_* writes into legacy post meta and delete the flat row. */
add_action( 'added_post_meta',   'wppb_msf_fb_mirror_settings', 10, 4 );
add_action( 'updated_post_meta', 'wppb_msf_fb_mirror_settings', 10, 4 );
function wppb_msf_fb_mirror_settings( $meta_id, $post_id, $meta_key, $meta_value ) {
    $map = wppb_msf_fb_virtual_keys();
    if ( ! isset( $map[ $meta_key ] ) ) return;
    if ( ! in_array( get_post_type( $post_id ), array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) return;

    $route = $map[ $meta_key ];

    if ( $route['nested_key'] === null ) {
        // Dense panel array → sparse legacy storage (blank steps must be absent for isset()-based defaults).
        $value = is_string( $meta_value ) ? json_decode( $meta_value, true ) : $meta_value;
        $value = is_array( $value ) ? $value : array();

        $titles = array();
        foreach ( $value as $i => $title ) {
            if ( is_string( $title ) && $title !== '' ) {
                $titles[ (int) $i ] = sanitize_text_field( $title );
            }
        }

        if ( empty( $titles ) ) {
            delete_post_meta( $post_id, $route['storage'] );
        } else {
            update_post_meta( $post_id, $route['storage'], $titles );
        }

        if ( function_exists( 'wppb_icl_register_string' ) ) {
            $form_type = get_post_type( $post_id ) === 'wppb-rf-cpt' ? 'register' : 'edit_profile';
            foreach ( $titles as $i => $title ) {
                wppb_icl_register_string( 'plugin profile-builder-pro', 'msf_' . $form_type . '_step_' . $i . '_tab_title_translation', $title );
            }
        }
    } else {
        $existing = get_post_meta( $post_id, $route['storage'], true );
        if ( ! is_array( $existing ) ) $existing = array();
        $existing[ $route['nested_key'] ] = is_string( $meta_value ) ? $meta_value : '';
        update_post_meta( $post_id, $route['storage'], $existing );
    }

    delete_post_meta( $post_id, $meta_key );
}

/** Project legacy MSF post meta onto flat wppb_fb_msf_* REST keys. */
add_filter( 'rest_prepare_wppb-rf-cpt',  'wppb_msf_fb_inject_settings_into_response', 11, 3 );
add_filter( 'rest_prepare_wppb-epf-cpt', 'wppb_msf_fb_inject_settings_into_response', 11, 3 );
function wppb_msf_fb_inject_settings_into_response( $response, $post, $request ) {
    if ( ! $response instanceof WP_REST_Response ) return $response;
    $data = $response->get_data();
    if ( ! isset( $data['meta'] ) || ! is_array( $data['meta'] ) ) {
        $data['meta'] = array();
    }

    $post_id     = (int) $post->ID;
    $opts        = get_post_meta( $post_id, 'wppb_msf_post_options', true );
    $tab_titles  = get_post_meta( $post_id, 'wppb_msf_tab_titles', true );

    $opts       = is_array( $opts ) ? $opts : array();
    $tab_titles = is_array( $tab_titles ) ? $tab_titles : array();

    // Sparse → dense (gaps → ''); do not array_values() — that would shift titles.
    $dense = array();
    if ( ! empty( $tab_titles ) ) {
        $max = max( array_map( 'intval', array_keys( $tab_titles ) ) );
        for ( $i = 0; $i <= $max; $i++ ) {
            $dense[ $i ] = isset( $tab_titles[ $i ] ) ? (string) $tab_titles[ $i ] : '';
        }
    }

    $data['meta']['wppb_fb_msf_pagination'] = isset( $opts['msf-pagination'] ) ? (string) $opts['msf-pagination'] : '';
    $data['meta']['wppb_fb_msf_tabs']       = isset( $opts['msf-tabs'] )       ? (string) $opts['msf-tabs']       : '';
    $data['meta']['wppb_fb_msf_tab_titles'] = $dense;

    $response->set_data( $data );
    return $response;
}

/** GET /wppb/v1/msf-state — post-save MSF state for editor reconcile. */
add_action( 'rest_api_init', 'wppb_msf_fb_register_rest_routes' );
function wppb_msf_fb_register_rest_routes() {
    register_rest_route( 'wppb/v1', '/msf-state', array(
        'methods'             => 'GET',
        'callback'            => 'wppb_msf_fb_rest_state',
        'permission_callback' => function () { return current_user_can( 'manage_options' ); },
        'args'                => array(
            'post_id' => array( 'type' => 'integer', 'required' => true ),
        ),
    ) );
}

function wppb_msf_fb_rest_state( $request ) {
    $post_id = (int) $request->get_param( 'post_id' );
    if ( $post_id <= 0 ) return new WP_Error( 'invalid_post_id', 'Missing post_id', array( 'status' => 400 ) );
    if ( ! in_array( get_post_type( $post_id ), array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) {
        return new WP_Error( 'invalid_post_type', 'Not a Profile Builder form', array( 'status' => 400 ) );
    }

    $bp     = get_post_meta( $post_id, 'wppb_msf_break_points', true );
    $opts   = get_post_meta( $post_id, 'wppb_msf_post_options', true );
    $titles = get_post_meta( $post_id, 'wppb_msf_tab_titles', true );

    $bp     = is_array( $bp ) ? array_values( array_map( 'intval', $bp ) ) : array();
    $opts   = is_array( $opts ) ? $opts : array();
    $titles = is_array( $titles ) ? array_values( $titles ) : array();

    return rest_ensure_response( array(
        'breakPoints' => $bp,
        'pagination'  => isset( $opts['msf-pagination'] ) ? (string) $opts['msf-pagination'] : '',
        'tabs'        => isset( $opts['msf-tabs'] )       ? (string) $opts['msf-tabs']       : '',
        'tabTitles'   => $titles,
    ) );
}

/** Publish MSF REST root + nonce to the editor (priority 11, after the form-builder bundle). */
add_action( 'enqueue_block_editor_assets', 'wppb_msf_fb_enqueue_inline_bridge', 11 );
function wppb_msf_fb_enqueue_inline_bridge() {
    $post_type = get_post_type();
    if ( ! in_array( $post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) return;
    if ( ! wp_script_is( 'wppb-form-editor-bundle', 'registered' ) ) return;

    wp_add_inline_script(
        'wppb-form-editor-bundle',
        'window.wppbFb = window.wppbFb || {}; window.wppbFb.msf = ' . wp_json_encode( array(
            'attributeName' => 'wppb-msf-break',
            'restRoot'      => esc_url_raw( rest_url( 'wppb/v1/msf-state' ) ),
            'restNonce'     => wp_create_nonce( 'wp_rest' ),
        ) ) . ';',
        'before'
    );
}

/**
 * Mirror option-level MSF state into default-form posts when the classic enable gate is 'yes'.
 * Option → post meta only; options stay the classic-admin source of truth.
 */
function wppb_msf_fb_mirror_options_to_default_forms() {
    $defaults = get_option( 'wppb_default_form_ids', array() );
    if ( ! is_array( $defaults ) || empty( $defaults ) ) return;

    $opts   = get_option( 'wppb_msf_options', array() );
    $bp     = get_option( 'wppb_msf_break_points', array() );
    $titles = get_option( 'wppb_msf_tab_titles', array() );

    $opts   = is_array( $opts ) ? $opts : array();
    $bp     = is_array( $bp ) ? $bp : array();
    $titles = is_array( $titles ) ? $titles : array();

    $gate_map = array(
        'register'     => 'pb-default-register',
        'edit_profile' => 'pb-default-edit-profile',
    );

    foreach ( $gate_map as $key => $gate ) {
        if ( empty( $defaults[ $key ] ) ) continue;
        if ( empty( $opts ) || ( isset( $opts[ $gate ] ) ? $opts[ $gate ] : 'no' ) !== 'yes' ) continue;

        $post_id = (int) $defaults[ $key ];

        if ( ! empty( $bp ) ) {
            update_post_meta( $post_id, 'wppb_msf_break_points', $bp );
        } else {
            delete_post_meta( $post_id, 'wppb_msf_break_points' );
        }

        if ( ! empty( $titles ) ) {
            update_post_meta( $post_id, 'wppb_msf_tab_titles', $titles );
        } else {
            delete_post_meta( $post_id, 'wppb_msf_tab_titles' );
        }

        update_post_meta( $post_id, 'wppb_msf_post_options', array(
            'msf-pagination' => isset( $opts['msf-pagination'] ) ? $opts['msf-pagination'] : 'no',
            'msf-tabs'       => isset( $opts['msf-tabs'] )       ? $opts['msf-tabs']       : 'no',
        ) );
    }
}

/**
 * One-time migration after default-form slots exist (`wppb_default_form_ids`, init:25).
 */
add_action( 'init', 'wppb_msf_fb_migrate_to_post_meta', 25 );
function wppb_msf_fb_migrate_to_post_meta() {
    if ( get_option( 'wppb_msf_fb_migrated' ) === '1' ) return;

    $default_ids = get_option( 'wppb_default_form_ids', array() );
    if ( ! is_array( $default_ids ) || empty( $default_ids['register'] ) || empty( $default_ids['edit_profile'] ) ) return;

    wppb_msf_fb_mirror_options_to_default_forms();
    update_option( 'wppb_msf_fb_migrated', '1' );
}

add_action( 'updated_option', 'wppb_msf_fb_option_changed', 10, 3 );
add_action( 'added_option',   'wppb_msf_fb_option_added',   10, 2 );

function wppb_msf_fb_option_changed( $option, $old_value, $new_value ) {
    if ( ! in_array( $option, array( 'wppb_msf_options', 'wppb_msf_break_points', 'wppb_msf_tab_titles' ), true ) ) return;

    // Tear down only on observed yes→off gate transition (not "gate isn't yes").
    if ( $option === 'wppb_msf_options' ) {
        wppb_msf_fb_mirror_gate_disables( $old_value, $new_value );
    }

    wppb_msf_fb_mirror_options_to_default_forms();
}

/** Clear mirrored MSF post meta when a classic enable gate goes from 'yes' to off. */

function wppb_msf_fb_mirror_gate_disables( $old_value, $new_value ) {
    $defaults = get_option( 'wppb_default_form_ids', array() );
    if ( ! is_array( $defaults ) || empty( $defaults ) ) return;

    $old = is_array( $old_value ) ? $old_value : array();
    $new = is_array( $new_value ) ? $new_value : array();

    $gate_map = array(
        'register'     => 'pb-default-register',
        'edit_profile' => 'pb-default-edit-profile',
    );

    foreach ( $gate_map as $key => $gate ) {
        if ( empty( $defaults[ $key ] ) ) continue;

        $was_on = ( isset( $old[ $gate ] ) ? $old[ $gate ] : 'no' ) === 'yes';
        $now_on = ( isset( $new[ $gate ] ) ? $new[ $gate ] : 'no' ) === 'yes';
        if ( ! $was_on || $now_on ) continue;

        $post_id = (int) $defaults[ $key ];
        delete_post_meta( $post_id, 'wppb_msf_break_points' );
        delete_post_meta( $post_id, 'wppb_msf_tab_titles' );
        update_post_meta( $post_id, 'wppb_msf_post_options', array(
            'msf-pagination' => 'no',
            'msf-tabs'       => 'no',
        ) );
    }
}
function wppb_msf_fb_option_added( $option, $value ) {
    if ( ! in_array( $option, array( 'wppb_msf_options', 'wppb_msf_break_points', 'wppb_msf_tab_titles' ), true ) ) return;
    wppb_msf_fb_mirror_options_to_default_forms();
}

