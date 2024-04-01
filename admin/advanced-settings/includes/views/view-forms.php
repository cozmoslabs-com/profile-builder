<?php if ( ! defined( 'ABSPATH' ) ) exit; ?>

<?php
    $settings = get_option( 'wppb_toolbox_forms_settings' );
?>

<form method="post" action="options.php">

    <?php settings_fields( 'wppb_toolbox_forms_settings' ); ?>

    <div class="cozmoslabs-form-subsection-wrapper cozmoslabs-no-title-section">
        <div class="cozmoslabs-form-field-wrapper cozmoslabs-toggle-switch">
            <input type="hidden" name="wppb_toolbox_forms_settings[placeholder-labels]" value="">

            <label class="cozmoslabs-form-field-label" for="placeholder-labels-enable"><?php esc_html_e('Placeholder Labels', 'profile-builder'); ?></label>

            <div class="cozmoslabs-toggle-container">
                <input type="checkbox" id="placeholder-labels-enable" name="wppb_toolbox_forms_settings[placeholder-labels]"<?php echo ( ( isset( $settings['placeholder-labels'] ) && ( $settings['placeholder-labels'] == 'yes' ) ) ? ' checked' : '' ); ?> value="yes">
                <label class="cozmoslabs-toggle-track" for="placeholder-labels-enable"></label>
            </div>

            <div class="cozmoslabs-toggle-description">
                <label for="placeholder-labels-enable" class="cozmoslabs-description"><?php esc_html_e( 'Replace Labels with Placeholders in Profile Builder forms.', 'profile-builder' ); ?></label>
            </div>
        </div>

        <div class="cozmoslabs-form-field-wrapper cozmoslabs-toggle-switch">
            <label class="cozmoslabs-form-field-label" for="restricted-email-domains-enable"><?php esc_html_e('Email Domains Registering', 'profile-builder'); ?></label>

            <div class="cozmoslabs-toggle-container">
                <input type="checkbox" id="restricted-email-domains-enable" name="wppb_toolbox_forms_settings[restricted-email-domains]"<?php echo ( ( isset( $settings['restricted-email-domains'] ) && ( $settings['restricted-email-domains'] == 'on' ) ) ? ' checked' : '' ); ?> value="on" class="wppb-toolbox-switch">
                <label class="cozmoslabs-toggle-track" for="restricted-email-domains-enable"></label>
            </div>

            <div class="cozmoslabs-toggle-description">
                <label for="restricted-email-domains-enable" class="cozmoslabs-description"><?php esc_html_e( 'By enabling this option you can allow or deny email domains from registering.', 'profile-builder' ); ?></label>
            </div>
        </div>


        <div class="cozmoslabs-form-field-wrapper wppb-toolbox-accordion">
            <label class="cozmoslabs-form-field-label"><?php esc_html_e( 'Registering Type', 'profile-builder' ); ?></label>

            <div class="cozmoslabs-radio-inputs-row">
                <label>
                    <input type="radio" name="wppb_toolbox_forms_settings[restricted-email-domains-type]"<?php echo ( ( isset( $settings['restricted-email-domains-type'] ) && ( $settings['restricted-email-domains-type'] == 'allow' ) ) ? ' checked' : '' ); ?> value="allow">
                    <?php esc_html_e( 'Allow', 'profile-builder' ); ?>
                </label>

                <label>
                    <input type="radio" name="wppb_toolbox_forms_settings[restricted-email-domains-type]"<?php echo ( ( isset( $settings['restricted-email-domains-type'] ) && ( $settings['restricted-email-domains-type'] == 'deny' ) ) ? ' checked' : '' ); ?> value="deny">
                    <?php esc_html_e( 'Deny', 'profile-builder' ); ?>
                </label>
            </div>

            <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'Choose rather to allow or deny Email Domains from registering.', 'profile-builder' ); ?></p>
        </div>

        <div class="cozmoslabs-form-field-wrapper wppb-toolbox-accordion">
            <label class="cozmoslabs-form-field-label" for="toolbox-restricted-emails"><?php esc_html_e('Restricted Domains', 'profile-builder'); ?></label>

            <select id="toolbox-restricted-emails" class="wppb-select" name="wppb_toolbox_forms_settings[restricted-email-domains-data][]" multiple="multiple">

                <?php
                if ( !empty( $settings['restricted-email-domains-data'] ) ) {
                    foreach( $settings['restricted-email-domains-data'] as $domain ) {
                        echo '<option value="'.esc_attr( $domain ).'" selected>'.esc_html( $domain ).'</option>';
                    }
                }
                ?>

            </select>

            <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'You should add only the domain in the list from above. eg.: gmail.com.', 'profile-builder' ); ?></p>
        </div>

        <div class="cozmoslabs-form-field-wrapper wppb-toolbox-accordion">
            <label class="cozmoslabs-form-field-label" for="toolbox-restricted-email-domains-message"><?php esc_html_e('Error Message', 'profile-builder'); ?></label>
            <input type="text" id="toolbox-restricted-email-domains-message" name="wppb_toolbox_forms_settings[restricted-email-domains-message]" value="<?php echo ( !empty( $settings['restricted-email-domains-message']) ? esc_attr( $settings['restricted-email-domains-message'] ) : '' ); ?>">
            <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'Add the Email Domain Registering restriction message.', 'profile-builder' ); ?></p>
        </div>





        <?php
        $wppb_module_settings = get_option( 'wppb_module_settings' );

        if ( $wppb_module_settings != false && isset( $wppb_module_settings['wppb_multipleRegistrationForms']) && $wppb_module_settings['wppb_multipleRegistrationForms'] == 'show' ) :
            ?>
            <div class="cozmoslabs-form-field-wrapper">
                <label class="cozmoslabs-form-field-label" for="toolbox-bypass-ec"><?php esc_html_e('Email Confirmation Bypass Forms', 'profile-builder'); ?></label>

                <select id="toolbox-bypass-ec" class="wppb-select" name="wppb_toolbox_forms_settings[ec-bypass][]" multiple="multiple">

                    <?php
                    $registration_forms = get_posts( array( 'post_type' => 'wppb-rf-cpt' ) );

                    if ( !empty( $registration_forms ) ) {
                        foreach ( $registration_forms as $form ) {
                            $form_slug = trim( Wordpress_Creation_Kit_PB::wck_generate_slug( $form->post_title ) );

                            ?>
                            <option value="<?php echo esc_attr( $form_slug ); ?>" <?php echo ( ( isset( $settings['ec-bypass'] ) && in_array( $form_slug, $settings['ec-bypass'] ) ) ? 'selected' : '' ); ?>>
                                <?php echo esc_html( $form->post_title ); ?>
                            </option>
                            <?php
                        }
                    }
                    ?>

                </select>

                <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'Select the Forms that should bypass Email Confirmation.', 'profile-builder' ); ?></p>
                <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'Users registering through any of the selected forms will not need to confirm their email address.', 'profile-builder' ); ?></p>
            </div>
        <?php endif; ?>

        <div class="cozmoslabs-form-field-wrapper cozmoslabs-toggle-switch">
            <label class="cozmoslabs-form-field-label" for="toolbox-confirm-user-email-change"><?php esc_html_e('Email confirmation', 'profile-builder'); ?></label>

            <div class="cozmoslabs-toggle-container">
                <input type="checkbox" id="toolbox-confirm-user-email-change" name="wppb_toolbox_forms_settings[confirm-user-email-change]"<?php echo ( ( isset( $settings['confirm-user-email-change'] ) && ( $settings['confirm-user-email-change'] == 'yes' ) ) ? ' checked' : '' ); ?> value="yes">
                <label class="cozmoslabs-toggle-track" for="toolbox-confirm-user-email-change"></label>
            </div>

            <div class="cozmoslabs-toggle-description">
                <label for="toolbox-confirm-user-email-change" class="cozmoslabs-description"><?php esc_html_e( 'Enable “Email confirmation” for changing user email address.', 'profile-builder' ); ?></label>
            </div>

            <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'If enabled, an activation email is sent for the new email address.', 'profile-builder' ); ?></p>
        </div>

        <?php if ( defined( 'WPPB_PAID_PLUGIN_DIR' ) && file_exists( WPPB_PAID_PLUGIN_DIR.'/add-ons-advanced/social-connect/index.php' ) ) : ?>
            <div class="cozmoslabs-form-field-wrapper cozmoslabs-toggle-switch">
                <label class="cozmoslabs-form-field-label" for="toolbox-social-connect-bypass-ec"><?php esc_html_e('Bypass Email Confirmation', 'profile-builder'); ?></label>

                <div class="cozmoslabs-toggle-container">
                    <input type="checkbox" id="toolbox-social-connect-bypass-ec" name="wppb_toolbox_forms_settings[social-connect-bypass-ec]"<?php echo ( ( isset( $settings['social-connect-bypass-ec'] ) && ( $settings['social-connect-bypass-ec'] == 'yes' ) ) ? ' checked' : '' ); ?> value="yes">
                    <label class="cozmoslabs-toggle-track" for="toolbox-social-connect-bypass-ec"></label>
                </div>

                <div class="cozmoslabs-toggle-description">
                    <label for="toolbox-social-connect-bypass-ec" class="cozmoslabs-description"><?php esc_html_e( 'Disable Email Confirmation for Social Connect registrations.', 'profile-builder' ); ?></label>
                </div>

                <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'Allow users that register through the Social Connect add-on to bypass the Email Confirmation feature.', 'profile-builder' ); ?></p>
            </div>
        <?php endif; ?>

        <div class="cozmoslabs-form-field-wrapper cozmoslabs-toggle-switch">
            <label class="cozmoslabs-form-field-label" for="toolbox-remember-me"><?php esc_html_e('Checked Remember Me', 'profile-builder'); ?></label>

            <div class="cozmoslabs-toggle-container">
                <input type="checkbox" id="toolbox-remember-me" name="wppb_toolbox_forms_settings[remember-me]"<?php echo ( ( isset( $settings['remember-me'] ) && ( $settings['remember-me'] == 'yes' ) ) ? ' checked' : '' ); ?> value="yes">
                <label class="cozmoslabs-toggle-track" for="toolbox-remember-me"></label>
            </div>

            <div class="cozmoslabs-toggle-description">
                <label for="toolbox-remember-me" class="cozmoslabs-description"><?php esc_html_e( 'Check the "Remember Me" checkbox on Login forms, by default.', 'profile-builder' ); ?></label>
            </div>
        </div>

        <div class="cozmoslabs-form-field-wrapper cozmoslabs-toggle-switch">
            <label class="cozmoslabs-form-field-label" for="toolbox-recover-password-autologin"><?php esc_html_e('Password Reset Auto-Login', 'profile-builder'); ?></label>

            <div class="cozmoslabs-toggle-container">
                <input type="checkbox" id="toolbox-recover-password-autologin" name="wppb_toolbox_forms_settings[recover-password-autologin]"<?php echo ( ( isset( $settings['recover-password-autologin'] ) && ( $settings['recover-password-autologin'] == 'yes' ) ) ? ' checked' : '' ); ?> value="yes">
                <label class="cozmoslabs-toggle-track" for="toolbox-recover-password-autologin"></label>
            </div>

            <div class="cozmoslabs-toggle-description">
                <label for="toolbox-recover-password-autologin" class="cozmoslabs-description"><?php esc_html_e( 'Automatically log in users after they reset their password using the Recover Password form.', 'profile-builder' ); ?></label>
            </div>
        </div>

        <div class="cozmoslabs-form-field-wrapper cozmoslabs-toggle-switch">
            <label class="cozmoslabs-form-field-label" for="toolbox-back-end-validation"><?php esc_html_e('Remove Profile Page Validation', 'profile-builder'); ?></label>

            <div class="cozmoslabs-toggle-container">
                <input type="checkbox" id="toolbox-back-end-validation" name="wppb_toolbox_forms_settings[back-end-validation]"<?php echo ( ( isset( $settings['back-end-validation'] ) && ( $settings['back-end-validation'] == 'yes' ) ) ? ' checked' : '' ); ?> value="yes">
                <label class="cozmoslabs-toggle-track" for="toolbox-back-end-validation"></label>
            </div>

            <div class="cozmoslabs-toggle-description">
                <label for="toolbox-back-end-validation" class="cozmoslabs-description"><?php esc_html_e( 'Remove validation from back-end Profile page.', 'profile-builder' ); ?></label>
            </div>
        </div>

        <?php
        $users = count_users();

        if ( $users['total_users'] >= 5000 ) : ?>
            <div class="cozmoslabs-form-field-wrapper cozmoslabs-toggle-switch">
                <label class="cozmoslabs-form-field-label" for="toolbox-edit-other-users-limit"><?php esc_html_e('Edit Users Selector', 'profile-builder'); ?></label>

                <div class="cozmoslabs-toggle-container">
                    <input type="checkbox" id="toolbox-edit-other-users-limit" name="wppb_toolbox_forms_settings[edit-other-users-limit]"<?php echo ( ( isset( $settings['edit-other-users-limit'] ) && ( $settings['edit-other-users-limit'] == 'yes' ) ) ? ' checked' : '' ); ?> value="yes">
                    <label class="cozmoslabs-toggle-track" for="toolbox-edit-other-users-limit"></label>
                </div>

                <div class="cozmoslabs-toggle-description">
                    <p class="cozmoslabs-description"><?php esc_html_e( 'Always show edit other users dropdown.', 'profile-builder' ); ?></p>
                </div>

                <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'For perfomance reasons, we disable the Select if you have more than 5000 users on your website.', 'profile-builder' ); ?></p>
            </div>
        <?php endif; ?>

        <div class="cozmoslabs-form-field-wrapper cozmoslabs-toggle-switch">
            <label class="cozmoslabs-form-field-label" for="toolbox-users-can-register"><?php esc_html_e('Anyone can Register', 'profile-builder'); ?></label>

            <div class="cozmoslabs-toggle-container">
                <input type="checkbox" id="toolbox-users-can-register" name="wppb_toolbox_forms_settings[users-can-register]"<?php echo ( ( isset( $settings['users-can-register'] ) && ( $settings['users-can-register'] == 'yes' ) ) ? ' checked' : '' ); ?> value="yes">
                <label class="cozmoslabs-toggle-track" for="toolbox-users-can-register"></label>
            </div>

            <div class="cozmoslabs-toggle-description">
                <label for="toolbox-users-can-register" class="cozmoslabs-description"><?php esc_html_e( 'Consider "Anyone can Register" WordPress option.', 'profile-builder' ); ?></label>
            </div>

            <p class="cozmoslabs-description cozmoslabs-description-space-left">
                <?php
                echo wp_kses_post( sprintf( __( 'By default, Profile Builder ignores this %1$s. By enabling this option, our Registration Form will consider it.', 'profile-builder' ), '<a href="'. esc_url( admin_url( 'options-general.php' ) ) .'" target="_blank">' . esc_html__( 'setting', 'profile-builder' ) . '</a>' ) );
                ?>
            </p>
        </div>

        <div class="cozmoslabs-form-field-wrapper">
            <label class="cozmoslabs-form-field-label" for="toolbox-redirect-delay-timer"><?php esc_html_e('Redirect Delay Timer', 'profile-builder'); ?></label>
            <input type="text" id="toolbox-redirect-delay-timer" name="wppb_toolbox_forms_settings[redirect-delay-timer]" value="<?php echo ( ( !empty( $settings['redirect-delay-timer'] ) || ( isset( $settings['redirect-delay-timer'] ) && $settings['redirect-delay-timer'] == 0 ) ) ? esc_attr( $settings['redirect-delay-timer'] ) : '' ); ?>">
            <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'This allows you to change the amount of seconds it takes for the "After Registration" redirect to happen.', 'profile-builder' ); ?></p>
            <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'The default is 3 seconds. Leave empty if you do not want to change it.', 'profile-builder' ); ?></p>
        </div>

        <?php if ( defined( 'WPPB_PAID_PLUGIN_DIR' ) && file_exists( WPPB_PAID_PLUGIN_DIR.'/features/admin-approval/admin-approval.php' ) ) : ?>
            <div class="cozmoslabs-form-field-wrapper cozmoslabs-toggle-switch">
                <label class="cozmoslabs-form-field-label" for="toolbox-save-admin-approval-status"><?php esc_html_e('Admin Approval Status Usermeta', 'profile-builder'); ?></label>

                <div class="cozmoslabs-toggle-container">
                    <input type="checkbox" id="toolbox-save-admin-approval-status" name="wppb_toolbox_forms_settings[save-admin-approval-status]"<?php echo ( ( isset( $settings['save-admin-approval-status'] ) && ( $settings['save-admin-approval-status'] == 'yes' ) ) ? ' checked' : '' ); ?> value="yes">
                    <label class="cozmoslabs-toggle-track" for="toolbox-save-admin-approval-status"></label>
                </div>

                <div class="cozmoslabs-toggle-description">
                    <label for="toolbox-save-admin-approval-status" class="cozmoslabs-description"><?php esc_html_e( 'Save Admin Approval status in usermeta.', 'profile-builder' ); ?></label>
                </div>

                <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'By default, the Admin Approval status is saved as a custom taxonomy that is attached to the user.', 'profile-builder' ); ?></p>
                <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'By enabling this option, the status will also be saved in the "*_usermeta" table under the "wppb_approval_status" meta name.', 'profile-builder' ); ?></p>
            </div>
        <?php endif; ?>

        <?php if ( defined( 'WPPB_PAID_PLUGIN_DIR' ) && file_exists( WPPB_PAID_PLUGIN_DIR.'/features/admin-approval/admin-approval.php' ) ) : ?>
            <div class="cozmoslabs-form-field-wrapper cozmoslabs-toggle-switch">
                <label class="cozmoslabs-form-field-label" for="toolbox-redirect-author-page"><?php esc_html_e('Redirect Unapproved Users', 'profile-builder'); ?></label>

                <div class="cozmoslabs-toggle-container">
                    <input type="checkbox" id="toolbox-redirect-author-page" name="wppb_toolbox_forms_settings[redirect-author-page]"<?php echo ( ( isset( $settings['redirect-author-page'] ) && ( $settings['redirect-author-page'] == 'yes' ) ) ? ' checked' : '' ); ?> value="yes">
                    <label class="cozmoslabs-toggle-track" for="toolbox-redirect-author-page"></label>
                </div>

                <div class="cozmoslabs-toggle-description">
                    <label for="toolbox-redirect-author-page" class="cozmoslabs-description"><?php esc_html_e( 'Redirect "/author" page if user is not approved.', 'profile-builder' ); ?></label>
                </div>

                <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'By default, users placed in Admin Approval will not be able to login, but the Author pages will be accessible.', 'profile-builder' ); ?></p>
                <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'Using this option you can redirect these pages, sending users who try to access them to your home page.', 'profile-builder' ); ?></p>
            </div>
        <?php endif; ?>

        <div class="cozmoslabs-form-field-wrapper cozmoslabs-toggle-switch">
            <label class="cozmoslabs-form-field-label" for="toolbox-save-last-login"><?php esc_html_e('Last Login Usermeta', 'profile-builder'); ?></label>

            <div class="cozmoslabs-toggle-container">
                <input type="checkbox" id="toolbox-save-last-login" name="wppb_toolbox_forms_settings[save-last-login]"<?php echo ( ( isset( $settings['save-last-login'] ) && ( $settings['save-last-login'] == 'yes' ) ) ? ' checked' : '' ); ?> value="yes">
                <label class="cozmoslabs-toggle-track" for="toolbox-save-last-login"></label>
            </div>

            <div class="cozmoslabs-toggle-description">
                <label for="toolbox-save-last-login" class="cozmoslabs-description"><?php esc_html_e( 'Save "Last Login" date in usermeta.', 'profile-builder' ); ?></label>
            </div>

            <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'By enabling this option, each time a user logins, the date and time will be saved in the database under the "last_login_date" meta name.', 'profile-builder' ); ?></p>
            <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php echo wp_kses_post( __( 'You can <a href="https://www.cozmoslabs.com/docs/profile-builder/manage-user-fields/#Manage_existing_custom_fields_with_Profile_Builder" target="_blank">create a field with this meta name</a> to display it in the Userlisting or Edit Profile forms.', 'profile-builder' ) ); ?></p>
        </div>

        <div class="cozmoslabs-form-field-wrapper cozmoslabs-toggle-switch">
            <label class="cozmoslabs-form-field-label" for="toolbox-save-last-profile-update"><?php esc_html_e('Last Profile Update Usermeta', 'profile-builder'); ?></label>

            <div class="cozmoslabs-toggle-container">
                <input type="checkbox" id="toolbox-save-last-profile-update" name="wppb_toolbox_forms_settings[save-last-profile-update]"<?php echo ( ( isset( $settings['save-last-profile-update'] ) && ( $settings['save-last-profile-update'] == 'yes' ) ) ? ' checked' : '' ); ?> value="yes">
                <label class="cozmoslabs-toggle-track" for="toolbox-save-last-profile-update"></label>
            </div>

            <div class="cozmoslabs-toggle-description">
                <label for="toolbox-save-last-profile-update" class="cozmoslabs-description"><?php esc_html_e( 'Save "Last Profile Update" date in usermeta.', 'profile-builder' ); ?></label>
            </div>

            <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'By enabling this option, each time a user modifies his profile the date and time will be saved in the database under the "last_profile_update_date" meta name.', 'profile-builder' ); ?></p>
            <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php echo wp_kses_post( __( 'You can <a href="https://www.cozmoslabs.com/docs/profile-builder/manage-user-fields/#Manage_existing_custom_fields_with_Profile_Builder" target="_blank">create a field with this meta name</a> to display it in the Userlisting or Edit Profile forms.', 'profile-builder' ) ); ?></p>
        </div>

        <div class="cozmoslabs-form-field-wrapper cozmoslabs-toggle-switch">
            <label class="cozmoslabs-form-field-label" for="toolbox-disable-automatic-scrolling"><?php esc_html_e('Disable Automatic Scrolling', 'profile-builder'); ?></label>

            <div class="cozmoslabs-toggle-container">
                <input type="checkbox" id="toolbox-disable-automatic-scrolling" name="wppb_toolbox_forms_settings[disable-automatic-scrolling]"<?php echo ( ( isset( $settings['disable-automatic-scrolling'] ) && ( $settings['disable-automatic-scrolling'] == 'yes' ) ) ? ' checked' : '' );?> value="yes">
                <label class="cozmoslabs-toggle-track" for="toolbox-disable-automatic-scrolling"></label>
            </div>

            <div class="cozmoslabs-toggle-description">
                <label for="toolbox-disable-automatic-scrolling" class="cozmoslabs-description"><?php esc_html_e( 'Disable automatic scrolling after submit.', 'profile-builder' ); ?></label>
            </div>

            <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'By default, after each form submission the page will automatically scroll to the form message. By enabling this option, automatic scrolling will be disabled.', 'profile-builder' ); ?></p>
        </div>

        <?php if( wppb_conditional_fields_exists() ): ?>
            <div class="cozmoslabs-form-field-wrapper cozmoslabs-toggle-switch">
                <label class="cozmoslabs-form-field-label" for="toolbox-ajax-conditional-logic"><?php esc_html_e('Conditional Fields Ajax', 'profile-builder'); ?></label>

                <div class="cozmoslabs-toggle-container">
                    <input type="checkbox" id="toolbox-ajax-conditional-logic" name="wppb_toolbox_forms_settings[ajax-conditional-logic]"<?php echo ( ( isset( $settings['ajax-conditional-logic'] ) && ( $settings['ajax-conditional-logic'] == 'yes' ) ) ? ' checked' : '' );?> value="yes">
                    <label class="cozmoslabs-toggle-track" for="toolbox-ajax-conditional-logic"></label>
                </div>

                <div class="cozmoslabs-toggle-description">
                    <label for="toolbox-ajax-conditional-logic" class="cozmoslabs-description"><?php esc_html_e( 'Use Ajax on conditional fields.', 'profile-builder' ); ?></label>
                </div>

                <p class="cozmoslabs-description cozmoslabs-description-space-left"><?php esc_html_e( 'For large conditional forms. Enable option for improved page performance.', 'profile-builder' ); ?></p>
            </div>
        <?php endif; ?>
    </div>

    <input type="hidden" name="wppb_toolbox_current_tab" value="forms" />

    <div class="submit">
        <h3 class="cozmoslabs-subsection-title"><?php esc_html_e( 'Update Settings', 'profile-builder' ) ?></h3>
        <div class="cozmoslabs-publish-button-group">
            <?php submit_button( __( 'Save Changes', 'profile-builder' ) ); ?>
        </div>
    </div>

</form>
