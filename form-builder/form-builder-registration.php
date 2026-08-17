<?php
/**
 * Form-builder block registration, editor assets, and inserter gating.
 * Main hooks: `wppb_fb_register_blocks()` (init:30) and
 * `wppb_fb_enqueue_editor_assets()` (publishes `window.wppbFb`).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// 1. Allowed block types + pattern suppression

/**
 * PB blocks only in form CPT inserters; stripped elsewhere. Blocks stay registered
 * globally so existing markup still parses.
 */
add_filter( 'allowed_block_types_all', 'wppb_fb_allowed_block_types', 10, 2 );
function wppb_fb_allowed_block_types( $allowed_blocks, $editor_context ) {
    $field_block_names = array_values( wp_list_pluck( WPPB_FB_Field_Registry::all(), 'block' ) );
    $all_registered    = array_keys( WP_Block_Type_Registry::get_instance()->get_all_registered() );
    $structural_blocks = array_values( array_filter( $all_registered, function ( $name ) use ( $field_block_names ) {
        return strpos( $name, 'profile-builder/' ) === 0 && ! in_array( $name, $field_block_names, true );
    } ) );
    $pb_block_names = array_merge( $field_block_names, $structural_blocks );

    // Repeater off: hide from inserter; existing blocks still render.
    if ( ! wppb_fb_is_repeater_module_active() ) {
        $pb_block_names = array_values( array_diff( $pb_block_names, array( 'profile-builder/field-repeater' ) ) );
    }

    $is_pb_form = ! empty( $editor_context->post ) && wppb_fb_is_form_cpt( $editor_context->post->post_type );

    if ( $is_pb_form ) {
        // PB form CPT only: hide gated blocks from inserter. Blocks stay registered.
        // Do not apply on the non-PB branch — that would leak them into post/page editors.
        $hidden = array_merge(
            wppb_fb_inactive_addon_field_blocks(),
            wppb_fb_inactive_addon_structural_blocks(),
            wppb_fb_context_hidden_field_blocks(),
            wppb_fb_free_locked_field_blocks()
        );
        if ( ! empty( $hidden ) ) {
            return array_values( array_diff( $pb_block_names, $hidden ) );
        }
        return array_values( $pb_block_names );
    }

    // Never replace `true` with an explicit list — the PHP registry omits JS-only blocks
    // and would strip them site-wide. PB blocks hide client-side instead. When another
    // plugin already narrowed the list, subtract ours from it.
    if ( is_array( $allowed_blocks ) && ! empty( $pb_block_names ) ) {
        return array_values( array_diff( $allowed_blocks, $pb_block_names ) );
    }

    return $allowed_blocks;
}

/**
 * Sets `window.wppbFbIsFormScreen` before the editor bundle loads.
 * Blocks register before the store knows the post type.
 */
add_action( 'enqueue_block_editor_assets', 'wppb_fb_flag_editor_screen', 9 );
function wppb_fb_flag_editor_screen() {
    $is_form_screen = wppb_fb_is_form_cpt( get_post_type() ) && wppb_fb_is_active_for( get_post_type() );
    wp_add_inline_script(
        'wppb-form-editor-bundle',
        'window.wppbFbIsFormScreen = ' . ( $is_form_screen ? 'true' : 'false' ) . ';',
        'before'
    );
}

/**
 * Field blocks gated by `"wppbAddonFieldType"` when the add-on bridge is inactive.
 *
 * @return string[] Block names to hide from the PB-form inserter.
 */
function wppb_fb_inactive_addon_field_blocks() {
    $enabled = apply_filters( 'wppb_fb_enabled_addon_field_types', array() );
    $hidden  = array();
    foreach ( WPPB_FB_Field_Registry::all() as $field_type => $entry ) {
        if ( ! empty( $entry['addon_gated'] ) && ! in_array( $field_type, (array) $enabled, true ) ) {
            $hidden[] = $entry['block'];
        }
    }
    return $hidden;
}

/**
 * Structural blocks declaring `"wppbAddonBlock": true` (block.json scan).
 *
 * @return string[] Registered structural block names with the flag.
 */
function wppb_fb_addon_gated_structural_blocks() {
    static $cache = null;
    if ( $cache !== null ) return $cache;

    $cache      = array();
    $blocks_dir = __DIR__ . '/blocks/src/blocks';
    if ( ! is_dir( $blocks_dir ) ) return $cache;

    $it = new DirectoryIterator( $blocks_dir );
    foreach ( $it as $fileinfo ) {
        if ( ! $fileinfo->isDir() || $fileinfo->isDot() ) continue;
        $json = WPPB_FB_Field_Registry::read_block_json( $fileinfo->getPathname() . '/block.json' );
        if ( ! is_array( $json ) || empty( $json['name'] ) ) continue;
        if ( strpos( $json['name'], 'profile-builder/field-' ) === 0 ) continue;
        if ( empty( $json['wppbAddonBlock'] ) ) continue;
        $cache[] = $json['name'];
    }
    return $cache;
}

/**
 * Structural add-on blocks inactive via `wppb_fb_enabled_structural_blocks`.
 *
 * @return string[] Block names to hide from the PB-form inserter.
 */
function wppb_fb_inactive_addon_structural_blocks() {
    $enabled = apply_filters( 'wppb_fb_enabled_structural_blocks', array() );
    $hidden  = array();
    foreach ( wppb_fb_addon_gated_structural_blocks() as $name ) {
        if ( ! in_array( $name, (array) $enabled, true ) ) {
            $hidden[] = $name;
        }
    }
    return $hidden;
}

/**
 * Core field blocks the classic Manage Fields dropdown offers only under a
 * particular WP context/setting; the form-builder inserter mirrors those gates.
 *
 * @return string[] PB field block names to exclude from the PB-form inserter.
 */
function wppb_fb_context_hidden_field_blocks() {
    $hidden = array();

    // Blog Details only when multisite blog signup is on (manage-fields.php).
    if ( ! function_exists( 'wppb_can_users_signup_blog' ) || ! wppb_can_users_signup_blog() ) {
        $hidden[] = 'profile-builder/field-default-blog-details';
    }

    // Legacy IM fields only on DB versions before WP 3.6 defaults (manage-fields.php).
    $show_contact_methods = apply_filters( 'wppb_remove_default_contact_methods', get_site_option( 'initial_db_version' ) < 23588 );
    if ( ! $show_contact_methods ) {
        $hidden[] = 'profile-builder/field-default-aim';
        $hidden[] = 'profile-builder/field-default-yim';
        $hidden[] = 'profile-builder/field-default-jabber';
    }

    /**
     * Extend or override context-gated blocks hidden from the inserter.
     *
     * @param string[] $hidden Block names to hide.
     */
    return apply_filters( 'wppb_fb_context_hidden_field_blocks', $hidden );
}

/**
 * Wire an add-on subscribe field: gating filter + `window.wppbFb.<bridge_key>` on
 * `wppb_fb_enqueue_editor_assets_late`. Lists come from cached settings, not live API.
 *
 * @param array $config {
 *     @type string   $field_type   PB field-type label. Required.
 *     @type string   $bridge_key   `window.wppbFb` key for SubscribeFieldEdit. Required.
 *     @type callable $lists        `[ { value, label } ]` for the editor selector.
 *     @type string   $settings_url Add-on settings admin URL ('' if none).
 * }
 */
function wppb_fb_register_subscribe_bridge( array $config ) {
    $field_type   = isset( $config['field_type'] ) ? (string) $config['field_type'] : '';
    $bridge_key   = isset( $config['bridge_key'] ) ? (string) $config['bridge_key'] : '';
    $settings_url = isset( $config['settings_url'] ) ? (string) $config['settings_url'] : '';
    $lists_cb     = isset( $config['lists'] ) ? $config['lists'] : null;

    // A malformed config would otherwise emit `window.wppbFb. = …`; bail instead.
    if ( $field_type === '' || $bridge_key === '' ) return;

    add_filter( 'wppb_fb_enabled_addon_field_types', function ( $types ) use ( $field_type ) {
        $types[] = $field_type;
        return $types;
    } );

    add_action( 'wppb_fb_enqueue_editor_assets_late', function () use ( $bridge_key, $settings_url, $lists_cb ) {
        $lists = is_callable( $lists_cb ) ? call_user_func( $lists_cb ) : array();
        if ( ! is_array( $lists ) ) $lists = array();

        $payload = array(
            // array_values so an associative return still encodes as a JS array.
            'lists'       => array_values( $lists ),
            'settingsUrl' => $settings_url,
        );
        wp_add_inline_script(
            'wppb-form-editor-bundle',
            'window.wppbFb = window.wppbFb || {}; window.wppbFb.' . $bridge_key . ' = ' . wp_json_encode( $payload ) . ';',
            'before'
        );
    } );
}

/**
 * Whether a post type is a form-builder CPT. Editor-mode gate is
 * `wppb_fb_is_active_for()`; use this for behavior in both editor modes.
 */
function wppb_fb_is_form_cpt( $post_type ) {
    return in_array( $post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true );
}

/** Disables remote block patterns for the form editor. */
add_filter( 'should_load_remote_block_patterns', 'wppb_fb_disable_remote_patterns' );
function wppb_fb_disable_remote_patterns( $should_load ) {
    return wppb_fb_is_form_cpt( get_post_type() ) ? false : $should_load;
}

/** Disables all block patterns in the editor settings for the form CPTs. */
add_filter( 'block_editor_settings_all', 'wppb_fb_disable_patterns_in_settings', 10, 2 );
function wppb_fb_disable_patterns_in_settings( $settings, $context ) {
    if ( ! wppb_fb_is_form_cpt( $context->post->post_type ) ) {
        return $settings;
    }

    $settings['__experimentalBlockPatterns'] = array();
    $settings['__experimentalBlockPatternCategories'] = array();

    return $settings;
}

// 2. Block category registration

/**
 * Registers the PB block categories, mirroring classic Manage Fields' optgroups.
 */
add_filter( 'block_categories_all', 'wppb_fb_register_block_category', 10, 2 );
function wppb_fb_register_block_category( $categories, $context ) {
    if ( empty( $context->post ) || ! wppb_fb_is_form_cpt( $context->post->post_type ) ) {
        return $categories;
    }
    return array_merge(
        $categories,
        array(
            // No category icon — Gutenberg duplicates per-block icons.
            array(
                'slug'  => 'profile-builder-default',
                'title' => __( 'Default', 'profile-builder' ),
            ),
            array(
                'slug'  => 'profile-builder-standard',
                'title' => __( 'Standard', 'profile-builder' ),
            ),
            array(
                'slug'  => 'profile-builder-advanced',
                'title' => __( 'Advanced', 'profile-builder' ),
            ),
            array(
                'slug'  => 'profile-builder-other',
                'title' => __( 'Other', 'profile-builder' ),
            ),
            array(
                'slug'  => 'profile-builder-structural',
                'title' => __( 'Structural', 'profile-builder' ),
            ),
        )
    );
}

// 3. Editor gating contracts (filterable getters)

/**
 * PB field types that cannot HOST a conditional-logic rule (the CL panel isn't
 * shown for them in the block editor). Mirrors the legacy admin JS
 * `disabled_fields` array.
 */
function wppb_fb_cf_disabled_field_types() {
    return apply_filters( 'wppb_fb_cf_disabled_field_types', array(
        'Default - Username',
        'Default - E-mail',
        'Default - Password',
        'Default - Repeat Password',
        'reCAPTCHA',
        'Turnstile',
        'Heading',
        'HTML',
        'Honeypot',
    ) );
}

/**
 * PB field types that may appear at most once per form. Prefers the legacy
 * `wppb_return_unique_field_list()` when it's loaded, so the contract and its
 * `wppb_unique_field_list` filter have one source.
 */
function wppb_fb_unique_field_types() {
    if ( function_exists( 'wppb_return_unique_field_list' ) ) {
        $list = wppb_return_unique_field_list();
    } else {
        /*
         * Front-end path when manage-fields.php is not loaded. Must match
         * wppb_return_unique_field_list() exactly or sites diverge by request.
         */
        $list = array(
            'Default - Name (Heading)',
            'Default - Contact Info (Heading)',
            'Default - About Yourself (Heading)',
            'Default - Username',
            'Default - First Name',
            'Default - Last Name',
            'Default - Nickname',
            'Default - E-mail',
            'Default - Website',
        );

        // Default contact methods were removed in WP 3.6.
        if ( apply_filters( 'wppb_remove_default_contact_methods', get_site_option( 'initial_db_version' ) < 23588 ) ) {
            $list[] = 'Default - AIM';
            $list[] = 'Default - Yahoo IM';
            $list[] = 'Default - Jabber / Google Talk';
        }

        $list[] = 'Default - Password';
        $list[] = 'Default - Repeat Password';
        $list[] = 'Default - Biographical Info';
        $list[] = 'Default - Display name publicly as';
        $list[] = 'GDPR Checkbox';
        $list[] = 'Email Confirmation';

        if ( function_exists( 'wppb_can_users_signup_blog' ) && wppb_can_users_signup_blog() ) {
            $list[] = 'Default - Blog Details';
        }

        $list[] = 'Avatar';
        $list[] = 'reCAPTCHA';
        $list[] = 'Turnstile';
        $list[] = 'Select (User Role)';
        $list[] = 'Map';

        // Apply the legacy filter this branch used to skip.
        $list = apply_filters( 'wppb_unique_field_list', $list );
    }
    return apply_filters( 'wppb_fb_unique_field_types', array_values( $list ) );
}

/** Groups of mutually exclusive field types: at most one per group, per form. */
function wppb_fb_exclusive_field_groups() {
    return apply_filters( 'wppb_fb_exclusive_field_groups', array(
        array( 'reCAPTCHA', 'Turnstile' ),
    ) );
}

// 4. Block registration (init priority 30)

add_action( 'init', 'wppb_fb_register_blocks', 30 );
function wppb_fb_register_blocks() {
    if ( ! function_exists( 'register_block_type' ) ) return;

    $asset_file = __DIR__ . '/blocks/build/index.asset.php';
    if ( ! file_exists( $asset_file ) ) return;

    $assets = include( $asset_file );
    $handle = 'wppb-form-editor-bundle';

    wp_register_script(
        $handle,
        WPPB_PLUGIN_URL . 'form-builder/blocks/build/index.js',
        $assets['dependencies'],
        $assets['version']
    );

    wp_register_style(
        $handle,
        WPPB_PLUGIN_URL . 'form-builder/blocks/build/style-index.css',
        array(),
        $assets['version']
    );

    $blocks_dir = __DIR__ . '/blocks/src/blocks';
    if ( ! is_dir( $blocks_dir ) ) return;

    $cf_disabled        = wppb_fb_cf_disabled_field_types();
    $no_meta_name_types = wppb_fb_no_meta_name_field_types();
    $default_meta_map   = wppb_fb_default_field_meta_names();
    $unique_types       = wppb_fb_unique_field_types();

    $it = new DirectoryIterator( $blocks_dir );
    foreach ( $it as $fileinfo ) {
        if ( $fileinfo->isDir() && ! $fileinfo->isDot() ) {
            $block_json_path = $fileinfo->getPathname() . '/block.json';
            // Shared registry parse cache; returned copy so mutations below are safe.
            $metadata = WPPB_FB_Field_Registry::read_block_json( $block_json_path );
            if ( ! $metadata || ! isset( $metadata['name'] ) ) continue;

            $metadata['editor_script'] = $handle;
            $metadata['editor_style']  = $handle;

            if ( ! isset( $metadata['attributes'] ) || ! is_array( $metadata['attributes'] ) ) {
                $metadata['attributes'] = array();
            }

            // Legacy renderer ignores anchor/CSS class; hide Advanced panel support.
            if ( ! isset( $metadata['supports'] ) || ! is_array( $metadata['supports'] ) ) {
                $metadata['supports'] = array();
            }
            $metadata['supports']['customClassName'] = false;
            $metadata['supports']['anchor']          = false;

            // Structural blocks skip field attribute injection.
            $is_field_block = strpos( $metadata['name'], 'profile-builder/field-' ) === 0;
            if ( ! $is_field_block ) {
                register_block_type( $metadata['name'], $metadata );
                continue;
            }

            $field_type = WPPB_FB_Field_Registry::get_field_type_from_block_name( $metadata['name'], $metadata );

            $metadata['attributes'] = wppb_fb_compute_field_attributes(
                $metadata['attributes'],
                $field_type,
                $metadata['name'],
                array(
                    'cf_disabled'        => $cf_disabled,
                    'default_meta_map'   => $default_meta_map,
                    'no_meta_name_types' => $no_meta_name_types,
                    'context_label'      => 'register',
                )
            );

            // supports.multiple=false gates inserter/duplicate; server still re-checks.
            if ( in_array( $field_type, $unique_types, true ) ) {
                if ( ! isset( $metadata['supports'] ) || ! is_array( $metadata['supports'] ) ) {
                    $metadata['supports'] = array();
                }
                $metadata['supports']['multiple'] = false;
            }

            register_block_type( $metadata['name'], $metadata );
        }
    }
}

// 5. Editor assets + inline-script bridges

add_action( 'enqueue_block_editor_assets', 'wppb_fb_enqueue_editor_assets' );
function wppb_fb_enqueue_editor_assets() {
    $post_type = get_post_type();
    if ( ! wppb_fb_is_form_cpt( $post_type ) ) {
        return;
    }
    wp_enqueue_script( 'wppb-form-editor-bundle' );
    wp_enqueue_style( 'wppb-form-editor-bundle' );

    $registry = WPPB_FB_Field_Registry::all();
    $block_to_field_type = array();
    foreach ( $registry as $field_type => $entry ) {
        $block_to_field_type[ $entry['block'] ] = $field_type;
    }

    // Field types that cannot be rule sources (legacy wppb_conditional_fields_not_allowed).
    $not_allowed_as_source = apply_filters( 'wppb_conditional_fields_not_allowed', array(
        'Default - Name (Heading)',
        'Default - Contact Info (Heading)',
        'Default - About Yourself (Heading)',
        'Default - Password',
        'Default - Repeat Password',
        'Heading',
        'WYSIWYG',
        'Checkbox (Terms and Conditions)',
        'Upload',
        'Avatar',
        'reCAPTCHA',
        'Turnstile',
        'HTML',
        'Map',
    ), array() );

    // Fresh each load so new post types / taxonomies appear.
    $reserved = function_exists( 'wppb_get_reserved_meta_name_list' )
        ? wppb_get_reserved_meta_name_list( wppb_fb_manage_fields(), array() )
        : array();

    $default_meta_map = wppb_fb_default_field_meta_names();

    // Exclusive groups need an editor Notice; Gutenberg has no native mutual-exclusion.
    $unique_types           = wppb_fb_unique_field_types();
    $unique_block_names     = array();
    foreach ( $unique_types as $field_type ) {
        if ( isset( $registry[ $field_type ]['block'] ) ) {
            $unique_block_names[] = $registry[ $field_type ]['block'];
        }
    }

    $exclusive_groups       = wppb_fb_exclusive_field_groups();
    $exclusive_block_groups = array();
    foreach ( $exclusive_groups as $group ) {
        $block_group = array();
        foreach ( $group as $field_type ) {
            if ( isset( $registry[ $field_type ]['block'] ) ) {
                $block_group[] = $registry[ $field_type ]['block'];
            }
        }
        if ( count( $block_group ) > 1 ) {
            $exclusive_block_groups[] = $block_group;
        }
    }

    // Role list for Set Role (RF) and Repeater row limits; legacy WCK order.
    global $wp_roles;
    $roles_assoc = ( $wp_roles && isset( $wp_roles->roles ) ) ? $wp_roles->roles : array();

    $ordered = array();
    foreach ( array( 'administrator', 'editor', 'author', 'contributor', 'subscriber' ) as $slug ) {
        if ( isset( $roles_assoc[ $slug ] ) ) {
            $ordered[ $slug ] = $roles_assoc[ $slug ];
            unset( $roles_assoc[ $slug ] );
        }
    }
    foreach ( $roles_assoc as $slug => $role ) {
        $ordered[ $slug ] = $role;
    }

    $role_options = array(
        array( 'label' => __( 'Default Role', 'profile-builder' ), 'value' => 'default role' ),
    );
    foreach ( $ordered as $slug => $role ) {
        $role_options[] = array(
            'label' => translate_user_role( $role['name'] ),
            'value' => $slug,
        );
    }

    // User Role field list: same order, no sentinel, no administrator.
    $user_role_field_options = array();
    foreach ( $ordered as $slug => $role ) {
        if ( 'administrator' === $slug ) {
            continue;
        }
        $user_role_field_options[] = array(
            'label' => translate_user_role( $role['name'] ),
            'value' => $slug,
        );
    }

    // loginWith=email strips Username on front end; editor shows a Notice.
    $general = get_option( 'wppb_general_settings', array() );
    $login_with = ( is_array( $general ) && isset( $general['loginWith'] ) ) ? (string) $general['loginWith'] : 'usernameemail';

    // Select option values must match classic admin encoding (ISO country/currency,
    // timezone string as value+label, CPT/taxonomy slugs).
    $select_field_options = array(
        'countries'  => array(),
        'currencies' => array(),
        'timezones'  => array(),
        'postTypes'  => array(),
        'taxonomies' => array(),
    );

    if ( function_exists( 'wppb_country_select_options' ) ) {
        foreach ( wppb_country_select_options( 'back_end' ) as $iso => $name ) {
            $select_field_options['countries'][] = array(
                'label' => $name,
                'value' => (string) $iso,
            );
        }
    }

    if ( function_exists( 'wppb_get_currencies' ) ) {
        $select_field_options['currencies'][] = array(
            'label' => __( '— Select a Currency —', 'profile-builder' ),
            'value' => '',
        );
        foreach ( wppb_get_currencies( 'back_end' ) as $iso => $name ) {
            $select_field_options['currencies'][] = array(
                'label' => $name,
                'value' => (string) $iso,
            );
        }
    }

    if ( function_exists( 'wppb_timezone_select_options' ) ) {
        $select_field_options['timezones'][] = array(
            'label' => __( '— Select a Timezone —', 'profile-builder' ),
            'value' => '',
        );
        foreach ( wppb_timezone_select_options( 'back_end' ) as $tz ) {
            $select_field_options['timezones'][] = array(
                'label' => (string) $tz,
                'value' => (string) $tz,
            );
        }
    }

    // Public post types/taxonomies; defaults match classic (post/category).
    foreach ( get_post_types( array( 'public' => true ), 'objects' ) as $pt ) {
        if ( isset( $pt->label ) ) {
            $select_field_options['postTypes'][] = array(
                'label' => $pt->label,
                'value' => $pt->name,
            );
        }
    }
    foreach ( get_taxonomies( array( 'public' => true ), 'objects' ) as $tax ) {
        if ( isset( $tax->label ) ) {
            $select_field_options['taxonomies'][] = array(
                'label' => $tax->label,
                'value' => $tax->name,
            );
        }
    }

    // One `window.wppbFb` snapshot per load (install/config only). Add-ons merge via
    // integrations/; existingFields.fields is the lone live-read exception.
    $bridge = array(
        'conditionalFields' => array(
            // Conditional fields panel is paid-only.
            'available'          => wppb_fb_conditional_logic_available(),
            'blockToFieldType'   => $block_to_field_type,
            'notAllowedAsSource' => array_values( $not_allowed_as_source ),
            'disabledFieldTypes' => array_values( wppb_fb_cf_disabled_field_types() ),
            'numericFieldTypes'  => array( 'Input', 'Textarea', 'Number' ),
            'restRoot'           => esc_url_raw( rest_url( 'wppb/v1/cf-source-options' ) ),
            'restNonce'          => wp_create_nonce( 'wp_rest' ),
        ),
        'metaNames' => array(
            'defaultFieldTypes'    => array_keys( $default_meta_map ),
            'defaultMetaNames'     => $default_meta_map,
            'fixedMetaNameFieldTypes' => array_keys( wppb_fb_fixed_meta_name_field_types() ),
            'noMetaNameFieldTypes' => array_values( wppb_fb_no_meta_name_field_types() ),
            'noOverwriteFieldTypes' => array_values( wppb_fb_no_overwrite_existing_field_types() ),
            'reservedNames'        => array_values( $reserved ),
            'reservedSubstrings'   => array( 'map' ),
            'customFieldPrefix'    => 'custom_field_',
            'maxLength'            => 255,
            'uploadFieldType'      => 'Upload',
        ),
        'allocate' => array(
            'restRoot'  => esc_url_raw( rest_url( 'wppb/v1/allocate-field-id' ) ),
            'restNonce' => wp_create_nonce( 'wp_rest' ),
        ),
        'existingFields' => array(
            'fields' => wppb_fb_existing_fields_bridge(),
        ),
        'uniqueness' => array(
            'uniqueBlocks'         => $unique_block_names,
            'exclusiveBlockGroups' => $exclusive_block_groups,
        ),
        'formSettings' => array(
            'roles' => $role_options,
        ),
        'userRoleField' => array(
            'roles' => $user_role_field_options,
        ),
        'selectFields' => $select_field_options,
        'generalSettings' => array(
            'loginWith' => $login_with,
        ),
        'repeater' => array(
            'parentBlockName' => 'profile-builder/field-repeater',
            'allowedBlocks'   => wppb_fb_repeater_allowed_block_names(),
        ),
        // Honors filtered wppb_fb_mandatory_registration_field_types.
        'mandatoryTypes' => array_values( wppb_fb_mandatory_registration_field_types() ),
        'preview' => array(
            'home'  => esc_url_raw( home_url( '/' ) ),
            'nonce' => wp_create_nonce( 'wppb_fb_preview' ),
        ),
    );

    wp_add_inline_script(
        'wppb-form-editor-bundle',
        'window.wppbFb = Object.assign( window.wppbFb || {}, ' . wp_json_encode( $bridge ) . ' );',
        'before'
    );

    do_action( 'wppb_fb_enqueue_editor_assets_late' );
}

/**
 * Deep-merge add-on schemas into `window.wppbFb.extraAttributes`.
 * Flat assign would drop keys when two bridges share a field type.
 *
 * @param array $payload_by_field_type PB field-type label => `{ attrSlug => schema }`.
 */
function wppb_fb_extra_attributes_inline_script( array $payload_by_field_type ): void {
    if ( empty( $payload_by_field_type ) ) return;
    if ( ! wp_script_is( 'wppb-form-editor-bundle', 'registered' ) ) return;

    $iife = '(function(extra){'
        . 'window.wppbFb=window.wppbFb||{};'
        . 'window.wppbFb.extraAttributes=window.wppbFb.extraAttributes||{};'
        . 'for(var ft in extra){'
            . 'var prev=window.wppbFb.extraAttributes[ft];'
            . 'window.wppbFb.extraAttributes[ft]=Object.assign('
                . '(typeof prev==="object"&&prev!==null)?prev:{},'
                . 'extra[ft]'
            . ');'
        . '}'
        . '})(' . wp_json_encode( $payload_by_field_type ) . ');';

    wp_add_inline_script( 'wppb-form-editor-bundle', $iife, 'before' );
}

/**
 * All PB field-type labels for bridge payloads.
 *
 * Safe from `wppb_fb_enqueue_editor_assets_late`. Do not call from
 * `wppb_fb_block_attributes` — recurses into registry construction.
 *
 * @return string[] Field-type labels.
 */
function wppb_fb_all_field_type_labels(): array {
    if ( ! class_exists( 'WPPB_FB_Field_Registry' ) ) return array();
    return array_keys( WPPB_FB_Field_Registry::all() );
}

/**
 * Register a generic Additional Settings control on `window.wppbFb.extraControls`.
 * Pairs with `wppb_fb_block_attributes` + `wppb_fb_extra_attributes_inline_script()`.
 * Repeat calls de-dupe by attribute (last wins).
 *
 * @param array $control {
 *     @type string $attribute Block attribute slug. Required.
 *     @type string $label     Control label.
 *     @type string $help      Help text.
 *     @type string $control   'text' (default) | 'number'.
 * }
 */
function wppb_fb_register_extra_field_control( array $control ): void {
    if ( empty( $control['attribute'] ) ) return;
    if ( ! wp_script_is( 'wppb-form-editor-bundle', 'registered' ) ) return;

    $iife = '(function(c){'
        . 'window.wppbFb=window.wppbFb||{};'
        . 'window.wppbFb.extraControls=window.wppbFb.extraControls||[];'
        . 'window.wppbFb.extraControls.push(c);'
        . '})(' . wp_json_encode( $control ) . ');';

    wp_add_inline_script( 'wppb-form-editor-bundle', $iife, 'before' );
}
