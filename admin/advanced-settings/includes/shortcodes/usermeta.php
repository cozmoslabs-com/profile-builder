<?php
// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) exit;

add_shortcode('user_meta', 'wppb_toolbox_usermeta_handler');
function wppb_toolbox_usermeta_handler( $atts, $content=null){

	$user_id = '';

	if( isset( $atts['user_id'] ) ){

		if( ( !is_multisite() && current_user_can( 'edit_users' ) ) || ( is_multisite() && ( current_user_can( 'remove_users' ) || current_user_can( 'manage_options' ) ) ) )
			$user_id = $atts['user_id'];
		
	}

	if( empty( $user_id ) ){
		$user    = wp_get_current_user();
		$user_id = $user->ID;
	}

	if ( !isset( $atts['size'] ) ){
		$atts['size'] = '50';
	}
	if ( !isset( $atts['pre'] ) ) {
		$atts['pre'] = '';
	}
	if ( !isset( $atts['post'] ) ) {
		$atts['post'] = '';
	}
	if ( !isset( $atts['wpautop'] ) ) {
		$atts['wpautop'] = '';
	}

	if( in_array( $atts['key'], array( 'user_pass', 'user_activation_key' ) ) )
		return;

	$user = new WP_User( $user_id );

	if ( !$user->exists() ) return;

	if ( !array_key_exists( 'key', $atts ) ) return;

	if( $atts['key'] == 'avatar' ){
		return $atts['pre'] . get_avatar( $user->ID, $atts['size']) . $atts['post'] ;
	}

    if( $atts['key'] === 'id' ){
        $atts['key'] = 'ID';
    }

	if ( $user->has_prop( $atts['key'] ) ){

		if ($atts['wpautop'] == 'on'){
			$value = wpautop( $user->get( $atts['key'] ) );
		} else {
			$value = $user->get( $atts['key'] );
		}

	}

	if (!empty( $value )){
		return $atts['pre'] . $value . $atts['post'] ;
	}

	if( $atts['key'] === 'role' ){
		$roles = !empty( $user->roles ) ? $user->roles : array();

		if( !empty( $roles ) ){
			$value_roles = implode( ', ', $roles );
			return  $atts['pre'] . $value_roles . $atts['post'];
		}
	}

	return;
}
