import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, SelectControl, TextareaControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'Map Settings', 'profile-builder' ) }>
            <TextControl
                label={ __( 'Google Maps API Key', 'profile-builder' ) }
                value={ attributes[ 'map-api-key' ] }
                onChange={ ( val ) => setAttributes( { 'map-api-key': val } ) }
                help={ __( 'When more than one Map field exists on a form, only the first map’s key is used.', 'profile-builder' ) }
            />
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
                label={ __( 'Default Zoom Level', 'profile-builder' ) }
                value={ attributes[ 'map-default-zoom' ] }
                onChange={ ( val ) => setAttributes( { 'map-default-zoom': val } ) }
                help={ __( '0–19. Higher values zoom in further.', 'profile-builder' ) }
            />
            <TextControl
                label={ __( 'Map Height (px)', 'profile-builder' ) }
                value={ attributes[ 'map-height' ] }
                onChange={ ( val ) => setAttributes( { 'map-height': val } ) }
            />
            <SelectControl
                label={ __( 'POIs Load Type', 'profile-builder' ) }
                value={ attributes[ 'map-pins-load-type' ] }
                options={ [
                    { label: __( 'POIs of the listed users (paginated)', 'profile-builder' ), value: '' },
                    { label: __( 'POIs of all users for the filter (no pagination)', 'profile-builder' ), value: 'all' },
                ] }
                onChange={ ( val ) => setAttributes( { 'map-pins-load-type': val } ) }
            />
            <TextControl
                label={ __( 'Number of Users per Map Iteration', 'profile-builder' ) }
                value={ attributes[ 'map-pagination-number' ] }
                onChange={ ( val ) => setAttributes( { 'map-pagination-number': val } ) }
                help={ __( 'Used only when loading all users with no pagination. Recommended max: 300.', 'profile-builder' ) }
            />
            <TextareaControl
                label={ __( 'POI Bubble Info', 'profile-builder' ) }
                value={ attributes[ 'map-bubble-fields' ] }
                onChange={ ( val ) => setAttributes( { 'map-bubble-fields': val } ) }
                help={ __( 'Comma-separated tag names to render in the POI bubble (e.g. avatar_or_gravatar, meta_display_name).', 'profile-builder' ) }
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
                border: '1px solid #ccc',
            } }>
                <span className="dashicons dashicons-location" style={ { marginRight: '10px' } } />
                { __( 'Google Map Placeholder', 'profile-builder' ) }
            </div>
        </BaseFieldEdit>
    );
}
