<?php if ( ! defined( 'ABSPATH' ) ) exit; ?>

<?php
$content_restriction_activated = 'no';
if ( ! empty( $this->content_restriction_settings['contentRestriction'] ) ) {
	$content_restriction_activated = $this->content_restriction_settings['contentRestriction'];
} elseif ( ! empty( $this->general_settings['contentRestriction'] ) ) {
	$content_restriction_activated = $this->general_settings['contentRestriction'];
}

$roles_editor_available = file_exists( WPPB_PLUGIN_DIR . '/features/roles-editor/roles-editor.php' );
$admin_approval_available = defined( 'WPPB_PAID_PLUGIN_DIR' );

$login_registration_fields = array(
	array(
		'name'    => 'automaticallyLogIn',
		'id'      => 'wppb_settings_automatically_log_in',
		'value'   => 'Yes',
		'checked' => ! empty( $this->general_settings['automaticallyLogIn'] ) && $this->general_settings['automaticallyLogIn'] === 'Yes',
		'label'   => __( 'Automatically log users in after registration', 'profile-builder' ),
		'desc'    => __( 'Log users in right after they register.', 'profile-builder' ),
		'icon'    => '<path d="M10 17L15 12L10 7" stroke="#1E1E1E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 12H4" stroke="#1E1E1E" stroke-width="1.5" stroke-linecap="round"/><path d="M14 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H14" stroke="#1E1E1E" stroke-width="1.5" stroke-linecap="round"/>',
	),
	array(
		'name'    => 'emailConfirmation',
		'id'      => 'emailConfirmation',
		'value'   => 'yes',
		'checked' => ! empty( $this->general_settings['emailConfirmation'] ) && $this->general_settings['emailConfirmation'] === 'yes',
		'label'   => __( 'Verify email addresses', 'profile-builder' ),
		'desc'    => __( 'Ask users to confirm their email before they can sign in.', 'profile-builder' ),
		'icon'    => '<path d="M4 6.5C4 5.67157 4.67157 5 5.5 5H18.5C19.3284 5 20 5.67157 20 6.5V17.5C20 18.3284 19.3284 19 18.5 19H5.5C4.67157 19 4 18.3284 4 17.5V6.5Z" stroke="#1E1E1E" stroke-width="1.5"/><path d="M5 7L12 12L19 7" stroke="#1E1E1E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
	),
	array(
		'name'    => 'hide_admin_bar_for_subscriber',
		'id'      => 'hide_admin_bar_for_subscriber',
		'value'   => 'Yes',
		'checked' => ! empty( $this->general_settings['hide_admin_bar_for'] ) && in_array( 'Subscriber', $this->general_settings['hide_admin_bar_for'], true ),
		'label'   => __( 'Hide the admin bar for the subscriber role', 'profile-builder' ),
		'desc'    => __( 'Hide the WordPress admin bar for Subscribers on the front end.', 'profile-builder' ),
		'title'   => __( 'You can modify each role individually in the settings', 'profile-builder' ),
		'icon'    => '<path d="M4 7H20" stroke="#1E1E1E" stroke-width="1.5" stroke-linecap="round"/><path d="M4 12H14" stroke="#1E1E1E" stroke-width="1.5" stroke-linecap="round"/><path d="M4 17H10" stroke="#1E1E1E" stroke-width="1.5" stroke-linecap="round"/><path d="M16.5 14.5L18 16L21 12.5" stroke="#1E1E1E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
	),
	array(
		'name'     => 'adminApproval',
		'id'       => 'adminApproval',
		'value'    => 'yes',
		'checked'  => $admin_approval_available && ! empty( $this->general_settings['adminApproval'] ) && $this->general_settings['adminApproval'] === 'yes',
		'disabled' => ! $admin_approval_available,
		'label'    => __( 'Admin Approval for new users', 'profile-builder' ),
		'desc'     => __( 'Hold new accounts until an admin approves them.', 'profile-builder' ),
		'title'    => ! $admin_approval_available ? __( 'Available in the Pro version', 'profile-builder' ) : '',
		'icon'     => '<circle cx="12" cy="12" r="8" stroke="#1E1E1E" stroke-width="1.5"/><path d="M8.5 12.5L11 15L15.5 9.5" stroke="#1E1E1E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
	),
);

$feature_fields = array(
	array(
		'name'    => 'contentRestriction',
		'id'      => 'contentRestriction',
		'value'   => 'yes',
		'checked' => $content_restriction_activated === 'yes',
		'label'   => __( 'Content Restriction', 'profile-builder' ),
		'desc'    => __( 'Restrict posts and pages by logged-in status or role.', 'profile-builder' ),
		'icon'    => '<g clip-path="url(#wppb-setup-cr-clip)"><mask id="wppb-setup-cr-mask" fill="white"><rect x="6" y="10" width="12" height="10" rx="1"/></mask><rect x="6" y="10" width="12" height="10" rx="1" stroke="#1E1E1E" stroke-width="3" mask="url(#wppb-setup-cr-mask)"/><path d="M15 10V7C15 5.34315 13.6569 4 12 4V4C10.3431 4 9 5.34315 9 7V10" stroke="#1E1E1E" stroke-width="1.5"/></g><defs><clipPath id="wppb-setup-cr-clip"><rect width="24" height="24" fill="white"/></clipPath></defs>',
	),
);

if ( $roles_editor_available ) {
	$feature_fields[] = array(
		'name'    => 'rolesEditor',
		'id'      => 'rolesEditor',
		'value'   => 'yes',
		'checked' => ! empty( $this->general_settings['rolesEditor'] ) && $this->general_settings['rolesEditor'] === 'yes',
		'label'   => __( 'Roles Editor', 'profile-builder' ),
		'desc'    => __( 'Create and edit custom roles and capabilities.', 'profile-builder' ),
		'icon'    => '<path fill-rule="evenodd" clip-rule="evenodd" d="M15.5 9.5C16.0523 9.5 16.5 9.05228 16.5 8.5C16.5 7.94772 16.0523 7.5 15.5 7.5C14.9477 7.5 14.5 7.94772 14.5 8.5C14.5 9.05228 14.9477 9.5 15.5 9.5ZM15.5 11C16.8807 11 18 9.88071 18 8.5C18 7.11929 16.8807 6 15.5 6C14.1193 6 13 7.11929 13 8.5C13 9.88071 14.1193 11 15.5 11ZM13.25 17V15C13.25 13.4812 12.0188 12.25 10.5 12.25H6.5C4.98122 12.25 3.75 13.4812 3.75 15V17H5.25V15C5.25 14.3096 5.80964 13.75 6.5 13.75H10.5C11.1904 13.75 11.75 14.3096 11.75 15V17H13.25ZM20.25 15V17H18.75V15C18.75 14.3096 18.1904 13.75 17.5 13.75H15V12.25H17.5C19.0188 12.25 20.25 13.4812 20.25 15ZM9.5 8.5C9.5 9.05228 9.05228 9.5 8.5 9.5C7.94772 9.5 7.5 9.05228 7.5 8.5C7.5 7.94772 7.94772 7.5 8.5 7.5C9.05228 7.5 9.5 7.94772 9.5 8.5ZM11 8.5C11 9.88071 9.88071 11 8.5 11C7.11929 11 6 9.88071 6 8.5C6 7.11929 7.11929 6 8.5 6C9.88071 6 11 7.11929 11 8.5Z" fill="#1E1E1E"/>',
	);
}

/**
 * Render a setup wizard toggle field row.
 *
 * @param array $field Field definition.
 */
$render_setup_field = static function ( $field ) {
	$disabled = ! empty( $field['disabled'] );
	$title    = ! empty( $field['title'] ) ? $field['title'] : '';
	?>
	<div class="wppb-setup-field">
		<div class="wppb-setup-field__icon">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<?php echo $field['icon']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG markup. ?>
			</svg>
		</div>

		<div class="wppb-setup-field__title">
			<h4>
				<?php if ( $disabled ) : ?>
					<span<?php echo $title ? ' title="' . esc_attr( $title ) . '"' : ''; ?>><?php echo esc_html( $field['label'] ); ?></span>
				<?php else : ?>
					<label for="<?php echo esc_attr( $field['id'] ); ?>"<?php echo $title ? ' title="' . esc_attr( $title ) . '"' : ''; ?>><?php echo esc_html( $field['label'] ); ?></label>
				<?php endif; ?>
			</h4>
			<p><?php echo esc_html( $field['desc'] ); ?></p>
		</div>

		<div class="cozmoslabs-toggle-switch"<?php echo ( $disabled && $title ) ? ' title="' . esc_attr( $title ) . '"' : ''; ?>>
			<div class="cozmoslabs-toggle-container">
				<input
					type="checkbox"
					id="<?php echo esc_attr( $field['id'] ); ?>"
					<?php echo $disabled ? '' : 'name="' . esc_attr( $field['name'] ) . '"'; ?>
					value="<?php echo esc_attr( $field['value'] ); ?>"
					<?php checked( ! empty( $field['checked'] ) ); ?>
					<?php disabled( $disabled ); ?>
				>
				<label class="cozmoslabs-toggle-track" for="<?php echo esc_attr( $field['id'] ); ?>"></label>
			</div>
		</div>
	</div>
	<?php
};
?>

<h3><?php esc_html_e( 'Login & registration settings', 'profile-builder' ); ?></h3>
<p class="cozmoslabs-description"><?php esc_html_e( 'Set how users register, sign in, and use key site features.', 'profile-builder' ); ?></p>

<form class="wppb-setup-form wppb-setup-form-fields" method="post">

	<?php if ( defined( 'WPPB_PAID_PLUGIN_DIR' ) && file_exists( WPPB_PAID_PLUGIN_DIR . '/features/form-designs/form-designs.php' ) ) : ?>
		<div class="wppb-setup-form-styles">
			<?php echo wppb_render_forms_design_selector(); //phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			<p class="info">
				<?php esc_html_e( 'Choose a style that better suits your website.', 'profile-builder' ); ?>
				<br>
				<?php esc_html_e( 'The default style is there to let you customize the CSS and in general will receive the look and feel from your own themes styling. ', 'profile-builder' ); ?>
				<br>
				<?php esc_html_e( 'The extra styles can be customized to your liking through extra settings. ', 'profile-builder' ); ?>
			</p>
		</div>
	<?php endif; ?>

	<strong class="wppb-setup-fields__heading"><?php esc_html_e( 'Login and registration', 'profile-builder' ); ?></strong>

	<?php foreach ( $login_registration_fields as $field ) {
		$render_setup_field( $field );
	} ?>

	<strong class="wppb-setup-fields__heading"><?php esc_html_e( 'Additional modules', 'profile-builder' ); ?></strong>

	<?php foreach ( $feature_fields as $field ) {
		$render_setup_field( $field );
	} ?>

	<div class="wppb-setup-form-button">
		<input type="submit" class="button primary button-primary button-hero" value="<?php esc_html_e( 'Continue', 'profile-builder' ); ?>" />
	</div>

	<?php wp_nonce_field( 'wppb-setup-wizard-nonce', 'wppb_setup_wizard_nonce' ); ?>
</form>
