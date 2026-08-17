<?php
/**
 * MailChimp ↔ Form Builder: enable field type + publish cached lists to the editor.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Loaded via wppb_fb_load_addon_integrations(); do not include directly.

wppb_fb_register_subscribe_bridge( array(
    'field_type'   => 'MailChimp Subscribe',
    'bridge_key'   => 'mailchimp',
    'settings_url' => admin_url( 'admin.php?page=profile-builder-mailchimp' ),
    'lists'        => 'wppb_in_mci_fb_get_lists',
) );

/**
 * MailChimp lists for the editor selector.
 *
 * @return array[] `[ { value, label } ]`
 */
function wppb_in_mci_fb_get_lists() {
    $settings = get_option( 'wppb_mci_settings' );
    $valid    = get_option( 'wppb_mailchimp_api_key_validated', false );

    $lists = array();
    if ( $valid && ! empty( $settings['lists'] ) && is_array( $settings['lists'] ) ) {
        foreach ( $settings['lists'] as $list_id => $list ) {
            $lists[] = array(
                'value' => (string) $list_id,
                'label' => isset( $list['name'] ) ? $list['name'] : (string) $list_id,
            );
        }
    }
    return $lists;
}
