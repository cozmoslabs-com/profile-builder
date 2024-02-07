<?php

class WPPB_RecoverPassword extends ET_Builder_Module {

	public $slug       = 'wppb_recover_password';
	public $vb_support = 'on';

	protected $module_credits = array(
		'module_uri' => 'https://wordpress.org/plugins/profile-builder/',
		'author'     => 'Cozmoslabs',
		'author_uri' => 'https://www.cozmoslabs.com/',
	);

	public function init() {
        $this->name = esc_html__( 'PB Recover Password', 'profile-builder' );

        $this->settings_modal_toggles = array(
            'general' => array(
                'toggles' => array(
                    'main_content' => esc_html__( 'Form Settings', 'profile-builder' ),
                ),
            ),
        );

        $this->advanced_fields = array(
            'link_options' => false,
            'background'   => false,
            'admin_label'  => false,
        );
	}

	public function get_fields() {
		return array();
	}

    public function render( $attrs, $content, $render_slug ) {

        include_once( WPPB_PLUGIN_DIR.'/front-end/recover.php' );

        return '<div class="wppb-divi-front-end-container">' . wppb_front_end_password_recovery( [] ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    }
}

new WPPB_RecoverPassword;
