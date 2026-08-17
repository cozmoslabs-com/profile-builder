<?php
/**
 * Edit Profile Approved by Admin ↔ Form Builder bridge.
 *
 * Injects `edit-profile-approved-by-admin` into field blocks and mirrors it to
 * extraAttributes. Key already round-trips via optional_addon_properties.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Loaded by wppb_fb_load_addon_integrations(); do not include directly.

/**
 * Field-type labels that do NOT get the approval attribute.
 * Mirrors the classic exclude list in assets/js/main.js#updateEditProfileApproval.
 * Use this during registry build — do not call supported_field_types() then (empty registry).
 *
 * @return string[]
 */
function wppb_in_epaa_fb_excluded_field_types() {
    return array(
        // Headings and structural defaults
        'Default - Name (Heading)',
        'Default - Contact Info (Heading)',
        'Default - About Yourself (Heading)',
        'Heading',
        'HTML',
        // Credentials and identity defaults the user can't change-via-approval
        'Default - Username',
        'Default - Password',
        'Default - Repeat Password',
        'Default - Display name publicly as',
        // Field types that aren't editable values
        'Checkbox (Terms and Conditions)',
        'Input (Hidden)',
        'Repeater',
        'Validation',
        'Honeypot',
        // GDPR / consent
        'GDPR Checkbox',
        'GDPR Delete Button',
        'GDPR Communication Preferences',
        // Anti-bot challenges
        'reCAPTCHA',
        'Turnstile',
        // Subscription / commerce widgets
        'Subscription Plans',
        'MailChimp Subscribe',
        'Campaign Monitor Subscribe',
        'MailPoet Subscribe',
        'WooCommerce Customer Billing Address',
        'WooCommerce Customer Shipping Address',
    );
}

/**
 * Field types that get the approval attribute (registry minus exclude list).
 * Call only after registry construction; during build invert the exclude list instead.
 *
 * @return string[]
 */
function wppb_in_epaa_fb_supported_field_types() {
    if ( ! class_exists( 'WPPB_FB_Field_Registry' ) ) return array();

    $all_types = array_keys( WPPB_FB_Field_Registry::all() );

    /**
     * Filter the EPAA-supported field-type list.
     *
     * @param string[] $supported Field-type labels supported by EPAA in the form builder.
     */
    return apply_filters(
        'wppb_in_epaa_fb_supported_field_types',
        array_values( array_diff( $all_types, wppb_in_epaa_fb_excluded_field_types() ) )
    );
}

/**
 * Inject `edit-profile-approved-by-admin`. Default '' matches legacy (absent = not required).
 */
add_filter( 'wppb_fb_block_attributes', 'wppb_in_epaa_fb_inject_block_attributes', 10, 3 );
function wppb_in_epaa_fb_inject_block_attributes( $attributes, $field_type, $context ) {
    if ( in_array( $field_type, wppb_in_epaa_fb_excluded_field_types(), true ) ) {
        return $attributes;
    }
    if ( ! isset( $attributes['edit-profile-approved-by-admin'] ) ) {
        $attributes['edit-profile-approved-by-admin'] = array( 'type' => 'string', 'default' => '' );
    }
    return $attributes;
}

/**
 * Publish the editor extraAttributes mirror for the approval key.
 */
add_action( 'wppb_fb_enqueue_editor_assets_late', 'wppb_in_epaa_fb_enqueue_editor_payload' );
function wppb_in_epaa_fb_enqueue_editor_payload() {
    $supported_types = wppb_in_epaa_fb_supported_field_types();
    if ( empty( $supported_types ) ) return;

    $schema = array(
        'edit-profile-approved-by-admin' => array( 'type' => 'string', 'default' => '' ),
    );
    $extra_attrs = array();
    foreach ( $supported_types as $field_type ) {
        $extra_attrs[ $field_type ] = $schema;
    }

    wppb_fb_extra_attributes_inline_script( $extra_attrs );
}
