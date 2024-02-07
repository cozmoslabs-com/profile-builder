<?php

class WPPB_EditProfile extends ET_Builder_Module {

	public $slug       = 'wppb_edit_profile';
	public $vb_support = 'on';

	protected $module_credits = array(
		'module_uri' => 'https://wordpress.org/plugins/profile-builder/',
		'author'     => 'Cozmoslabs',
		'author_uri' => 'https://www.cozmoslabs.com/',
	);

	public function init() {
        $this->name = esc_html__( 'PB Edit Profile', 'profile-builder' );

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
        $args = array(
            'post_type'         => 'page',
            'posts_per_page'    => -1
        );

        if( function_exists( 'wc_get_page_id' ) )
            $args['exclude'] = wc_get_page_id( 'shop' );

        $all_pages = get_posts( $args );
        $pages ['default'] = 'None';

        if( !empty( $all_pages ) ){
            foreach ( $all_pages as $page ){
                $pages [ esc_url( get_page_link( $page->ID ) ) ] = esc_html( $page->post_title );
            }
        }

        $wppb_module_settings = get_option( 'wppb_module_settings', 'not_found' );

        $edit_profile_forms ['default'] = esc_html__( 'Default' , 'profile-builder' );

        if ( !( ( $wppb_module_settings !== 'not_found' && (
                    !isset( $wppb_module_settings['wppb_multipleRegistrationForms'] ) ||
                    $wppb_module_settings['wppb_multipleRegistrationForms'] !== 'show'
                ) ) ||
            $wppb_module_settings === 'not_found' ) ){
            $args = array(
                'post_type'      => 'wppb-epf-cpt',
                'posts_per_page' => -1
            );

            $the_query = new WP_Query( $args );

            if ( $the_query->have_posts() ) {
                foreach ( $the_query->posts as $post ) {
                    $edit_profile_forms [esc_attr( Wordpress_Creation_Kit_PB::wck_generate_slug( $post->post_title ) )] = esc_html( $post->post_title );
                }
                wp_reset_postdata();
            }
        }

		return array(
			'form_name'           => array(
				'label'           => esc_html__( 'Form', 'profile-builder' ),
				'type'            => 'select',
				'options'         => $edit_profile_forms,
                'default'         => 'default',
				'option_category' => 'basic_option',
				'description'     => esc_html__( 'Select the desired Edit Profile form.', 'profile-builder' ),
				'toggle_slug'     => 'main_content',
			),
            'redirect_url'        => array(
                'label'           => esc_html__( 'Redirect After Edit Profile', 'profile-builder' ),
                'type'            => 'select',
                'options'         => $pages,
                'default'         => 'default',
                'option_category' => 'basic_option',
                'description'     => esc_html__( 'Select a page for an After Edit Profile Redirect.', 'profile-builder' ),
                'toggle_slug'     => 'main_content',
                'show_if'         => array(
                    'form_name'   => 'default',
                ),
            ),
		);
	}

    public function render( $attrs, $content, $render_slug ) {

        if ( !is_array( $attrs ) ) {
            return;
        }

        include_once(WPPB_PLUGIN_DIR . '/front-end/edit-profile.php');
        include_once(WPPB_PLUGIN_DIR . '/front-end/class-formbuilder.php');

        $form_name = 'unspecified';
        if ( is_array( $attrs ) && array_key_exists( 'form_name', $attrs ) ) {
            $form_name = $attrs['form_name'];
            if ( $form_name === 'default' ) {
                $form_name = 'unspecified';
            }
        }
        $atts = [
            'form_name' => $form_name,
            'redirect_url' => is_array( $attrs ) && array_key_exists( 'redirect_url', $attrs ) && $attrs['redirect_url'] !== '' ? esc_url( $attrs['redirect_url'] ) : '',
        ];
        return '<div class="wppb-divi-front-end-container">' . wppb_front_end_profile_info( $atts ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    }
}

new WPPB_EditProfile;
