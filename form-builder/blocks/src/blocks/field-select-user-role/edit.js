import { __ } from '@wordpress/i18n';
import { PanelBody, CheckboxControl, Button, Notice } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

// Site roles published by the editor bridge (administrator excluded
// server-side; see form-builder-registration.php). Falls back to an empty
// list so a missing payload degrades to a Notice instead of crashing.
function getAvailableRoles() {
    const fb = ( typeof window !== 'undefined' && window.wppbFb ) || {};
    const cfg = fb.userRoleField || {};
    return Array.isArray( cfg.roles ) ? cfg.roles : [];
}

// Parse the stored comma-separated slug list into an ordered array. Tolerates
// both the block's `, ` separator and a bare `,` (the server normalizes to
// `, ` on save — see wppb_fb_normalize_role_slug_csv).
function parseSlugs( value ) {
    return ( value || '' )
        .split( ',' )
        .map( ( s ) => s.trim() )
        .filter( Boolean );
}

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const availableRoles = getAvailableRoles();
    const roleLabelBySlug = {};
    availableRoles.forEach( ( r ) => {
        roleLabelBySlug[ r.value ] = r.label;
    } );

    // Selected slugs in display order; drop any that no longer map to a real
    // role on this site (a role removed after the field was configured).
    const selected = parseSlugs( attributes[ 'user-roles' ] ).filter( ( slug ) =>
        Object.prototype.hasOwnProperty.call( roleLabelBySlug, slug )
    );

    // Keep `user-roles` (front-end option order) and `user-roles-sort-order`
    // in sync, exactly as the classic Manage Fields UI does.
    const commit = ( slugs ) => {
        const value = slugs.join( ', ' );
        setAttributes( {
            'user-roles': value,
            'user-roles-sort-order': value,
        } );
    };

    const toggleRole = ( slug, checked ) => {
        if ( checked ) {
            if ( ! selected.includes( slug ) ) {
                commit( [ ...selected, slug ] );
            }
        } else {
            commit( selected.filter( ( s ) => s !== slug ) );
        }
    };

    const move = ( index, delta ) => {
        const target = index + delta;
        if ( target < 0 || target >= selected.length ) {
            return;
        }
        const next = [ ...selected ];
        [ next[ index ], next[ target ] ] = [ next[ target ], next[ index ] ];
        commit( next );
    };

    const extraPanels = (
        <PanelBody title={ __( 'User Role Settings', 'profile-builder' ) }>
            { availableRoles.length === 0 ? (
                <Notice status="warning" isDismissible={ false }>
                    { __( 'No selectable user roles are available on this site.', 'profile-builder' ) }
                </Notice>
            ) : (
                <>
                    <p style={ { marginTop: 0 } }>
                        { __(
                            'Select which roles a user can choose from. Administrator is excluded.',
                            'profile-builder'
                        ) }
                    </p>
                    { availableRoles.map( ( role ) => (
                        <CheckboxControl
                            key={ role.value }
                            label={ role.label }
                            checked={ selected.includes( role.value ) }
                            onChange={ ( checked ) => toggleRole( role.value, checked ) }
                        />
                    ) ) }

                    { selected.length > 1 && (
                        <div style={ { marginTop: '12px' } }>
                            <p style={ { fontWeight: 600, marginBottom: '4px' } }>
                                { __( 'Display order', 'profile-builder' ) }
                            </p>
                            { selected.map( ( slug, index ) => (
                                <div
                                    key={ slug }
                                    style={ {
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px',
                                        padding: '2px 0',
                                    } }
                                >
                                    <span>{ roleLabelBySlug[ slug ] || slug }</span>
                                    <span style={ { display: 'flex', gap: '2px' } }>
                                        <Button
                                            isSmall
                                            variant="tertiary"
                                            aria-label={ __( 'Move up', 'profile-builder' ) }
                                            disabled={ index === 0 }
                                            onClick={ () => move( index, -1 ) }
                                        >
                                            { '↑' }
                                        </Button>
                                        <Button
                                            isSmall
                                            variant="tertiary"
                                            aria-label={ __( 'Move down', 'profile-builder' ) }
                                            disabled={ index === selected.length - 1 }
                                            onClick={ () => move( index, 1 ) }
                                        >
                                            { '↓' }
                                        </Button>
                                    </span>
                                </div>
                            ) ) }
                        </div>
                    ) }
                </>
            ) }

            <CheckboxControl
                label={ __( 'Display on Edit Profile', 'profile-builder' ) }
                help={ __( 'Allow users to change their role from the Edit Profile form.', 'profile-builder' ) }
                checked={ attributes[ 'user-roles-on-edit-profile' ] === 'yes' }
                onChange={ ( checked ) =>
                    setAttributes( { 'user-roles-on-edit-profile': checked ? 'yes' : '' } )
                }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <select disabled style={ { width: '100%' } }>
                <option>{ __( '-- Select a role --', 'profile-builder' ) }</option>
                { selected.map( ( slug ) => (
                    <option key={ slug }>{ roleLabelBySlug[ slug ] || slug }</option>
                ) ) }
            </select>
        </BaseFieldEdit>
    );
}
