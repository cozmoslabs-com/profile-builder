<?php
/**
 * Per-CPT editor mode: modern (Gutenberg form-builder) or classic (WCK).
 * Stored in `wppb_forms_editor_mode`; missing keys default to 'modern'.
 * Read at `init` priority < 9 so CPT registration stays stable for the request.
 * Toggle lives in Advanced Settings → Forms under the shared toolbox option group.
 *
 * STORED vs EFFECTIVE mode: `wppb_fb_stored_forms_editor_mode()` is the user's
 * saved preference; `wppb_fb_forms_editor_mode()` is what the request actually
 * runs on.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * The user's saved preference, ignoring any runtime override.
 *
 * Read this only for the settings UI (and the sanitizer's round-trip). Every
 * behavioral gate must go through wppb_fb_forms_editor_mode() /
 * wppb_fb_is_active_for() so it sees the effective mode.
 *
 * @param string $post_type One of wppb-rf-cpt, wppb-epf-cpt.
 * @return string 'modern' | 'classic'
 */
function wppb_fb_stored_forms_editor_mode( $post_type ) {
    $modes = get_option( 'wppb_forms_editor_mode', array() );
    if ( isset( $modes[ $post_type ] ) && $modes[ $post_type ] === 'classic' ) {
        return 'classic';
    }
    return 'modern';
}

/**
 * The mode this request runs on: the stored preference, unless the Classic
 * Editor plugin forces the classic fallback.
 *
 * @param string $post_type One of wppb-rf-cpt, wppb-epf-cpt.
 * @return string 'modern' | 'classic'
 */
function wppb_fb_forms_editor_mode( $post_type ) {
    if ( wppb_fb_classic_editor_plugin_forces_classic() ) {
        return 'classic';
    }
    return wppb_fb_stored_forms_editor_mode( $post_type );
}

/**
 * Is the WordPress.org Classic Editor plugin loaded?
 *
 * @return bool
 */
function wppb_fb_classic_editor_plugin_active() {
    return (bool) apply_filters( 'wppb_fb_classic_editor_plugin_active', class_exists( 'Classic_Editor', false ) );
}

/**
 * Resolve the Classic Editor plugin's effective settings.
 *
 * @return array{editor:string,allow-users:bool}|null Null when the plugin is absent.
 */
function wppb_fb_classic_editor_plugin_settings() {
    if ( ! wppb_fb_classic_editor_plugin_active() ) {
        return null;
    }

    $override = apply_filters( 'classic_editor_plugin_settings', false );
    if ( is_array( $override ) ) {
        return array(
            'editor'      => ( isset( $override['editor'] ) && $override['editor'] === 'block' ) ? 'block' : 'classic',
            'allow-users' => ! empty( $override['allow-users'] ),
        );
    }

    if ( is_multisite() ) {
        $defaults = apply_filters(
            'classic_editor_network_default_settings',
            array(
                'editor'      => get_network_option( null, 'classic-editor-replace' ) === 'block' ? 'block' : 'classic',
                'allow-users' => false,
            )
        );

        if ( get_network_option( null, 'classic-editor-allow-sites' ) !== 'allow' ) {
            return array(
                'editor'      => ( isset( $defaults['editor'] ) && $defaults['editor'] === 'block' ) ? 'block' : 'classic',
                'allow-users' => ! empty( $defaults['allow-users'] ),
            );
        }

        $editor_option      = get_option( 'classic-editor-replace' );
        $allow_users_option = get_option( 'classic-editor-allow-users' );
        if ( $editor_option ) {
            $defaults['editor'] = $editor_option;
        }
        if ( $allow_users_option ) {
            $defaults['allow-users'] = ( $allow_users_option === 'allow' );
        }

        return array(
            'editor'      => ( isset( $defaults['editor'] ) && $defaults['editor'] === 'block' ) ? 'block' : 'classic',
            'allow-users' => ! empty( $defaults['allow-users'] ),
        );
    }

    $option = get_option( 'classic-editor-replace' );

    return array(
        // empty( $option ) || 'classic' || legacy 'replace' => classic.
        'editor'      => ( $option === 'block' || $option === 'no-replace' ) ? 'block' : 'classic',
        'allow-users' => ( get_option( 'classic-editor-allow-users' ) === 'allow' ),
    );
}

/**
 * Should the modern form editor fall back to the Classic Form Design because of
 * the Classic Editor plugin?
 *
 * @return bool
 */
function wppb_fb_classic_editor_plugin_forces_classic() {
    $settings = wppb_fb_classic_editor_plugin_settings();
    $forced   = ( null !== $settings ) && ( $settings['editor'] !== 'block' || $settings['allow-users'] );

    return (bool) apply_filters( 'wppb_fb_force_classic_for_classic_editor_plugin', $forced, $settings );
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
 * This writes the STORED preference, never the effective mode -- a Classic
 * Editor-forced fallback must not be persisted here, or deactivating that plugin
 * would leave the user stuck in classic. Because a missing key defaults to
 * 'modern', the settings view emits a hidden field per CPT carrying the stored
 * value so a disabled radio can't silently wipe an explicit Classic preference.
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
