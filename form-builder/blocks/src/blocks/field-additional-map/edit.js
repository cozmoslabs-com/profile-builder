import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'Map Settings', 'profile-builder' ) }>
            <TextControl
                label={ __( 'Default Latitude', 'profile-builder' ) }
                value={ attributes[ 'map-default-lat' ] }
                onChange={ ( val ) => setAttributes( { 'map-default-lat': val } ) }
            />
            <TextControl
                label={ __( 'Default Longitude', 'profile-builder' ) }
                value={ attributes[ 'map-default-lng' ] }
                onChange={ ( val ) => setAttributes( { 'map-default-lng': val } ) }
            />
            <TextControl
                label={ __( 'Default Zoom', 'profile-builder' ) }
                value={ attributes[ 'map-default-zoom' ] }
                onChange={ ( val ) => setAttributes( { 'map-default-zoom': val } ) }
            />
            <TextControl
                label={ __( 'Map Height (px)', 'profile-builder' ) }
                value={ attributes[ 'map-height' ] }
                onChange={ ( val ) => setAttributes( { 'map-height': val } ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <div style={ { 
                width: '100%', 
                height: attributes[ 'map-height' ] + 'px', 
                backgroundColor: '#e5e3df', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#666',
                border: '1px solid #ccc'
            } }>
                <span className="dashicons dashicons-location-alt" style={ { marginRight: '10px' } } />
                { __( 'Google Map Placeholder (Additional)', 'profile-builder' ) }
            </div>
        </BaseFieldEdit>
    );
}
