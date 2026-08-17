<?php
/**
 * MailPoet ↔ Form Builder: enable field type + publish local lists.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Loaded via wppb_fb_load_addon_integrations(); do not include directly.

wppb_fb_register_subscribe_bridge( array(
    'field_type'   => 'MailPoet Subscribe',
    'bridge_key'   => 'mailpoet',
    'settings_url' => '',
    'lists'        => 'wppb_in_mpi_fb_get_lists',
) );

/**
 * MailPoet lists for the editor selector.
 *
 * @return array[] `[ { value, label } ]`
 */
function wppb_in_mpi_fb_get_lists() {
    $lists = array();
    if ( function_exists( 'wppb_in_mpi_get_lists' ) ) {
        $raw = wppb_in_mpi_get_lists();
        if ( is_array( $raw ) ) {
            foreach ( $raw as $list ) {
                if ( ! is_array( $list ) ) continue;
                $id = isset( $list['id'] ) ? $list['id'] : ( isset( $list['list_id'] ) ? $list['list_id'] : '' );
                if ( $id === '' ) continue;
                $lists[] = array(
                    'value' => (string) $id,
                    'label' => isset( $list['name'] ) ? $list['name'] : (string) $id,
                );
            }
        }
    }
    return $lists;
}
