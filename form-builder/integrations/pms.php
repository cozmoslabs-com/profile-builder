<?php
/**
 * Paid Member Subscriptions ↔ Form Builder integration.
 *
 * Gate at hook time because PMS may load after PB. PB owns this bridge so classic
 * parity does not wait on a PMS release. Front-end render stays in PMS.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Whether PMS's Profile Builder integration is loaded (same signal as classic Manage Fields).
 */
function wppb_fb_pms_integration_active() {
    return function_exists( 'pms_pb_manage_field_types' );
}

/**
 * Field-type labels PMS contributes. Must match wppbFieldType in the two blocks' block.json.
 */
function wppb_fb_pms_field_types() {
    return array( 'Subscription Plans', 'PMS Billing Fields' );
}

/**
 * Flatten a PMS plan-output HTML snippet to plain text for the canvas preview.
 *
 * @param string $html                One PMS plan-output snippet.
 * @param bool   $drop_plain_dividers Drop bare `pms-divider` spans (front end hides them).
 *                                    Duration divider (`pms-duration-divider`) is kept.
 * @return string
 */
function wppb_fb_pms_plan_text( $html, $drop_plain_dividers = false ) {
    if ( ! is_string( $html ) || '' === $html ) {
        return '';
    }

    if ( $drop_plain_dividers ) {
        $html = preg_replace( '#<span class="pms-divider">.*?</span>#s', '', $html );
    }

    $text = html_entity_decode( wp_strip_all_tags( $html ), ENT_QUOTES, 'UTF-8' );

    return trim( preg_replace( '/\s+/u', ' ', $text ) );
}

/**
 * Price + billing cycles + duration. Uses `wppb_register` so the same filters apply as on the form.
 */
function wppb_fb_pms_plan_price_text( $plan ) {
    if ( ! function_exists( 'pms_get_output_subscription_plan_price' ) ) {
        return '';
    }
    return wppb_fb_pms_plan_text( pms_get_output_subscription_plan_price( $plan, 'wppb_register' ), true );
}

/**
 * Free-trial suffix. Empty when none; PMS may also suppress for the current user (e.g. admin who used the trial).
 */
function wppb_fb_pms_plan_trial_text( $plan ) {
    if ( ! function_exists( 'pms_get_output_subscription_plan_trial' ) ) {
        return '';
    }
    return wppb_fb_pms_plan_text( pms_get_output_subscription_plan_trial( $plan, 'wppb_register' ) );
}

/**
 * Sign-up-fee suffix. Empty when none or no gateway supports fees.
 */
function wppb_fb_pms_plan_sign_up_fee_text( $plan ) {
    if ( ! function_exists( 'pms_get_output_subscription_plan_sign_up_fee' ) ) {
        return '';
    }
    return wppb_fb_pms_plan_text( pms_get_output_subscription_plan_sign_up_fee( $plan ) );
}

/**
 * Plan description for the preview, via the same filter as the front end.
 */
function wppb_fb_pms_plan_description_text( $plan ) {
    $description = ! empty( $plan->description ) ? htmlspecialchars_decode( esc_html( $plan->description ) ) : '';
    $description = apply_filters( 'pms_output_subscription_plan_description', $description, $plan );

    return wppb_fb_pms_plan_text( $description );
}

/* 1. Gating — both PMS field types active so their blocks are insertable. */
add_filter( 'wppb_fb_enabled_addon_field_types', 'wppb_fb_pms_enable_field_types' );
function wppb_fb_pms_enable_field_types( $types ) {
    if ( ! wppb_fb_pms_integration_active() ) {
        return $types;
    }
    if ( ! is_array( $types ) ) $types = array();

    foreach ( wppb_fb_pms_field_types() as $field_type ) {
        if ( ! in_array( $field_type, $types, true ) ) {
            $types[] = $field_type;
        }
    }
    return $types;
}

/* 2. Editor payload — plans + billing fields for the two blocks' controls. */
add_action( 'wppb_fb_enqueue_editor_assets_late', 'wppb_fb_pms_enqueue_editor_payload' );
function wppb_fb_pms_enqueue_editor_payload() {
    if ( ! wppb_fb_pms_integration_active() ) {
        return;
    }

    // `all` first, then each plan by id — matches classic option order / values.
    $subscription_plans = array(
        array( 'value' => 'all', 'label' => __( 'All', 'profile-builder' ) ),
    );
    if ( function_exists( 'pms_get_subscription_plans' ) ) {
        foreach ( pms_get_subscription_plans() as $plan ) {
            $subscription_plans[] = array(
                'value' => (string) $plan->id,
                'label' => $plan->name,
                'price'       => wppb_fb_pms_plan_price_text( $plan ),
                'trial'       => wppb_fb_pms_plan_trial_text( $plan ),
                'signUpFee'   => wppb_fb_pms_plan_sign_up_fee_text( $plan ),
                'description' => wppb_fb_pms_plan_description_text( $plan ),
            );
        }
    }

    // Default-plan select: no `all`; "Choose..." = -1. Value/label only for SelectControl.
    $subscription_plan_select = array(
        array( 'value' => '-1', 'label' => __( 'Choose...', 'profile-builder' ) ),
    );
    foreach ( $subscription_plans as $plan ) {
        if ( $plan['value'] === 'all' ) continue;
        $subscription_plan_select[] = array(
            'value' => $plan['value'],
            'label' => $plan['label'],
        );
    }

    $billing_fields = array();
    if ( function_exists( 'pms_pb_get_billing_fields' ) ) {
        foreach ( pms_pb_get_billing_fields() as $slug => $field_data ) {
            $billing_fields[] = array(
                'value' => (string) $slug,
                'label' => isset( $field_data['label'] ) ? $field_data['label'] : (string) $slug,
            );
        }
    }

    $payload = array(
        'subscriptionPlans'      => array_values( $subscription_plans ),
        'subscriptionPlanSelect' => array_values( $subscription_plan_select ),
        'billingFields'          => array_values( $billing_fields ),
        'subscriptionsUrl'       => admin_url( 'edit.php?post_type=pms-subscription' ),
        'addonsUrl'              => admin_url( 'admin.php?page=pms-addons-page' ),
    );

    wp_add_inline_script(
        'wppb-form-editor-bundle',
        'window.wppbFb = window.wppbFb || {}; window.wppbFb.pms = ' . wp_json_encode( $payload ) . ';',
        'before'
    );
}
