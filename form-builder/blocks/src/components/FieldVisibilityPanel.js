/**
 * Field Visibility inspector. Wire separator is ", " (legacy WCK / PHP explode).
 * 'all' is exclusive with other items; empty list falls back to 'all'.
 */
import { PanelBody, SelectControl, CheckboxControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const SEP = ', ';

function csvList( csv ) {
    if ( ! csv ) return [];
    return csv.split( ',' ).map( ( v ) => v.trim() ).filter( Boolean );
}

function csvHas( csv, value ) {
    return csvList( csv ).includes( value );
}

/**
 * Toggle a single item in the comma-separated value.
 * - Clicking 'all' always resets to 'all' (mutually exclusive with everything).
 * - Clicking any other item drops 'all' from the list.
 * - Empty list falls back to 'all'.
 */
function toggleItem( current, key, checked ) {
    if ( key === 'all' ) {
        return 'all';
    }
    let list = csvList( current ).filter( ( v ) => v !== 'all' );
    if ( checked && ! list.includes( key ) ) list.push( key );
    if ( ! checked ) list = list.filter( ( v ) => v !== key );
    if ( list.length === 0 ) return 'all';
    return list.join( SEP );
}

export default function FieldVisibilityPanel( { attributes, setAttributes } ) {
    const cfg = ( typeof window !== 'undefined' && window.wppbFb && window.wppbFb.fieldVisibility ) || null;
    if ( ! cfg ) return null;

    const visibility         = attributes[ 'visibility' ]           || 'all';
    const userRoleVisibility = attributes[ 'user-role-visibility' ] || 'all';
    const locationVisibility = attributes[ 'location-visibility' ]  || 'all';

    const userRoles         = cfg.userRoles         || {};
    const locations         = cfg.locations         || {};
    const visibilityOptions = cfg.visibilityOptions || {};

    const visOptions = Object.keys( visibilityOptions ).map( ( value ) => ( {
        value,
        label: visibilityOptions[ value ],
    } ) );

    return (
        <PanelBody title={ __( 'Field Visibility', 'profile-builder' ) } initialOpen={ false }>
            <SelectControl
                label={ __( 'Visibility', 'profile-builder' ) }
                value={ visibility }
                options={ visOptions }
                onChange={ ( val ) => setAttributes( { 'visibility': val } ) }
                help={ __( 'Admin Only: visible only for administrators. User Locked: visible for everyone, but only administrators can edit.', 'profile-builder' ) }
            />

            <p style={ { marginTop: '1em', marginBottom: '0.25em', fontWeight: 600 } }>
                { __( 'User Role Visibility', 'profile-builder' ) }
            </p>
            <CheckboxControl
                label={ __( 'All', 'profile-builder' ) }
                checked={ csvHas( userRoleVisibility, 'all' ) }
                onChange={ ( c ) => setAttributes( { 'user-role-visibility': toggleItem( userRoleVisibility, 'all', c ) } ) }
            />
            { Object.keys( userRoles ).map( ( slug ) => (
                <CheckboxControl
                    key={ slug }
                    label={ userRoles[ slug ] }
                    checked={ csvHas( userRoleVisibility, slug ) }
                    onChange={ ( c ) => setAttributes( { 'user-role-visibility': toggleItem( userRoleVisibility, slug, c ) } ) }
                />
            ) ) }
            <p style={ { color: '#757575', fontSize: '12px', marginTop: '0.25em' } }>
                { __( 'Select which user roles see this field.', 'profile-builder' ) }
            </p>

            <p style={ { marginTop: '1em', marginBottom: '0.25em', fontWeight: 600 } }>
                { __( 'Location Visibility', 'profile-builder' ) }
            </p>
            <CheckboxControl
                label={ __( 'All', 'profile-builder' ) }
                checked={ csvHas( locationVisibility, 'all' ) }
                onChange={ ( c ) => setAttributes( { 'location-visibility': toggleItem( locationVisibility, 'all', c ) } ) }
            />
            { Object.keys( locations ).map( ( slug ) => (
                <CheckboxControl
                    key={ slug }
                    label={ locations[ slug ] }
                    checked={ csvHas( locationVisibility, slug ) }
                    onChange={ ( c ) => setAttributes( { 'location-visibility': toggleItem( locationVisibility, slug, c ) } ) }
                />
            ) ) }
            <p style={ { color: '#757575', fontSize: '12px', marginTop: '0.25em' } }>
                { __( 'Select the locations you wish the field to appear.', 'profile-builder' ) }
            </p>
        </PanelBody>
    );
}
