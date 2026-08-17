<?php
/**
 * Maximum Character Length ↔ Form Builder bridge.
 *
 * Injects `maximum-character-length` into allowlisted field blocks and registers
 * the ExtraFieldPropertiesPanel control. Stored as string (legacy casts at enforce time).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Loaded by wppb_fb_load_addon_integrations(); do not include directly.

/**
 * Field types that get the Maximum Character Length control (classic updateFields allowlist).
 *
 * @return string[]
 */
function wppb_mcl_fb_supported_field_types() {
    return array(
        'Input',
        'Textarea',
        'Default - Biographical Info',
        'URL',
        'Email',
        'Default - Website',
    );
}

/**
 * Inject `maximum-character-length` into the allowlisted field blocks' schema.
 */
add_filter( 'wppb_fb_block_attributes', 'wppb_mcl_fb_inject_block_attributes', 10, 3 );
function wppb_mcl_fb_inject_block_attributes( $attributes, $field_type, $context ) {
    if ( ! in_array( $field_type, wppb_mcl_fb_supported_field_types(), true ) ) {
        return $attributes;
    }
    if ( ! isset( $attributes['maximum-character-length'] ) ) {
        $attributes['maximum-character-length'] = array( 'type' => 'string', 'default' => '' );
    }
    return $attributes;
}

/**
 * Publish the client schema mirror and the editable number control.
 */
add_action( 'wppb_fb_enqueue_editor_assets_late', 'wppb_mcl_fb_enqueue_editor_payload' );
function wppb_mcl_fb_enqueue_editor_payload() {
    $field_types = array_intersect( wppb_mcl_fb_supported_field_types(), wppb_fb_all_field_type_labels() );
    if ( empty( $field_types ) ) return;

    $schema = array( 'maximum-character-length' => array( 'type' => 'string', 'default' => '' ) );
    $extra  = array();
    foreach ( $field_types as $field_type ) {
        $extra[ $field_type ] = $schema;
    }
    wppb_fb_extra_attributes_inline_script( $extra );

    wppb_fb_register_extra_field_control( array(
        'attribute' => 'maximum-character-length',
        'label'     => __( 'Maximum Character Length', 'profile-builder' ),
        'help'      => __( 'Specify the maximum number of characters a user can type in this field.', 'profile-builder' ),
        'control'   => 'number',
    ) );
}
