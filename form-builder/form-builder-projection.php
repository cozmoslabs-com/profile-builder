<?php
/**
 * Save-side projection: Gutenberg block trees → legacy field storage.
 * Entry: wppb_fb_project_blocks_to_meta(); walker: wppb_fb_flatten_blocks().
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// 1. Cross-cutting policy: excluded attrs, Repeater allow/exclude/strip

/**
 * Attribute names excluded from wppb_manage_fields rows.
 * For per-form attrs that must not hit the shared global row.
 */
function wppb_fb_excluded_manage_fields_attrs() {
    return apply_filters( 'wppb_fb_excluded_manage_fields_attrs', array( 'id' ) );
}

/**
 * Field types banned as Repeater children (matches repeater add-on list).
 * Defers to add-on when loaded. Bans Default-* fields: indexed keys hit
 * user_meta and bypass wp_update_user().
 */
function wppb_fb_repeater_excluded_field_types() {
    if ( function_exists( 'wppb_rpf_manage_fields_get_excluded_fields' ) ) {
        return wppb_rpf_manage_fields_get_excluded_fields();
    }

    return apply_filters( 'wppb_rpf_manage_fields_get_excluded_fields', wppb_fb_repeater_excluded_field_types_fallback() );
}

/** Fallback when repeater add-on is not loaded (admin-only include). Hand-mirrored; test diffs when add-on loads. */
function wppb_fb_repeater_excluded_field_types_fallback() {
    return array(
        'Default - Name (Heading)',
        'Default - Contact Info (Heading)',
        'Default - About Yourself (Heading)',
        'Default - Username',
        'Default - First Name',
        'Default - Last Name',
        'Default - Nickname',
        'Default - E-mail',
        'Default - Website',
        'Default - AIM',
        'Default - Yahoo IM',
        'Default - Jabber / Google Talk',
        'Default - Password',
        'Default - Repeat Password',
        'Default - Biographical Info',
        'Default - Display name publicly as',
        'Default - Blog Details',
        'Select (User Role)',
        'WYSIWYG',
        'Avatar',
        'reCAPTCHA',
        'MailChimp Subscribe',
        'MailPoet Subscribe',
        'Campaign Monitor Subscribe',
        'Email Confirmation',
        'WooCommerce Customer Billing Address',
        'WooCommerce Customer Shipping Address',
        'Subscription Plans',
        'Repeater',
        'GDPR Checkbox',
        'GDPR Delete Button',
        'Checkbox (Terms and Conditions)',
    );
}

/** Registered field blocks minus repeater-excluded types. Filterable. */
function wppb_fb_repeater_allowed_block_names() {
    $excluded   = wppb_fb_repeater_excluded_field_types();
    $registry   = WPPB_FB_Field_Registry::all();
    $block_names = array();
    foreach ( $registry as $field_type => $entry ) {
        if ( in_array( $field_type, $excluded, true ) ) continue;
        if ( ! empty( $entry['block'] ) ) {
            $block_names[] = $entry['block'];
        }
    }
    // Final overlay, so an add-on can adjust the result without the type list.
    return array_values( apply_filters( 'wppb_fb_repeater_allowed_block_names', $block_names ) );
}

/**
 * Sub-field attrs stripped before Repeater option write.
 * Conditional Logic runs on parent only. Filterable.
 */
function wppb_fb_repeater_subfield_stripped_attrs() {
    return apply_filters( 'wppb_fb_repeater_subfield_stripped_attrs', array(
        'conditional-logic-enabled',
        'conditional-logic',
    ) );
}

/** Whether Repeater Fields module is on. Off = no-op; legacy data stays intact when re-enabled. */
function wppb_fb_is_repeater_module_active() {
    $settings = get_option( 'wppb_module_settings', 'not_found' );
    if ( $settings === 'not_found' || ! is_array( $settings ) ) return false;
    return isset( $settings['wppb_repeaterFields'] ) && $settings['wppb_repeaterFields'] === 'show';
}

// 2. Dedup pre-walk

/**
 * Reset duplicate non-zero IDs to 0 for re-allocation.
 * Gutenberg "Duplicate block" copies id; without this the copy clobbers the row.
 */
function wppb_fb_dedup_block_ids( &$blocks, &$seen = array() ) {
    foreach ( $blocks as &$block ) {
        if ( ! empty( $block['blockName'] ) && strpos( $block['blockName'], 'profile-builder/' ) === 0 ) {
            $id = isset( $block['attrs']['id'] ) ? (int) $block['attrs']['id'] : 0;
            if ( $id > 0 ) {
                if ( isset( $seen[ $id ] ) ) {
                    $block['attrs']['id'] = 0;
                } else {
                    $seen[ $id ] = true;
                }
            }
        }
        if ( ! empty( $block['innerBlocks'] ) ) {
            wppb_fb_dedup_block_ids( $block['innerBlocks'], $seen );
        }
    }
    unset( $block );
}

// 3. Save projection (blocks -> meta)

/** Import guard. Import/Export uses empty post_content and restores field list from meta. */
function wppb_fb_set_importing( $state ) {
    $GLOBALS['wppb_fb_importing'] = (bool) $state;
}
function wppb_fb_is_importing() {
    return ! empty( $GLOBALS['wppb_fb_importing'] );
}

/**
 * Flag that this save carried editor content.
 * post_content is always blank for form CPTs, so empty tree ≠ cleared canvas
 * without this. Hook rest_pre_insert_* (before save_post), not after.
 */
add_filter( 'rest_pre_insert_wppb-rf-cpt',  'wppb_fb_flag_editor_content_save', 10, 2 );
add_filter( 'rest_pre_insert_wppb-epf-cpt', 'wppb_fb_flag_editor_content_save', 10, 2 );
function wppb_fb_flag_editor_content_save( $prepared_post, $request ) {
    if ( $request instanceof WP_REST_Request && $request->has_param( 'content' ) ) {
        $GLOBALS['wppb_fb_editor_content_save'] = true;
    }
    return $prepared_post;
}

/** Whether this request carried editor content (REST filter or classic POST). */
function wppb_fb_save_carries_editor_content() {
    return ! empty( $GLOBALS['wppb_fb_editor_content_save'] ) || isset( $_POST['content'] );
}

function wppb_fb_tree_has_pb_block( $blocks ) {
    foreach ( (array) $blocks as $block ) {
        if ( ! empty( $block['blockName'] ) && strpos( $block['blockName'], 'profile-builder/' ) === 0 ) {
            return true;
        }
        if ( ! empty( $block['innerBlocks'] ) && wppb_fb_tree_has_pb_block( $block['innerBlocks'] ) ) {
            return true;
        }
    }
    return false;
}

add_action( 'save_post_wppb-rf-cpt',  'wppb_fb_project_blocks_to_meta', 20, 2 );
add_action( 'save_post_wppb-epf-cpt', 'wppb_fb_project_blocks_to_meta', 20, 2 );
function wppb_fb_project_blocks_to_meta( $post_id, $post ) {
    if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
        /**
         * Fires when the projection bails on a guard.
         *
         * @param int    $post_id Post that triggered the projection.
         * @param string $reason  Guard name that stopped the write.
         */
        do_action( 'wppb_fb_projection_skipped', $post_id, 'revision_or_autosave' );
        return;
    }
    if ( ! in_array( $post->post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) {
        do_action( 'wppb_fb_projection_skipped', $post_id, 'wrong_cpt' );
        return;
    }

    // Classic mode: the WCK metaboxes own the save flow, and projecting their
    // empty post_content would wipe wppb_*_fields.
    if ( ! wppb_fb_is_active_for( $post->post_type ) ) {
        do_action( 'wppb_fb_projection_skipped', $post_id, 'classic_editor_mode' );
        return;
    }

    // meta-box-loader re-fires save_post with empty content — would wipe fields.
    if ( ! empty( $_REQUEST['meta-box-loader'] ) ) {
        do_action( 'wppb_fb_projection_skipped', $post_id, 'meta_box_loader' );
        return;
    }

    if ( wppb_fb_is_importing() ) {
        do_action( 'wppb_fb_projection_skipped', $post_id, 'importing' );
        return;
    }

    // No editor content: post_content is blank for form CPTs — projecting would wipe fields.
    $blocks_parsed = parse_blocks( $post->post_content );
    if ( ! wppb_fb_tree_has_pb_block( $blocks_parsed ) && ! wppb_fb_save_carries_editor_content() ) {
        do_action( 'wppb_fb_projection_skipped', $post_id, 'no_editor_content' );
        return;
    }

    static $done = array();
    if ( isset( $done[ $post_id ] ) ) {
        do_action( 'wppb_fb_projection_skipped', $post_id, 'reentrancy' );
        return;
    }
    $done[ $post_id ] = true;

    // 1. Blank post_content in the database
    if ( $post->post_content !== '' ) {
        $blanked = wp_update_post( array( 'ID' => $post_id, 'post_content' => '' ), true );
        if ( is_wp_error( $blanked ) ) {
            // Update short-circuited; next non-editor save could re-project stale markup.
            do_action( 'wppb_fb_content_blank_failed', $post_id, $blanked );
        }
    }

    wppb_fb_dedup_block_ids( $blocks_parsed );

    $ordered_list  = array();
    $manage        = wppb_fb_manage_fields();

    // Index manage_fields by ID for updates
    $manage_by_id = array();
    foreach ( $manage as $idx => $item ) {
        if ( isset( $item['id'] ) ) $manage_by_id[ (int) $item['id'] ] = $idx;
    }

    // Track meta-names already claimed in this save so the sanitizer can
    // detect cross-block collisions.
    $claimed_meta_names = array();

    // Seed $claimed with out-of-tree global meta-names (uniqueness is site-wide).
    $tree_field_ids = wppb_fb_collect_tree_field_ids( $blocks_parsed );
    foreach ( $manage as $m_row ) {
        if ( empty( $m_row['meta-name'] ) ) continue;
        $m_id = isset( $m_row['id'] ) ? (int) $m_row['id'] : 0;
        if ( $m_id > 0 && isset( $tree_field_ids[ $m_id ] ) ) continue; // in this form → resolved during the walk
        $claimed_meta_names[ (string) $m_row['meta-name'] ] = true;
    }

    // Collected once so the meta-name resolver and the ID allocator reuse it
    // instead of each re-reading every Repeater's option.
    $global_subfield_state = wppb_fb_collect_global_subfield_state( $manage );

    $context = array(
        'post_id'               => (int) $post_id,
        'post_type'             => $post->post_type,
        'global_subfield_state' => $global_subfield_state,
    );

    wppb_fb_flatten_blocks( $blocks_parsed, $ordered_list, $manage, $manage_by_id, $claimed_meta_names, $context );

    update_option( 'wppb_manage_fields', $manage );

    $meta_key = $post->post_type === 'wppb-rf-cpt' ? 'wppb_rf_fields' : 'wppb_epf_fields';

    // Entries that were unrenderable on read never reached the canvas, so the
    // canvas-rebuilt list must not treat their absence as a removal (see below).
    $previous_list = get_post_meta( $post_id, $meta_key, true );
    if ( is_array( $previous_list ) && ! empty( $previous_list ) ) {
        $ordered_list = wppb_fb_carry_forward_unrenderable_entries( $ordered_list, $previous_list, $manage );
    }

    update_post_meta( $post_id, $meta_key, $ordered_list );

    // Add-ons flush per-form state accumulated during flatten.
    do_action( 'wppb_fb_post_project', (int) $post_id, $post, $context );
}

/**
 * Re-insert unrenderable entries the canvas omitted (Repeater off / no block).
 * Survivors keep position after their nearest surviving predecessor.
 *
 * @param array $ordered_list  List rebuilt from the canvas this save.
 * @param array $previous_list Stored per-form list from before this save.
 * @param array $manage        Post-flatten wppb_manage_fields working copy.
 * @return array
 */
function wppb_fb_carry_forward_unrenderable_entries( $ordered_list, $previous_list, $manage ) {
    $previous_list = array_values( $previous_list );

    $new_ids = array();
    foreach ( $ordered_list as $entry ) {
        if ( isset( $entry['id'] ) ) $new_ids[ (int) $entry['id'] ] = true;
    }

    $manage_by_id = array();
    foreach ( $manage as $row ) {
        if ( isset( $row['id'] ) ) $manage_by_id[ (int) $row['id'] ] = $row;
    }

    $registry        = WPPB_FB_Field_Registry::all();
    $repeater_active = wppb_fb_is_repeater_module_active();

    foreach ( $previous_list as $pos => $entry ) {
        if ( ! isset( $entry['id'] ) ) continue;
        $id = (int) $entry['id'];

        if ( isset( $new_ids[ $id ] ) )        continue; // re-emitted from the canvas
        if ( ! isset( $manage_by_id[ $id ] ) ) continue; // globally deleted → genuinely gone

        $type = isset( $manage_by_id[ $id ]['field'] ) ? $manage_by_id[ $id ]['field'] : '';
        $unrenderable =
            ( ! $repeater_active && $type === 'Repeater' ) ||
            ( ! isset( $registry[ $type ] ) );
        if ( ! $unrenderable ) continue; // renderable but absent → user removed it

        // Nearest preceding previous-list entry that survived into the new list.
        $anchor_id = null;
        for ( $j = $pos - 1; $j >= 0; $j-- ) {
            if ( isset( $previous_list[ $j ]['id'] ) && isset( $new_ids[ (int) $previous_list[ $j ]['id'] ] ) ) {
                $anchor_id = (int) $previous_list[ $j ]['id'];
                break;
            }
        }

        $insert_at = 0;
        if ( $anchor_id !== null ) {
            foreach ( $ordered_list as $k => $e ) {
                if ( isset( $e['id'] ) && (int) $e['id'] === $anchor_id ) { $insert_at = $k + 1; break; }
            }
        }

        array_splice( $ordered_list, $insert_at, 0, array( $entry ) );
        $new_ids[ $id ] = true; // a following carried entry may anchor on this one
    }

    return $ordered_list;
}

/**
 * Re-insert unrenderable Repeater sub-rows the canvas omitted (no registered block).
 *
 * @param array $group          Group rebuilt from the canvas this save.
 * @param array $existing_group Stored per-Repeater option from before this save.
 * @return array
 */
function wppb_fb_carry_forward_unrenderable_subfields( $group, $existing_group ) {
    $existing_group = array_values( $existing_group );
    $registry       = WPPB_FB_Field_Registry::all();

    $present_ids = array();
    foreach ( $group as $row ) {
        if ( isset( $row['id'] ) ) $present_ids[ (int) $row['id'] ] = true;
    }

    foreach ( $existing_group as $pos => $row ) {
        if ( ! is_array( $row ) || ! isset( $row['id'] ) ) continue;
        $id = (int) $row['id'];

        if ( isset( $present_ids[ $id ] ) ) continue; // re-emitted from the canvas

        $type = isset( $row['field'] ) ? (string) $row['field'] : '';
        if ( $type === '' || isset( $registry[ $type ] ) ) continue; // renderable but absent → user removed it

        // Nearest preceding stored row that survived into the rebuilt group.
        $anchor_id = null;
        for ( $j = $pos - 1; $j >= 0; $j-- ) {
            if ( isset( $existing_group[ $j ]['id'] ) && isset( $present_ids[ (int) $existing_group[ $j ]['id'] ] ) ) {
                $anchor_id = (int) $existing_group[ $j ]['id'];
                break;
            }
        }

        $insert_at = 0;
        if ( $anchor_id !== null ) {
            foreach ( $group as $k => $e ) {
                if ( isset( $e['id'] ) && (int) $e['id'] === $anchor_id ) { $insert_at = $k + 1; break; }
            }
        }

        array_splice( $group, $insert_at, 0, array( $row ) );
        $present_ids[ $id ] = true; // a following carried row may anchor on this one
    }

    return $group;
}

/**
 * Field ids in a parsed tree (for seeding global meta-name uniqueness).
 *
 * @param array $blocks Parsed block tree.
 * @return array Map of int field id => true.
 */
function wppb_fb_collect_tree_field_ids( $blocks ) {
    $ids = array();
    foreach ( (array) $blocks as $block ) {
        if ( ! empty( $block['blockName'] ) && strpos( $block['blockName'], 'profile-builder/' ) === 0 ) {
            if ( ! empty( $block['attrs']['id'] ) ) {
                $ids[ (int) $block['attrs']['id'] ] = true;
            }
        }
        if ( ! empty( $block['innerBlocks'] ) ) {
            $ids += wppb_fb_collect_tree_field_ids( $block['innerBlocks'] );
        }
    }
    return $ids;
}

/**
 * Flatten a block tree into the per-form field list and upsert global definitions.
 * Repeater innerBlocks go to a per-meta-name option, not the ordered list.
 */
function wppb_fb_flatten_blocks( $blocks, &$ordered_list, &$manage, &$manage_by_id, &$claimed_meta_names, $context = array() ) {
    // ArrayObject so recursive $context copies share uniqueness state.
    if ( ! isset( $context['_uniqueness'] ) ) {
        $context['_uniqueness'] = new ArrayObject( array(
            'seen_unique'     => array(),
            'seen_exclusive'  => array(),
            'unique_types'    => wppb_fb_unique_field_types(),
            'exclusive_groups'=> wppb_fb_exclusive_field_groups(),
        ) );
    }
    $uniqueness = $context['_uniqueness'];

    foreach ( $blocks as $block ) {
        if ( empty( $block['blockName'] ) ) continue;
        if ( strpos( $block['blockName'], 'profile-builder/' ) !== 0 ) continue;

        // Before registry lookup: by_block_name still hits with module off.
        if ( $block['blockName'] === 'profile-builder/field-repeater'
            && ! wppb_fb_is_repeater_module_active()
        ) {
            continue;
        }

        // Every PB block in source order, before any field-specific processing —
        // this is how add-ons see structural blocks and their adjacency.
        do_action( 'wppb_fb_pb_block_walked', $block, $context );

        $lookup = WPPB_FB_Field_Registry::by_block_name( $block['blockName'] );
        if ( ! $lookup ) {
            // Unrecognised PB block = container; children flatten as siblings.
            if ( ! empty( $block['innerBlocks'] ) ) {
                $inner_context = array_merge( $context, array( 'parent_block_name' => $block['blockName'] ) );
                wppb_fb_flatten_blocks( $block['innerBlocks'], $ordered_list, $manage, $manage_by_id, $claimed_meta_names, $inner_context );
                // Symmetric "leave" event so bridges know the wrapper closed.
                do_action( 'wppb_fb_pb_block_walked_done', $block, $context );
            }
            continue;
        }

        $field_type = $lookup['field_type'];
        $attrs      = $block['attrs'];
        $id         = isset( $attrs['id'] ) ? (int) $attrs['id'] : 0;
        $is_repeater = ( $field_type === 'Repeater' );

        // Uniqueness gate: a repeat of a one-per-form type, or of an exclusive
        // group's partner type, is skipped. First occurrence wins.
        if ( in_array( $field_type, $uniqueness['unique_types'], true ) ) {
            if ( isset( $uniqueness['seen_unique'][ $field_type ] ) ) {
                continue;
            }
            $seen_map = $uniqueness['seen_unique'];
            $seen_map[ $field_type ] = true;
            $uniqueness['seen_unique'] = $seen_map;
        }
        $is_blocked_by_exclusive = false;
        foreach ( $uniqueness['exclusive_groups'] as $group ) {
            if ( ! in_array( $field_type, $group, true ) ) continue;
            foreach ( $group as $other_type ) {
                if ( $other_type !== $field_type && isset( $uniqueness['seen_exclusive'][ $other_type ] ) ) {
                    $is_blocked_by_exclusive = true;
                    break 2;
                }
            }
            $excl_map = $uniqueness['seen_exclusive'];
            $excl_map[ $field_type ] = true;
            $uniqueness['seen_exclusive'] = $excl_map;
        }
        if ( $is_blocked_by_exclusive ) continue;

        // Sub-field ids share the global id pool — fold them in for every block.
        $extra_ids = wppb_fb_collect_global_subfield_ids( $manage, isset( $context['global_subfield_state'] ) ? $context['global_subfield_state'] : null );
        if ( $id === 0 ) {
            $id = wppb_fb_next_field_id( $manage, $extra_ids );
            $manage_by_id[ $id ] = count( $manage );
            $manage[] = array( 'id' => $id, 'field' => $field_type );
        } elseif ( ! isset( $manage_by_id[ $id ] ) ) {
            // Declared id with no row yet (tree authored by CLI/import, or the row
            // was deleted globally): insert at that id rather than drop the field.
            $manage_by_id[ $id ] = count( $manage );
            $manage[] = array( 'id' => $id, 'field' => $field_type );
        }

        $repeater_meta_name = '';

        // Schema-hydrated patch (unsupplied attributes land at their default),
        // applied by the helper both save paths share.
        if ( isset( $manage_by_id[ $id ] ) ) {
            $idx = $manage_by_id[ $id ];

            $patch = array();
            foreach ( $lookup['attributes'] as $attr_name => $schema ) {
                $patch[ $attr_name ] = isset( $attrs[ $attr_name ] )
                    ? $attrs[ $attr_name ]
                    : ( isset( $schema['default'] ) ? $schema['default'] : '' );
            }
            // Carry the user's raw meta-name through so the helper can sanitize
            // it; otherwise the schema-derived blank would override a typed value.
            if ( isset( $attrs['meta-name'] ) ) {
                $patch['meta-name'] = $attrs['meta-name'];
            }

            // Keep stored Repeater meta-name (it IS the option key); renaming orphans data.
            $existing_meta = isset( $manage[ $idx ]['meta-name'] ) ? (string) $manage[ $idx ]['meta-name'] : '';
            $skip_repeater_rename = $is_repeater
                && $existing_meta !== ''
                && isset( $attrs['meta-name'] )
                && (string) $attrs['meta-name'] !== $existing_meta;

            $patch_context = array(
                'field_type'            => $field_type,
                'manage'                => $manage,
                'claimed'               => $claimed_meta_names,
                'field_title'           => isset( $attrs['field-title'] ) ? (string) $attrs['field-title'] : '',
                'global_subfield_state' => isset( $context['global_subfield_state'] ) ? $context['global_subfield_state'] : null,
            );
            if ( $skip_repeater_rename ) {
                $patch_context['resolve_meta_name'] = false;
            }

            $manage[ $idx ] = wppb_fb_apply_field_row_patch(
                $manage[ $idx ],
                $patch,
                $patch_context
            );

            $resolved_meta = isset( $manage[ $idx ]['meta-name'] ) ? (string) $manage[ $idx ]['meta-name'] : '';
            if ( $resolved_meta !== '' ) {
                $claimed_meta_names[ $resolved_meta ] = true;
                if ( $is_repeater ) $repeater_meta_name = $resolved_meta;
            }
        }

        $title = isset( $attrs['field-title'] ) ? $attrs['field-title'] : ( isset( $lookup['attributes']['field-title']['default'] ) ? $lookup['attributes']['field-title']['default'] : '' );

        $ordered_list[] = array(
            'field' => $title . ' ( ' . $field_type . ' )',
            'id'    => $id,
        );

        // Once per field block: where add-ons harvest a cross-cutting attribute
        // into their own per-form storage.
        $field_context = array_merge(
            array( 'is_subfield' => false, 'is_repeater' => $is_repeater ),
            $context
        );
        do_action( 'wppb_fb_field_flattened', $id, $attrs, $field_type, $field_context );

        if ( $is_repeater ) {
            // Sub-fields go into the parent's own option, never the per-form list.
            if ( $repeater_meta_name !== '' ) {
                $written_group = wppb_fb_flatten_repeater_subfields(
                    isset( $block['innerBlocks'] ) ? $block['innerBlocks'] : array(),
                    $repeater_meta_name,
                    $manage,
                    isset( $context['global_subfield_state'] ) ? $context['global_subfield_state'] : null
                );
                // Refresh the snapshot so a sibling Repeater flattened later in
                // this same save sees these ids + meta-names.
                if ( isset( $context['global_subfield_state'] ) && is_array( $context['global_subfield_state'] ) ) {
                    $context['global_subfield_state'] = wppb_fb_merge_repeater_group_into_state(
                        $context['global_subfield_state'],
                        $repeater_meta_name,
                        (array) $written_group
                    );
                }
            }
        } elseif ( ! empty( $block['innerBlocks'] ) ) {
            wppb_fb_flatten_blocks( $block['innerBlocks'], $ordered_list, $manage, $manage_by_id, $claimed_meta_names, $context );
        }
    }
}

/**
 * Write Repeater sub-fields to update_option( $repeater_meta_name ). Returns the
 * group so the caller can refresh the global sub-field snapshot.
 */
function wppb_fb_flatten_repeater_subfields( $inner_blocks, $repeater_meta_name, $manage, $global_subfield_state = null ) {
    $group            = array();  // sub-field rows we'll write to the option
    $group_ids        = array();  // ids already used inside this group
    $claimed_in_group = array();  // meta-names already claimed inside this group

    // Global ID pool: manage_fields + every other Repeater's sub-fields, reusing
    // the caller's snapshot when it threaded one.
    $other_subfield_ids = wppb_fb_collect_global_subfield_ids( $manage, $global_subfield_state );

    // Seed from stored row first or non-schema keys strip every save.
    $existing_by_id = array();
    // array() default, not the 'not_set' sentinel used at the write below: here
    // "no option" and "empty option" seed the same empty index.
    $existing_group = get_option( $repeater_meta_name, array() );
    if ( is_array( $existing_group ) ) {
        foreach ( $existing_group as $existing_row ) {
            if ( is_array( $existing_row ) && isset( $existing_row['id'] ) ) {
                $existing_by_id[ (int) $existing_row['id'] ] = $existing_row;
            }
        }
    }
    // Strip from seed too — patch filter is bypassed for the seed base.
    $stripped_seed_attrs = (array) wppb_fb_repeater_subfield_stripped_attrs();

    foreach ( $inner_blocks as $block ) {
        if ( empty( $block['blockName'] ) ) continue;
        if ( strpos( $block['blockName'], 'profile-builder/' ) !== 0 ) continue;

        $lookup = WPPB_FB_Field_Registry::by_block_name( $block['blockName'] );
        if ( ! $lookup ) continue;

        $field_type = $lookup['field_type'];
        // Repeaters cannot nest inside Repeaters in the legacy data model.
        if ( $field_type === 'Repeater' ) continue;

        $attrs = $block['attrs'];
        $id    = isset( $attrs['id'] ) ? (int) $attrs['id'] : 0;

        $reallocated = false;
        if ( $id === 0 || in_array( $id, $group_ids, true ) ) {
            // Allocate a fresh ID across the global pool + already-allocated group ids.
            $id = wppb_fb_next_field_id( $manage, array_merge( $other_subfield_ids, $group_ids ) );
            $reallocated = true;
        }
        $group_ids[] = $id;

        // Schema-hydrated patch, same shape as the top-level flatten. The helper
        // drops the stripped attrs, so there is nothing to pre-filter here.
        $patch = array();
        foreach ( $lookup['attributes'] as $attr_name => $schema ) {
            $patch[ $attr_name ] = isset( $attrs[ $attr_name ] )
                ? $attrs[ $attr_name ]
                : ( isset( $schema['default'] ) ? $schema['default'] : '' );
        }
        if ( isset( $attrs['meta-name'] ) ) {
            $patch['meta-name'] = $attrs['meta-name'];
        }

        // A reallocated id is a brand-new sub-field with no stored counterpart,
        // so it starts bare.
        $base_row = ( ! $reallocated && isset( $existing_by_id[ $id ] ) )
            ? $existing_by_id[ $id ]
            : array();
        foreach ( $stripped_seed_attrs as $strip_key ) {
            unset( $base_row[ $strip_key ] );
        }
        $base_row['id']    = $id;
        $base_row['field'] = $field_type;

        $row = wppb_fb_apply_field_row_patch(
            $base_row,
            $patch,
            array(
                'field_type'            => $field_type,
                'manage'                => $manage,
                'claimed'               => $claimed_in_group,
                'is_subfield'           => true,
                'group'                 => $group,
                'current_repeater_meta' => $repeater_meta_name,
                'extra_known_metas'     => array_keys( $claimed_in_group ),
                'global_subfield_state' => $global_subfield_state,
            )
        );

        $resolved_meta = isset( $row['meta-name'] ) ? (string) $row['meta-name'] : '';
        if ( $resolved_meta !== '' ) {
            $claimed_in_group[ $resolved_meta ] = true;
        }

        $group[] = $row;
    }

    // Rebuilding the group without an unrenderable sub-row would delete its
    // definition permanently and orphan its `<name>_1`, `<name>_2`, … usermeta.
    if ( is_array( $existing_group ) && ! empty( $existing_group ) ) {
        $group = wppb_fb_carry_forward_unrenderable_subfields( $group, $existing_group );
    }

    // Skip update_option when identical (still fires hooks/cache even on no-op).
    $existing = get_option( $repeater_meta_name, 'not_set' );
    if ( is_array( $existing ) && $existing === $group ) return $group;

    update_option( $repeater_meta_name, $group );

    return $group;
}

// 4. Cascade delete: wppb_manage_fields row -> per-form ordered lists

/**
 * Forms whose ordered list contains this global field id (delete-confirm warning).
 *
 * @param int $field_id Global wppb_manage_fields row id.
 * @return array<int,array{id:int,title:string,post_type:string}>
 */
function wppb_fb_forms_using_field( $field_id ) {
    $field_id = (int) $field_id;
    $found    = array();

    foreach ( array( 'rf', 'epf' ) as $form_type ) {
        // Full posts: primes meta + title in bulk (ids-only would N+1).
        $forms = get_posts( array(
            'post_type'              => 'wppb-' . $form_type . '-cpt',
            'numberposts'            => -1,
            'posts_per_page'         => -1,
            'post_status'            => 'any',
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
        ) );

        $meta_key = 'wppb_' . $form_type . '_fields';
        foreach ( $forms as $form ) {
            $form_id        = (int) $form->ID;
            $fields_in_form = get_post_meta( $form_id, $meta_key, true );
            if ( ! is_array( $fields_in_form ) || empty( $fields_in_form ) ) continue;
            foreach ( $fields_in_form as $field ) {
                if ( isset( $field['id'] ) && (int) $field['id'] === $field_id ) {
                    $title   = get_the_title( $form );
                    $found[] = array(
                        'id'        => (int) $form_id,
                        'title'     => ( $title !== '' )
                            ? $title
                            /* translators: %d: form post ID */
                            : sprintf( __( '(no title) #%d', 'profile-builder' ), (int) $form_id ),
                        'post_type' => 'wppb-' . $form_type . '-cpt',
                    );
                    break; // Count each form once, regardless of duplicate rows.
                }
            }
        }
    }

    return $found;
}

/**
 * Cascade a manage_fields delete into every form's ordered list (legacy listener
 * is not loaded while the form-builder is active).
 */
add_action( 'wck_before_remove_meta', 'wppb_fb_cascade_delete_field_from_forms', 10, 3 );
function wppb_fb_cascade_delete_field_from_forms( $meta, $id, $element_id ) {
    if ( $meta !== 'wppb_manage_fields' ) return;

    $all_fields = get_option( $meta );
    if ( ! is_array( $all_fields ) || ! isset( $all_fields[ $element_id ]['id'] ) ) return;
    $deleted_id = (int) $all_fields[ $element_id ]['id'];

    foreach ( array( 'rf', 'epf' ) as $form_type ) {
        $forms = get_posts( array(
            'post_type'              => 'wppb-' . $form_type . '-cpt',
            'numberposts'            => -1,
            'posts_per_page'         => -1,
            'post_status'            => 'any',
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        ) );
        if ( ! empty( $forms ) ) update_meta_cache( 'post', $forms );  // one IN() query, not one per form

        foreach ( $forms as $form_id ) {
            $meta_key       = 'wppb_' . $form_type . '_fields';
            $fields_in_form = get_post_meta( $form_id, $meta_key, true );
            if ( ! is_array( $fields_in_form ) || empty( $fields_in_form ) ) continue;
            $changed = false;
            foreach ( $fields_in_form as $key => $field ) {
                if ( isset( $field['id'] ) && (int) $field['id'] === $deleted_id ) {
                    unset( $fields_in_form[ $key ] );
                    $changed = true;
                }
            }
            if ( $changed ) {
                update_post_meta( $form_id, $meta_key, array_values( $fields_in_form ) );
            }
        }
    }
}
