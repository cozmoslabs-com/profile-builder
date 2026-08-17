<?php
/**
 * Registers Registration Forms (wppb-rf-cpt) and Edit Profile Forms (wppb-epf-cpt).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Priority 11: must run after bundled multiple-forms CPT registration (RF at 9,
// EPF at default 10). At 10, classic EPF would win FIFO and wipe show_in_rest.
add_action( 'init', 'wppb_fb_register_form_cpts', 11 );
function wppb_fb_register_form_cpts() {
    $rf_labels = array(
        'name'               => __( 'Registration Forms', 'profile-builder' ),
        'singular_name'      => __( 'Registration Form', 'profile-builder' ),
        'add_new'            => __( 'Add New Registration Form', 'profile-builder' ),
        'add_new_item'       => __( 'Add New Registration Form', 'profile-builder' ),
        'edit_item'          => __( 'Edit Registration Form', 'profile-builder' ),
        'new_item'           => __( 'New Registration Form', 'profile-builder' ),
        'view_item'          => __( 'View Registration Form', 'profile-builder' ),
        'search_items'       => __( 'Search Registration Forms', 'profile-builder' ),
        'not_found'          => __( 'No Registration Forms found', 'profile-builder' ),
        'not_found_in_trash' => __( 'No Registration Forms found in Trash', 'profile-builder' ),
    );

    $epf_labels = array(
        'name'               => __( 'Edit Profile Forms', 'profile-builder' ),
        'singular_name'      => __( 'Edit Profile Form', 'profile-builder' ),
        'add_new'            => __( 'Add New Edit Profile Form', 'profile-builder' ),
        'add_new_item'       => __( 'Add New Edit Profile Form', 'profile-builder' ),
        'edit_item'          => __( 'Edit Edit Profile Form', 'profile-builder' ),
        'new_item'           => __( 'New Edit Profile Form', 'profile-builder' ),
        'view_item'          => __( 'View Edit Profile Form', 'profile-builder' ),
        'search_items'       => __( 'Search Edit Profile Forms', 'profile-builder' ),
        'not_found'          => __( 'No Edit Profile Forms found', 'profile-builder' ),
        'not_found_in_trash' => __( 'No Edit Profile Forms found in Trash', 'profile-builder' ),
    );

    $common = array(
        'public'             => false,
        'show_ui'            => true,
        'show_in_menu'       => 'profile-builder',
        'query_var'          => false,
        'rewrite'            => false,
        'has_archive'        => false,
        'hierarchical'       => false,
        'capability_type'    => 'post',
        // Primitives → manage_options; keep map_meta_cap so meta caps still
        // resolve (delete protection + current_user_can( 'edit_post', … )).
        // Free installs also get create_posts => do_not_allow via licensing.
        'map_meta_cap'       => true,
        'capabilities'       => array_merge( array(
            'edit_post'              => 'edit_post',
            'read_post'              => 'read_post',
            'delete_post'            => 'delete_post',
            'edit_posts'             => 'manage_options',
            'edit_others_posts'      => 'manage_options',
            'publish_posts'          => 'manage_options',
            'read_private_posts'     => 'manage_options',
            'create_posts'           => 'manage_options',
            'delete_posts'           => 'manage_options',
            'delete_private_posts'   => 'manage_options',
            'delete_published_posts' => 'manage_options',
            'delete_others_posts'    => 'manage_options',
            'edit_private_posts'     => 'manage_options',
            'edit_published_posts'   => 'manage_options',
        ), wppb_fb_form_cpt_capability_overrides() ),
        'supports'           => array( 'title', 'editor', 'custom-fields' ),
        'show_in_rest'       => true,
        // Custom controller: default allows anonymous collection reads.
        'rest_controller_class' => 'WPPB_FB_Forms_REST_Controller',
    );

    // No block `template` on RF: template blocks get id=0 and first save would
    // duplicate Username/E-mail/Password rows. Seed via defaults.php instead.
    // Classic-mode CPTs: skip registration so bundled WCK registration wins.
    if ( wppb_fb_is_active_for( 'wppb-rf-cpt' ) ) {
        register_post_type( 'wppb-rf-cpt', array_merge( $common, array(
            'labels'    => $rf_labels,
            'rest_base' => 'wppb-rf-cpt',
        ) ) );
    }

    if ( wppb_fb_is_active_for( 'wppb-epf-cpt' ) ) {
        register_post_type( 'wppb-epf-cpt', array_merge( $common, array(
            'labels'    => $epf_labels,
            'rest_base' => 'wppb-epf-cpt',
        ) ) );
    }
}

/**
 * Require manage_options for form CPT REST reads (anonymous GET would leak forms).
 * WP_REST_Posts_Controller is loaded from wp-settings.php before plugins.
 */
if ( class_exists( 'WP_REST_Posts_Controller' ) && ! class_exists( 'WPPB_FB_Forms_REST_Controller' ) ) {

    class WPPB_FB_Forms_REST_Controller extends WP_REST_Posts_Controller {

        public function get_items_permissions_check( $request ) {
            $check = parent::get_items_permissions_check( $request );
            if ( is_wp_error( $check ) || false === $check ) {
                return $check;
            }
            return $this->wppb_fb_require_manage_options();
        }

        public function get_item_permissions_check( $request ) {
            $check = parent::get_item_permissions_check( $request );
            if ( is_wp_error( $check ) || false === $check ) {
                return $check;
            }
            return $this->wppb_fb_require_manage_options();
        }

        protected function wppb_fb_require_manage_options() {
            if ( ! current_user_can( 'manage_options' ) ) {
                return new WP_Error(
                    'rest_forbidden',
                    __( 'Sorry, you are not allowed to view Profile Builder forms.', 'profile-builder' ),
                    array( 'status' => rest_authorization_required_code() )
                );
            }
            return true;
        }
    }
}
