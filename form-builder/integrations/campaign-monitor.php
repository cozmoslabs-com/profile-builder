<?php
/**
 * Campaign Monitor ↔ Form Builder: enable field type + publish cached lists.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Loaded via wppb_fb_load_addon_integrations(); do not include directly.

wppb_fb_register_subscribe_bridge( array(
    'field_type'   => 'Campaign Monitor Subscribe',
    'bridge_key'   => 'campaignMonitor',
    'settings_url' => admin_url( 'admin.php?page=profile-builder-campaign-monitor' ),
    'lists'        => 'wppb_in_cmi_fb_get_lists',
) );

/**
 * Campaign Monitor lists for the editor selector.
 *
 * @return array[] `[ { value, label } ]`
 */
function wppb_in_cmi_fb_get_lists() {
    $settings = get_option( 'wppb_cmi_settings' );
    $valid    = get_option( 'wppb_cmi_api_key_validated', false );

    $lists = array();
    if ( $valid && ! empty( $settings['client']['lists'] ) && is_array( $settings['client']['lists'] ) ) {
        foreach ( $settings['client']['lists'] as $list_id => $list ) {
            $lists[] = array(
                'value' => (string) $list_id,
                'label' => isset( $list['name'] ) ? $list['name'] : (string) $list_id,
            );
        }
    }
    return $lists;
}
