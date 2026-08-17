<?php
/**
 * Capability-gated front-end form preview (CPTs are public=>false).
 * Build by post ID (drafts work); bare wp_head/wp_footer (block themes break get_header).
 * Display-only — neutralize anything that mutates data or fires external actions.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'init', 'wppb_fb_preview_scrub_submission_request', 0 );
/**
 * Strip action/form_name at init:0 — before OAuth/add-on routers read $_REQUEST.
 * No auth: only removes keys; renderer still gates on nonce + edit_post.
 */
function wppb_fb_preview_scrub_submission_request() {
	if ( empty( $_GET['wppb_fb_preview'] ) ) {
		return;
	}
	unset( $_POST['action'], $_GET['action'], $_REQUEST['action'] );
	unset( $_POST['form_name'], $_GET['form_name'], $_REQUEST['form_name'] );
}

add_action( 'template_redirect', 'wppb_fb_maybe_render_form_preview' );
/**
 * Render and exit when `?wppb_fb_preview=<id>` is present.
 */
function wppb_fb_maybe_render_form_preview() {
	if ( empty( $_GET['wppb_fb_preview'] ) ) {
		return;
	}

	$post_id = absint( wp_unslash( $_GET['wppb_fb_preview'] ) );

	if ( ! isset( $_GET['_wppbnonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_GET['_wppbnonce'] ) ), 'wppb_fb_preview' ) ) {
		wp_die( esc_html__( 'This form preview link has expired. Reopen the preview from the form editor.', 'profile-builder' ), '', array( 'response' => 403 ) );
	}

	$post = get_post( $post_id );

	if ( ! $post instanceof WP_Post || ! in_array( $post->post_type, array( 'wppb-rf-cpt', 'wppb-epf-cpt' ), true ) ) {
		wp_die( esc_html__( 'The requested form could not be found.', 'profile-builder' ), '', array( 'response' => 404 ) );
	}

	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		wp_die( esc_html__( 'You are not allowed to preview this form.', 'profile-builder' ), '', array( 'response' => 403 ) );
	}

	wppb_fb_render_form_preview( $post );
	exit;
}

/**
 * Adds `disabled` to the form's submit button while a preview renders.
 *
 * @param string $attrs     Existing extra attributes for the submit input.
 * @param string $form_type 'register' | 'edit_profile' (unused).
 * @return string
 */
function wppb_fb_preview_disable_submit( $attrs, $form_type = '' ) {
	return $attrs . ' disabled="disabled"';
}

/** Note under the disabled submit button. */
function wppb_fb_preview_submit_note() {
	echo '<span class="wppb-fb-preview-submit-note">'
		. esc_html__( 'Submitting is disabled in preview mode.', 'profile-builder' )
		. '</span>';
}

/**
 * Dequeue Social Connect OAuth SDKs and the GDPR delete-account handler.
 * CSS alone cannot stop self-init SDKs; dequeue alone leaves inline handlers live.
 */
function wppb_fb_preview_dequeue_unsafe_scripts() {
	global $wp_scripts;
	if ( ! $wp_scripts instanceof WP_Scripts ) {
		return;
	}
	foreach ( $wp_scripts->queue as $handle ) {
		if ( strpos( $handle, 'wppb-sc-' ) === 0 || $handle === 'wppb-gdpr-delete-script' ) {
			wp_dequeue_script( $handle );
		}
	}
}

/**
 * Renders the standalone preview document for a form post.
 *
 * @param WP_Post $post Form post (already validated by the caller).
 */
function wppb_fb_render_form_preview( $post ) {
	if ( ! class_exists( 'Profile_Builder_Form_Creator' ) ) {
		wp_die( esc_html__( 'The form rendering engine is unavailable.', 'profile-builder' ) );
	}

	// wp_resource_hints() reads SERVER_NAME without isset; absent in CLI/some FastCGI.
	if ( empty( $_SERVER['SERVER_NAME'] ) ) {
		$_SERVER['SERVER_NAME'] = wp_parse_url( home_url(), PHP_URL_HOST ) ?: 'localhost';
	}

	add_filter( 'show_admin_bar', '__return_false' );

	// Unset action/form_name from ALL three superglobals: wppb_form_logic() gates
	// on $_REQUEST['action'], and the $_POST['action'] check only gates the message.
	unset( $_POST['action'], $_GET['action'], $_REQUEST['action'] );
	unset( $_POST['form_name'], $_GET['form_name'], $_REQUEST['form_name'] );
	add_filter( 'wppb_form_submit_button_extra_attributes', 'wppb_fb_preview_disable_submit', 10, 2 );
	add_action( 'wppb_form_after_submit_button', 'wppb_fb_preview_submit_note' );

	// Enqueue phase + wp_footer@1 (GDPR script enqueues during field render).
	add_action( 'wp_enqueue_scripts', 'wppb_fb_preview_dequeue_unsafe_scripts', 9999 );
	add_action( 'wp_footer', 'wppb_fb_preview_dequeue_unsafe_scripts', 1 );

	add_filter( 'wppb_display_edit_other_users_dropdown', '__return_false' );
	unset( $_GET['edit_user'] );

	$is_epf    = ( $post->post_type === 'wppb-epf-cpt' );
	$form_type = $is_epf ? 'edit_profile' : 'register';

	// form_name 'unspecified' skips publish-only slug resolver; ajax must be set
	// (class has no default — shortcode_atts normally supplies it).
	$form = new Profile_Builder_Form_Creator( array(
		'form_type' => $form_type,
		'form_name' => 'unspecified',
		'ID'        => $post->ID,
		'ajax'      => false,
	) );

	$title = $post->post_title !== '' ? $post->post_title : __( '(no title)', 'profile-builder' );

	// Clone post with embed shortcode as content so add-ons sniffing $post enqueue
	// (e.g. Progress Bar). Hint only — shortcode is not executed.
	$sniff_shortcode = wppb_fb_build_form_shortcode( $post );
	if ( $sniff_shortcode === '' ) {
		$sniff_shortcode = $is_epf ? '[wppb-edit-profile]' : '[wppb-register]';
	}
	$preview_post               = clone $post;
	$preview_post->post_content = $sniff_shortcode;
	$GLOBALS['post']            = $preview_post;

	nocache_headers();

	?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="robots" content="noindex, nofollow" />
	<title><?php echo esc_html( sprintf( /* translators: %s: form title */ __( 'Preview: %s', 'profile-builder' ), $title ) ); ?></title>
	<?php wp_head(); ?>
	<style>
		body.wppb-fb-preview-body {
			margin: 0;
			background: #f0f0f1;
			padding-top: 52px;
		}
		.wppb-fb-preview-bar {
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			z-index: 99999;
			display: flex;
			align-items: center;
			gap: 8px;
			height: 52px;
			box-sizing: border-box;
			padding: 0 16px;
			background: #1e1e1e;
			color: #fff;
			font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
		}
		.wppb-fb-preview-bar strong { font-weight: 600; }
		.wppb-fb-preview-bar .wppb-fb-preview-badge {
			background: #2271b1;
			border-radius: 2px;
			padding: 2px 8px;
			text-transform: uppercase;
			letter-spacing: .04em;
			font-size: 11px;
		}
		.wppb-fb-preview-canvas {
			max-width: 700px;
			margin: 24px auto;
			padding: 32px;
			background: #fff;
			border: 1px solid #dcdcde;
			border-radius: 4px;
			box-sizing: border-box;
		}
		@media (max-width: 782px) {
			.wppb-fb-preview-canvas { margin: 16px; padding: 20px; }
		}
		.wppb-fb-preview-canvas .form-submit input[type="submit"][disabled] {
			cursor: not-allowed;
			opacity: .6;
		}
		.wppb-fb-preview-submit-note {
			display: inline-block;
			margin-left: 10px;
			color: #757575;
			font-style: italic;
			font-size: 13px;
		}
		/* Social Connect + GDPR delete — independent of submit. */
		.wppb-fb-preview-canvas .wppb-sc-buttons-container,
		.wppb-fb-preview-canvas .wppb-sc-linked-accounts-text,
		.wppb-fb-preview-canvas .wppb-delete-account {
			pointer-events: none !important;
			opacity: .6;
			cursor: not-allowed;
		}
		#wppb-epaa-admin-review-links {
			display: none !important;
		}
	</style>
</head>
<body class="wppb-fb-preview-body">
	<div class="wppb-fb-preview-bar">
		<span class="wppb-fb-preview-badge"><?php esc_html_e( 'Preview', 'profile-builder' ); ?></span>
		<span><strong><?php echo esc_html( $title ); ?></strong> &mdash; <?php echo $is_epf ? esc_html__( 'Edit Profile form', 'profile-builder' ) : esc_html__( 'Registration form', 'profile-builder' ); ?></span>
	</div>
	<div class="wppb-fb-preview-canvas">
		<?php echo $form; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- form output is built and escaped by Profile_Builder_Form_Creator. ?>
	</div>
	<?php wp_footer(); ?>
</body>
</html>
	<?php
}
