<?php
/**
 * WooCommerce ↔ Form Builder bridge.
 *
 * Gates the two address field types, injects the checkout toggle on the classic
 * allowlist, and ships billing/shipping sub-field lists for the address blocks.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Loaded by wppb_fb_load_addon_integrations(); do not include directly.

/* 1. Gating — both address field types active. */
add_filter( 'wppb_fb_enabled_addon_field_types', 'wppb_in_woo_fb_enable_field_types' );
function wppb_in_woo_fb_enable_field_types( $types ) {
    $types[] = 'WooCommerce Customer Billing Address';
    $types[] = 'WooCommerce Customer Shipping Address';
    return $types;
}

/**
 * Field types that get the "Display on WooCommerce Checkout" toggle.
 * Mirrors WooCheckoutFields() in assets/js/main.js (shorter list for block checkout).
 * Cached — block-checkout probe hits the DB and the attributes filter fires per type.
 */
function wppb_in_woo_fb_checkout_field_types() {
    static $types = null;
    if ( null !== $types ) {
        return $types;
    }

    $is_block_checkout = function_exists( 'wppb_is_woocommerce_block_checkout' ) && wppb_is_woocommerce_block_checkout();

    if ( $is_block_checkout ) {
        $types = array(
            'Input',
            'Number',
            'Phone',
            'Select',
            'Checkbox (Terms and Conditions)',
        );
    } else {
        $types = array(
            'Default - First Name',
            'Default - Last Name',
            'Default - Nickname',
            'Default - Biographical Info',
            'Default - Website',
            'Default - About Yourself (Heading)',
            'Input',
            'Input (Hidden)',
            'Textarea',
            'Checkbox',
            'Checkbox (Terms and Conditions)',
            'Select',
            'Radio',
            'Heading',
            'Datepicker',
            'Phone',
            'Number',
            'Avatar',
            'Upload',
            'MailChimp Subscribe',
            'Select (Multiple)',
            'WYSIWYG',
            'Select (Country)',
            'Select (Timezone)',
            'Select (Currency)',
            'Select (CPT)',
            'Select (User Role)',
            'Timepicker',
            'Colorpicker',
            'Map',
            'HTML',
            'Repeater',
            'Validation',
        );
    }

    return $types;
}

/*
 * Classic: no checkout toggle on Repeater sub-fields. Strip on flatten; hideInsideRepeater suppresses the control.
 */
add_filter( 'wppb_fb_repeater_subfield_stripped_attrs', 'wppb_in_woo_fb_strip_subfield_attrs' );
function wppb_in_woo_fb_strip_subfield_attrs( $stripped ) {
    $stripped[] = 'woocommerce-checkout-field';
    return $stripped;
}

/* 2. Checkout toggle — inject into allowlisted field blocks. */
add_filter( 'wppb_fb_block_attributes', 'wppb_in_woo_fb_inject_checkout_attr', 10, 3 );
function wppb_in_woo_fb_inject_checkout_attr( $attributes, $field_type, $context ) {
    if ( ! in_array( $field_type, wppb_in_woo_fb_checkout_field_types(), true ) ) {
        return $attributes;
    }
    if ( ! isset( $attributes['woocommerce-checkout-field'] ) ) {
        $attributes['woocommerce-checkout-field'] = array( 'type' => 'string', 'default' => 'No' );
    }
    return $attributes;
}

add_action( 'wppb_fb_enqueue_editor_assets_late', 'wppb_in_woo_fb_enqueue_editor_payload' );
function wppb_in_woo_fb_enqueue_editor_payload() {
    $allowed = array_intersect( wppb_in_woo_fb_checkout_field_types(), wppb_fb_all_field_type_labels() );
    if ( ! empty( $allowed ) ) {
        $schema = array( 'woocommerce-checkout-field' => array( 'type' => 'string', 'default' => 'No' ) );
        $extra  = array();
        foreach ( $allowed as $ft ) {
            $extra[ $ft ] = $schema;
        }
        wppb_fb_extra_attributes_inline_script( $extra );
    }
    wppb_fb_register_extra_field_control( array(
        'attribute' => 'woocommerce-checkout-field',
        'label'     => __( 'Display on WooCommerce Checkout', 'profile-builder' ),
        'help'      => __( 'Add this field to the WooCommerce checkout form.', 'profile-builder' ),
        'control'   => 'toggle',
        'onValue'   => 'Yes',
        'offValue'  => 'No',
        // Classic strips this from Repeater sub-fields; pair with stripped-attrs above.
        'hideInsideRepeater' => true,
    ) );

    $payload = array(
        'billingFields'  => wppb_in_woo_fb_field_list( 'billing' ),
        'shippingFields' => wppb_in_woo_fb_field_list( 'shipping' ),
    );
    wp_add_inline_script(
        'wppb-form-editor-bundle',
        'window.wppbFb = window.wppbFb || {}; window.wppbFb.woocommerce = ' . wp_json_encode( $payload ) . ';',
        'before'
    );
}

/* Convert legacy { key => [label, required] } to [ {key,label,required} ] for the editor. */
function wppb_in_woo_fb_field_list( $kind ) {
    $map = array();
    if ( $kind === 'billing' && function_exists( 'wppb_in_woo_get_billing_fields' ) ) {
        $map = wppb_in_woo_get_billing_fields();
    } elseif ( $kind === 'shipping' && function_exists( 'wppb_in_woo_get_shipping_fields' ) ) {
        $map = wppb_in_woo_get_shipping_fields();
    }
    $out = array();
    if ( is_array( $map ) ) {
        foreach ( $map as $key => $def ) {
            $out[] = array(
                'key'      => (string) $key,
                'label'    => isset( $def['label'] ) ? $def['label'] : (string) $key,
                'required' => isset( $def['required'] ) ? $def['required'] : 'No',
            );
        }
    }
    return $out;
}
