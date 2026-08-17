jQuery( function( $ ) {
    var data = window.wppbSetupWizardPointer;

    if ( ! data || ! data.target ) {
        return;
    }

    var $target = $( data.target );

    if ( ! $target.length ) {
        $target = $( '#the-list .row-title' ).first();
    }

    if ( ! $target.length ) {
        return;
    }

    $target.pointer( {
        content: data.content,
        position: {
            edge: 'left',
            align: 'middle'
        },
        close: function() {
            $.post( ajaxurl, {
                pointer: data.pointerId,
                action: 'dismiss-wp-pointer'
            } );
        }
    } ).pointer( 'open' );
} );
