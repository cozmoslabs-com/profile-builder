<?php
/**
 * Editor chrome gates for Profile Builder form CPT screens:
 * dequeue third-party editor JS; strip classic meta-boxes (bypassed in classic mode).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Marker body class for editor-chrome CSS. Block `editor_style` loads on every
 * block-editor screen; SCSS scopes under `.wppb-fb-block-editor`. Canvas iframe
 * body gets the same class from EditorBodyClass.js.
 */
add_filter( 'admin_body_class', 'wppb_fb_add_editor_body_class' );
function wppb_fb_add_editor_body_class( $classes ) {
    if ( ! function_exists( 'get_current_screen' ) ) return $classes;
    $screen = get_current_screen();
    if ( ! $screen || ! $screen->is_block_editor() ) return $classes;
    if ( ! in_array( $screen->post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) return $classes;
    if ( ! wppb_fb_is_active_for( $screen->post_type ) ) return $classes;

    // admin_body_class is a space-separated string, not an array.
    return trim( $classes . ' wppb-fb-block-editor' );
}

/**
 * True on a modern-mode PB form CPT block-editor screen.
 *
 * @return bool
 */
function wppb_fb_is_form_block_editor_screen() {
    if ( ! function_exists( 'get_current_screen' ) ) return false;
    $screen = get_current_screen();
    if ( ! $screen || ! in_array( $screen->post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) {
        return false;
    }
    return (bool) $screen->is_block_editor();
}

/**
 * Drop third-party TinyMCE external plugins on PB form CPT screens.
 *
 * `mce_external_plugins` entries are URLs TinyMCE fetches itself, so the script
 * gate below never sees them. The companion handles that carry their localized
 * data are plain script handles, so they *are* dequeued -- the external plugin
 * then initializes against a missing global and TinyMCE throws
 * "Failed to initialize plugin: <name>" (e.g. TablePress' `tablepress_tinymce`,
 * whose `init()` reads the `tablepress_editor_button` const).
 *
 * Nothing is lost: the inserter is locked to PB blocks, so no TinyMCE-authored
 * content exists on these screens.
 */
add_filter( 'mce_external_plugins', 'wppb_fb_gate_mce_external_plugins', 999 );
function wppb_fb_gate_mce_external_plugins( $plugins ) {
    if ( ! wppb_fb_is_form_block_editor_screen() ) return $plugins;

    return apply_filters( 'wppb_fb_allowed_mce_external_plugins', array(), $plugins );
}

/**
 * Dequeue non-allowlisted editor scripts on PB form CPT screens.
 * Head: priority 19 (before print_head_scripts at 20).
 * Footer: priority 9 (before _wp_footer_scripts at 10).
 */
add_action( 'admin_print_scripts',        'wppb_fb_gate_editor_scripts', 19 );
add_action( 'admin_print_footer_scripts', 'wppb_fb_gate_editor_scripts',  9 );
function wppb_fb_gate_editor_scripts() {
    if ( ! wppb_fb_is_form_block_editor_screen() ) {
        return;
    }

    $allowlist = apply_filters( 'wppb_fb_allowed_editor_scripts', array(
        'wppb-form-editor-bundle',
    ) );

    // Core handles suppressed despite the wp- prefix exemption.
    // wp-block-directory: inserter already locked to PB blocks.
    $denylist = apply_filters( 'wppb_fb_denied_editor_scripts', array(
        'wp-block-directory',
    ) );

    $core_prefixes = array(
        'wp-', 'react', 'react-dom', 'lodash', 'jquery', 'underscore',
        'moment', 'regenerator-runtime', 'backbone', 'imagesloaded',
        'masonry', 'media-', 'mce-', 'tinymce-', 'tinymce',
    );

    $core_path_fragments = array( '/wp-includes/', '/wp-admin/' );

    $scripts = wp_scripts();
    foreach ( (array) $scripts->queue as $handle ) {
        if ( in_array( $handle, $denylist, true ) ) {
            wp_dequeue_script( $handle );
            continue;
        }

        if ( in_array( $handle, $allowlist, true ) ) {
            continue;
        }

        $is_core_handle = false;
        foreach ( $core_prefixes as $prefix ) {
            if ( $handle === rtrim( $prefix, '-' ) || strpos( $handle, $prefix ) === 0 ) {
                $is_core_handle = true;
                break;
            }
        }
        if ( $is_core_handle ) continue;

        $registered = isset( $scripts->registered[ $handle ] ) ? $scripts->registered[ $handle ] : null;
        $src        = $registered ? (string) $registered->src : '';

        $is_core_src = false;
        foreach ( $core_path_fragments as $fragment ) {
            if ( $src !== '' && strpos( $src, $fragment ) !== false ) {
                $is_core_src = true;
                break;
            }
        }
        if ( $is_core_src ) continue;

        wp_dequeue_script( $handle );
    }
}

/**
 * Strip classic meta-boxes on modern-mode form CPT screens. Skip classic mode
 * (WCK metaboxes are the UI there). Allowlist via `wppb_fb_allowed_meta_boxes`.
 */
add_action( 'add_meta_boxes', 'wppb_fb_gate_meta_boxes', 999 );
function wppb_fb_gate_meta_boxes() {
    if ( empty( $GLOBALS['wp_meta_boxes'] ) || ! is_array( $GLOBALS['wp_meta_boxes'] ) ) {
        return;
    }

    $allowed = apply_filters( 'wppb_fb_allowed_meta_boxes', array() );

    foreach ( array( 'wppb-rf-cpt', 'wppb-epf-cpt' ) as $post_type ) {
        if ( ! wppb_fb_is_active_for( $post_type ) ) continue;

        if ( empty( $GLOBALS['wp_meta_boxes'][ $post_type ] ) ) continue;

        foreach ( $GLOBALS['wp_meta_boxes'][ $post_type ] as $context => $priorities ) {
            foreach ( $priorities as $priority => $boxes ) {
                foreach ( (array) $boxes as $id => $box ) {
                    if ( in_array( $id, $allowed, true ) ) continue;
                    unset( $GLOBALS['wp_meta_boxes'][ $post_type ][ $context ][ $priority ][ $id ] );
                }
            }
        }
    }
}
