<?php
// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) exit;

function wppb_toolbox_flush_rewrite_rules() {
    $base = wppb_toolbox_get_settings( 'userlisting', 'modify-permalinks-single' );

    if ( $base == false ) return;

	$rules           = get_option( 'rewrite_rules' );
    $frontpage_id    = get_option( 'page_on_front' );
    $lang_pattern    = function_exists( 'wppb_userlisting_get_language_pattern' ) ? wppb_userlisting_get_language_pattern() : '';

    $needs_flush = (
        !isset($rules['(.+?)/'.$base.'/([^/]+)']) ||
        !isset($rules['(.?.+?)/' . wppb_get_users_pagination_slug() . '/?([0-9]{1,})/?$'] ) ||
        ( !empty( $frontpage_id ) && !isset( $rules[wppb_get_users_pagination_slug() . '/?([0-9]{1,})/?$'] ) )
    );

    if ( ! $needs_flush && $lang_pattern !== '' && ! isset( $rules[ $lang_pattern . '/(.+?)/' . $base . '/([^/]+)' ] ) ) {
        $needs_flush = true;
    }

    if ( $needs_flush ) {
        global $wp_rewrite;
		$wp_rewrite->flush_rules();
	}
}
add_action( 'wp_loaded', 'wppb_toolbox_flush_rewrite_rules' );

function wppb_toolbox_insert_userlisting_rule( $rules ) {
    $base = wppb_toolbox_get_settings( 'userlisting', 'modify-permalinks-single' );

    if ( $base == false ) return $rules;

    $wppb_addonOptions = get_option('wppb_module_settings');

    if( $wppb_addonOptions['wppb_userListing'] == 'show' ) {
        $new_rules    = array();
        $frontpage_id = get_option('page_on_front');
        $lang_pattern = function_exists( 'wppb_userlisting_get_language_pattern' ) ? wppb_userlisting_get_language_pattern() : '';

        // Polylang compatibility: capture the language slug separately so the pagename only
        // contains the actual page slug.
        if ( $lang_pattern !== '' ) {
            $new_rules[ $lang_pattern . '/(.+?)/' . $base . '/([^/]+)' ] = 'index.php?lang=$matches[1]&pagename=$matches[2]&username=$matches[3]';

            if ( !empty($frontpage_id) ) {
                $new_rules[ $lang_pattern . '/' . wppb_get_users_pagination_slug() . '/?([0-9]{1,})/?$' ] = 'index.php?lang=$matches[1]&page_id=' . $frontpage_id . '&wppb_page=$matches[2]';
            }

            $new_rules[ $lang_pattern . '/(.?.+?)/' . wppb_get_users_pagination_slug() . '/?([0-9]{1,})/?$' ] = 'index.php?lang=$matches[1]&pagename=$matches[2]&wppb_page=$matches[3]';
        }

        //user rule
        $new_rules['(.+?)/'. $base .'/([^/]+)'] = 'index.php?pagename=$matches[1]&username=$matches[2]';

        //users-page rule
        if (!empty($frontpage_id)) {
            $new_rules[wppb_get_users_pagination_slug() . '/?([0-9]{1,})/?$'] = 'index.php?&page_id=' . $frontpage_id . '&wppb_page=$matches[1]';
        }

        $new_rules['(.?.+?)/' . wppb_get_users_pagination_slug() . '/?([0-9]{1,})/?$'] = 'index.php?pagename=$matches[1]&wppb_page=$matches[2]';

        $rules = $new_rules + $rules;
    }

    return $rules;

}
add_filter( 'rewrite_rules_array', 'wppb_toolbox_insert_userlisting_rule' );

add_action('init', 'wppb_toolbox_remove_ul_rewrite_rules');
function wppb_toolbox_remove_ul_rewrite_rules() {
    remove_action( 'wp_loaded', 'wppb_flush_rewrite_rules' );
    remove_filter( 'rewrite_rules_array', 'wppb_insert_userlisting_rule' );
}

add_filter( 'wppb_userlisting_more_info_link_structure2', 'wppb_toolbox_modify_more_info_link', 20, 3 );
add_filter( 'wppb_userlisting_more_info_link_structure3', 'wppb_toolbox_modify_more_info_link', 20, 3 );
function wppb_toolbox_modify_more_info_link( $final_url, $url, $user_info ) {
    $base = wppb_toolbox_get_settings( 'userlisting', 'modify-permalinks-single' );

    if ( $base == false ) return $final_url;

    if ( apply_filters( 'wppb_userlisting_get_user_by_id', true ) )
        $new_url = trailingslashit( $url ) . $base . '/' . $user_info->ID;
    else
        $new_url = trailingslashit( $url ) . $base . '/' . $user_info;

    return $new_url;
}
