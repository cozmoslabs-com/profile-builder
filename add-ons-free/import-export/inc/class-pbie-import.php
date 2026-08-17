<?php
// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) exit;

class WPPB_ImpEx_Import {

	protected $args_to_import;
	public $import_messages = array();
	private $j = '0';

	function __construct( $args_to_import ) {
		$this->args_to_import = $args_to_import;
	}

	private function json_to_db( $json_content, $nonce ) {

		if( !wp_verify_nonce( $nonce, 'wppb_import_setttings' ) ){
			$this->import_messages[$this->j]['message'] = __( 'You are not allowed to do this!', 'profile-builder' );
			$this->import_messages[$this->j]['type'] = 'error';
			$this->j++;
			return;
		}

		/* decode and put json to array */
		$imported_array_from_json = json_decode( $json_content, true );
		if ( $imported_array_from_json !== NULL ) {
			$imported_options = $imported_array_from_json['options'];
			$imported_posts = $imported_array_from_json['posts'];

			foreach( $imported_options as $key => $value ) {

				if( ! empty( $value ) && strpos( $key, 'wppb_' ) !== false )
					update_option( $key, $value );

			}

			// Suppress form-builder projection during insert — empty post_content would wipe fields.
			if ( function_exists( 'wppb_fb_set_importing' ) ) {
				wppb_fb_set_importing( true );
			}

			$imported_default_ids = array();

			foreach( $this->args_to_import as $imported_post_type ) {

				if ( !post_type_exists( $imported_post_type ) ) {
					register_post_type( $imported_post_type );
				}

				$db_posts = get_posts( "post_type=$imported_post_type&posts_per_page=-1" );
				if( ! empty( $imported_posts[$imported_post_type] ) ) {
					foreach( $imported_posts[$imported_post_type] as $imported_post ) {
						foreach( $db_posts as $db_post ) {
							if( $imported_post["post_title"] == $db_post->post_title && $imported_post["post_name"] == $db_post->post_name ) {
								wp_delete_post( $db_post->ID, $force_delete = true );
							}
						}
						unset( $imported_post["ID"] );
						$imported_post_id = wp_insert_post( $imported_post );
						foreach( $imported_post["postmeta"] as $key => $value ) {
							// Replace, don't append — get_post_meta(..., true) would otherwise return a stale first row.
							delete_post_meta( $imported_post_id, $key );
							foreach( $value as $serialized_value ) {
								add_post_meta( $imported_post_id, $key, maybe_unserialize( $serialized_value ) );
							}
						}

						if ( ! empty( $imported_post["postmeta"]["_pbform_is_default"] ) ) {
							foreach( (array) $imported_post["postmeta"]["_pbform_is_default"] as $wppb_default_flag ) {
								if ( maybe_unserialize( $wppb_default_flag ) === '1' ) {
									$imported_default_ids[ $imported_post_type ] = $imported_post_id;
									break;
								}
							}
						}
					}
				}
			}

			if ( function_exists( 'wppb_fb_set_importing' ) ) {
				wppb_fb_set_importing( false );
			}

			// Repoint wppb_default_form_ids — new IDs are not in the export.
			$this->reconcile_default_forms( $imported_default_ids );
		} else {
			$this->import_messages[$this->j]['message'] = __( 'Uploaded file is not valid json!', 'profile-builder' );
			$this->import_messages[$this->j]['type'] = 'error';
			$this->j++;
		}
	}

	/**
	 * Point wppb_default_form_ids at imported defaults and demote any other default for the same type.
	 *
	 * @param array $imported_default_ids  Map of CPT slug => imported post ID.
	 */
	private function reconcile_default_forms( $imported_default_ids ) {
		if ( ! function_exists( 'wppb_fb_ensure_default_forms' ) || empty( $imported_default_ids ) ) {
			return;
		}

		$slots = array(
			'wppb-rf-cpt'  => 'register',
			'wppb-epf-cpt' => 'edit_profile',
		);

		$defaults     = (array) get_option( 'wppb_default_form_ids', array() );
		$seeded_slots = array();

		foreach ( $slots as $cpt => $slot ) {
			if ( empty( $imported_default_ids[ $cpt ] ) ) {
				continue;
			}

			$keep              = (int) $imported_default_ids[ $cpt ];
			$defaults[ $slot ] = $keep;

			$existing = get_posts( array(
				'post_type'   => $cpt,
				'post_status' => 'any',
				'numberposts' => -1,
				'fields'      => 'ids',
			) );
			foreach ( $existing as $existing_id ) {
				if ( (int) $existing_id !== $keep && get_post_meta( $existing_id, '_pbform_is_default', true ) === '1' ) {
					// Demote other defaults; do not delete their posts.
					delete_post_meta( $existing_id, '_pbform_is_default' );
				}
			}

			$seeded_slots[ $cpt ] = true;
		}

		update_option( 'wppb_default_form_ids', $defaults );
	}

	public function upload_json_file() {
		if( isset( $_POST['cozmos-import'] ) && isset( $_POST['wppb_nonce'] ) && wp_verify_nonce( sanitize_text_field( $_POST['wppb_nonce'] ), 'wppb_import_setttings' ) ) {
            if( ( !is_multisite() && current_user_can( apply_filters( 'wppb_settings_import_user_capability', 'manage_options' ) ) ) ||
                ( is_multisite() && current_user_can( apply_filters( 'wppb_multi_settings_import_user_capability', 'manage_network' ) ) ) ) {
                if (!empty($_FILES['cozmos-upload']['tmp_name'])) {
                    $json_content = file_get_contents($_FILES['cozmos-upload']['tmp_name']); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
                    /* save uploaded file to server (for later versions).
                    $target = dirname( plugin_dir_path( __FILE__ ) ) . '/upload/';
                    $target = $target . basename( $_FILES['cozmos-upload']['name'] );
                    move_uploaded_file( $_FILES['cozmos-upload']['tmp_name'], $target );
                    */
                    $this->json_to_db( $json_content, sanitize_text_field( $_POST['wppb_nonce'] ) );
                    if (empty($this->pbie_import_messages)) {
                        $this->import_messages[$this->j]['message'] = __('Import successfully!', 'profile-builder');
                        $this->import_messages[$this->j]['type'] = 'updated';
                        $this->j++;
                        flush_rewrite_rules(false);
                    }
                } else {
                    $this->import_messages[$this->j]['message'] = __('Please select a .json file to import!', 'profile-builder');
                    $this->import_messages[$this->j]['type'] = 'error';
                    $this->j++;
                }
            } else {
                $this->import_messages[$this->j]['message'] = __('You do not have the capabilities required to do this!', 'profile-builder');
                $this->import_messages[$this->j]['type'] = 'error';
                $this->j++;
            }
		}
	}

	public function get_messages() {
		return $this->import_messages;
	}
}