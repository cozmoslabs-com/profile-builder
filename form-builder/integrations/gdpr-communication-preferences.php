<?php
/**
 * GDPR Communication Preferences ↔ Form Builder: declare the addon field type active.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Loaded via wppb_fb_load_addon_integrations(); do not include directly.

add_filter( 'wppb_fb_enabled_addon_field_types', 'wppb_gdprcp_fb_enable_field_type' );
function wppb_gdprcp_fb_enable_field_type( $types ) {
    $types[] = 'GDPR Communication Preferences';
    return $types;
}
