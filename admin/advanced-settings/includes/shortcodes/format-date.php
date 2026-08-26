<?php
// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) exit;

add_shortcode( 'wppb-format-date', 'wppb_toolbox_format_date_handler' );
function wppb_toolbox_format_date_handler( $atts ){
	$a = shortcode_atts( array(
		   'date' => null,
		   'format' => null,
	),$atts );

	if ($a['date'] === null)
		return;

	if ($a['format'] === null)
		return esc_html( $a['date'] );

	$format = wppb_toolbox_sanitize_date_format( $a['format'] );

	if ( $format === '' )
		return esc_html( $a['date'] );

	$date = strtotime($a['date']);

	return esc_html( date( $format, $date ) );
}

/**
 * Keep letters, digits, and date separators; drop markup and other symbols.
 *
 * @param string $format User-supplied date format.
 * @return string
 */
function wppb_toolbox_sanitize_date_format( $format ) {
	if ( ! is_string( $format ) )
		return '';

	return preg_replace( '/[^\p{L}0-9 \-\/.,:\\\\()]/u', '', $format );
}
