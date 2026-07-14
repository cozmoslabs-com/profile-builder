
/**
 * Function that initializes select2 on fields
 *
 * @since v.3.3.4
 */
function wppb_select2_initialize() {
    jQuery ( '.custom_field_select2' ).each( function(){
        var selectElement = jQuery( this );
        var select2Arguments = selectElement.attr( 'data-wppb-select2-arguments' );

        if ( select2Arguments ) {
            select2Arguments = JSON.parse( select2Arguments );
        } else {
            select2Arguments = {};
        }

        select2Arguments = wp.hooks.applyFilters( 'wppb_select2_initialize_arguments', select2Arguments, selectElement );

        if ( !( 'placeholder' in select2Arguments ) || select2Arguments.placeholder === '' ) {
            select2Arguments.placeholder = jQuery('label[for="' + selectElement.attr('id') + '"]').text();
        }

        selectElement.select2( select2Arguments ).on('select2:open', function(){
            // compatibility with Divi Overlay
            if( jQuery(selectElement).parents( '.overlay-container' ).length ){
                jQuery(selectElement).data('select2').dropdown.$dropdownContainer.css( 'z-index', '99999999' );
            }
        });
    });
}

jQuery( document ).ready(function() {
    wppb_select2_initialize();
});