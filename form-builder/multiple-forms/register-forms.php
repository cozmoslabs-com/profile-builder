<?php
// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Function that creates the "Registration Forms" post type
 *
 * @since v.2.0
 *
 * @return void
 */
function wppb_create_registration_forms_cpt(){
    $labels = array(
        'name' 					=> __( 'Registration Form', 'profile-builder'),
        'singular_name' 		=> __( 'Registration Form', 'profile-builder'),
        'add_new' 				=> __( 'Add New', 'profile-builder' ),
        'add_new_item' 			=> __( 'Add new Registration Form', 'profile-builder' ),
        'edit_item' 			=> __( 'Edit the Registration Forms', 'profile-builder' ) ,
        'new_item' 				=> __( 'New Registration Form', 'profile-builder' ),
        'all_items' 			=> __( 'Registration Forms', 'profile-builder' ),
        'view_item' 			=> __( 'View the Registration Form', 'profile-builder' ),
        'search_items' 			=> __( 'Search the Registration Forms', 'profile-builder' ),
        'not_found' 			=> __( 'No Registration Form found', 'profile-builder' ),
        'not_found_in_trash' 	=> __( 'No Registration Forms found in trash', 'profile-builder' ),
        'parent_item_colon' 	=> '',
        'menu_name' 			=> __( 'Registration Forms', 'profile-builder' )
    );

    $args = array(
        'labels' 				=> $labels,
        'public' 				=> false,
        'publicly_queryable' 	=> false,
        'show_ui' 				=> true,
        'query_var'          	=> true,
        'show_in_menu' 			=> 'profile-builder',
        'has_archive' 			=> false,
        'hierarchical' 			=> false,
        'capability_type' 		=> 'post',
        'supports' 				=> array( 'title' )
    );

    /* Free installs get the default forms only -- see form-builder-licensing.php.
       Same override the modern registration applies, so the gate holds in classic
       editor mode too. */
    $wppb_fb_cap_overrides = function_exists( 'wppb_fb_form_cpt_capability_overrides' ) ? wppb_fb_form_cpt_capability_overrides() : array();
    if ( ! empty( $wppb_fb_cap_overrides ) )
        $args['capabilities'] = $wppb_fb_cap_overrides;

	/* hide from admin bar for non administrators */
	if( !current_user_can( 'manage_options' ) )
		$args['show_in_admin_bar'] = false;

    $wppb_addonOptions = get_option('wppb_module_settings');
    if( !empty( $wppb_addonOptions['wppb_multipleRegistrationForms'] ) && $wppb_addonOptions['wppb_multipleRegistrationForms'] == 'show' )
        register_post_type( 'wppb-rf-cpt', $args );
}
add_action( 'init', 'wppb_create_registration_forms_cpt', 9);

/* Register Form change classes based on Redirect field start */
add_filter( 'wck_add_form_class_wppb_rf_page_settings', 'wppb_register_add_form_change_class_based_on_redirect_field', 10, 3 );
function wppb_register_add_form_change_class_based_on_redirect_field($wck_update_container_css_class, $meta, $results ) {
    if( !empty( $results ) ){
        $redirect = Wordpress_Creation_Kit_PB::wck_generate_slug( $results[0]["redirect"] );
        return "update_container_$meta update_container_$redirect redirect_$redirect";
    }
}
/* Register Form change classes based on Redirect field end */

/**
 * Remove view/trash row actions for Register Forms.
 *
 * @param array $actions
 * @return array
 */
function wppb_remove_rf_view_link( $actions ){
	global $post;

	if ( $post->post_type == 'wppb-rf-cpt' ){
		unset( $actions['view'] );

		if ( wppb_get_post_number ( $post->post_type, 'singular_action' ) )
			unset( $actions['trash'] );
	}

	return $actions;
}
add_filter( 'post_row_actions', 'wppb_remove_rf_view_link', 10, 1 );


/**
 * Remove view/trash bulk actions for Register Forms.
 *
 * @param array $actions
 * @return array
 */
function wppb_remove_trash_bulk_option_rf( $actions ){
	global $post;
	if( !empty( $post ) ){
        if ( $post->post_type == 'wppb-rf-cpt' ){
            unset( $actions['view'] );

            if ( wppb_get_post_number ( $post->post_type, 'bulk_action' ) )
                unset( $actions['trash'] );
        }
    }

	return $actions;
}
add_filter( 'bulk_actions-edit-wppb-rf-cpt', 'wppb_remove_trash_bulk_option_rf' );


/** Hide publishing UI chrome on Register Form edit screens. */
function wppb_hide_rf_publishing_actions(){
	global $post;

	if ( $post->post_type == 'wppb-rf-cpt' ){
		echo '<style type="text/css">#misc-publishing-actions, #minor-publishing-actions{display:none;}</style>';

		$rf = get_posts( array( 'posts_per_page' => -1, 'post_status' => apply_filters ( 'wppb_check_singular_rf_form_publishing_options', array( 'publish' ) ) , 'post_type' => 'wppb-rf-cpt' ) );
		if ( count( $rf ) == 1 )
			echo '<style type="text/css">#major-publishing-actions #delete-action{display:none;}</style>';
	}
}
add_action('admin_head-post.php', 'wppb_hide_rf_publishing_actions');
add_action('admin_head-post-new.php', 'wppb_hide_rf_publishing_actions');


/**
 * Add Shortcode column to Register Forms list.
 *
 * @param array $columns
 * @return array
 */
function wppb_add_extra_column_for_rf( $columns ){
	$columns['rf-shortcode'] = __( 'Shortcode', 'profile-builder' );

	return $columns;
}
add_filter( 'manage_wppb-rf-cpt_posts_columns', 'wppb_add_extra_column_for_rf' );


/**
 * Render Shortcode column content for Register Forms.
 *
 * @param string  $column_name
 * @param integer $post_id
 */
function wppb_rf_custom_column_content( $column_name, $post_id ){
	if( $column_name == 'rf-shortcode' ){
		$post = get_post( $post_id );

		if( empty( $post->post_title ) )
			$post->post_title = __( '(no title)', 'profile-builder' );

		// Default forms embed via a bare [wppb-register]; custom forms
		// keep their title-derived form_name. wppb_fb_build_form_shortcode()
		// owns that distinction.
		$shortcode = function_exists( 'wppb_fb_build_form_shortcode' )
			? wppb_fb_build_form_shortcode( $post )
			: '[wppb-register form_name="' . Wordpress_Creation_Kit_PB::wck_generate_slug( $post->post_title ) . '"]';

		// An unpublished form has no working shortcode (the front-end resolver is
		// publish-only), so offer a hint instead of an empty copy field.
		if ( $shortcode === '' ) {
			echo '<span class="wppb-shortcode-unavailable">&mdash; ' . esc_html__( 'available after publishing', 'profile-builder' ) . '</span>';
			return;
		}

        echo "<input readonly spellcheck='false' type='text' title='Click to copy' class='wppb-shortcode_copy wppb-shortcode input' value='" . esc_attr( $shortcode ) . "' />";
		echo "<span style='display: none; margin-left: 10px' class='wppb-copy-message'>Shortcode copied</span>";
	}
}
add_action("manage_wppb-rf-cpt_posts_custom_column",  "wppb_rf_custom_column_content", 10, 2);

/**
 * Add side metaboxes
 *
 * @since v.2.0
 *
 * @return void
 */
function wppb_rf_content(){
	global $post;

    $shortcode  = function_exists( 'wppb_fb_build_form_shortcode' )
        ? wppb_fb_build_form_shortcode( $post )
        : '[wppb-register form_name="' . trim( Wordpress_Creation_Kit_PB::wck_generate_slug( $post->post_title ) ) . '"]';
    $is_default = function_exists( 'wppb_fb_is_default_form' ) && wppb_fb_is_default_form( $post );

    if ( $shortcode === '' ) {
        echo '<p class="cozmoslabs-description"><span style="color: #e76054;">NOTE: </span>' . esc_html__( 'The shortcode will be available after you publish this form.', 'profile-builder' ) . '</p>';
    } else {
        echo '<p class="cozmoslabs-description">' . esc_html__( 'Use this shortcode on the page you want the form to be displayed.', 'profile-builder' ) . '</p>';
        echo '<div class="cozmoslabs-form-field-wrapper">';
        echo "<textarea readonly spellcheck='false' class='wppb-shortcode textarea' >" . esc_html( $shortcode ) . "</textarea>";
        // Default forms embed via a bare shortcode, so the title-change caveat
        // does not apply to them.
        if ( ! $is_default ) {
            echo '<p class="cozmoslabs-description">'. wp_kses_post( __( '<span style="color: #e76054;">NOTE:</span> Changing the form title also changes the shortcode!', 'profile-builder' ) ) .'</p>';
        }
        echo '</div>';
    }
}

function wppb_rf_side_box(){
	add_meta_box( 'wppb-rf-side', __( 'Form Shortcode', 'profile-builder' ), 'wppb_rf_content', 'wppb-rf-cpt', 'side', 'low' );
}
add_action( 'add_meta_boxes', 'wppb_rf_side_box' );

/**
 * Function that manages the Register CPT
 *
 * @since v.2.0
 *
 * @return void
 */
function wppb_manage_rf_cpt(){
	// Skip WCK on modern mode — constructing it registers wp_ajax_wck_* that
	// write wppb_rf_fields and bypass the save projection / meta-name resolver.
	if ( wppb_fb_is_active_for( 'wppb-rf-cpt' ) ) return;

	global $wp_roles;

	$available_roles = $available_time = array();

	foreach ( $wp_roles->roles as $slug => $role )
		$available_roles[$slug] = '%'. wppb_prepare_wck_labels( $role['name'] ).'%'.$slug;

    /* put the roles subscriber contributor author editor administrator in this order at the start of the options */
    $desired_order_reversed = array( 'administrator', 'editor', 'author', 'contributor', 'subscriber' );
    foreach( $desired_order_reversed as $key ){
        if( !empty( $available_roles[$key] ) ){
            $value = $available_roles[$key];
            unset( $available_roles[$key] );
            array_unshift( $available_roles , $value );
        }
    }
    /* add the default role at the start of the options */
    array_unshift( $available_roles , '%'.__( 'Default Role', 'profile-builder' ).'%'.'default role' );



	for( $i=0; $i<=250; $i++ )
		$available_time[] = $i;

	// set up the fields array
	$settings_fields = array(
		array( 'type' => 'select', 'slug' => 'set-role', 'title' => __( 'Set Role', 'profile-builder' ), 'options' => $available_roles, 'description' => __( 'Choose what role the user will have after (s)he registered<br/>If not specified, defaults to the role set in the WordPress settings', 'profile-builder' ) ),
		array( 'type' => 'select', 'slug' => 'automatically-log-in', 'title' => __( 'Automatically Log In', 'profile-builder' ), 'options' => array( '%'.__('No', 'profile-builder').'%No', '%'.__('Yes', 'profile-builder').'%Yes' ), 'default' => 'No', 'description' => __( 'Whether to automatically log in the newly registered user or not<br/>Only works on single-sites without "Admin Approval" feature activated<br/>WARNING: Caching the registration form will make automatic login not work', 'profile-builder' ) ),
		array( 'type' => 'select', 'slug' => 'redirect', 'title' => __( 'Redirect', 'profile-builder' ), 'options' => array( '%'.__('Default', 'profile-builder').'%-', '%'.__('No', 'profile-builder').'%No', '%'.__('Yes', 'profile-builder').'%Yes' ), 'default' => '-', 'description' => __( 'Whether to redirect the user to a specific page or not', 'profile-builder' ) ),
		array( 'type' => 'select', 'slug' => 'display-messages', 'title' => __( 'Display Messages', 'profile-builder' ), 'options' => $available_time, 'default' => 1, 'description' => __( 'Allowed time to display any success messages (in seconds)', 'profile-builder' ) ),
		array( 'type' => 'text', 'slug' => 'url', 'title' => __( 'URL', 'profile-builder' ), 'description' => __( 'Specify the URL of the page users will be redirected once registered using this form<br/>Use the following format: http://www.mysite.com', 'profile-builder' ) ),
	);

    if( defined( 'WPPB_PAID_PLUGIN_DIR' ) ) {
        $settings_fields[] = array( 'type' => 'checkbox', 'slug' => 'ajax', 'title' => __( 'Ajax Validation', 'profile-builder' ), 'options' => array( '%' . __( 'Yes', 'profile-builder' ) . '%true' ), 'description' => __( 'Use AJAX to validate this form without reloading the page', 'profile-builder' ) );
    }

	// set up the box arguments
	$args = array(
		'metabox_id' => 'wppb-rf-settings-args',
		'metabox_title' => __( 'After Registration...', 'profile-builder' ),
		'post_type' => 'wppb-rf-cpt',
		'meta_name' => 'wppb_rf_page_settings',
		'meta_array' => $settings_fields,
		'sortable' => false,
		'single' => true
	);
	new Wordpress_Creation_Kit_PB( $args );

	$rf_fields = array ();

	$all_fields = get_option ( 'wppb_manage_fields', 'not_set' );
	if ( ( $all_fields != 'not_set' ) && ( ( is_array( $all_fields ) ) && ( !empty( $all_fields ) ) ) ){
		foreach ( $all_fields as $key => $value ) {
            if (  $value['field'] != 'Default - Display name publicly as' )
                array_push( $rf_fields, wppb_field_format( $value['field-title'], $value['field'] ) );
        }
	}

	$rf_fields = apply_filters( 'wppb_rf_fields_types', $rf_fields );

	// set up the box arguments for the register forms and create them
	$args = array(
		'metabox_id' => 'wppb-rf-fields',
		'metabox_title' => __( 'Add New Field to the List', 'profile-builder' ),
		'post_type' => 'wppb-rf-cpt',
		'meta_name' => 'wppb_rf_fields',
		'meta_array' => $rf_fields = apply_filters	( 'wppb_rf_fields', array(
																				array( 'type' => 'select', 'slug' => 'field', 'title' => __( 'Field', 'profile-builder' ), 'options' => $rf_fields, 'default-option' => true, 'description' => sprintf( __( 'Choose one of the supported fields you manage <a href="%s">here</a>', 'profile-builder' ), admin_url( 'admin.php?page=manage-fields' ) ) ),
																				array( 'type' => 'text', 'slug' => 'id', 'title' => __( 'ID', 'profile-builder' ), 'default' =>  '', 'description' => __( "A unique, auto-generated ID for this particular field<br/>You can use this in conjuction with filters to target this element if needed<br/>Can't be edited", 'profile-builder' ), 'readonly' => true )
																		)
													)
	);
	new Wordpress_Creation_Kit_PB( $args );


}
add_action( 'admin_init', 'wppb_manage_rf_cpt', 1 );


add_filter( "wck_before_listed_wppb_rf_fields_element_0", 'wppb_manage_fields_display_field_title_slug', 10, 3 );
add_filter( 'wck_update_container_class_wppb_rf_fields', 'wppb_update_container_class', 10, 4 );
add_filter( 'wck_element_class_wppb_rf_fields', 'wppb_element_class', 10, 4 );


/** Re-hide delete on mandatory fields after list refresh. */
function wppb_rf_after_refresh_list( $id ){
    echo "<script type=\"text/javascript\">wppb_disable_delete_on_default_mandatory_fields();</script>";
}
add_action( "wck_refresh_list_wppb_rf_fields", "wppb_rf_after_refresh_list" );