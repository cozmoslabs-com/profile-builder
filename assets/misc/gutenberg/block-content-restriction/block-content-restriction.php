<?php

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

function wppb_render_blocks( $block_content, $block ) {
    $block_attrs = isset( $block['attrs']['wppbContentRestriction'] ) ? $block['attrs']['wppbContentRestriction'] : null;

    // Abort if:
    // the block does not have the content restriction settings attribute or
    // the block is to be displayed to all users or
    // the current block is the Content Restriction Start block
    if ( !isset( $block_attrs ) || $block_attrs['display_to'] === 'all' || $block['blockName'] === 'wppb/content-restriction-start' ) {
        return $block_content;
    }

    // Map the block content restriction settings to the wppb-restrict shortcode parameters
    $atts = array(
            'user_roles'    => is_array( $block_attrs['selected_user_roles'] ) ? $block_attrs['selected_user_roles'] : array(),
            'display_to'    => $block_attrs['display_to'],
            'message'       => $block_attrs['display_to'] === 'not_logged_in'
                ? ( $block_attrs['enable_message_logged_out'] ? $block_attrs['message_logged_out'] : '' )
                : ( $block_attrs['enable_message_logged_in']  ? $block_attrs['message_logged_in']  : '' ),
            'users_id'      => $block_attrs['users_ids'],
        );

    return wppb_content_restriction_shortcode( $atts, $block_content );
}
add_filter( 'render_block', 'wppb_render_blocks', 10, 2 );
