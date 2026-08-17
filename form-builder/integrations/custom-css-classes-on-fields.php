<?php
/**
 * Custom CSS Classes ↔ Form Builder bridge.
 *
 * Injects `class-field` into allowlisted field blocks and registers the
 * ExtraFieldPropertiesPanel control. Key already round-trips via optional_addon_properties.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Loaded by wppb_fb_load_addon_integrations(); do not include directly.

/**
 * Field types that get the CSS Class control (classic updateFields allowlist, for parity).
 *
 * @return string[]
 */
function wppb_ccc_fb_supported_field_types() {
    return array(
        'Default - Name (Heading)', 'Default - Contact Info (Heading)', 'Default - About Yourself (Heading)',
        'Default - Username', 'Default - First Name', 'Default - Last Name', 'Default - Nickname',
        'Default - E-mail', 'Default - Website', 'Default - AIM', 'Default - Yahoo IM',
        'Default - Jabber / Google Talk', 'Default - Password', 'Default - Repeat Password',
        'Default - Biographical Info', 'Default - Display name publicly as',
        'Heading', 'Input', 'Textarea', 'WYSIWYG', 'Select', 'Datepicker', 'Select (Multiple)',
        'Checkbox', 'Radio', 'Upload', 'Phone', 'Timepicker', 'Colorpicker', 'Validation',
        'Select (User Role)', 'Select (CPT)', 'Select (Timezone)', 'Select (Country)', 'Select (Currency)',
        'Email', 'URL', 'GDPR Checkbox', 'GDPR Delete Button', 'Map', 'Number', 'Avatar',
        'Input (Hidden)', 'International Telephone Input', 'Language', 'HTML', 'Select2',
        'Checkbox (Terms and Conditions)', 'reCAPTCHA', 'Select2 (Multiple)', 'Honeypot', 'Email Confirmation',
    );
}

/**
 * Inject `class-field` into the allowlisted field blocks' schema.
 */
add_filter( 'wppb_fb_block_attributes', 'wppb_ccc_fb_inject_block_attributes', 10, 3 );
function wppb_ccc_fb_inject_block_attributes( $attributes, $field_type, $context ) {
    if ( ! in_array( $field_type, wppb_ccc_fb_supported_field_types(), true ) ) {
        return $attributes;
    }
    if ( ! isset( $attributes['class-field'] ) ) {
        $attributes['class-field'] = array( 'type' => 'string', 'default' => '' );
    }
    return $attributes;
}

/**
 * Publish the client schema mirror and the editable text control.
 */
add_action( 'wppb_fb_enqueue_editor_assets_late', 'wppb_ccc_fb_enqueue_editor_payload' );
function wppb_ccc_fb_enqueue_editor_payload() {
    $field_types = array_intersect( wppb_ccc_fb_supported_field_types(), wppb_fb_all_field_type_labels() );
    if ( empty( $field_types ) ) return;

    $schema = array( 'class-field' => array( 'type' => 'string', 'default' => '' ) );
    $extra  = array();
    foreach ( $field_types as $field_type ) {
        $extra[ $field_type ] = $schema;
    }
    wppb_fb_extra_attributes_inline_script( $extra );

    wppb_fb_register_extra_field_control( array(
        'attribute' => 'class-field',
        'label'     => __( 'CSS Class', 'profile-builder' ),
        'help'      => __( 'Add a class to a field. Should not contain dots(.) and for multiple classes separate by space.', 'profile-builder' ),
        'control'   => 'text',
    ) );
}
