<?php
/**
 * Form Fields in Columns ↔ Form Builder bridge.
 *
 * Harvests ffc-columns InnerBlocks into `wppb_ffc_break_points` on save, wraps
 * ranges on REST read, and mirrors `ffc-enable` via `wppb_fb_ffc_enable`.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Loaded by wppb_fb_load_addon_integrations(); do not include directly.

// Keep the Columns structural block in the inserter while FFC is active.
add_filter( 'wppb_fb_enabled_structural_blocks', function ( $blocks ) {
    $blocks[] = 'profile-builder/ffc-columns';
    return $blocks;
} );

/**
 * Per-save state by post_id: start/end pairs + current open-wrapper field ids.
 */
function &wppb_ffc_fb_state() {
    static $state = array();
    return $state;
}

/** Open a top-level ffc-columns accumulator; nested wrappers are ignored. */
add_action( 'wppb_fb_pb_block_walked', 'wppb_ffc_fb_open_wrapper', 10, 2 );
function wppb_ffc_fb_open_wrapper( $block, $context ) {
    if ( empty( $block['blockName'] ) || $block['blockName'] !== 'profile-builder/ffc-columns' ) return;
    if ( ! empty( $context['is_subfield'] ) ) return;
    if ( empty( $context['post_id'] ) ) return;
    if ( ! empty( $context['parent_block_name'] ) ) return;

    $state   = &wppb_ffc_fb_state();
    $post_id = (int) $context['post_id'];
    if ( ! isset( $state[ $post_id ] ) ) {
        $state[ $post_id ] = array( 'pairs' => array(), 'current' => null );
    }
    $state[ $post_id ]['current'] = array();
}

add_action( 'wppb_fb_field_flattened', 'wppb_ffc_fb_track_inner_field', 10, 4 );
function wppb_ffc_fb_track_inner_field( $field_id, $attrs, $field_type, $context ) {
    if ( ! empty( $context['is_subfield'] ) ) return;
    if ( empty( $context['post_id'] ) ) return;
    if ( ( isset( $context['parent_block_name'] ) ? $context['parent_block_name'] : '' ) !== 'profile-builder/ffc-columns' ) return;

    $state   = &wppb_ffc_fb_state();
    $post_id = (int) $context['post_id'];
    if ( ! isset( $state[ $post_id ] ) || ! is_array( $state[ $post_id ]['current'] ) ) return;
    $state[ $post_id ]['current'][] = (int) $field_id;
}

/** Close wrapper; drop pairs with fewer than 2 children (legacy needs start+end). */
add_action( 'wppb_fb_pb_block_walked_done', 'wppb_ffc_fb_close_wrapper', 10, 2 );
function wppb_ffc_fb_close_wrapper( $block, $context ) {
    if ( empty( $block['blockName'] ) || $block['blockName'] !== 'profile-builder/ffc-columns' ) return;
    if ( ! empty( $context['is_subfield'] ) ) return;
    if ( empty( $context['post_id'] ) ) return;

    $state   = &wppb_ffc_fb_state();
    $post_id = (int) $context['post_id'];
    if ( ! isset( $state[ $post_id ] ) || ! is_array( $state[ $post_id ]['current'] ) ) return;

    $inner_ids = $state[ $post_id ]['current'];
    $state[ $post_id ]['current'] = null;

    if ( count( $inner_ids ) < 2 ) return;

    $state[ $post_id ]['pairs'][] = array(
        'start' => $inner_ids[0],
        'end'   => $inner_ids[ count( $inner_ids ) - 1 ],
    );
}

/**
 * Flush start/end pairs to wppb_ffc_break_points. Insertion order matters for legacy array_keys().
 */
add_action( 'wppb_fb_post_project', 'wppb_ffc_fb_flush_break_points', 10, 3 );
function wppb_ffc_fb_flush_break_points( $post_id, $post, $context ) {
    $state = &wppb_ffc_fb_state();
    $entry = isset( $state[ $post_id ] ) ? $state[ $post_id ] : array( 'pairs' => array() );
    $pairs = $entry['pairs'];

    if ( empty( $pairs ) ) {
        delete_post_meta( $post_id, 'wppb_ffc_break_points' );
    } else {
        $bp = array();
        foreach ( $pairs as $p ) {
            $bp[ $p['start'] ] = 'start';
            $bp[ $p['end'] ]   = 'end';
        }
        update_post_meta( $post_id, 'wppb_ffc_break_points', $bp );
    }

    unset( $state[ $post_id ] );
}

/** Wrap start/end field ranges from wppb_ffc_break_points in ffc-columns blocks. */
add_filter( 'wppb_fb_form_blocks', 'wppb_ffc_fb_inject_wrappers', 10, 3 );
function wppb_ffc_fb_inject_wrappers( $blocks, $post_id, $post_type ) {
    if ( ! in_array( $post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) return $blocks;
    $bp = get_post_meta( $post_id, 'wppb_ffc_break_points', true );
    if ( ! is_array( $bp ) || empty( $bp ) ) return $blocks;

    $out = array();
    $i = 0;
    $n = count( $blocks );

    while ( $i < $n ) {
        $block = $blocks[ $i ];
        $id    = isset( $block['attrs']['id'] ) ? (int) $block['attrs']['id'] : 0;

        if ( $id > 0 && isset( $bp[ $id ] ) && $bp[ $id ] === 'start' ) {
            $wrap = array( $block );
            $j = $i + 1;
            $found_end = false;
            while ( $j < $n ) {
                $b2  = $blocks[ $j ];
                $id2 = isset( $b2['attrs']['id'] ) ? (int) $b2['attrs']['id'] : 0;
                $wrap[] = $b2;
                if ( $id2 > 0 && isset( $bp[ $id2 ] ) && $bp[ $id2 ] === 'end' ) {
                    $found_end = true;
                    $j++;
                    break;
                }
                $j++;
            }

            if ( $found_end ) {
                $out[] = array(
                    'blockName'    => 'profile-builder/ffc-columns',
                    'attrs'        => array(),
                    'innerBlocks'  => $wrap,
                    'innerHTML'    => '',
                    // serialize_blocks needs one null per child or children are dropped.
                    'innerContent' => array_fill( 0, count( $wrap ), null ),
                );
                $i = $j;
            } else {
                foreach ( $wrap as $b ) $out[] = $b;
                $i = $j;
            }
        } else {
            $out[] = $block;
            $i++;
        }
    }

    return $out;
}

add_action( 'init', 'wppb_ffc_fb_register_virtual_meta' );
function wppb_ffc_fb_register_virtual_meta() {
    foreach ( array( 'wppb-rf-cpt', 'wppb-epf-cpt' ) as $post_type ) {
        // manage_options write gate; mirror writes into legacy storage.
        register_post_meta( $post_type, 'wppb_fb_ffc_enable', array(
            'show_in_rest' => true, 'single' => true, 'type' => 'string',
            'sanitize_callback' => 'wppb_ffc_fb_sanitize_enable',
            'auth_callback'     => 'wppb_fb_virtual_meta_auth',
        ) );
    }
}

/** Normalize to 'yes'/'no' — legacy compares against the literal 'yes'. */

function wppb_ffc_fb_sanitize_enable( $value ) {
    return $value === 'yes' ? 'yes' : 'no';
}

add_action( 'added_post_meta',   'wppb_ffc_fb_mirror_settings', 10, 4 );
add_action( 'updated_post_meta', 'wppb_ffc_fb_mirror_settings', 10, 4 );
function wppb_ffc_fb_mirror_settings( $meta_id, $post_id, $meta_key, $meta_value ) {
    if ( $meta_key !== 'wppb_fb_ffc_enable' ) return;
    if ( ! in_array( get_post_type( $post_id ), array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) return;

    wppb_ffc_fb_write_enable( $post_id, is_string( $meta_value ) ? $meta_value : '' );

    delete_post_meta( $post_id, 'wppb_fb_ffc_enable' );
}

/** Write the legacy per-form `ffc-enable` flag. */

function wppb_ffc_fb_write_enable( $post_id, $value ) {
    $existing = get_post_meta( $post_id, 'wppb_ffc_post_options', true );
    if ( ! is_array( $existing ) ) $existing = array();
    $existing['ffc-enable'] = $value;
    update_post_meta( $post_id, 'wppb_ffc_post_options', $existing );
}

/** Project ffc-enable onto REST (priority 12, after form-builder and MSF). */
add_filter( 'rest_prepare_wppb-rf-cpt',  'wppb_ffc_fb_inject_settings_into_response', 12, 3 );
add_filter( 'rest_prepare_wppb-epf-cpt', 'wppb_ffc_fb_inject_settings_into_response', 12, 3 );
function wppb_ffc_fb_inject_settings_into_response( $response, $post, $request ) {
    if ( ! $response instanceof WP_REST_Response ) return $response;
    $data = $response->get_data();
    if ( ! isset( $data['meta'] ) || ! is_array( $data['meta'] ) ) {
        $data['meta'] = array();
    }

    $opts = get_post_meta( (int) $post->ID, 'wppb_ffc_post_options', true );
    $opts = is_array( $opts ) ? $opts : array();
    $data['meta']['wppb_fb_ffc_enable'] = isset( $opts['ffc-enable'] ) ? (string) $opts['ffc-enable'] : '';

    $response->set_data( $data );
    return $response;
}

/** Field types the column wrapper rejects as children. */

function wppb_ffc_fb_disallowed_field_types() {
    return apply_filters( 'wppb_ffc_fb_disallowed_field_types', array(
        'Heading',
        'HTML',
        'Repeater',
        'reCAPTCHA',
        'Turnstile',
        'Honeypot',
        'Language',
        'Default - Name (Heading)',
        'Default - Contact Info (Heading)',
        'Default - About Yourself (Heading)',
        'Default - Blog Details',
    ) );
}

add_action( 'enqueue_block_editor_assets', 'wppb_ffc_fb_enqueue_inline_bridge', 11 );
function wppb_ffc_fb_enqueue_inline_bridge() {
    $post_type = get_post_type();
    if ( ! in_array( $post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) return;
    if ( ! wp_script_is( 'wppb-form-editor-bundle', 'registered' ) ) return;

    $disallowed = wppb_ffc_fb_disallowed_field_types();
    $registry   = WPPB_FB_Field_Registry::all();
    $allowed    = array();
    foreach ( $registry as $field_type => $entry ) {
        if ( in_array( $field_type, $disallowed, true ) ) continue;
        if ( isset( $entry['block'] ) ) $allowed[] = $entry['block'];
    }

    wp_add_inline_script(
        'wppb-form-editor-bundle',
        'window.wppbFb = window.wppbFb || {}; window.wppbFb.ffc = ' . wp_json_encode( array(
            'allowedBlocks'        => array_values( $allowed ),
            'disallowedFieldTypes' => array_values( $disallowed ),
        ) ) . ';',
        'before'
    );
}

/** Mirror classic option-level FFC state into default-form posts when the gate is 'yes'. */
function wppb_ffc_fb_mirror_options_to_default_forms() {
    $defaults = get_option( 'wppb_default_form_ids', array() );
    if ( ! is_array( $defaults ) || empty( $defaults ) ) return;

    $opts = get_option( 'wppb_ffc_options', array() );
    $bp   = get_option( 'wppb_ffc_break_points', array() );

    $opts = is_array( $opts ) ? $opts : array();
    $bp   = is_array( $bp ) ? $bp : array();

    $gate_map = array(
        'register'     => 'pb-ffc-default-register',
        'edit_profile' => 'pb-ffc-default-edit-profile',
    );

    foreach ( $gate_map as $key => $gate ) {
        if ( empty( $defaults[ $key ] ) ) continue;
        if ( empty( $opts ) || ( isset( $opts[ $gate ] ) ? $opts[ $gate ] : 'no' ) !== 'yes' ) continue;

        $post_id = (int) $defaults[ $key ];

        if ( ! empty( $bp ) ) {
            update_post_meta( $post_id, 'wppb_ffc_break_points', $bp );
        } else {
            delete_post_meta( $post_id, 'wppb_ffc_break_points' );
        }

        wppb_ffc_fb_write_enable( $post_id, 'yes' );
    }
}

/**
 * Clear mirrored columns state on observed yes→off gate transition only
 * (do not tear down forms configured purely in the new editor).
 */
function wppb_ffc_fb_mirror_gate_disables( $old_value, $new_value ) {
    $defaults = get_option( 'wppb_default_form_ids', array() );
    if ( ! is_array( $defaults ) || empty( $defaults ) ) return;

    $old = is_array( $old_value ) ? $old_value : array();
    $new = is_array( $new_value ) ? $new_value : array();

    $gate_map = array(
        'register'     => 'pb-ffc-default-register',
        'edit_profile' => 'pb-ffc-default-edit-profile',
    );

    foreach ( $gate_map as $key => $gate ) {
        if ( empty( $defaults[ $key ] ) ) continue;

        $was_on = ( isset( $old[ $gate ] ) ? $old[ $gate ] : 'no' ) === 'yes';
        $now_on = ( isset( $new[ $gate ] ) ? $new[ $gate ] : 'no' ) === 'yes';
        if ( ! $was_on || $now_on ) continue;

        $post_id = (int) $defaults[ $key ];
        delete_post_meta( $post_id, 'wppb_ffc_break_points' );
        wppb_ffc_fb_write_enable( $post_id, 'no' );
    }
}

/**
 * One-time migration after default-form slots exist (`wppb_default_form_ids`, init:25).
 */
add_action( 'init', 'wppb_ffc_fb_migrate_to_post_meta', 25 );
function wppb_ffc_fb_migrate_to_post_meta() {
    if ( get_option( 'wppb_ffc_fb_migrated' ) === '1' ) return;

    $default_ids = get_option( 'wppb_default_form_ids', array() );
    if ( ! is_array( $default_ids ) || empty( $default_ids['register'] ) || empty( $default_ids['edit_profile'] ) ) return;

    wppb_ffc_fb_mirror_options_to_default_forms();
    update_option( 'wppb_ffc_fb_migrated', '1' );
}

add_action( 'updated_option', 'wppb_ffc_fb_option_changed', 10, 3 );
add_action( 'added_option',   'wppb_ffc_fb_option_added',   10, 2 );

function wppb_ffc_fb_option_changed( $option, $old_value, $new_value ) {
    if ( ! in_array( $option, array( 'wppb_ffc_options', 'wppb_ffc_break_points' ), true ) ) return;

    if ( $option === 'wppb_ffc_options' ) {
        wppb_ffc_fb_mirror_gate_disables( $old_value, $new_value );
    }
    wppb_ffc_fb_mirror_options_to_default_forms();
}
function wppb_ffc_fb_option_added( $option, $value ) {
    if ( ! in_array( $option, array( 'wppb_ffc_options', 'wppb_ffc_break_points' ), true ) ) return;
    wppb_ffc_fb_mirror_options_to_default_forms();
}
