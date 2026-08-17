<?php
/**
 * Meta-name policy for form fields. Pure helpers, no hooks.
 * `meta-name` is the wp_usermeta key; shared with legacy admin, front end, and Repeater.
 * New rules go in wppb_fb_resolve_meta_name() so all save paths stay in sync.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Canonical meta-names for default field types (mirrors admin/manage-fields.php).
 * Empty string: wp_update_user or no user data. Non-empty: legacy wp_usermeta key.
 */
function wppb_fb_default_field_meta_names() {
    static $cached = null;
    if ( $cached !== null ) return $cached;
    $cached = array(
        'Default - Name (Heading)'           => '',
        'Default - Contact Info (Heading)'   => '',
        'Default - About Yourself (Heading)' => '',
        'Default - Username'                 => '',
        'Default - E-mail'                   => '',
        'Default - Website'                  => '',
        'Default - Display name publicly as' => '',
        'Default - Password'                 => '',
        'Default - Repeat Password'          => '',
        'Default - Blog Details'             => '',
        'Default - First Name'               => 'first_name',
        'Default - Last Name'                => 'last_name',
        'Default - Nickname'                 => 'nickname',
        'Default - Biographical Info'        => 'description',
        'Default - AIM'                      => 'aim',
        'Default - Yahoo IM'                 => 'yim',
        'Default - Jabber / Google Talk'     => 'jabber',
    );
    return $cached;
}

/** Field types with no storable meta-name. */
function wppb_fb_no_meta_name_field_types() {
    static $cached = null;
    if ( $cached !== null ) return $cached;
    $cached = array_merge(
        array_keys( array_filter(
            wppb_fb_default_field_meta_names(),
            function ( $v ) { return $v === ''; }
        ) ),
        array(
            'Heading',
            'HTML',
            'reCAPTCHA',
            'Turnstile',
            'Honeypot',
            'Select (User Role)',
            'GDPR Delete Button',
            'Email Confirmation',
            'MailChimp Subscribe',
            'MailPoet Subscribe',
            'Campaign Monitor Subscribe',
            'Subscription Plans',
            'PMS Billing Fields',
        )
    );
    return $cached;
}

/**
 * Types that hide Overwrite-existing despite having a meta-name (classic editor rule).
 * Not tied to meta-name editability — fixed-meta types like GDPR Checkbox still show it.
 */
function wppb_fb_no_overwrite_existing_field_types() {
    static $cached = null;
    if ( $cached !== null ) return $cached;
    $cached = array(
        'Validation',
        'WooCommerce Customer Billing Address',
        'WooCommerce Customer Shipping Address',
    );
    return $cached;
}

/**
 * Fixed meta-names for add-on field types. Downstream code reads these keys hardcoded;
 * a drifted key drops stored data. Resolver ignores user input; editor shows read-only.
 */
function wppb_fb_fixed_meta_name_field_types() {
    static $cached = null;
    if ( $cached !== null ) return $cached;
    $cached = array(
        'GDPR Checkbox'                        => 'user_consent_gdpr',
        'GDPR Communication Preferences'       => 'gdpr_communication_preferences',
        'WooCommerce Customer Billing Address' => 'wppbwoo_billing',
        'WooCommerce Customer Shipping Address' => 'wppbwoo_shipping',
    );
    return $cached;
}

/**
 * wppb_manage_fields, always as an array.
 * A string value fatals on foreach / []=; every read goes through here.
 */
function wppb_fb_manage_fields() {
    $manage = get_option( 'wppb_manage_fields', array() );

    return is_array( $manage ) ? $manage : array();
}

/** Next free field id on a working copy (Repeater sub-fields share the global id space). */
function wppb_fb_next_field_id( $manage, $extra_ids = array() ) {
    $ids = $extra_ids;
    foreach ( $manage as $row ) {
        if ( isset( $row['id'] ) ) $ids[] = (int) $row['id'];
    }
    if ( empty( $ids ) ) return 1;
    return ( (int) max( $ids ) ) + 1;
}

/**
 * One-pass Repeater sub-field snapshot: ids plus metanames_by_repeater.
 * Snapshot-once — in-save option rewrites are not seen; use $current_repeater_meta to exclude.
 */
function wppb_fb_collect_global_subfield_state( $manage ) {
    $state = array(
        'ids'                    => array(),
        'metanames_by_repeater'  => array(),
    );
    if ( ! is_array( $manage ) ) return $state;

    foreach ( $manage as $row ) {
        if ( ! isset( $row['field'], $row['meta-name'] ) ) continue;
        if ( $row['field'] !== 'Repeater' || $row['meta-name'] === '' ) continue;

        $r_meta = (string) $row['meta-name'];
        $group  = get_option( $r_meta, 'not_set' );
        if ( $group === 'not_set' || ! is_array( $group ) ) continue;

        $r_metanames = array();
        foreach ( $group as $subfield ) {
            if ( isset( $subfield['id'] ) )           $state['ids'][]  = (int) $subfield['id'];
            if ( ! empty( $subfield['meta-name'] ) )  $r_metanames[]   = (string) $subfield['meta-name'];
        }
        $state['metanames_by_repeater'][ $r_meta ] = $r_metanames;
    }
    return $state;
}

/**
 * Merge a Repeater group into the threaded snapshot so sibling Repeaters see new sub-fields.
 * Replaces metanames_by_repeater for that Repeater; appends ids.
 */
function wppb_fb_merge_repeater_group_into_state( $state, $repeater_meta_name, $group ) {
    $names = array();
    foreach ( (array) $group as $subfield ) {
        if ( ! is_array( $subfield ) ) continue;
        if ( isset( $subfield['id'] ) )          $state['ids'][] = (int) $subfield['id'];
        if ( ! empty( $subfield['meta-name'] ) ) $names[]        = (string) $subfield['meta-name'];
    }
    $state['metanames_by_repeater'][ (string) $repeater_meta_name ] = $names;

    return $state;
}

/** All Repeater sub-field IDs. Works with the add-on unloaded; $state reuses a snapshot. */
function wppb_fb_collect_global_subfield_ids( $manage, $state = null ) {
    if ( is_array( $state ) && isset( $state['ids'] ) ) {
        return $state['ids'];
    }
    $ids = array();
    if ( ! is_array( $manage ) ) return $ids;
    foreach ( $manage as $row ) {
        if ( ! isset( $row['field'], $row['meta-name'] ) ) continue;
        if ( $row['field'] !== 'Repeater' || $row['meta-name'] === '' ) continue;
        $group = get_option( $row['meta-name'], 'not_set' );
        if ( $group === 'not_set' || ! is_array( $group ) ) continue;
        foreach ( $group as $subfield ) {
            if ( isset( $subfield['id'] ) ) $ids[] = (int) $subfield['id'];
        }
    }
    return $ids;
}

/**
 * All Repeater sub-field meta-names. $exclude_repeater_meta skips a Repeater being rewritten this save.
 * $state reuses a snapshot.
 */
function wppb_fb_collect_global_subfield_metanames( $manage, $exclude_repeater_meta = null, $state = null ) {
    if ( is_array( $state ) && isset( $state['metanames_by_repeater'] ) ) {
        $names = array();
        foreach ( $state['metanames_by_repeater'] as $r_meta => $list ) {
            if ( $exclude_repeater_meta !== null && $r_meta === $exclude_repeater_meta ) continue;
            foreach ( $list as $n ) $names[] = $n;
        }
        return $names;
    }
    $names = array();
    if ( ! is_array( $manage ) ) return $names;
    foreach ( $manage as $row ) {
        if ( ! isset( $row['field'], $row['meta-name'] ) ) continue;
        if ( $row['field'] !== 'Repeater' || $row['meta-name'] === '' ) continue;
        if ( $exclude_repeater_meta !== null && $row['meta-name'] === $exclude_repeater_meta ) continue;
        $group = get_option( $row['meta-name'], 'not_set' );
        if ( $group === 'not_set' || ! is_array( $group ) ) continue;
        foreach ( $group as $subfield ) {
            if ( ! empty( $subfield['meta-name'] ) ) $names[] = $subfield['meta-name'];
        }
    }
    return $names;
}

/**
 * Break Repeater runtime-key collisions on a candidate meta-name.
 * Forward: M cannot match ^<sub>_[0-9]+$. Reverse (sub-fields): no name may match ^<M>_[0-9]+$.
 * Exact match is skipped when $candidate === $previous_value (rename-tolerant). On hit, suffix _pb.
 *
 * @param string $previous_value Prior meta-name; empty on flatten (self-excludes via $current_repeater_meta).
 */
function wppb_fb_break_runtime_collision( $candidate, $is_sub, $manage, $current_repeater_meta = null, $extra_known_metas = array(), $state = null, $previous_value = '' ) {
    if ( ! is_string( $candidate ) || $candidate === '' ) return $candidate;

    $sub_metas = wppb_fb_collect_global_subfield_metanames( $manage, $current_repeater_meta, $state );

    // Siblings claimed this iteration but not yet in $manage/$state.
    $extra = array();
    if ( $is_sub ) {
        foreach ( $extra_known_metas as $e ) {
            if ( is_string( $e ) && $e !== '' && $e !== $candidate ) $extra[] = $e;
        }
    }

    // Top-level meta-names for reverse and exact checks (sub-fields only).
    $top_metas = array();
    if ( $is_sub ) {
        foreach ( $manage as $row ) {
            if ( ! empty( $row['meta-name'] ) && is_string( $row['meta-name'] ) ) $top_metas[] = $row['meta-name'];
        }
    }

    $guard    = 0;
    $collides = false;
    while ( $guard++ < 64 ) {
        $collides = false;

        foreach ( array_merge( $sub_metas, $extra ) as $sub ) {
            if ( $sub === '' ) continue;
            if ( preg_match( '/^' . preg_quote( $sub, '/' ) . '_[0-9]+$/', $candidate ) ) {
                $collides = true;
                break;
            }
        }

        if ( $is_sub && ! $collides ) {
            $pattern = '/^' . preg_quote( $candidate, '/' ) . '_[0-9]+$/';
            foreach ( array_merge( $sub_metas, $top_metas, $extra ) as $other ) {
                if ( $other !== '' && preg_match( $pattern, $other ) ) {
                    $collides = true;
                    break;
                }
            }
        }

        // Exact match; skipped when unchanged. Top-level candidates skip $top_metas (own row + tree dedup).
        if ( ! $collides && $candidate !== $previous_value ) {
            $equality_pool = $is_sub ? array_merge( $sub_metas, $top_metas, $extra ) : $sub_metas;
            foreach ( $equality_pool as $other ) {
                if ( $other !== '' && $other === $candidate ) {
                    $collides = true;
                    break;
                }
            }
        }

        if ( ! $collides ) break;
        $candidate .= '_pb';
    }

    // 64 suffixes still collide — never fail open; allocate a guaranteed-free name.
    if ( $collides ) {
        return wppb_fb_next_meta_name( $manage, 'custom_field_', array_merge( $sub_metas, $extra ) );
    }

    return $candidate;
}

/** Default Repeater meta-name when empty (legacy wppb_rpf_add_missing_meta_name shape). */
function wppb_fb_default_repeater_meta_name( $title ) {
    $title = is_string( $title ) ? $title : '';
    if ( class_exists( 'Wordpress_Creation_Kit_PB' ) && method_exists( 'Wordpress_Creation_Kit_PB', 'wck_generate_slug' ) ) {
        $slug = Wordpress_Creation_Kit_PB::wck_generate_slug( $title );
    } else {
        $slug = strtolower( preg_replace( '/[^a-z0-9]+/i', '_', $title ) );
        $slug = trim( $slug, '_' );
    }
    if ( $slug === '' ) $slug = 'group';
    return 'wppb_repeater_field_' . $slug;
}

/**
 * Next free custom_field_N on a working copy. $extra_names folds in Repeater sub-field names.
 */
function wppb_fb_next_meta_name( $manage, $prefix = 'custom_field_', $extra_names = array() ) {
    $numbers = array( 0 );
    $rows    = $manage;
    foreach ( (array) $extra_names as $extra_name ) {
        if ( is_string( $extra_name ) && $extra_name !== '' ) {
            $rows[] = array( 'meta-name' => $extra_name );
        }
    }
    foreach ( $rows as $row ) {
        // is_string guard: array meta-name makes strpos() a PHP 8 TypeError.
        if ( ! isset( $row['meta-name'] ) || ! is_string( $row['meta-name'] ) ) continue;
        if ( strpos( $row['meta-name'], $prefix ) !== 0 ) continue;
        // Tail after prefix only; custom_field_1_2 must not collapse to "12".
        $tail = substr( $row['meta-name'], strlen( $prefix ) );
        if ( ctype_digit( $tail ) ) $numbers[] = (int) $tail;
    }
    return $prefix . ( max( $numbers ) + 1 );
}

/**
 * Sanitize meta-name at save time; never reject. Mirrors admin/manage-fields.php rules.
 * $allow_duplicate skips tree-level uniqueness only (overwrite-existing carve-out).
 */
function wppb_fb_sanitize_meta_name( $value, $field_type, $previous_value, $claimed, $manage, $allow_duplicate = false ) {
    $value = is_string( $value ) ? trim( $value ) : '';

    // Strip whitespace.
    $value = preg_replace( '/\s+/', '', $value );

    // Upload fields are stricter — lowercase only.
    if ( $field_type === 'Upload' ) {
        $value = strtolower( $value );
        $value = preg_replace( '/[^a-z0-9_\-]/', '', $value );
    }

    // 255-char DB cap.
    if ( strlen( $value ) > 255 ) {
        $value = substr( $value, 0, 255 );
    }

    // Empty after sanitization — let the caller auto-generate.
    if ( $value === '' ) return '';

    // Rename-tolerant reserved-name check: only reject if this is a new name
    // (not equal to the row's existing meta-name).
    if ( $value !== $previous_value ) {
        // Memo only for id=>0 (field-invariant); classic callers pass a real id.
        static $reserved_cache = null;
        if ( null === $reserved_cache ) {
            $reserved_cache = function_exists( 'wppb_get_reserved_meta_name_list' )
                ? wppb_get_reserved_meta_name_list( $manage, array( 'id' => 0, 'meta-name' => $value ) )
                : array();
        }
        // Map keeps "map"; reserved lists are filterable like classic admin.
        $skip_reserved_types = (array) apply_filters( 'wppb_skip_unique_meta_name_list_check', array( 'Map', 'Honeypot' ) );
        if ( ! in_array( $field_type, $skip_reserved_types, true ) ) {
            $strict_tokens = (array) apply_filters( 'wppb_unique_meta_name_list_strict', array( 'map' ) );
            $hits_strict   = false;
            foreach ( $strict_tokens as $token ) {
                if ( is_string( $token ) && $token !== '' && stripos( $value, $token ) !== false ) {
                    $hits_strict = true;
                    break;
                }
            }
            if ( in_array( $value, $reserved_cache, true ) || $hits_strict ) {
                // Prefix with `pb_` to make it safe rather than dropping the field.
                $value = 'pb_' . $value;
            }
        }
    }

    // Sibling collision → next custom_field_N (not a numeric suffix). No
    // value!==previous guard: an earlier sibling may already have claimed this name.
    if ( ! $allow_duplicate && isset( $claimed[ $value ] ) ) {
        $value = wppb_fb_next_meta_name( $manage );
        // Defensive: a sibling may have claimed that custom_field_N earlier in
        // this pass without its row being reflected in $manage yet. Bump past it.
        while ( isset( $claimed[ $value ] ) ) {
            $manage_plus   = $manage;
            $manage_plus[] = array( 'meta-name' => $value );
            $value         = wppb_fb_next_meta_name( $manage_plus );
        }
    }

    return $value;
}

/**
 * Add cross-cutting attributes (CL, meta-name, overwrite, add-on attrs).
 * Sole implementation for registry + register_blocks — a missing attr is dropped/no-op.
 *
 * @param array  $attributes Base attributes (typically from block.json).
 * @param string $field_type Resolved PB field-type label (e.g. "Input").
 * @param string $block_name Block name (e.g. "profile-builder/field-input").
 * @param array  $context    Lookup tables (cf_disabled, default_meta_map, …).
 * @return array Augmented attributes.
 */
function wppb_fb_compute_field_attributes( array $attributes, $field_type, $block_name, array $context ) {
    $cf_disabled        = isset( $context['cf_disabled'] )        ? (array) $context['cf_disabled']        : array();
    $default_meta_map   = isset( $context['default_meta_map'] )   ? (array) $context['default_meta_map']   : array();
    $no_meta_name_types = isset( $context['no_meta_name_types'] ) ? (array) $context['no_meta_name_types'] : array();
    $context_label      = isset( $context['context_label'] )      ? (string) $context['context_label']     : 'register';

    // CL attrs for types that can host rules.
    if ( ! in_array( $field_type, $cf_disabled, true ) ) {
        if ( ! isset( $attributes['conditional-logic-enabled'] ) ) {
            $attributes['conditional-logic-enabled'] = array( 'type' => 'string', 'default' => '' );
        }
        if ( ! isset( $attributes['conditional-logic'] ) ) {
            $attributes['conditional-logic'] = array( 'type' => 'string', 'default' => '' );
        }
    }

    // Defaults: canonical readonly; custom storable: '' + overwrite; else neither.
    $is_default   = array_key_exists( $field_type, $default_meta_map );
    $carries_meta = $is_default
        ? $default_meta_map[ $field_type ] !== ''
        : ! in_array( $field_type, $no_meta_name_types, true );

    if ( $is_default && $carries_meta ) {
        $attributes['meta-name'] = array(
            'type'    => 'string',
            'default' => $default_meta_map[ $field_type ],
        );
    } elseif ( ! $is_default && $carries_meta ) {
        if ( ! isset( $attributes['meta-name'] ) ) {
            $attributes['meta-name'] = array( 'type' => 'string', 'default' => '' );
        }
        $attributes['overwrite-existing'] = array( 'type' => 'string', 'default' => 'No' );
    }

    // Add-on per-field-property attrs (Field Visibility, EPAA approval flag, …).
    return apply_filters(
        'wppb_fb_block_attributes',
        $attributes,
        $field_type,
        array( 'context' => $context_label, 'block_name' => $block_name )
    );
}

/**
 * Resolve canonical meta-name for a row. Single entry for flatten + REST PUT paths.
 *
 * @param string $raw            User-supplied meta-name (may be empty).
 * @param string $previous_value Prior meta-name (rename-tolerant sanitization).
 * @param string $field_type     Field type display name.
 * @param array  $manage         Working copy of wppb_manage_fields.
 * @param array  $claimed        Already-claimed names (excluding self) → true.
 * @param array  $opts           Optional: field_title, is_subfield, group, …
 * @return string Final meta-name ('' when the type has none).
 */
function wppb_fb_resolve_meta_name( $raw, $previous_value, $field_type, $manage, $claimed, $opts = array() ) {
    $default_meta_map   = wppb_fb_default_field_meta_names();
    $fixed_meta_map     = wppb_fb_fixed_meta_name_field_types();
    $no_meta_name_types = wppb_fb_no_meta_name_field_types();

    if ( array_key_exists( $field_type, $default_meta_map ) ) {
        return $default_meta_map[ $field_type ];
    }
    // Fixed key: return verbatim so it never drifts.
    if ( array_key_exists( $field_type, $fixed_meta_map ) ) {
        return $fixed_meta_map[ $field_type ];
    }
    if ( in_array( $field_type, $no_meta_name_types, true ) ) {
        return '';
    }

    $is_subfield           = ! empty( $opts['is_subfield'] );
    $field_title           = isset( $opts['field_title'] )           ? (string) $opts['field_title']           : '';
    $current_repeater_meta = isset( $opts['current_repeater_meta'] ) ? (string) $opts['current_repeater_meta'] : null;
    $extra_known_metas     = isset( $opts['extra_known_metas'] )     ? (array)  $opts['extra_known_metas']     : array();
    // Overwrite-existing keeps a duplicate meta-name, as in the classic admin.
    $allow_duplicate       = ! empty( $opts['overwrite_existing'] );
    $state                 = isset( $opts['global_subfield_state'] ) && is_array( $opts['global_subfield_state'] )
        ? $opts['global_subfield_state']
        : null;

    if ( $is_subfield ) {
        // Sub-field: sanitize against group; collision-check vs global rows.
        $group = isset( $opts['group'] ) && is_array( $opts['group'] ) ? $opts['group'] : array();
        $clean = wppb_fb_sanitize_meta_name( (string) $raw, $field_type, $previous_value, $claimed, $group, $allow_duplicate );
        if ( $clean === '' ) {
            $clean = ( $previous_value !== '' ) ? $previous_value : wppb_fb_next_meta_name( $group );
        }
        return wppb_fb_break_runtime_collision( $clean, true, $manage, $current_repeater_meta, $extra_known_metas, $state, $previous_value );
    }

    if ( $field_type === 'Repeater' ) {
        // No generic dedup: Repeater meta-name IS the option key. Suffix slug instead.
        $clean = wppb_fb_sanitize_meta_name( (string) $raw, $field_type, $previous_value, $claimed, $manage, true );
        if ( $clean === '' ) {
            $clean = ( $previous_value !== '' && strpos( $previous_value, 'wppb_repeater_field_' ) === 0 )
                ? $previous_value
                : wppb_fb_default_repeater_meta_name( $field_title );
        }
        // Keep the `wppb_repeater_field_` prefix, suffixing `_2`, `_3`, … until
        // free. Skipped for overwrite-existing or an unchanged name (a re-save).
        if ( ! $allow_duplicate && $clean !== $previous_value && isset( $claimed[ $clean ] ) ) {
            $base = $clean;
            $n    = 2;
            do {
                $clean = $base . '_' . $n;
                $n++;
            } while ( isset( $claimed[ $clean ] ) );
        }
        return wppb_fb_break_runtime_collision( $clean, false, $manage, null, array(), $state, $previous_value );
    }

    // Custom storable field.
    $clean = wppb_fb_sanitize_meta_name( (string) $raw, $field_type, $previous_value, $claimed, $manage, $allow_duplicate );
    if ( $clean === '' ) {
        // Include sub-field names: set-0 runtime key is the bare meta-name.
        $clean = ( $previous_value !== '' )
            ? $previous_value
            : wppb_fb_next_meta_name( $manage, 'custom_field_', wppb_fb_collect_global_subfield_metanames( $manage, null, $state ) );
    }
    return wppb_fb_break_runtime_collision( $clean, false, $manage, null, array(), $state, $previous_value );
}

/**
 * Sanitize a CL scalar. Legacy renderer concatenates values into double-quoted JS —
 * strip `"`, `\`, and `<>` on write (`sanitize_text_field` leaves quotes).
 */
function wppb_fb_sanitize_cl_scalar( $v ) {
    if ( is_int( $v ) || is_float( $v ) || is_bool( $v ) ) {
        return $v;
    }
    $v = sanitize_text_field( (string) $v );
    return str_replace( array( '"', '\\', '<', '>' ), '', $v );
}

/**
 * True when a CL rule names a real source field. Empty/`-1` placeholders poison
 * the whole field under logic_type=all — drop them on write.
 *
 * @param array $rule Decoded rule row.
 * @return bool
 */
function wppb_fb_cl_rule_has_source( $rule ) {
    if ( ! is_array( $rule ) || ! isset( $rule['field'] ) || ! is_scalar( $rule['field'] ) ) {
        return false;
    }
    $field = trim( (string) $rule['field'] );
    return $field !== '' && $field !== '-1' && $field !== '0';
}

/**
 * Sanitize CL JSON: scalar-clean each rule, drop sourceless rules, re-encode.
 * Malformed input falls back to sanitize_text_field().
 */
function wppb_fb_sanitize_conditional_logic_json( $value ) {
    if ( ! is_string( $value ) || $value === '' ) {
        return '';
    }
    $data = json_decode( $value, true );
    if ( ! is_array( $data ) ) {
        // Not the expected JSON — never store it raw (it still reaches the sink).
        return sanitize_text_field( $value );
    }
    if ( isset( $data['rules'] ) && is_array( $data['rules'] ) ) {
        $clean_rules = array();
        foreach ( $data['rules'] as $rule ) {
            if ( ! is_array( $rule ) ) {
                continue;
            }
            foreach ( array( 'field', 'operator', 'value' ) as $rule_key ) {
                if ( isset( $rule[ $rule_key ] ) && is_scalar( $rule[ $rule_key ] ) ) {
                    $rule[ $rule_key ] = wppb_fb_sanitize_cl_scalar( $rule[ $rule_key ] );
                }
            }
            if ( ! wppb_fb_cl_rule_has_source( $rule ) ) {
                continue;
            }
            $clean_rules[] = $rule;
        }
        // Re-index so the JSON stays an array, not an object with holes.
        $data['rules'] = $clean_rules;
    }
    // Whitelist action_type/logic_type only when present (renderer emits them raw).
    if ( isset( $data['action_type'] ) ) {
        $data['action_type'] = ( $data['action_type'] === 'hide' ) ? 'hide' : 'show';
    }
    if ( isset( $data['logic_type'] ) ) {
        $data['logic_type'] = ( $data['logic_type'] === 'any' ) ? 'any' : 'all';
    }
    return wp_json_encode( $data );
}

/**
 * Seed mandatory legacy keys from registry defaults when the row omits them
 * (editor serializes only non-defaults). Seed only keys read UNCONDITIONALLY.
 */
function wppb_fb_seed_legacy_row_keys( array $row, $field_type, array $excluded = array() ) {
    $type_attrs = array();
    if ( $field_type !== '' ) {
        $registry = WPPB_FB_Field_Registry::all();
        if ( isset( $registry[ $field_type ]['attributes'] ) && is_array( $registry[ $field_type ]['attributes'] ) ) {
            $type_attrs = $registry[ $field_type ]['attributes'];
        }
    }

    foreach ( wppb_fb_always_seeded_legacy_row_keys() as $legacy_key => $fallback ) {
        if ( array_key_exists( $legacy_key, $row ) ) continue;
        if ( in_array( $legacy_key, $excluded, true ) ) continue;
        $row[ $legacy_key ] = isset( $type_attrs[ $legacy_key ]['default'] )
            ? (string) $type_attrs[ $legacy_key ]['default']
            : $fallback;
    }

    foreach ( wppb_fb_seeded_legacy_row_keys( $field_type ) as $legacy_key ) {
        if ( array_key_exists( $legacy_key, $row ) ) continue;
        if ( in_array( $legacy_key, $excluded, true ) ) continue;
        if ( ! isset( $type_attrs[ $legacy_key ]['default'] ) ) continue;
        $row[ $legacy_key ] = (string) $type_attrs[ $legacy_key ]['default'];
    }

    return $row;
}

/**
 * Type-independent legacy keys every row must have (classic `$common_properties`).
 * `overwrite-existing` omitted — no unguarded reader of a stored row.
 *
 * @return array Map of legacy row key => fallback value.
 */
function wppb_fb_always_seeded_legacy_row_keys() {
    return array(
        'field-title' => '',
        'description' => '',
        'required'    => 'No',
    );
}

/**
 * Per-type legacy keys seeded only when the block declares them (unguarded readers).
 *
 * @param string $field_type Field type display name.
 * @return array Legacy row keys to seed.
 */
function wppb_fb_seeded_legacy_row_keys( $field_type = '' ) {
    // Unguarded readers; description/required are type-independent.
    $keys = array(
        // default-fields/input (and most other renderers).
        'default-value',
        // default-fields/textarea, description; extra-fields/wysiwyg.
        'default-content', 'row-count',
        'default-option', 'default-options', 'options', 'labels', 'cpt', 'taxonomy',
        // extra-fields/select-country|currency|timezone.
        'default-option-country', 'default-option-currency', 'default-option-timezone',
        // default-fields/heading; extra-fields/html.
        'heading-tag', 'html-content',
        // extra-fields/datepicker, timepicker, phone.
        'date-format', 'time-format', 'phone-format',
        // default-fields/upload (upload_helper_functions); extra-fields/upload.
        'avatar-size', 'max-file-size', 'simple-upload',
        'allowed-image-extensions', 'allowed-upload-extensions',
        // extra-fields/number.
        'min-number-value', 'max-number-value', 'number-step-value',
        // extra-fields/select2-multiple.
        'select2-multiple-limit',
        // default-fields/user-role.
        'user-roles',
        // extra-fields/validation.
        'validation-possible-values', 'custom-error-message',
        // default-fields/recaptcha; extra-fields/turnstile.
        'recaptcha-type', 'public-key', 'private-key',
        'turnstile-site-key', 'turnstile-secret-key',
        // extra-fields/map.
        'map-api-key',
        'rpf-limit', 'rpf-enable-limit',
        // gdpr-communication-preferences: explode() on every render.
        'gdpr-communication-preferences',
        // MailPoet on every edit-profile render; the other two on unsubscribe.
        'mailpoet-lists', 'mailchimp-lists', 'campaign-monitor-lists',
    );

    /**
     * Filter seeded legacy row keys for a field type.
     *
     * @param array  $keys       Legacy row keys to seed.
     * @param string $field_type Field type display name.
     */
    return apply_filters( 'wppb_fb_seeded_legacy_row_keys', $keys, $field_type );
}

/**
 * Apply an attribute patch and resolve meta-name. Single entry for flatten + REST PUTs
 * so excluded-attrs and meta-name policy stay uniform.
 *
 * @param array $row     Existing or freshly allocated row.
 * @param array $patch   Attribute map to apply.
 * @param array $context Resolver context (manage, claimed, …).
 * @return array Updated row.
 */
function wppb_fb_apply_field_row_patch( array $row, array $patch, array $context ) {
    $field_type    = isset( $context['field_type'] ) ? (string) $context['field_type'] : '';
    $manage        = isset( $context['manage'] ) && is_array( $context['manage'] ) ? $context['manage'] : array();
    $claimed       = isset( $context['claimed'] ) && is_array( $context['claimed'] ) ? $context['claimed'] : array();
    $is_subfield   = ! empty( $context['is_subfield'] );

    // The default excluded set differs by row scope: per-form cross-cutting attrs
    // for a top-level row, the Repeater-stripped attrs for a sub-field row.
    $excluded = isset( $context['excluded_attrs'] ) && is_array( $context['excluded_attrs'] )
        ? $context['excluded_attrs']
        : ( $is_subfield
            ? (array) wppb_fb_repeater_subfield_stripped_attrs()
            : (array) wppb_fb_excluded_manage_fields_attrs() );

    // `id` and `field` are immutable identity; `meta-name` is resolved below, and
    // skipping it here keeps the resolver's value winning whatever the patch order.
    foreach ( $patch as $key => $value ) {
        if ( $key === 'id' || $key === 'field' || $key === 'meta-name' ) continue;
        if ( in_array( $key, $excluded, true ) ) continue;
        if ( $key === 'conditional-logic' ) {
            // Security: rule values reach an inline <script> on the legacy front
            // end. See wppb_fb_sanitize_cl_scalar() for the threat model.
            $row[ $key ] = wppb_fb_sanitize_conditional_logic_json( $value );
            continue;
        }
        if ( is_scalar( $value ) || $value === null ) {
            $row[ $key ] = (string) $value;
        } else {
            $row[ $key ] = $value;
        }
    }

    // Ensure the field type is correct (the caller may have just created the row).
    if ( $field_type !== '' ) $row['field'] = $field_type;

    // Select (User Role) explode( ', ', … ) needs the legacy separator.
    $effective_type = ( isset( $row['field'] ) && $row['field'] !== '' ) ? (string) $row['field'] : $field_type;
    if ( $effective_type === 'Select (User Role)' ) {
        foreach ( array( 'user-roles', 'user-roles-sort-order' ) as $roles_key ) {
            if ( array_key_exists( $roles_key, $row ) && is_string( $row[ $roles_key ] ) && $row[ $roles_key ] !== '' ) {
                $row[ $roles_key ] = wppb_fb_normalize_role_slug_csv( $row[ $roles_key ] );
            }
        }
    }

    // Seed the legacy keys the block omitted because they sat at their default.
    $row = wppb_fb_seed_legacy_row_keys( $row, $field_type, $excluded );

    if ( isset( $context['resolve_meta_name'] ) && $context['resolve_meta_name'] === false ) {
        return $row;
    }

    $patch_has_meta = array_key_exists( 'meta-name', $patch );
    $previous_meta  = isset( $row['meta-name'] ) ? (string) $row['meta-name'] : '';
    $raw            = $patch_has_meta ? (string) $patch['meta-name'] : $previous_meta;

    // Fixed-key defaults: mirror PUTs diffs only — seed so new rows don't get custom_field_N.
    if ( ! $patch_has_meta && $previous_meta === '' && $field_type !== '' ) {
        $seed_registry = WPPB_FB_Field_Registry::all();
        if ( ! empty( $seed_registry[ $field_type ]['attributes']['meta-name']['default'] ) ) {
            $raw = (string) $seed_registry[ $field_type ]['attributes']['meta-name']['default'];
        }
    }

    // Read off the already-patched row so the current toggle state wins whether it
    // arrived in this patch or was carried on the existing row.
    $overwrite_existing = isset( $row['overwrite-existing'] ) && $row['overwrite-existing'] === 'Yes';

    $resolve_opts = array(
        'is_subfield'           => $is_subfield,
        'field_title'           => isset( $context['field_title'] )           ? (string) $context['field_title']           : '',
        'group'                 => isset( $context['group'] )                 ? (array)  $context['group']                 : array(),
        'current_repeater_meta' => isset( $context['current_repeater_meta'] ) ? (string) $context['current_repeater_meta'] : null,
        'extra_known_metas'     => isset( $context['extra_known_metas'] )     ? (array)  $context['extra_known_metas']     : array(),
        'overwrite_existing'    => $overwrite_existing,
        'global_subfield_state' => isset( $context['global_subfield_state'] ) && is_array( $context['global_subfield_state'] )
            ? $context['global_subfield_state']
            : null,
    );

    $row['meta-name'] = wppb_fb_resolve_meta_name( $raw, $previous_meta, $field_type, $manage, $claimed, $resolve_opts );

    return $row;
}

/**
 * Normalize a slug CSV to legacy ', ' (front end explode). Idempotent.
 *
 * @param string $csv Raw comma-separated slug list.
 * @return string
 */
function wppb_fb_normalize_role_slug_csv( $csv ) {
    $parts = array_map( 'trim', explode( ',', (string) $csv ) );
    $parts = array_values( array_filter( $parts, static function ( $p ) {
        return $p !== '';
    } ) );
    return implode( ', ', $parts );
}
