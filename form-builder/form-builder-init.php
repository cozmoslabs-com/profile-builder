<?php
/**
 * Form Builder bootstrap and admin chrome.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Canonical "form builder is loaded" sentinel for separately distributed integrations.
 * Test this name — not an arbitrary wppb_fb_* helper (renames would break the guard).
 *
 * @return bool Always true; the function's existence is the signal.
 */
function wppb_fb_loaded() {
    return true;
}

// 1. Core Logic & CPTs
include_once( __DIR__ . '/class-field-registry.php' );
include_once( __DIR__ . '/form-builder-licensing.php' );
include_once( __DIR__ . '/form-builder-editor-mode.php' );
include_once( __DIR__ . '/form-builder-cpts.php' );
include_once( __DIR__ . '/form-builder-hooks.php' );
include_once( __DIR__ . '/form-builder-defaults.php' );

include_once( __DIR__ . '/form-builder-meta-names.php' );
include_once( __DIR__ . '/form-builder-row-projection.php' );
include_once( __DIR__ . '/form-builder-rest-mirror.php' );
include_once( __DIR__ . '/form-builder-projection.php' );
include_once( __DIR__ . '/form-builder-rest-routes.php' );
include_once( __DIR__ . '/form-builder-registration.php' );
include_once( __DIR__ . '/form-builder-editor-chrome.php' );
include_once( __DIR__ . '/form-builder-preview.php' );

// Integrations ship with the form builder (free vs paid update skew). Separate
// plugins (pms.php) load unconditionally — they may init after PB.
include_once( __DIR__ . '/integrations/pms.php' );

/**
 * Add-on slug => PHP probe (function_exists/defined). Must be long-lived and live
 * in the same branch that used to load the bridge — never a JS name.
 *
 * @return array<string,string> Slug => function or constant name.
 */
function wppb_fb_addon_integrations() {
    return array(
        'campaign-monitor'               => 'WPPBCMI_IN_PLUGIN_DIR',
        'edit-profile-approved-by-admin' => 'WPPBEPAA_IN_PLUGIN_DIR',
        'field-visibility'               => 'wppb_in_field_visibility_get_extra_fields',
        'form-fields-in-columns'         => 'wppb_in_ffc_add_meta_boxes',
        'mailchimp-integration'          => 'WPPBMCI_IN_PLUGIN_DIR',
        'mailpoet-integration'           => 'wppb_in_mpi_get_lists',
        'multi-step-forms'               => 'wppb_in_msf_add_meta_boxes',
        'progress-bar'                   => 'WPPBPB_PLUGIN_DIR',
        'woocommerce'                    => 'wppb_in_woo_get_billing_fields',
        'custom-css-classes-on-fields'   => 'wppb_ccc_scripts',
        'gdpr-communication-preferences' => 'PBGCP_ADD_ON_DIR',
        'maximum-character-length'       => 'wppb_mcl_scripts',
    );
}

/**
 * Whether an integration's add-on is loaded, per its registry probe.
 *
 * @param string $slug Add-on slug from wppb_fb_addon_integrations().
 * @return bool
 */
function wppb_fb_addon_integration_active( $slug ) {
    $probes = wppb_fb_addon_integrations();
    if ( ! isset( $probes[ $slug ] ) ) {
        return false;
    }
    $probe = $probes[ $slug ];
    return function_exists( $probe ) || defined( $probe );
}

/** Include each add-on integration whose probe passes. */
function wppb_fb_load_addon_integrations() {
    $paid = defined( 'WPPB_PAID_PLUGIN_DIR' ) ? WPPB_PAID_PLUGIN_DIR : '';

    foreach ( array_keys( wppb_fb_addon_integrations() ) as $slug ) {
        if ( ! wppb_fb_addon_integration_active( $slug ) ) {
            continue;
        }

        // Skip if paid plugin already ships its own bridge (fatal redeclare otherwise).
        if ( '' !== $paid && file_exists( $paid . '/add-ons-advanced/' . $slug . '/form-builder-bridge.php' ) ) {
            continue;
        }

        include_once( __DIR__ . '/integrations/' . $slug . '.php' );
    }
}

// plugins_loaded@11: file loads at priority 10 before add-ons; direct call if late.
if ( doing_action( 'plugins_loaded' ) || ! did_action( 'plugins_loaded' ) ) {
    add_action( 'plugins_loaded', 'wppb_fb_load_addon_integrations', 11 );
} else {
    wppb_fb_load_addon_integrations();
}

// require_once: hooks.php registers wppb_change_form_fields unconditionally.
require_once( __DIR__ . '/multiple-forms/multiple-forms.php' );

/**
 * Forms menu plan from CPT editor modes: unified entry replaces RF auto when modern;
 * remove EPF auto only when unified can host its tab.
 *
 * @param bool $rf_modern  RF CPT uses the block editor.
 * @param bool $epf_modern EPF CPT uses the block editor.
 * @return array{add_unified:bool,remove_rf_auto:bool,remove_epf_auto:bool}
 */
function wppb_fb_forms_menu_plan( $rf_modern, $epf_modern ) {
    $add_unified = (bool) $rf_modern;
    return array(
        'add_unified'     => $add_unified,
        'remove_rf_auto'  => (bool) $rf_modern,
        'remove_epf_auto' => ( (bool) $epf_modern ) && $add_unified,
    );
}

add_action( 'admin_menu', 'wppb_fb_register_forms_menu', 15 );
function wppb_fb_register_forms_menu() {
    $plan = wppb_fb_forms_menu_plan(
        wppb_fb_is_active_for( 'wppb-rf-cpt' ),
        wppb_fb_is_active_for( 'wppb-epf-cpt' )
    );

    // Remove before add: Forms reuses the RF list slug.
    if ( $plan['remove_rf_auto'] ) {
        remove_submenu_page( 'profile-builder', 'edit.php?post_type=wppb-rf-cpt' );
    }
    if ( $plan['remove_epf_auto'] ) {
        remove_submenu_page( 'profile-builder', 'edit.php?post_type=wppb-epf-cpt' );
    }

    if ( $plan['add_unified'] ) {
        add_submenu_page(
            'profile-builder',
            __( 'Forms', 'profile-builder' ),
            __( 'Forms', 'profile-builder' ),
            'manage_options',
            'edit.php?post_type=wppb-rf-cpt'
        );
    }

    // manage-fields stays in $submenu (CSS-hidden): remove_submenu_page breaks the hookname.
}

add_action( 'admin_menu', 'wppb_fb_reorder_forms_submenu', 999 );
function wppb_fb_reorder_forms_submenu() {
    global $submenu;
    if ( empty( $submenu['profile-builder'] ) || ! is_array( $submenu['profile-builder'] ) ) {
        return;
    }

    $forms_index      = null;
    $basic_info_index = null;
    foreach ( $submenu['profile-builder'] as $key => $item ) {
        if ( ! isset( $item[2] ) ) continue;
        if ( $item[2] === 'edit.php?post_type=wppb-rf-cpt' ) $forms_index      = $key;
        if ( $item[2] === 'profile-builder-basic-info' )     $basic_info_index = $key;
    }
    if ( $forms_index === null || $basic_info_index === null ) {
        return;
    }

    $forms_entry = $submenu['profile-builder'][ $forms_index ];
    unset( $submenu['profile-builder'][ $forms_index ] );

    $reordered = array();
    foreach ( $submenu['profile-builder'] as $item ) {
        $reordered[] = $item;
        if ( isset( $item[2] ) && $item[2] === 'profile-builder-basic-info' ) {
            $reordered[] = $forms_entry;
        }
    }
    $submenu['profile-builder'] = $reordered;
}

/**
 * Strip slugdiv on classic form CPT screens (slug is internal; editing breaks refs).
 */
add_action( 'add_meta_boxes', 'wppb_fb_remove_slug_metabox_from_form_cpts', 100 );
function wppb_fb_remove_slug_metabox_from_form_cpts() {
    remove_meta_box( 'slugdiv', 'wppb-rf-cpt',  'normal' );
    remove_meta_box( 'slugdiv', 'wppb-epf-cpt', 'normal' );
}

add_action( 'admin_head', 'wppb_fb_hide_legacy_manage_fields_menu_item' );
function wppb_fb_hide_legacy_manage_fields_menu_item() {
    ?>
    <style id="wppb-fb-hide-manage-fields-menu">
        #adminmenu #toplevel_page_profile-builder .wp-submenu a[href$="admin.php?page=manage-fields"],
        #adminmenu #toplevel_page_profile-builder .wp-submenu a[href$="page=manage-fields"] {
            display: none;
        }
    </style>
    <?php
}

/** Keep Forms menu highlighted on form CPT screens. */
add_filter( 'parent_file', 'wppb_fb_keep_forms_menu_active' );
function wppb_fb_keep_forms_menu_active( $parent_file ) {
    global $submenu_file, $current_screen;

    if ( ! empty( $current_screen ) && in_array( $current_screen->post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) {
        $submenu_file = 'edit.php?post_type=wppb-rf-cpt';
        return 'profile-builder';
    }

    return $parent_file;
}

/** Whether the current screen is a form CPT list table. */
function wppb_fb_is_forms_list_screen() {
    $screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
    return ! empty( $screen )
        && $screen->base === 'edit'
        && in_array( $screen->post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true );
}

/**
 * RF / EPF tabs under the header banner (priority 11, after banner at 10).
 */
add_action( 'in_admin_header', 'wppb_fb_render_forms_tabs', 11 );
function wppb_fb_render_forms_tabs() {
    if ( ! wppb_fb_is_forms_list_screen() ) {
        return;
    }

    $screen = get_current_screen();
    $tabs   = array(
        'wppb-rf-cpt'  => __( 'Registration Forms', 'profile-builder' ),
        'wppb-epf-cpt' => __( 'Edit Profile Forms', 'profile-builder' ),
    );
    ?>
    <nav class="nav-tab-wrapper cozmoslabs-nav-tab-wrapper wppb-forms-header-tabs">
        <?php foreach ( $tabs as $post_type => $label ) : ?>
            <a href="<?php echo esc_url( admin_url( 'edit.php?post_type=' . $post_type ) ); ?>" class="nav-tab <?php echo ( $screen->post_type === $post_type ? 'nav-tab-active' : '' ); ?>">
                <?php echo esc_html( $label ); ?>
            </a>
        <?php endforeach; ?>
    </nav>
    <?php
}

/** Body class for list-screen reskin CSS. */
add_filter( 'admin_body_class', 'wppb_fb_forms_list_body_class' );
function wppb_fb_forms_list_body_class( $classes ) {
    if ( wppb_fb_is_forms_list_screen() ) {
        $classes .= ' wppb-forms-list-screen';
    }
    return $classes;
}

/** "Default" post state on default forms in the list tables. */
add_filter( 'display_post_states', 'wppb_fb_forms_default_post_state', 10, 2 );
function wppb_fb_forms_default_post_state( $post_states, $post ) {
    if ( in_array( $post->post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true )
        && get_post_meta( $post->ID, '_pbform_is_default', true ) === '1' ) {
        $post_states['wppb_fb_default_form'] = __( 'Default', 'profile-builder' );
    }
    return $post_states;
}

/** Remove Quick Edit / bulk Edit (they expose the internal slug). */
add_filter( 'post_row_actions', 'wppb_fb_forms_remove_quick_edit', 10, 2 );
function wppb_fb_forms_remove_quick_edit( $actions, $post ) {
    if ( in_array( $post->post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) {
        unset( $actions['inline hide-if-no-js'] );
    }
    return $actions;
}

add_filter( 'bulk_actions-edit-wppb-rf-cpt', 'wppb_fb_forms_remove_bulk_edit' );
add_filter( 'bulk_actions-edit-wppb-epf-cpt', 'wppb_fb_forms_remove_bulk_edit' );
function wppb_fb_forms_remove_bulk_edit( $actions ) {
    unset( $actions['edit'] );
    return $actions;
}

/** Wrap Published status for list-table reskin CSS. */
add_filter( 'post_date_column_status', 'wppb_fb_forms_date_column_status', 10, 2 );
function wppb_fb_forms_date_column_status( $status, $post ) {
    if ( in_array( $post->post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) && $post->post_status === 'publish' ) {
        return '<span class="wppb-forms-status-published">' . esc_html( $status ) . '</span>';
    }
    return $status;
}
