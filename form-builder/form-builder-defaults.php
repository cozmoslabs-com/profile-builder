<?php
/**
 * Ensures the two default forms exist and stay non-deletable.
 * Seeded with the full field list on create; then behave like any other form.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'init', 'wppb_fb_ensure_default_forms', 20 );
function wppb_fb_ensure_default_forms() {
    /*
     * Admin/cron/CLI only: concurrent anonymous init writers race on manage_fields,
     * and post_status=>any adoption needs edit caps (else a second default is created).
     */
    if ( ! is_admin() && ! wp_doing_cron() && ! ( defined( 'WP_CLI' ) && WP_CLI ) ) {
        return;
    }

    $defaults = get_option( 'wppb_default_form_ids', array() );
    $original = $defaults;

    // Adopt an existing default-flagged form before creating one.
    $defaults['register']     = wppb_fb_resolve_default_form_slot( 'register', isset( $defaults['register'] ) ? (int) $defaults['register'] : 0 );
    $defaults['edit_profile'] = wppb_fb_resolve_default_form_slot( 'edit_profile', isset( $defaults['edit_profile'] ) ? (int) $defaults['edit_profile'] : 0 );

    $repaired = ( $defaults !== $original );
    if ( $repaired ) {
        update_option( 'wppb_default_form_ids', $defaults );
    }

    wppb_fb_dedupe_default_forms( $defaults, $repaired );
    wppb_fb_migrate_legacy_forms_seed_fields();
    wppb_fb_prune_incomplete_conditional_logic_rules();
}

/**
 * One-time prune of CL rules with no source field (placeholder kills whole show/hide).
 * Flag-gated; skips Repeater sub-fields (CL stripped on write anyway).
 */
function wppb_fb_prune_incomplete_conditional_logic_rules() {
    if ( get_option( 'wppb_fb_cl_incomplete_rules_pruned' ) === '1' ) return;
    if ( ! function_exists( 'wppb_fb_cl_rule_has_source' ) ) return;

    $manage = wppb_fb_manage_fields();
    if ( is_array( $manage ) && ! empty( $manage ) ) {
        $changed = false;
        foreach ( $manage as $key => $row ) {
            if ( ! is_array( $row ) || empty( $row['conditional-logic'] ) ) continue;
            if ( ! is_string( $row['conditional-logic'] ) ) continue;

            $data = json_decode( $row['conditional-logic'], true );
            if ( ! is_array( $data ) || ! isset( $data['rules'] ) || ! is_array( $data['rules'] ) ) continue;

            $clean = array();
            foreach ( $data['rules'] as $rule ) {
                if ( wppb_fb_cl_rule_has_source( $rule ) ) {
                    $clean[] = $rule;
                }
            }
            if ( count( $clean ) === count( $data['rules'] ) ) continue;

            $data['rules'] = $clean;

            $manage[ $key ]['conditional-logic'] = wp_json_encode( $data );
            $changed                             = true;
        }
        if ( $changed ) {
            update_option( 'wppb_manage_fields', $manage );
        }
    }

    update_option( 'wppb_fb_cl_incomplete_rules_pruned', '1' );
}

/**
 * Canonical default-form post ID: tracked if valid, else adopt oldest flagged, else create.
 *
 * @param string $type       'register' | 'edit_profile'.
 * @param int    $tracked_id Currently tracked ID for the slot (0 if none).
 * @return int Post ID (0 only if creation failed).
 */
function wppb_fb_resolve_default_form_slot( $type, $tracked_id ) {
    $post_type = $type === 'register' ? 'wppb-rf-cpt' : 'wppb-epf-cpt';

    if ( $tracked_id > 0 ) {
        $post = get_post( $tracked_id );
        if ( $post
            && $post->post_type === $post_type
            && $post->post_status !== 'trash'
            && get_post_meta( $tracked_id, '_pbform_is_default', true ) === '1' ) {
            return $tracked_id;
        }
    }

    $existing = get_posts( array(
        'post_type'     => $post_type,
        'post_status'   => 'any',
        'numberposts'   => 1,
        'orderby'       => 'ID',
        'order'         => 'ASC',
        'fields'        => 'ids',
        'meta_key'      => '_pbform_is_default',
        'meta_value'    => '1',
        'no_found_rows' => true,
    ) );
    if ( ! empty( $existing ) ) {
        return (int) $existing[0];
    }

    $new_id = wppb_fb_create_default_form( $type );
    return $new_id ? (int) $new_id : 0;
}

/**
 * Demote other defaults; do not delete their posts.
 * Runs only when a slot was repaired ($force) or a stray flag armed the pending option.
 *
 * @param array $defaults Resolved slot => post ID map.
 * @param bool  $force    Run even when nothing armed the pending flag.
 * @return void
 */
function wppb_fb_dedupe_default_forms( $defaults, $force = false ) {
    if ( ! $force && get_option( 'wppb_fb_default_forms_dedupe_pending' ) !== '1' ) {
        return;
    }

    $slots = array(
        'wppb-rf-cpt'  => isset( $defaults['register'] ) ? (int) $defaults['register'] : 0,
        'wppb-epf-cpt' => isset( $defaults['edit_profile'] ) ? (int) $defaults['edit_profile'] : 0,
    );

    foreach ( $slots as $post_type => $keep ) {
        if ( ! $keep ) continue;

        $flagged = get_posts( array(
            'post_type'     => $post_type,
            'post_status'   => 'any',
            'numberposts'   => -1,
            'fields'        => 'ids',
            'meta_key'      => '_pbform_is_default',
            'meta_value'    => '1',
            'no_found_rows' => true,
        ) );

        foreach ( $flagged as $flagged_id ) {
            if ( (int) $flagged_id !== $keep ) {
                delete_post_meta( $flagged_id, '_pbform_is_default' );
            }
        }
    }

    delete_option( 'wppb_fb_default_forms_dedupe_pending' );
}

add_action( 'added_post_meta', 'wppb_fb_rearm_default_forms_dedupe', 10, 4 );
add_action( 'updated_post_meta', 'wppb_fb_rearm_default_forms_dedupe', 10, 4 );
/**
 * Arm dedupe when `_pbform_is_default` is set on a non-tracked form (import/duplicate).
 * Arm only — demote needs the resolved slot map and may run after several writes.
 *
 * @param int    $meta_id    Unused.
 * @param int    $post_id    Post the meta was written to.
 * @param string $meta_key   Meta key written.
 * @param mixed  $meta_value Value written.
 * @return void
 */
function wppb_fb_rearm_default_forms_dedupe( $meta_id, $post_id, $meta_key, $meta_value ) {
    if ( $meta_key !== '_pbform_is_default' ) return;
    if ( (string) $meta_value !== '1' ) return;

    $post_type = get_post_type( $post_id );
    if ( $post_type !== 'wppb-rf-cpt' && $post_type !== 'wppb-epf-cpt' ) return;

    $defaults = get_option( 'wppb_default_form_ids', array() );
    $slot     = $post_type === 'wppb-rf-cpt' ? 'register' : 'edit_profile';
    $tracked  = ( is_array( $defaults ) && isset( $defaults[ $slot ] ) ) ? (int) $defaults[ $slot ] : 0;
    if ( (int) $post_id === $tracked ) return;

    update_option( 'wppb_fb_default_forms_dedupe_pending', '1' );
}

/**
 * One-time seed for pre-rework forms with an empty ordered list (no read-path fallback).
 * Flag is per-CPT: classic mode skips without burning, so a later switch still seeds.
 */
function wppb_fb_migrate_legacy_forms_seed_fields() {
    foreach ( array( 'wppb-rf-cpt', 'wppb-epf-cpt' ) as $post_type ) {
        $flag = 'wppb_fb_legacy_forms_seeded_' . $post_type;
        if ( get_option( $flag ) === '1' ) continue;

        if ( ! wppb_fb_is_active_for( $post_type ) ) continue;

        $meta_key = $post_type === 'wppb-rf-cpt' ? 'wppb_rf_fields' : 'wppb_epf_fields';

        $ids = get_posts( array(
            'post_type'      => $post_type,
            'post_status'    => array( 'publish', 'draft', 'pending', 'private', 'future' ),
            'posts_per_page' => -1,
            'fields'         => 'ids',
            'no_found_rows'  => true,
        ) );

        foreach ( $ids as $post_id ) {
            $existing = get_post_meta( $post_id, $meta_key, true );
            if ( is_array( $existing ) && ! empty( $existing ) ) continue;
            wppb_fb_seed_form_fields_from_registry( $post_id, $post_type );
        }

        update_option( $flag, '1' );
    }
}

/**
 * One ordered-list entry in the projection's "Title ( Type )" shape.
 *
 * @param string $title Field title.
 * @param string $type  PB field-type label.
 * @param int    $id    Field id.
 * @return array{field:string,id:int}
 */
function wppb_fb_format_form_field_entry( $title, $type, $id ) {
    $field = function_exists( 'wppb_field_format' )
        ? wppb_field_format( $title, $type )
        : ( $title . ' ( ' . $type . ' )' );
    return array(
        'field' => $field,
        'id'    => (int) $id,
    );
}

/**
 * Seed per-form field list from the registry (same exclusions as legacy auto-draft seeder).
 */
function wppb_fb_seed_form_fields_from_registry( $post_id, $post_type ) {
    $all = wppb_fb_manage_fields();
    if ( ! is_array( $all ) || empty( $all ) ) return;

    $list = array();
    foreach ( $all as $row ) {
        if ( ! isset( $row['field'], $row['id'] ) ) continue;

        $field_type  = (string) $row['field'];
        $field_title = isset( $row['field-title'] ) ? (string) $row['field-title'] : '';

        if ( $post_type === 'wppb-rf-cpt' && strpos( $field_type, 'Display name publicly as' ) !== false ) continue;
        if ( $post_type === 'wppb-epf-cpt' && ( $field_type === 'reCAPTCHA' || $field_type === 'Validation' ) ) continue;

        $list[] = wppb_fb_format_form_field_entry( $field_title, $field_type, $row['id'] );
    }

    $meta_key = $post_type === 'wppb-rf-cpt' ? 'wppb_rf_fields' : 'wppb_epf_fields';
    update_post_meta( $post_id, $meta_key, $list );
}

/**
 * Create a default form post and seed its field list from the registry.
 */
function wppb_fb_create_default_form( $type ) {
    $config = array(
        'register'     => array(
            'title'     => __( 'Default Registration', 'profile-builder' ),
            'post_type' => 'wppb-rf-cpt',
        ),
        'edit_profile' => array(
            'title'     => __( 'Default Edit Profile', 'profile-builder' ),
            'post_type' => 'wppb-epf-cpt',
        ),
    );

    if ( ! isset( $config[ $type ] ) ) return false;
    $c = $config[ $type ];

    $post_id = wp_insert_post( array(
        'post_title'  => $c['title'],
        'post_type'   => $c['post_type'],
        'post_status' => 'publish',
    ) );

    if ( ! $post_id || is_wp_error( $post_id ) ) return false;

    update_post_meta( $post_id, '_pbform_is_default', '1' );

    wppb_fb_seed_form_fields_from_registry( $post_id, $c['post_type'] );

    return $post_id;
}

/**
 * Seed new Registration forms with Username / E-mail / Password at canonical ids.
 * Priority 25: projection at 20 would write an empty list first and clobber this.
 */
add_action( 'save_post_wppb-rf-cpt', 'wppb_fb_seed_new_form_mandatory_fields', 25, 2 );
function wppb_fb_seed_new_form_mandatory_fields( $post_id, $post ) {
    if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) return;
    if ( ! wppb_fb_is_active_for( $post->post_type ) ) return;
    if ( $post->post_status !== 'auto-draft' ) return;
    if ( get_post_meta( $post_id, '_pbform_is_default', true ) === '1' ) return;

    $existing = get_post_meta( $post_id, 'wppb_rf_fields', true );
    if ( is_array( $existing ) && ! empty( $existing ) ) return;

    $manage = wppb_fb_manage_fields();
    if ( ! is_array( $manage ) ) return;

    $mandatory_types = wppb_fb_mandatory_registration_field_types();

    // First occurrence of each mandatory type is canonical.
    $canonical_by_type = array();
    foreach ( $manage as $row ) {
        if ( ! isset( $row['field'], $row['id'] ) ) continue;
        $type = (string) $row['field'];
        if ( ! in_array( $type, $mandatory_types, true ) ) continue;
        if ( isset( $canonical_by_type[ $type ] ) ) continue;
        $canonical_by_type[ $type ] = $row;
    }

    $seeded = array();
    foreach ( $mandatory_types as $type ) {
        if ( ! isset( $canonical_by_type[ $type ] ) ) continue;
        $row   = $canonical_by_type[ $type ];
        $title = isset( $row['field-title'] ) ? (string) $row['field-title'] : str_replace( 'Default - ', '', $type );
        $seeded[] = wppb_fb_format_form_field_entry( $title, $type, $row['id'] );
    }

    if ( empty( $seeded ) ) return;

    update_post_meta( $post_id, 'wppb_rf_fields', $seeded );

    // Do not write block markup to post_content: isCleanNewPost / autosaves blank it.
    // Editor useAutoSeedRegistrationForm inserts the three blocks on first paint.
}

add_filter( 'map_meta_cap', 'wppb_fb_protect_default_forms_caps', 10, 4 );
function wppb_fb_protect_default_forms_caps( $caps, $cap, $user_id, $args ) {
    if ( $cap !== 'delete_post' || empty( $args[0] ) ) {
        return $caps;
    }
    $post_id = (int) $args[0];
    if ( ! in_array( get_post_type( $post_id ), array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) {
        return $caps;
    }
    if ( get_post_meta( $post_id, '_pbform_is_default', true ) === '1' ) {
        $caps[] = 'do_not_allow';
    }
    return $caps;
}
