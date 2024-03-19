<?php

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

add_action(
    'enqueue_block_editor_assets',
    function () {
        global $content_restriction_activated;
        global $wp_version;

        global $pagenow;

        $arrDeps = ($pagenow === 'widgets.php') ?
            array( 'wp-blocks', 'wp-dom', 'wp-dom-ready', 'wp-edit-widgets', 'lodash', )
            : array( 'wp-blocks', 'wp-dom', 'wp-dom-ready', 'wp-edit-post', 'lodash', );


        //Register the Block Content Restriction assets
        if ( $content_restriction_activated == 'yes' && version_compare( $wp_version, "5.0.0", ">=" ) ) {
            wp_register_script(
                'wppb-block-editor-assets-content-restriction',
                WPPB_PLUGIN_URL . 'assets/misc/gutenberg/block-content-restriction/build/index.js',
                $arrDeps,
                PROFILE_BUILDER_VERSION
            );
            wp_enqueue_script('wppb-block-editor-assets-content-restriction');

            if (!function_exists('get_editable_roles')) {
                require_once ABSPATH . 'wp-admin/includes/user.php';
            }

            $user_roles_initial = get_editable_roles();

            foreach ($user_roles_initial as $key => $role) {
                $user_roles[] = [
                    "slug" => $key,
                    "name" => $role['name'],
                ];
            }

            $vars_array = array(
                'userRoles' => json_encode($user_roles),
                'content_restriction_activated' => json_encode($content_restriction_activated == 'yes'),
            );

            wp_localize_script('wppb-block-editor-assets-content-restriction', 'wppbBlockEditorData', $vars_array);
        }
    }
);

add_action(
    'init',
    function () {
        global $content_restriction_activated;
        global $wp_version;

        //Register the Content Restriction Start and Content Restriction End blocks
        if ( $content_restriction_activated == 'yes' && version_compare( $wp_version, "5.0.0", ">=" ) ) {
            if( file_exists( WPPB_PLUGIN_DIR . 'assets/misc/gutenberg/blocks/build/content-restriction-start' ) )
                register_block_type( WPPB_PLUGIN_DIR . 'assets/misc/gutenberg/blocks/build/content-restriction-start' );
            if( file_exists( WPPB_PLUGIN_DIR . 'assets/misc/gutenberg/blocks/build/content-restriction-end' ) )
                register_block_type( WPPB_PLUGIN_DIR . 'assets/misc/gutenberg/blocks/build/content-restriction-end' );
        }
    }
);
