jQuery(document).ready(function(){

    // Listen for Elementor Popup show event
    jQuery(document).on('elementor/popup/show', function(event, popupID) {
        handleElementorPopupForm(event, popupID);
    });

})

/**
 * Handles the PB-Form inside an Elementor Popup
 *
 */
function handleElementorPopupForm(event, popupID) {

    // Identify the Elementor Popup and the PB-Form or PB-Form Wrapper inside the popup
    let elementorPopup = jQuery('#elementor-popup-modal-' + popupID),
        wppbElement = elementorPopup.find('.wppb-user-forms');

    // Exit here if there is no PB Form inside the Elementor Popup
    if (wppbElement.length === 0) {
        return;
    }

    // Identify PB-Form and Form elements
    let form = wppbElement.is('form') ? wppbElement : wppbElement.find('form'),
        formID = form.attr('id'),
        elementorWidgetContainer = wppbElement.closest('.elementor-widget-container').parent().attr('data-id');

    // Append DatePicker-UI to the DatePicker Field (this prevents the Elementor Popup to close when a date is selected)
    if (form.find('.wppb-datepicker .custom_field_datepicker').length > 0) {
        jQuery('.wppb-datepicker .custom_field_datepicker').on('focus', function () {
            if (!jQuery(this).next().is('#ui-datepicker-div')) {
                jQuery(this).after(jQuery('#ui-datepicker-div'));
            }
        });
    }

    // Listen for PB-Form submission
    form.on('submit', function(submitEvent) {
        submitEvent.preventDefault();

        // Get PB-Form Data and Submit button
        let formData = new FormData(this),
            submitButton = form.find('input[type="submit"]');

        // Disable Submit button while AJAX request is in progress
        submitButton.prop('disabled', true).val('Processing...').css('opacity', '0.5');

        // Remove any Error Message added in case of AJAX request error
        submitButton.siblings('p.error-message').remove();

        jQuery.ajax({
            url: form.attr('action'),
            method: form.attr('method'),
            data: formData,
            contentType: false,
            processData: false,

            success: function(response, status, responseData) {
                let formContainer = jQuery(response).find('[data-id="' + elementorWidgetContainer + '"]'),
                    fromErrorMessage =  formContainer.find('.wppb-error, .wppb-warning');

                if (formContainer.length > 0) {
                    jQuery('[data-id="' + elementorWidgetContainer + '"]').html(formContainer.html());
                }

                // Reset submit button
                submitButton.prop('disabled', false).val('Submit').css('opacity', '');

                // Call this Function again so the PB-Form inside an Elementor Popup is properly handled after a Form submission with errors
                handleElementorPopupForm(event, popupID);

                if (fromErrorMessage.length === 0 && (formID === 'wppb-loginform' || formID === 'wppb-register-user')) {
                    let autoLogin = jQuery(response).find('p.redirect_message a').attr('href'),
                        formRedirect = formData.get('redirect_to');

                    // Check for an Autologin link before making the redirect for the Registration Form
                    if (autoLogin && formID === 'wppb-register-user')
                        formRedirect = autoLogin;

                    window.location.href = formRedirect;
                }
            },

            error: function(xhr, status, error) {

                // Display error message
                let errorMessage = jQuery('<p>').addClass('error-message').css('color', '#C62828').text('Something went wrong! Please try again...');
                submitButton.after(errorMessage);

                // Reset submit button
                submitButton.prop('disabled', false).val('Submit').css('opacity', '');
            }
        });

    });

    // Bind specific Form Field Events inside an Elementor Popup
    bindFormFieldEvents(elementorPopup);

}


/**
 * Bind specific Form Field Events inside an Elementor Popup
 *
 */
function bindFormFieldEvents(elementorPopup) {

    // Call this Function again so the Form Fields inside the Elementor Popup are properly handled (for FD - Style 1 & Style-2)
    if (typeof handleFormFields === 'function')
        handleFormFields();

    // DatePicker Field
    if (elementorPopup.find('.wppb-datepicker').length > 0 ){
        jQuery('.wppb-user-forms *').removeClass('hasDatepicker');
        wppb_initialize_datepicker();
    }

    // ColorPicker Field
    if (elementorPopup.find('.wppb-colorpicker').length > 0 )
        wppb_initialize_colorpicker();

    // Phone Field
    if ( elementorPopup.find('.wppb-phone').length > 0 )
        wppb_initialize_phone_field();

    // Map Field
    if ( elementorPopup.find('.wppb-map').length > 0)
        wppb_initialize_map();

    // Select2 & Select2 Multiple Fields
    let select2Fields = elementorPopup.find('.wppb-select2, .wppb-select2-multiple');
    if ( select2Fields.length > 0 && ( typeof wppb_select2_initialize === "function" ) ){
        select2Fields.each(function(){
            jQuery( '.select2-container' ).remove();
        });
        wppb_select2_initialize();
    }

    // CPT Field
    let selectCPTFields = elementorPopup.find('.wppb-select-cpt');
    if ( selectCPTFields.length > 0 ){
        selectCPTFields.each(function(){
            jQuery( '.wppb-select-cpt .select2-container' ).remove();
        });
        jQuery('.custom_field_cpt_select').each( function(){
            var currentCptSelect = this;
            jQuery( currentCptSelect ).select2();
        });
    }

    // "Select User To Edit" Field (Edit Profile Form)
    if ( elementorPopup.find('#select_user_to_edit_form').length > 0)
        wppb_select_user_to_edit_initialize();

    // Simple Upload Field
    if ( elementorPopup.find('.wppb_simple_upload').length > 0)
        validate_simple_upload();

    // Bind the Click Event for the Password Visibility Toggle
    jQuery( 'button.wppb-toggle-pw' ).on( 'click', wppb_password_visibility_toggle );

    // Bind missing Events for Password Strength feature
    if (typeof check_pass_strength === 'function')
        jQuery('#passw1, #passw2').val('').on('keyup change', check_pass_strength);

}