<?php
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly


/**
 * Scripts for PB Forms inside an Elementor Popup
 *
 */
function wppb_elementor_popup_scripts() {
    if ( defined( 'WPPB_PAID_PLUGIN_URL' ) ) {
        wp_register_script('wppb_elementor_popup_script', WPPB_PAID_PLUGIN_URL . 'features/elementor-pro/assets/js/elementor-popup.js', array('jquery'), PROFILE_BUILDER_VERSION, true);
        wp_enqueue_script('wppb_elementor_popup_script');
        wp_print_scripts('wppb_elementor_popup_script');
    }
}
add_action( 'wp_footer', 'wppb_elementor_popup_scripts', 9999 );