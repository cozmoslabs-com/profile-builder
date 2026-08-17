<?php
/**
 * Read-side projection: legacy field rows → parsed-block trees. The inverse of
 * the flatten loop in form-builder-projection.php. Pure helpers, no hooks.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Generates block markup from legacy field meta.
 *
 * The per-form list (`wppb_*_fields`) is flat — Repeater sub-fields live in a
 * separate option keyed by the parent's meta-name (legacy contract), and are
 * emitted here as innerBlocks.
 */
function wppb_fb_build_block_markup_for_form( $post_id, $post_type ) {
    $meta_key = $post_type === 'wppb-rf-cpt' ? 'wppb_rf_fields' : 'wppb_epf_fields';
    $entries  = get_post_meta( $post_id, $meta_key, true );
    $manage   = wppb_fb_manage_fields();

    if ( ! is_array( $entries ) ) $entries = array();

    wppb_fb_prime_repeater_option_caches( $manage );

    // Index manage_fields for quick attribute lookup
    $manage_by_id = array();
    foreach ( $manage as $item ) {
        if ( isset( $item['id'] ) ) $manage_by_id[ (int) $item['id'] ] = $item;
    }

    // Resolve block names via the registry (the canonical reverse of by_block_name).
    // Keyed by PB field type -> block name.
    $registry = WPPB_FB_Field_Registry::all();

    $top_context = array(
        'context'     => 'form-render',
        'post_id'     => $post_id,
        'post_type'   => $post_type,
        'is_subfield' => false,
    );
    $sub_context = array(
        'context'     => 'form-render',
        'post_id'     => $post_id,
        'post_type'   => $post_type,
        'is_subfield' => true,
    );

    $repeater_active = wppb_fb_is_repeater_module_active();

    // Registration forms' mandatory fields get `lock.remove = true` injected on
    // read so Gutenberg's `canRemoveBlocks` gate closes the keyboard / toolbar /
    // dispatch removal paths. `lock` is in no field block's attribute schema, so
    // the flatten loop can't persist it and the per-edit mirror baselines it.
    $is_registration_form  = $post_type === 'wppb-rf-cpt';
    $mandatory_field_types = $is_registration_form ? wppb_fb_mandatory_registration_field_types() : array();

    $blocks = array();
    foreach ( $entries as $entry ) {
        // An entry without a usable `id` can't be resolved to a registry row —
        // there is nothing to look up. Skip it explicitly instead of emitting
        // `Undefined array key "id"` and falling through to the null-block path.
        if ( ! is_array( $entry ) || empty( $entry['id'] ) ) continue;

        $id     = (int) $entry['id'];
        $global = isset( $manage_by_id[ $id ] ) ? $manage_by_id[ $id ] : array();

        // Skip Repeater rows entirely when the module is off. The
        // underlying legacy data (manage_fields row + get_option(meta-name)
        // sub-field defs + user_meta rows) is left untouched — re-enabling
        // the module brings the field back into the canvas as-is.
        if ( ! $repeater_active && ( $global['field'] ?? '' ) === 'Repeater' ) continue;

        $block  = wppb_fb_row_to_block( $global, $id, $registry, $top_context );
        if ( $block === null ) continue;

        if ( $is_registration_form && in_array( $global['field'] ?? '', $mandatory_field_types, true ) ) {
            $existing_lock = isset( $block['attrs']['lock'] ) && is_array( $block['attrs']['lock'] ) ? $block['attrs']['lock'] : array();
            $block['attrs']['lock'] = array_merge( $existing_lock, array( 'remove' => true ) );
        }

        // Repeaters: hydrate innerBlocks from get_option( $meta_name ).
        if ( ( $global['field'] ?? '' ) === 'Repeater' && ! empty( $global['meta-name'] ) ) {
            $group = get_option( $global['meta-name'], 'not_set' );
            if ( is_array( $group ) ) {
                foreach ( $group as $subrow ) {
                    $sub_id = (int) ( $subrow['id'] ?? 0 );
                    $subblock = wppb_fb_row_to_block( $subrow, $sub_id, $registry, $sub_context );
                    if ( $subblock === null ) continue;

                    // Sub-fields are scope-locked to their parent Repeater
                    // client-side only (a CSS overlay — see RepeaterScopeGuard.js
                    // and _repeater-scope.scss), so intra-Repeater reorder by drag
                    // keeps working. Nothing is injected server-side here.
                    $block['innerBlocks'][] = $subblock;
                }
            }
            // serialize_block() walks innerContent, treating nulls as child-block
            // placeholders. Without this, children are silently dropped during
            // serialization even though innerBlocks is populated.
            $block['innerContent'] = array_fill( 0, count( $block['innerBlocks'] ), null );
        }

        $blocks[] = $block;
    }

    // Lets add-ons inject structural blocks (e.g. Multi-Step Forms step-break
    // separators) into the regenerated tree at positions derived from their
    // own per-form storage. Receives ($blocks, $post_id, $post_type).
    $blocks = apply_filters( 'wppb_fb_form_blocks', $blocks, $post_id, $post_type );

    return serialize_blocks( $blocks );
}

/**
 * Field types that are mandatory on every Registration form. Mirrors the legacy
 * `wppb_disable_delete_on_default_mandatory_fields()` rule; enforced by the
 * DELETE route (403) and by the `lock.remove` injection on read. Filterable.
 */
function wppb_fb_mandatory_registration_field_types() {
    return apply_filters( 'wppb_fb_mandatory_registration_field_types', array(
        'Default - Username',
        'Default - E-mail',
        'Default - Password',
    ) );
}

/**
 * Copies a legacy field row's block-attribute keys, dropping the two non-attribute
 * keys (`id`, `field`) every caller surfaces separately. Single source of truth for
 * that reserved set, so the two read paths can't drift.
 */
function wppb_fb_row_attrs_without_meta( $row ) {
    $attrs = array();
    foreach ( $row as $key => $val ) {
        if ( $key === 'id' || $key === 'field' ) continue;
        $attrs[ $key ] = $val;
    }
    return $attrs;
}

/**
 * Converts a legacy field row into a parsed-block array. Returns null when the
 * row's field type isn't registered (add-on deactivated). $context is forwarded
 * to `wppb_fb_row_to_block_attrs` so add-ons can hydrate per-form attributes
 * that don't live on the row itself.
 */
function wppb_fb_row_to_block( $row, $id, $registry, $context = array() ) {
    $field_type = isset( $row['field'] ) ? $row['field'] : '';
    if ( $field_type === '' || ! isset( $registry[ $field_type ] ) ) {
        return null;
    }
    $attrs = array( 'id' => $id ) + wppb_fb_row_attrs_without_meta( $row );
    $attrs = apply_filters( 'wppb_fb_row_to_block_attrs', $attrs, $row, $field_type, $context );
    return array(
        'blockName'    => $registry[ $field_type ]['block'],
        'attrs'        => $attrs,
        'innerBlocks'  => array(),
        'innerHTML'    => '',
        'innerContent' => array(),
    );
}

/**
 * Converts a legacy field row into the Existing Fields bridge's entry shape.
 * Returns null when the field type has no registered block, so the panel never
 * produces a block Gutenberg can't parse.
 */
function wppb_fb_existing_fields_row_to_entry( $row, $registry, $is_subfield = false ) {
    if ( ! isset( $row['field'], $row['id'] ) ) return null;
    $field_type = $row['field'];
    if ( ! isset( $registry[ $field_type ] ) ) return null;

    $attrs = wppb_fb_row_attrs_without_meta( $row );

    // Same filter as wppb_fb_row_to_block(), distinct context. Per-form
    // attributes (e.g. Multi-Step Forms break-point flags) MUST NOT be
    // injected here — this is global state from wppb_manage_fields and the
    // panel's "linked, not cloned" semantics would leak per-form state across
    // forms. Add-ons listen for context === 'form-render' only.
    $attrs = apply_filters( 'wppb_fb_row_to_block_attrs', $attrs, $row, $field_type, array(
        'context'     => 'existing-fields-bridge',
        'is_subfield' => (bool) $is_subfield,
    ) );

    return array(
        'id'          => (int) $row['id'],
        'fieldType'   => $field_type,
        'blockName'   => $registry[ $field_type ]['block'],
        'title'       => isset( $row['field-title'] ) ? (string) $row['field-title'] : '',
        'metaName'    => isset( $row['meta-name'] ) ? (string) $row['meta-name'] : '',
        'attributes'  => $attrs,
        'innerBlocks' => array(),
    );
}

/**
 * Pre-warms the options cache for every Repeater meta-name in a snapshot, so the
 * hydration loops don't issue one un-cached `get_option()` per Repeater row.
 * No-op on WP < 6.4 — the bridge still works, just without the batched prefetch.
 */
function wppb_fb_prime_repeater_option_caches( $manage ) {
    if ( ! function_exists( 'wp_prime_option_caches' ) ) return;
    if ( ! is_array( $manage ) ) return;

    $names = array();
    foreach ( $manage as $row ) {
        if ( ( $row['field'] ?? '' ) === 'Repeater' && ! empty( $row['meta-name'] ) ) {
            $names[] = (string) $row['meta-name'];
        }
    }
    if ( $names ) wp_prime_option_caches( $names );
}

/**
 * True when `$meta_name` is a Repeater meta-name in `$manage` (sub-field REST gate).
 */
function wppb_fb_is_repeater_meta_name( $meta_name, $manage ) {
    if ( ! is_string( $meta_name ) || $meta_name === '' ) return false;
    if ( ! is_array( $manage ) ) return false;
    foreach ( $manage as $row ) {
        if ( ( $row['field'] ?? '' ) === 'Repeater' && (string) ( $row['meta-name'] ?? '' ) === $meta_name ) {
            return true;
        }
    }
    return false;
}

/** Hydrate a Repeater entry's `innerBlocks` from `get_option( $meta_name )`. */
function wppb_fb_hydrate_repeater_subfields( array &$entry, array $registry ) {
    if ( ( $entry['fieldType'] ?? '' ) !== 'Repeater' ) return;
    if ( ( $entry['metaName'] ?? '' ) === '' ) return;

    $group = get_option( $entry['metaName'], 'not_set' );
    if ( ! is_array( $group ) ) return;

    foreach ( $group as $sub_row ) {
        $sub_entry = wppb_fb_existing_fields_row_to_entry( $sub_row, $registry, true );
        if ( $sub_entry !== null ) $entry['innerBlocks'][] = $sub_entry;
    }
}

/**
 * Snapshot wppb_manage_fields for the Existing Fields panel. Repeaters must be hydrated.
 */
function wppb_fb_existing_fields_bridge() {
    $manage = wppb_fb_manage_fields();
    if ( ! is_array( $manage ) ) return array();

    wppb_fb_prime_repeater_option_caches( $manage );

    $registry = WPPB_FB_Field_Registry::all();
    $fields   = array();
    foreach ( $manage as $row ) {
        $entry = wppb_fb_existing_fields_row_to_entry( $row, $registry );
        if ( $entry === null ) continue;

        wppb_fb_hydrate_repeater_subfields( $entry, $registry );

        $fields[] = $entry;
    }
    return $fields;
}
