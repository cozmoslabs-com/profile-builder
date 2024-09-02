<?php
// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) exit;

class Cozmoslabs_Plugin_Optin_WPPB {

    public static $user_name           = '';
    public static $base_url            = 'https://www.cozmoslabs.com/wp-json/cozmos-api/';
    public static $plugin_optin_status = '';
    public static $plugin_optin_email  = '';

    public static $plugin_option_key       = 'cozmos_wppb_plugin_optin';
    public static $plugin_option_email_key = 'cozmos_wppb_plugin_optin_email';

    public function __construct(){

        if( apply_filters( 'wppb_enable_plugin_optin', true ) === false )
            return;

        if ( !wp_next_scheduled( 'cozmos_wppb_plugin_optin_sync' ) )
            wp_schedule_event( time(), 'weekly', 'cozmos_wppb_plugin_optin_sync' );

        add_action( 'cozmos_wppb_plugin_optin_sync', array( 'Cozmoslabs_Plugin_Optin_WPPB', 'sync_data' ) );

        self::$plugin_optin_status = get_option( self::$plugin_option_key, false );
        self::$plugin_optin_email  = get_option( self::$plugin_option_email_key, false );

        add_action( 'admin_init', array( $this, 'redirect_to_plugin_optin_page' ) );
        add_action( 'admin_menu', array( $this, 'add_submenu_page_optin' ) );
        add_action( 'admin_init', array( $this, 'process_optin_actions' ) );
        add_action( 'activate_plugin', array( $this, 'process_paid_plugin_activation' ) );
        add_action( 'deactivated_plugin', array( $this, 'process_paid_plugin_deactivation' ) );
        add_filter( 'wppb_advanced_settings_sanitize', array( $this, 'process_plugin_optin_advanced_setting' ), 20, 2 );

    }

    public function redirect_to_plugin_optin_page(){

        if( ( isset( $_GET['page'] ) && sanitize_text_field( $_GET['page'] ) == 'wppb-optin-page' ) || ( isset( $_GET['page'] ) && isset( $_GET['subpage'] ) && sanitize_text_field( $_GET['page'] ) == 'profile-builder-dashboard' && sanitize_text_field( $_GET['subpage'] ) == 'wppb-setup' ) )
            return;

        if( self::$plugin_optin_status !== false )
            return;

        // Show this only when admin tries to access a plugin page
        $target_slugs   = array( 'profile-builder-', 'manage-fields', 'wppb-', 'admin-email-customizer', 'user-email-customizer', 'pbie', 'manage-fields', 'custom-redirects', 'pb-labels-edit' );
        $is_plugin_page = false;

        if( !empty( $target_slugs ) ){
            foreach ( $target_slugs as $slug ){

                if( ! empty( $_GET['page'] ) && false !== strpos( sanitize_text_field( $_GET['page'] ), $slug ) )
                    $is_plugin_page = true;

                if( ! empty( $_GET['post_type'] ) && false !== strpos( sanitize_text_field( $_GET['post_type'] ), $slug ) )
                    $is_plugin_page = true;

                if( ! empty( $_GET['post'] ) && false !== strpos( get_post_type( (int)$_GET['post'] ), $slug ) )
                    $is_plugin_page = true;

            }
        }

        if( $is_plugin_page == true ){
            wp_safe_redirect( admin_url( 'admin.php?page=wppb-optin-page' ) );
            exit();
        }

        return;

    }

    public function add_submenu_page_optin() {
        add_submenu_page( 'WPPBHidden', 'Profile Builder Plugin Optin', 'WPPBHidden', 'manage_options', 'wppb-optin-page', array(
            $this,
            'optin_page_content'
        ) );
	}

    public function optin_page_content(){
        require_once WPPB_PLUGIN_DIR . 'admin/plugin-optin/view-plugin-optin.php';
    }

    public function process_optin_actions(){

        if( !isset( $_GET['page'] ) || $_GET['page'] != 'wppb-optin-page' || !isset( $_GET['_wpnonce'] ) )
            return;

        if( !current_user_can( 'manage_options' ) )
            return;

        if( wp_verify_nonce( sanitize_text_field( $_GET['_wpnonce'] ), 'cozmos_enable_plugin_optin' ) ){

            $args = array(
                'method' => 'POST',
                'body'   => array(
                    'email'   => get_option( 'admin_email' ),
                    'name'    => self::get_user_name(),
                    'version' => self::get_current_active_version(),
                    'product' => 'wppb',
                ),
            );

            // Check if the other plugin might be active as well
            $args = $this->add_other_plugin_version_information( $args );

            $request = wp_remote_post( self::$base_url . 'pluginOptinSubscribe/', $args );

            update_option( self::$plugin_option_key, 'yes' );
            update_option( self::$plugin_option_email_key, get_option( 'admin_email' ) );

            $settings = get_option( 'wppb_toolbox_admin_settings', array() );

            if( empty( $settings ) )
                $settings = array( 'plugin-optin' => 'yes' );
            else
                $settings['plugin-optin'] = 'yes';

            update_option( 'wppb_toolbox_admin_settings', $settings );

            wp_safe_redirect( admin_url( 'admin.php?page=profile-builder-dashboard' ) );
            exit;

        }

        if( wp_verify_nonce( sanitize_text_field( $_GET['_wpnonce'] ), 'cozmos_disable_plugin_optin' ) ){

            update_option( self::$plugin_option_key, 'no' );

            $settings = get_option( 'wppb_toolbox_admin_settings', array() );

            if( empty( $settings ) )
                $settings = array( 'plugin-optin' => 'no' );
            else
                $settings['plugin-optin'] = 'no';

            update_option( 'wppb_toolbox_admin_settings', $settings );

            wp_safe_redirect( admin_url( 'admin.php?page=profile-builder-dashboard' ) );
            exit;

        }

    }

    // Update tags when a paid version is activated
    public function process_paid_plugin_activation( $plugin ){

        if( self::$plugin_optin_status !== 'yes' || self::$plugin_optin_email === false )
            return;

        $target_plugins = [ 'profile-builder-agency/index.php', 'profile-builder-pro/index.php', 'profile-builder-unlimited/index.php', 'profile-builder-hobbyist/index.php' ];

        if( !in_array( $plugin, $target_plugins ) )
            return;

        $version = explode( '/', $plugin );
        $version = str_replace( 'profile-builder-', '', $version[0] );

        if( $version == 'hobbyist' )
            $version == 'basic';

        // Update user version tag
        $args = array(
            'method' => 'POST',
            'body'   => array(
                'email'   => self::$plugin_optin_email,
                'version' => $version,
                'product' => 'wppb',
            )
        );

        // Check if the other plugin might be active as well
        $args = $this->add_other_plugin_version_information( $args );

        $request = wp_remote_post( self::$base_url . 'pluginOptinUpdateVersion/', $args );

    }

    // Update tags when a paid version is deactivated
    public function process_paid_plugin_deactivation( $plugin ){

        if( self::$plugin_optin_status !== 'yes' || self::$plugin_optin_email === false )
            return;

        $target_plugins = [ 'profile-builder-agency/index.php', 'profile-builder-pro/index.php', 'profile-builder-unlimited/index.php', 'profile-builder-hobbyist/index.php' ];

        if( !in_array( $plugin, $target_plugins ) )
            return;

        // Update user version tag
        $args = array(
            'method' => 'POST',
            'body'   => [
                'email'   => self::$plugin_optin_email,
                'version' => 'free',
                'product' => 'wppb',
            ],
        );

        $request = wp_remote_post( self::$base_url . 'pluginOptinUpdateVersion/', $args );

    }

    // Advanced settings
    public function process_plugin_optin_advanced_setting( $settings, $previous_settings ){

        if( !isset( $settings['plugin-optin'] ) || $settings['plugin-optin'] == 'no' ){

            update_option( self::$plugin_option_key, 'no' );

            if( self::$plugin_optin_email === false )
                return $settings;

            $args = array(
                'method' => 'POST',
                'body'   => [
                    'email'   => self::$plugin_optin_email,
                    'product' => 'wppb',
                ],
            );

            $request = wp_remote_post( self::$base_url . 'pluginOptinArchiveSubscriber/', $args );

        } else if ( $settings['plugin-optin'] == 'yes' && ( !isset( $previous_settings['plugin-optin'] ) || $settings['plugin-optin'] != $previous_settings['plugin-optin'] ) ) {

            update_option( self::$plugin_option_key, 'yes' );
            update_option( self::$plugin_option_email_key, get_option( 'admin_email' ) );

            if( self::$plugin_optin_email === false )
                return;

            $args = array(
                'method' => 'POST',
                'body'   => [
                    'email'   => self::$plugin_optin_email,
                    'name'    => self::get_user_name(),
                    'product' => 'wppb',
                    'version' => self::get_current_active_version(),
                ],
            );

            // Check if the other plugin might be active as well
            $args = $this->add_other_plugin_version_information( $args );

            $request = wp_remote_post( self::$base_url . 'pluginOptinSubscribe/', $args );

        }

        return $settings;

    }

    public function add_other_plugin_version_information( $args ){

        $target_found = false;

        // paid versions
        $target_plugins = [ 'paid-member-subscriptions-agency/index.php', 'paid-member-subscriptions-pro/index.php', 'paid-member-subscriptions-unlimited/index.php', 'paid-member-subscriptions-basic/index.php' ];

        foreach( $target_plugins as $plugin ){
            if( is_plugin_active( $plugin ) || is_plugin_active_for_network( $plugin ) ){
                $target_found = $plugin;
                break;
            }
        }

        // verify free version separately
        if( $target_found === false ){

            if( is_plugin_active( 'paid-member-subscriptions/index.php' ) || is_plugin_active_for_network( 'paid-member-subscriptions/index.php' ) )
                $target_found = 'paid-member-subscriptions-free';

        }

        if( $target_found !== false ){

            $target_found = explode( '/', $target_found );
            $target_found = str_replace( 'paid-member-subscriptions-', '', $target_found[0] );

            $args['body']['other_product_data'] = array(
                'product' => 'pms',
                'version' => $target_found,
            );

        }

        return $args;

    }

    // Determine current user name
    public static function get_user_name(){

        if( !empty( self::$user_name ) )
            return self::$user_name;

        $user = wp_get_current_user();

        $name = $user->display_name;

        $first_name = get_user_meta( $user->ID, 'first_name', true );
        $last_name  = get_user_meta( $user->ID, 'last_name', true );

        if( !empty( $first_name ) && !empty( $last_name ) )
            $name = $first_name . ' ' . $last_name;

        self::$user_name = $name;

        return self::$user_name;

    }

    // Determine current active plugin version
    public static function get_current_active_version(){

        if( !function_exists( 'is_plugin_active' ) || !function_exists( 'is_plugin_active_for_network' ) )
            include_once( ABSPATH . 'wp-admin/includes/plugin.php' );

        if( is_plugin_active( 'profile-builder-agency/index.php' ) || is_plugin_active_for_network( 'profile-builder-agency/index.php' ) )
            return 'agency';
        elseif( is_plugin_active( 'profile-builder-pro/index.php' ) || is_plugin_active_for_network( 'profile-builder-pro/index.php' ) )
            return 'pro';
        elseif( is_plugin_active( 'profile-builder-unlimited/index.php' ) || is_plugin_active_for_network( 'profile-builder-unlimited/index.php' ) )
            return 'unlimited';
        elseif( is_plugin_active( 'profile-builder-hobbyist/index.php' ) || is_plugin_active_for_network( 'profile-builder-hobbyist/index.php' ) )
            return 'basic';

        return 'free';

    }

    public static function sync_data(){

        if( self::$plugin_optin_status != 'yes' )
            return;

        $args = array(
            'method' => 'POST',
            'body'   => array(
                'home_url'       => home_url(),
                'product'        => 'wppb',
                'email'          => self::$plugin_optin_email,
                'name'           => self::get_user_name(),
                'version'        => self::get_current_active_version(),
                'license'        => wppb_get_serial_number(),
                'active_plugins' => json_encode( get_option( 'active_plugins', array() ) ),
            ),
        );

        $args = self::add_request_metadata( $args );

        $request = wp_remote_post( self::$base_url . 'pluginOptinSync/', $args );

    }

    public static function add_request_metadata( $args ){

        $settings                                = get_option( 'wppb_general_settings', false );
        $content_restriction_settings            = get_option( 'wppb_content_restriction_settings', false );
        $wppb_two_factor_authentication_settings = get_option( 'wppb_two_factor_authentication_settings', 'not_found' );

	    $enabled = 'no';

        if( !empty( $settings ) ) {

            if( isset( $settings['emailConfirmation'] ) && $settings['emailConfirmation'] == 'yes' )
                $args['body']['email_confirmation'] = 1;
            else
                $args['body']['email_confirmation'] = 0;

            if( isset( $settings['adminApproval'] ) && $settings['adminApproval'] == 'yes' )
                $args['body']['admin_approval'] = 1;
            else
                $args['body']['admin_approval'] = 0;

            if( !empty( $settings['formsDesign'] ) )
                $args['body']['form_design'] = $settings['formsDesign'];
            else
                $args['body']['form_design'] = '';

            if( !empty( $content_restriction_settings['contentRestriction'] ) )
                $args['body']['content_restriction'] = 1;
            else
                $args['body']['content_restriction'] = 0;

            if ( isset( $wppb_two_factor_authentication_settings['enabled'] ) && $wppb_two_factor_authentication_settings['enabled'] == 'yes' )
                $args['body']['2fa'] = 1;
            else
                $args['body']['2fa'] = 0;

            $args['body']['modules'] = json_encode( get_option( 'wppb_module_settings', 'not_found' ) );
            $args['body']['addons']  = json_encode( get_option( 'wppb_advanced_add_ons_settings', array() ) );

        }

        return $args;

    }

}

new Cozmoslabs_Plugin_Optin_WPPB();