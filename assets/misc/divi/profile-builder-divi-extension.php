<?php
/*
Plugin Name: Profile Builder Divi Extension
Plugin URI:  https://wordpress.org/plugins/profile-builder/
Description: Profile Builder is the all in one user profile and user registration plugin for WordPress.
Version:     1.0.0
Author:      Cozmoslabs
Author URI:  https://www.cozmoslabs.com/
License:     GPL2
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: wppb-profile-builder-divi-extension
Domain Path: /languages

Profile Builder Divi Extension is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 2 of the License, or
any later version.

Profile Builder Divi Extension is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Profile Builder Divi Extension. If not, see https://www.gnu.org/licenses/gpl-2.0.html.
*/


if ( ! function_exists( 'wppb_initialize_extension' ) ):
/**
 * Creates the extension's main class instance.
 *
 * @since 1.0.0
 */
function wppb_initialize_extension() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/ProfileBuilderDiviExtension.php';
}
add_action( 'divi_extensions_init', 'wppb_initialize_extension' );

add_action( 'wp_ajax_nopriv_wppb_divi_extension_ajax', 'wppb_divi_extension_ajax' );
add_action( 'wp_ajax_wppb_divi_extension_ajax', 'wppb_divi_extension_ajax' );
function wppb_divi_extension_ajax(){

    if ( is_array( $_POST ) && array_key_exists( 'form_type', $_POST ) && $_POST['form_type'] !== '' ) {
        switch ($_POST['form_type']) {
            case 'rf':
                include_once(WPPB_PLUGIN_DIR . '/front-end/register.php');
                include_once(WPPB_PLUGIN_DIR . '/front-end/class-formbuilder.php');

                $form_name = 'unspecified';
                if ( array_key_exists('form_name', $_POST)) {
                    $form_name = $_POST['form_name'];
                    if ($form_name === 'default') {
                        $form_name = 'unspecified';
                    }
                }
                if (!$form_name || $form_name === 'unspecified') {
                    $atts = [
                        'role'                => array_key_exists('role', $_POST)                                                                     ? esc_attr($_POST['role'])               : '',
                        'form_name'           => '',
                        'redirect_url'        => array_key_exists('redirect_url', $_POST)           && $_POST['redirect_url']           !== 'default' ? esc_url($_POST['redirect_url'])        : '',
                        'logout_redirect_url' => array_key_exists('logout_redirect_url', $_POST)    && $_POST['logout_redirect_url']    !== 'default' ? esc_url($_POST['logout_redirect_url']) : '',
                        'automatic_login'     => array_key_exists('toggle_automatic_login', $_POST) && $_POST['toggle_automatic_login']               ? 'yes'                                  : '',
                    ];
                } else {
                    $atts = [
                        'role'                => '',
                        'form_name'           => $form_name,
                        'redirect_url'        => '',
                        'logout_redirect_url' => array_key_exists('logout_redirect_url', $_POST) && $_POST['logout_redirect_url'] !== 'default' ? esc_url($_POST['logout_redirect_url']) : '',
                        'automatic_login'     => '',
                    ];
                }

                $output =
                    '<div class="wppb-divi-editor-container">' .
                    wppb_front_end_register( $atts ) .
                    '</div>';

                break;

            case 'epf':
                include_once(WPPB_PLUGIN_DIR . '/front-end/edit-profile.php');
                include_once(WPPB_PLUGIN_DIR . '/front-end/class-formbuilder.php');

                $form_name = 'unspecified';
                if ( array_key_exists('form_name', $_POST)) {
                    $form_name = $_POST['form_name'];
                    if ($form_name === 'default') {
                        $form_name = 'unspecified';
                    }
                }

                $atts = [
                    'form_name'    => $form_name,
                    'redirect_url' => array_key_exists('redirect_url', $_POST) && $_POST['redirect_url'] !== 'default' ? esc_url($_POST['redirect_url']) : '',
                ];

                $output =
                    '<div class="wppb-divi-editor-container">' .
                    wppb_front_end_profile_info( $atts ) .
                    '</div>';

                break;

            case 'l':
                include_once(WPPB_PLUGIN_DIR . '/front-end/login.php');

                $atts = [
                    'register_url'        => array_key_exists('register_url', $_POST)        && $_POST['register_url']        !== 'default' ? esc_url($_POST['register_url'])        : '',
                    'lostpassword_url'    => array_key_exists('lostpassword_url', $_POST)    && $_POST['lostpassword_url']    !== 'default' ? esc_url($_POST['lostpassword_url'])    : '',
                    'redirect_url'        => array_key_exists('redirect_url', $_POST)        && $_POST['redirect_url']        !== 'default' ? esc_url($_POST['redirect_url'])        : '',
                    'logout_redirect_url' => array_key_exists('logout_redirect_url', $_POST) && $_POST['logout_redirect_url'] !== 'default' ? esc_url($_POST['logout_redirect_url']) : '',
                    'show_2fa_field'      => array_key_exists('toggle_auth_field', $_POST)   && $_POST['toggle_auth_field']   === 'on'      ? 'yes'                                  : '',
                    'block'               => 'true',
                ];

                $output =
                    '<div class="wppb-divi-editor-container">' .
                    wppb_front_end_login( $atts ) .
                    '</div>';

                break;

            case 'rp':
                include_once(WPPB_PLUGIN_DIR . '/front-end/recover.php');

                $atts = [
                    'block'               => 'true',
                ];

                $output =
                    '<div class="wppb-divi-editor-container">' .
                    wppb_front_end_password_recovery( $atts ) .
                    '</div>';

                break;

            case 'ul':
                if( defined( 'WPPB_PAID_PLUGIN_DIR' ) ){
                    include_once( WPPB_PAID_PLUGIN_DIR.'/add-ons/user-listing/userlisting.php' );
                    
                    $atts = [
                        'name'       => array_key_exists('userlisting_name', $_POST) ?  esc_attr($_POST['userlisting_name'])   :   '',
                        'meta_value' => array_key_exists('field_name', $_POST) && array_key_exists('meta_value', $_POST) && $_POST['field_name'] !== 'default' ? ( $_POST['meta_value'] !== 'undefined' ? $_POST['meta_value'] : '' ) : '',
                        'single'     => array_key_exists('single', $_POST) && $_POST['single'] === 'on',
                        'id'         => array_key_exists('id', $_POST)         && $_POST['id']         !== 'undefined' ? esc_attr($_POST['id'])         : '',
                        'meta_key'   => array_key_exists('field_name', $_POST) && $_POST['field_name'] !== 'default'   ? esc_attr($_POST['field_name']) : '',
                        'include'    => array_key_exists('include', $_POST)    && $_POST['include']    !== 'undefined' ? esc_attr($_POST['include'])    : '',
                        'exclude'    => array_key_exists('exclude', $_POST)    && $_POST['exclude']    !== 'undefined' ? esc_attr($_POST['exclude'])    : '',
                    ];

                    if ( $atts['name'] === '' || $atts['name'] === 'default' ) {
                        $output =wppb_form_notification_styling(
                            '<div class="wppb-divi-editor-container">
                                <p class="wppb-alert">
                                    Please select a User Listing!
                                </p><!-- .wppb-alert-->
                             </div>');
                    } else {
                        $output =
                            '<div class="wppb-divi-editor-container">' .
                            wppb_user_listing_shortcode( $atts ) .
                            '</div>';
                    }
                }

                break;
        }

        $output .=
            '<style type="text/css">' .
            file_get_contents( WPPB_PLUGIN_DIR . '/assets/css/style-front-end.css' ) .
            '</style>';

        // load the corresponding Form Design stylesheets
        $active_design = 'form-style-default';
        if ( defined( 'WPPB_PAID_PLUGIN_DIR' ) && file_exists( WPPB_PAID_PLUGIN_DIR.'/features/form-designs/form-designs.php' ) )
            $active_design = wppb_get_active_form_design();

        if ( $active_design === 'form-style-default' ) {

            // load stylesheet for the Default Form Style if the active WP Theme is a Block Theme (Block Themes were introduced in WordPress since the 5.9 release)
            if ( version_compare( get_bloginfo( 'version' ), '5.9', '>=' ) && function_exists( 'wp_is_block_theme' ) && wp_is_block_theme() )
                $output .=
                    '<style type="text/css">' .
                    file_get_contents( WPPB_PLUGIN_DIR . '/assets/css/style-block-themes-front-end.css' ) .
                    '</style>';

        }
        else { // if $active_design is other than 'form-style-default' the constants WPPB_PAID_PLUGIN_DIR and WPPB_PAID_PLUGIN_URL are defined (verified at line:14)

            if ( file_exists( WPPB_PAID_PLUGIN_DIR . '/features/form-designs/css/' . $active_design . '/form-design-general-style.css' ) )
                $output .=
                    '<style type="text/css">' .
                    file_get_contents( WPPB_PLUGIN_DIR . '/features/form-designs/css/' . $active_design . '/form-design-general-style.css' ) .
                    '</style>';

            if ( file_exists( WPPB_PAID_PLUGIN_DIR . '/features/form-designs/css/' . $active_design  .'/extra-form-notifications-style.css' ) )
                $output .=
                    '<style type="text/css">' .
                    file_get_contents( WPPB_PLUGIN_DIR . '/features/form-designs/css/' . $active_design  .'/extra-form-notifications-style.css' ) .
                    '</style>';
        }

        //Select
        // Don't enqueue when JetEngine is active
        if( !class_exists( 'Jet_Engine' ) ){
            $output .=
                '<script type="text/javascript">' .
                file_get_contents( WPPB_PLUGIN_DIR . '/assets/js/select2/select2.min.js' ) .
                '</script>';
            $output .=
                '<style type="text/css">' .
                file_get_contents( WPPB_PLUGIN_DIR . '/assets/css/select2/select2.min.css' ) .
                '</style>';
        }

        if ( defined( 'WPPB_PAID_PLUGIN_URL' ) ) {
            //Select2
            $output .=
                '<style type="text/css">' .
                file_get_contents( WPPB_PAID_PLUGIN_DIR . '/front-end/default-fields/select2/select2.css' ) .
                '</style>';
            $output .=
                '<style type="text/css">' .
                file_get_contents( WPPB_PAID_PLUGIN_DIR . '/front-end/extra-fields/select-cpt/style-front-end.css' ) .
                '</style>';

            //Upload
            $output .=
                '<style type="text/css">' .
                file_get_contents( WPPB_PAID_PLUGIN_DIR . '/front-end/extra-fields/upload/upload.css' ) .
                '</style>';

            //Multi-Step Forms compatibility
            $output .=
                '<style type="text/css">' .
                file_get_contents( WPPB_PAID_PLUGIN_DIR . '/add-ons-advanced/multi-step-forms/assets/css/frontend-multi-step-forms.css' ) .
                '</style>';

            //Social Connect
            $output .=
                '<style type="text/css">' .
                file_get_contents( WPPB_PAID_PLUGIN_DIR . '/add-ons-advanced/social-connect/assets/css/wppb_sc_main_frontend.css' ) .
                '</style>';
        }

        echo json_encode( $output );// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        wp_die();
    }
}

endif;
