<?php
/**
 * Per-CPT editor mode: modern (Gutenberg form-builder) or classic (WCK).
 * Stored in `wppb_forms_editor_mode`; missing keys default to 'modern'.
 * Read at `init` priority < 9 so CPT registration stays stable for the request.
 * Toggle lives in Advanced Settings → Forms under the shared toolbox option group.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * @param string $post_type One of wppb-rf-cpt, wppb-epf-cpt.
 * @return string 'modern' | 'classic'
 */
function wppb_fb_forms_editor_mode( $post_type ) {
    $modes = get_option( 'wppb_forms_editor_mode', array() );
    if ( isset( $modes[ $post_type ] ) && $modes[ $post_type ] === 'classic' ) {
        return 'classic';
    }
    return 'modern';
}

/**
 * @param string $post_type One of wppb-rf-cpt, wppb-epf-cpt.
 * @return bool
 */
function wppb_fb_is_active_for( $post_type ) {
    return wppb_fb_forms_editor_mode( $post_type ) === 'modern';
}

add_filter( 'use_block_editor_for_post', 'wppb_fb_use_block_editor_for_post', 10, 2 );

/**
 * Force classic editor when mode is classic (covers third-party CPT overrides).
 *
 * @param bool    $use  Whether the post can be edited in the block editor.
 * @param WP_Post $post The post being checked.
 * @return bool
 */
function wppb_fb_use_block_editor_for_post( $use, $post ) {
    if ( ! $post instanceof WP_Post ) return $use;
    if ( ! in_array( $post->post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) return $use;
    return wppb_fb_is_active_for( $post->post_type ) ? $use : false;
}

/**
 * Register under `wppb_toolbox_forms_settings` so one Save Changes persists both.
 */
add_action( 'admin_init', 'wppb_fb_register_editor_mode_setting' );
function wppb_fb_register_editor_mode_setting() {
    register_setting(
        'wppb_toolbox_forms_settings',
        'wppb_forms_editor_mode',
        array(
            'type'              => 'array',
            'sanitize_callback' => 'wppb_fb_sanitize_editor_mode',
            'default'           => array(),
        )
    );
}

/**
 * Only known CPT keys and modern|classic values; missing keys default to modern.
 *
 * @param mixed $input Raw submitted value (expected: array<string, string>).
 * @return array<string, string>
 */
function wppb_fb_sanitize_editor_mode( $input ) {
    $allowed = array( 'modern', 'classic' );
    $out     = array();
    foreach ( array( 'wppb-rf-cpt', 'wppb-epf-cpt' ) as $post_type ) {
        $submitted = ( is_array( $input ) && isset( $input[ $post_type ] ) )
            ? sanitize_key( $input[ $post_type ] )
            : 'modern';
        $out[ $post_type ] = in_array( $submitted, $allowed, true ) ? $submitted : 'modern';
    }
    return $out;
}

/*
 * No write-back to wppb_module_settings: the read filter already forces both
 * gates to 'show'. Writing that filtered value would permanently rewrite a site
 * option the user never set.
 */
