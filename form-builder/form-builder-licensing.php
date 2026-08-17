<?php
/**
 * Free vs paid form-builder gating (multiple forms + Pro-only field types).
 * Entitlement uses PROFILE_BUILDER (active plugin), not serial status — an expired
 * licence keeps unlocked features, matching other paid surfaces.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * PROFILE_BUILDER values that unlock paid form-builder features (Pro and up).
 *
 * @return string[]
 */
function wppb_fb_paid_versions() {
    return apply_filters( 'wppb_fb_paid_versions', array(
        'Profile Builder Pro',
        'Profile Builder Agency',
        'Profile Builder Unlimited',
        'Profile Builder Dev',
    ) );
}

/**
 * Whether a paid (Pro and up) version of Profile Builder is the active plugin.
 *
 * @return bool
 */
function wppb_fb_is_paid_version() {
    return defined( 'PROFILE_BUILDER' ) && in_array( PROFILE_BUILDER, wppb_fb_paid_versions(), true );
}

/**
 * Whether this install may create forms beyond the two defaults. Creation-only —
 * existing forms keep working after a downgrade. Enforced via create_posts =>
 * do_not_allow; direct wp_insert_post() is unchecked so default seeding still works.
 *
 * @return bool
 */
function wppb_fb_multiple_forms_available() {
    return (bool) apply_filters( 'wppb_fb_multiple_forms_available', wppb_fb_is_paid_version() );
}

/**
 * CPT capabilities override: create_posts => do_not_allow when multiple forms locked.
 *
 * @return array<string,string> Empty when unlocked.
 */
function wppb_fb_form_cpt_capability_overrides() {
    if ( wppb_fb_multiple_forms_available() ) {
        return array();
    }
    return array( 'create_posts' => 'do_not_allow' );
}

/**
 * Pro-only field type labels hidden from the inserter on free (mirror manage-fields.php).
 * Blocks stay registered so existing instances remain editable after a downgrade.
 *
 * @return string[] PB field-type labels.
 */
function wppb_fb_free_locked_field_types() {
    return apply_filters( 'wppb_fb_free_locked_field_types', array(
        // standard
        'Number',
        'Input (Hidden)',
        'Language',
        'WYSIWYG',
        'Select (Multiple)',
        'HTML',
        'Upload',
        'International Telephone Input',
        // advanced
        'Phone',
        'Select (Country)',
        'Select (Timezone)',
        'Select (Currency)',
        'Select (CPT)',
        'Select (Taxonomy)',
        'Checkbox (Terms and Conditions)',
        'Datepicker',
        'Timepicker',
        'Colorpicker',
        'Validation',
        'Map',
        'Additional Map',
        // other
        'WooCommerce Customer Billing Address',
        'WooCommerce Customer Shipping Address',
        'MailChimp Subscribe',
        'Email',
        'URL',
        'Select2 (Multiple)',
        'Honeypot',
    ) );
}

/**
 * Pro-only field block names to hide from the inserter on free. Empty when paid.
 *
 * @return string[]
 */
function wppb_fb_free_locked_field_blocks() {
    if ( wppb_fb_is_paid_version() ) {
        return array();
    }

    $locked = wppb_fb_free_locked_field_types();
    $hidden = array();
    foreach ( WPPB_FB_Field_Registry::all() as $field_type => $entry ) {
        if ( in_array( $field_type, $locked, true ) && ! empty( $entry['block'] ) ) {
            $hidden[] = $entry['block'];
        }
    }
    return $hidden;
}

/**
 * Whether Conditional Logic UI may show. Hide UI only — attributes stay in schema
 * so stored rules survive a downgrade save.
 *
 * @return bool
 */
function wppb_fb_conditional_logic_available() {
    $available = function_exists( 'wppb_conditional_fields_exists' ) ? wppb_conditional_fields_exists() : false;
    return (bool) apply_filters( 'wppb_fb_conditional_logic_available', $available );
}

/**
 * Upsell URL for a locked form-builder surface.
 *
 * @param string $campaign utm_campaign value.
 * @return string
 */
function wppb_fb_upsell_url( $campaign ) {
    return add_query_arg(
        array(
            'utm_source'   => 'pb-forms',
            'utm_medium'   => 'client-site',
            'utm_campaign' => $campaign,
        ),
        'https://www.cozmoslabs.com/wordpress-profile-builder/'
    ) . '#pricing';
}

/**
 * Friendlier wp_die on post-new.php when create_posts is locked (cap still gates).
 */
add_action( 'load-post-new.php', 'wppb_fb_block_new_form_screen' );
function wppb_fb_block_new_form_screen() {
    $post_type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : 'post';

    if ( ! wppb_fb_is_form_cpt( $post_type ) || wppb_fb_multiple_forms_available() ) {
        return;
    }

    wp_die(
        wp_kses_post( sprintf(
            /* translators: %s is the upgrade link URL */
            __( '<h1>Multiple Forms is a Pro feature</h1><p>The free version of Profile Builder includes the Default Registration and Default Edit Profile forms. Creating additional forms requires <a href="%s" target="_blank" rel="noopener">Profile Builder Pro</a>.</p>', 'profile-builder' ),
            esc_url( wppb_fb_upsell_url( 'pb-multiple-forms' ) )
        ) ),
        esc_html__( 'Multiple Forms is a Pro feature', 'profile-builder' ),
        array(
            'response'  => 403,
            'back_link' => true,
        )
    );
}

/**
 * Greyed "Add New" stand-in + wp-pointer when create_posts is locked (core hides
 * the real button). Use a focusable span (not disabled button); close pointer on
 * a short timer so the Upgrade link stays reachable across the arrow gap.
 */
add_action( 'admin_enqueue_scripts', 'wppb_fb_enqueue_locked_add_new_button' );
function wppb_fb_enqueue_locked_add_new_button() {
    if ( ! wppb_fb_is_forms_list_screen() || wppb_fb_multiple_forms_available() ) {
        return;
    }

    $post_type_object = get_post_type_object( get_current_screen()->post_type );

    if ( empty( $post_type_object ) ) {
        return;
    }

    wp_enqueue_style( 'wp-pointer' );
    wp_enqueue_script( 'wp-pointer' );

    $label     = $post_type_object->labels->add_new;
    $post_type = get_current_screen()->post_type;
    $title     = ( $post_type === 'wppb-epf-cpt' )
        ? __( 'Need a second edit profile form?', 'profile-builder' )
        : __( 'Need a second registration form?', 'profile-builder' );

    // Custom markup (not pointer <h3>): core paints a WP logo bar on h3.
    $message = sprintf(
        '<div class="wppb-fb-upsell-pointer">'
        . '<p class="wppb-fb-upsell-pointer__title">%1$s</p>'
        . '<p class="wppb-fb-upsell-pointer__text">%2$s</p>'
        . '<p class="wppb-fb-upsell-pointer__cta"><a href="%3$s" target="_blank" rel="noopener">%4$s</a></p>'
        . '</div>',
        esc_html( $title ),
        esc_html__( 'Free gives you the Default Registration and Edit Profile forms. With Pro you can create as many as you like and set different fields on each.', 'profile-builder' ),
        esc_url( wppb_fb_upsell_url( 'pb-multiple-forms' ) ),
        esc_html__( 'Upgrade to Pro', 'profile-builder' )
    );

    $plain = __( 'Creating additional forms requires Profile Builder Pro.', 'profile-builder' );

    // NOWDOC: translated strings arrive as one JSON argument (no PHP interpolation).
    $body = <<<'JS'
( function ( data ) {
    document.addEventListener( 'DOMContentLoaded', function () {
        var heading = document.querySelector( '.wrap .wp-heading-inline' );

        if ( ! heading || document.querySelector( '.wrap .page-title-action' ) ) {
            return;
        }

        var button = document.createElement( 'span' );
        button.className = 'page-title-action wppb-fb-add-new-locked';
        button.setAttribute( 'role', 'button' );
        button.setAttribute( 'aria-disabled', 'true' );
        button.setAttribute( 'tabindex', '0' );
        button.textContent = data.label;

        heading.insertAdjacentElement( 'afterend', button );
        heading.insertAdjacentText( 'afterend', ' ' );

        var $ = window.jQuery;

        if ( ! $ || ! $.fn.pointer ) {
            button.title = data.plain;
            return;
        }

        var $button = $( button ), closeTimer = null;

        $button.pointer( {
            content: data.message,
            position: { edge: 'top', align: 'left' },
            pointerClass: 'wp-pointer wppb-fb-add-new-locked-pointer',
            // No Dismiss: tooltip reopens on hover; returning false skips the button.
            buttons: function () {
                return false;
            }
        } );

        function cancelClose() {
            window.clearTimeout( closeTimer );
        }

        function close() {
            cancelClose();
            $button.pointer( 'close' );
        }

        function closeSoon() {
            cancelClose();
            closeTimer = window.setTimeout( close, 300 );
        }

        function show() {
            cancelClose();
            $button.pointer( 'open' );

            // Keep open while cursor is in the pointer; off() first so handlers do not stack.
            $button.pointer( 'widget' )
                .off( '.wppbFbLocked' )
                .on( 'mouseenter.wppbFbLocked', cancelClose )
                .on( 'mouseleave.wppbFbLocked', closeSoon );
        }

        $button.on( 'mouseenter focus', show );
        $button.on( 'mouseleave blur', closeSoon );
        $button.on( 'click', function ( event ) {
            event.preventDefault();
            show();
        } );
        $button.on( 'keydown', function ( event ) {
            if ( event.key === 'Enter' || event.key === ' ' ) {
                event.preventDefault();
                show();
            } else if ( event.key === 'Escape' ) {
                close();
            }
        } );

        // Touch has no mouseleave — close on outside click.
        $( document ).on( 'click.wppbFbLocked', function ( event ) {
            var $target = $( event.target );

            if ( ! $target.closest( button ).length
                && ! $target.closest( $button.pointer( 'widget' ) ).length ) {
                close();
            }
        } );
    } );
} )
JS;

    $data = wp_json_encode( array(
        'label'   => $label,
        'message' => $message,
        'plain'   => $plain,
    ) );

    wp_add_inline_script( 'wp-pointer', $body . '( ' . $data . ' );', 'after' );
}
