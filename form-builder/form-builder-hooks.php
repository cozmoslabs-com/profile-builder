<?php
/**
 * Shortcode default-form ID resolution, and an unconditional
 * `wppb_change_form_fields` registration so per-form ordering works even when
 * the classic module gate is 'hide'. add_filter() de-duplicates if the bundled
 * conditional registration also runs.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Safe before multiple-forms.php is included: add_filter() does not resolve the
// callback until `wppb_change_form_fields` fires.
add_filter( 'wppb_change_form_fields', 'wppb_multiple_forms_change_fields', 10, 2 );

/**
 * Force Multiple Registration / Edit Profile Forms module gates to 'show' on
 * every read so classic-mode WCK admin UI loads. Read-only — do not write back
 * (would persist the filtered value into a site option the user never set).
 */
add_filter( 'option_wppb_module_settings', 'wppb_fb_force_multiple_forms_modules_active' );
// Absent option rows fire `default_option_*` instead of `option_*`.
add_filter( 'default_option_wppb_module_settings', 'wppb_fb_force_multiple_forms_modules_active' );
function wppb_fb_force_multiple_forms_modules_active( $settings ) {
    if ( ! is_array( $settings ) ) $settings = array();
    $settings['wppb_multipleRegistrationForms'] = 'show';
    $settings['wppb_multipleEditProfileForms']  = 'show';
    return $settings;
}

add_filter( 'wppb_form_args_after_init', 'wppb_fb_resolve_default_form_id', 10 );

/**
 * Bind a bare shortcode to the configured default form when no ID was passed.
 *
 * @param array $args Form render args from the `wppb_form_args_after_init` filter.
 * @return array
 */
function wppb_fb_resolve_default_form_id( $args ) {
    if ( ! empty( $args['ID'] ) ) return $args;

    // Type is `$args['form_type']`, not a `context` key.
    $form_type = ( isset( $args['form_type'] ) && $args['form_type'] === 'edit_profile' )
        ? 'edit_profile'
        : 'register';

    $defaults = get_option( 'wppb_default_form_ids', array() );

    if ( ! empty( $defaults[ $form_type ] ) ) {
        $args['ID'] = $defaults[ $form_type ];
    }

    return $args;
}
