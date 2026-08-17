<?php
/**
 * Form-builder REST API. Admin-only (`manage_options`), standard `wp_rest` nonce.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/** Admin-only permission callback for form-builder REST routes. */
function wppb_fb_rest_manage_options_permission() {
    return current_user_can( 'manage_options' );
}

add_action( 'rest_api_init', 'wppb_fb_register_cf_rest_routes' );
function wppb_fb_register_cf_rest_routes() {
    register_rest_route( 'wppb/v1', '/cf-source-options', array(
        'methods'             => 'GET',
        'callback'            => 'wppb_fb_rest_cf_source_options',
        'permission_callback' => 'wppb_fb_rest_manage_options_permission',
        'args'                => array(
            'field_type' => array( 'type' => 'string', 'required' => true ),
            'cpt'        => array( 'type' => 'string' ),
            'taxonomy'   => array( 'type' => 'string' ),
            'user_roles' => array( 'type' => 'string' ),
        ),
    ) );

    // Editor refetches after save for server-assigned ids and meta-names.
    register_rest_route( 'wppb/v1', '/existing-fields', array(
        'methods'             => 'GET',
        'callback'            => function () {
            return rest_ensure_response( array( 'fields' => wppb_fb_existing_fields_bridge() ) );
        },
        'permission_callback' => 'wppb_fb_rest_manage_options_permission',
    ) );

    register_rest_route( 'wppb/v1', '/existing-fields/(?P<id>\d+)', array(
        array(
            'methods'             => 'PUT',
            'callback'            => 'wppb_fb_rest_update_existing_field',
            'permission_callback' => 'wppb_fb_rest_manage_options_permission',
            'args'                => array(
                'id'         => array( 'type' => 'integer', 'required' => true ),
                'attributes' => array( 'type' => 'object',  'required' => true ),
                'field'      => array( 'type' => 'string' ),
            ),
        ),
        array(
            'methods'             => 'DELETE',
            'callback'            => 'wppb_fb_rest_delete_existing_field',
            'permission_callback' => 'wppb_fb_rest_manage_options_permission',
            'args'                => array(
                'id' => array( 'type' => 'integer', 'required' => true ),
            ),
        ),
    ) );

    // Must register before {id}; `$` anchor stops /{id}/usage matching that route.
    register_rest_route( 'wppb/v1', '/existing-fields/(?P<id>\d+)/usage', array(
        'methods'             => 'GET',
        'callback'            => 'wppb_fb_rest_existing_field_usage',
        'permission_callback' => 'wppb_fb_rest_manage_options_permission',
        'args'                => array(
            'id' => array( 'type' => 'integer', 'required' => true ),
        ),
    ) );

    // Sub-fields live in per-Repeater options, not wppb_manage_fields.
    register_rest_route( 'wppb/v1', '/existing-fields/sub/(?P<parent_meta>[A-Za-z0-9_\-]+)/(?P<sub_id>\d+)', array(
        array(
            'methods'             => 'PUT',
            'callback'            => 'wppb_fb_rest_update_existing_subfield',
            'permission_callback' => 'wppb_fb_rest_manage_options_permission',
            'args'                => array(
                'parent_meta' => array( 'type' => 'string',  'required' => true ),
                'sub_id'      => array( 'type' => 'integer', 'required' => true ),
                'attributes'  => array( 'type' => 'object',  'required' => true ),
                'field'       => array( 'type' => 'string' ),
            ),
        ),
    ) );

    // Next free id from global pool plus client `claimed`; save-time dedup handles races.
    register_rest_route( 'wppb/v1', '/allocate-field-id', array(
        'methods'             => 'POST',
        'callback'            => 'wppb_fb_rest_allocate_field_id',
        'permission_callback' => 'wppb_fb_rest_manage_options_permission',
        'args'                => array(
            'claimed' => array(
                'type'    => 'array',
                'items'   => array( 'type' => 'integer' ),
                'default' => array(),
            ),
        ),
    ) );
}

function wppb_fb_rest_allocate_field_id( WP_REST_Request $request ) {
    $manage = wppb_fb_manage_fields();
    if ( ! is_array( $manage ) ) $manage = array();

    $extra_ids = wppb_fb_collect_global_subfield_ids( $manage );
    $claimed   = (array) $request->get_param( 'claimed' );
    $claimed   = array_values( array_filter( array_map( 'intval', $claimed ), function ( $i ) { return $i > 0; } ) );

    $id = wppb_fb_next_field_id( $manage, array_merge( $extra_ids, $claimed ) );
    return rest_ensure_response( array( 'id' => (int) $id ) );
}

/**
 * Shared upsert for top-level and sub-field PUT routes.
 *
 * @param array    $collection     Row collection (manage_fields or Repeater group).
 * @param int      $id             Row id to find or create.
 * @param array    $attrs          Attribute patch.
 * @param string   $field_hint     Field type when creating (404 if missing).
 * @param string   $not_found_code WP_Error code when row absent and no hint.
 * @param callable $build_context  Context for wppb_fb_apply_field_row_patch().
 * @return array|WP_Error  collection, row, created; or WP_Error.
 */
function wppb_fb_rest_upsert_row_core( array $collection, $id, array $attrs, $field_hint, $not_found_code, callable $build_context ) {
    $id = (int) $id;

    $row_index = null;
    foreach ( $collection as $idx => $row ) {
        if ( isset( $row['id'] ) && (int) $row['id'] === $id ) {
            $row_index = $idx;
            break;
        }
    }

    $created = false;
    if ( $row_index === null ) {
        if ( $field_hint === '' ) {
            return new WP_Error(
                $not_found_code,
                'Row not found. Include `field` in the request body to create it.',
                array( 'status' => 404 )
            );
        }
        $registry = WPPB_FB_Field_Registry::all();
        if ( ! isset( $registry[ $field_hint ] ) ) {
            return new WP_Error( 'wppb_unknown_field_type', 'Unknown field type: ' . $field_hint, array( 'status' => 400 ) );
        }
        $collection[] = array( 'id' => $id, 'field' => $field_hint );
        $row_index    = count( $collection ) - 1;
        $created      = true;
    }

    $row        = $collection[ $row_index ];
    $field_type = isset( $row['field'] ) ? (string) $row['field'] : '';

    $claimed = array();
    foreach ( $collection as $idx2 => $other ) {
        if ( $idx2 === $row_index ) continue;
        if ( isset( $other['meta-name'] ) && $other['meta-name'] !== '' ) {
            $claimed[ $other['meta-name'] ] = true;
        }
    }

    $context = call_user_func( $build_context, $field_type, $collection, $claimed, $row );
    $row     = wppb_fb_apply_field_row_patch( $row, $attrs, $context );

    $collection[ $row_index ] = $row;
    return array( 'collection' => $collection, 'row' => $row, 'created' => $created );
}

/**
 * Upsert wppb_manage_fields row. Mirror may create on first edit; `field` required when absent.
 * Blocks Repeater meta-name changes (re-key orphans sub-field option and user data).
 */
function wppb_fb_rest_update_existing_field( WP_REST_Request $request ) {
    $id    = (int) $request['id'];
    $attrs = $request->get_param( 'attributes' );
    if ( ! is_array( $attrs ) ) {
        return new WP_Error( 'wppb_invalid_attributes', 'attributes must be an object', array( 'status' => 400 ) );
    }

    $manage = wppb_fb_manage_fields();
    if ( ! is_array( $manage ) ) $manage = array();

    $result = wppb_fb_rest_upsert_row_core(
        $manage,
        $id,
        $attrs,
        (string) $request->get_param( 'field' ),
        'wppb_field_not_found',
        function ( $field_type, $collection, $claimed, $row ) use ( $attrs ) {
            $skip_repeater_edit = ( $field_type === 'Repeater' )
                && isset( $row['meta-name'] ) && $row['meta-name'] !== ''
                && array_key_exists( 'meta-name', $attrs );
            // New Repeater needs field-title or auto-slug falls back to wppb_repeater_field_group.
            $field_title = isset( $attrs['field-title'] )
                ? (string) $attrs['field-title']
                : ( isset( $row['field-title'] ) ? (string) $row['field-title'] : '' );
            return array(
                'field_type'        => $field_type,
                'manage'            => $collection,
                'claimed'           => $claimed,
                'field_title'       => $field_title,
                'resolve_meta_name' => ! $skip_repeater_edit,
            );
        }
    );
    if ( is_wp_error( $result ) ) return $result;

    update_option( 'wppb_manage_fields', $result['collection'] );

    $registry = WPPB_FB_Field_Registry::all();
    $entry    = wppb_fb_existing_fields_row_to_entry( $result['row'], $registry );
    if ( $entry === null ) {
        return new WP_Error( 'wppb_field_unrepresentable', 'Field could not be re-projected', array( 'status' => 500 ) );
    }
    wppb_fb_hydrate_repeater_subfields( $entry, $registry );

    $response = rest_ensure_response( array( 'field' => $entry, 'created' => $result['created'] ) );
    if ( $result['created'] ) $response->set_status( 201 );
    return $response;
}

/**
 * Upsert one Repeater sub-field in get_option( $parent_meta ).
 * Meta-name uniqueness is per-Repeater; global manage_fields used for reverse collision check.
 */
function wppb_fb_rest_update_existing_subfield( WP_REST_Request $request ) {
    $parent_meta = (string) $request['parent_meta'];
    $sub_id      = (int) $request['sub_id'];
    $attrs       = $request->get_param( 'attributes' );
    if ( ! is_array( $attrs ) ) {
        return new WP_Error( 'wppb_invalid_attributes', 'attributes must be an object', array( 'status' => 400 ) );
    }
    if ( $parent_meta === '' ) {
        return new WP_Error( 'wppb_invalid_parent', 'parent_meta is required', array( 'status' => 400 ) );
    }

    // parent_meta must be a real Repeater meta-name; else get_option/update_option could clobber core options.
    $global_manage = wppb_fb_manage_fields();
    if ( ! is_array( $global_manage ) ) $global_manage = array();
    if ( ! wppb_fb_is_repeater_meta_name( $parent_meta, $global_manage ) ) {
        return new WP_Error(
            'wppb_invalid_parent',
            'parent_meta is not a known Repeater meta-name',
            array( 'status' => 400 )
        );
    }

    $group = get_option( $parent_meta, 'not_set' );
    if ( $group === 'not_set' || ! is_array( $group ) ) $group = array();

    $result = wppb_fb_rest_upsert_row_core(
        $group,
        $sub_id,
        $attrs,
        (string) $request->get_param( 'field' ),
        'wppb_subfield_not_found',
        function ( $field_type, $collection, $claimed, $row ) use ( $global_manage ) {
            return array(
                'field_type'  => $field_type,
                'manage'      => $global_manage,
                'claimed'     => $claimed,
                'is_subfield' => true,
                'group'       => $collection,
            );
        }
    );
    if ( is_wp_error( $result ) ) return $result;

    update_option( $parent_meta, $result['collection'] );

    $registry = WPPB_FB_Field_Registry::all();
    $entry    = wppb_fb_existing_fields_row_to_entry( $result['row'], $registry, true );
    if ( $entry === null ) {
        return new WP_Error( 'wppb_subfield_unrepresentable', 'Sub-field could not be re-projected', array( 'status' => 500 ) );
    }

    $response = rest_ensure_response( array( 'field' => $entry, 'created' => $result['created'], 'parent_meta' => $parent_meta ) );
    if ( $result['created'] ) $response->set_status( 201 );
    return $response;
}

/**
 * Delete one manage_fields row. Fires wck_before_remove_meta before update (listeners re-read option).
 * Blocks mandatory registration fields (username, email, password).
 */
function wppb_fb_rest_delete_existing_field( WP_REST_Request $request ) {
    $id = (int) $request['id'];

    $manage = wppb_fb_manage_fields();
    if ( ! is_array( $manage ) ) $manage = array();

    $row_index = null;
    foreach ( $manage as $idx => $row ) {
        if ( isset( $row['id'] ) && (int) $row['id'] === $id ) {
            $row_index = $idx;
            break;
        }
    }
    if ( $row_index === null ) {
        return new WP_Error( 'wppb_field_not_found', 'Field not found', array( 'status' => 404 ) );
    }

    $row        = $manage[ $row_index ];
    $field_type = isset( $row['field'] ) ? (string) $row['field'] : '';

    if ( in_array( $field_type, wppb_fb_mandatory_registration_field_types(), true ) ) {
        return new WP_Error(
            'wppb_field_undeletable',
            __( 'Username, E-mail and Password fields cannot be deleted.', 'profile-builder' ),
            array( 'status' => 403 )
        );
    }

    // Must run before update_option; ob_start swallows echoed JS from WCK listeners.
    ob_start();
    do_action( 'wck_before_remove_meta', 'wppb_manage_fields', 0, $row_index );
    ob_end_clean();

    unset( $manage[ $row_index ] );
    $manage = array_values( $manage );
    update_option( 'wppb_manage_fields', $manage );

    return rest_ensure_response( array( 'id' => $id, 'deleted' => true ) );
}

function wppb_fb_rest_existing_field_usage( WP_REST_Request $request ) {
    $id = (int) $request['id'];
    return rest_ensure_response( array(
        'id'    => $id,
        'forms' => wppb_fb_forms_using_field( $id ),
    ) );
}

/**
 * Value/label pairs for enriched Select types where stored value differs from displayed label.
 */
function wppb_fb_rest_cf_source_options( WP_REST_Request $request ) {
    $field_type = (string) $request->get_param( 'field_type' );
    $values = array();
    $labels = array();

    if ( $field_type === 'Select (CPT)' ) {
        $cpt = (string) $request->get_param( 'cpt' );
        if ( $cpt !== '' && post_type_exists( $cpt ) ) { // same guard as taxonomy branch
            $query = new WP_Query( array(
                'post_type'      => $cpt,
                'orderby'        => 'menu_order title',
                'order'          => 'ASC',
                'posts_per_page' => 200,
                'post_status'    => 'publish',
            ) );
            foreach ( $query->posts as $cpt_post ) {
                $values[] = (string) $cpt_post->ID;
                $labels[] = $cpt_post->post_title !== '' ? $cpt_post->post_title : 'No title. ID: ' . $cpt_post->ID;
            }
        }
    } elseif ( $field_type === 'Select (Taxonomy)' ) {
        $taxonomy = (string) $request->get_param( 'taxonomy' );
        if ( $taxonomy !== '' && taxonomy_exists( $taxonomy ) ) {
            $args = apply_filters( 'wppb_taxonomy_select_args', array(
                'taxonomy'   => $taxonomy,
                'hide_empty' => false,
                'number'     => 200, // match CPT cap
            ), array( 'taxonomy' => $taxonomy ) );
            $terms = get_terms( $args );
            if ( ! is_wp_error( $terms ) ) {
                foreach ( $terms as $term ) {
                    $values[] = (string) $term->term_id;
                    $labels[] = $term->name;
                }
            }
        }
    } elseif ( $field_type === 'Select (User Role)' ) {
        $user_roles_csv = (string) $request->get_param( 'user_roles' );
        if ( $user_roles_csv !== '' ) {
            global $wp_roles;
            foreach ( explode( ',', $user_roles_csv ) as $slug ) {
                $slug = trim( $slug );
                if ( $slug === '' ) continue;
                $values[] = $slug;
                $labels[] = isset( $wp_roles->roles[ $slug ]['name'] ) ? $wp_roles->roles[ $slug ]['name'] : $slug;
            }
        }
    } elseif ( $field_type === 'Select (Country)' && function_exists( 'wppb_country_select_options' ) ) {
        // Value is ISO code; label is country name (CL rules compare against ISO).
        foreach ( wppb_country_select_options( 'register' ) as $iso => $country_name ) {
            if ( $iso === '' ) continue; // skip the "Select a Country" placeholder
            $values[] = (string) $iso;
            $labels[] = $country_name;
        }
    } elseif ( $field_type === 'Select (Currency)' && function_exists( 'wppb_get_currencies' ) ) {
        // Same value-vs-label split as country.
        foreach ( wppb_get_currencies() as $iso => $currency_name ) {
            if ( $iso === '' ) continue;
            $label = $currency_name;
            if ( function_exists( 'wppb_get_currency_symbol' ) ) {
                $symbol = wppb_get_currency_symbol( $iso );
                if ( ! empty( $symbol ) ) {
                    // Stored as HTML entities; decode so the control shows a glyph.
                    $label = $currency_name . ' (' . html_entity_decode( $symbol, ENT_QUOTES, 'UTF-8' ) . ')';
                }
            }
            $values[] = (string) $iso;
            $labels[] = $label;
        }
    }

    return rest_ensure_response( array(
        'values' => $values,
        'labels' => $labels,
    ) );
}
