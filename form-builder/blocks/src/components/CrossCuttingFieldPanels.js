/**
 * Cross-cutting inspector panels shared by every PB field block.
 * Mount from BaseFieldEdit and from hosts that build their own Fill
 * (e.g. field-repeater). Each panel gates on its attribute / availability.
 *
 * `insideRepeater` is a prop so hosts that already know nesting skip a second walk.
 */

import ConditionalLogicPanel from './ConditionalLogicPanel';
import FieldVisibilityPanel from './FieldVisibilityPanel';
import EditProfileApprovedByAdminPanel from './EditProfileApprovedByAdminPanel';
import ExtraFieldPropertiesPanel from './ExtraFieldPropertiesPanel';

const has = ( attributes, key ) => Object.prototype.hasOwnProperty.call( attributes, key );

export default function CrossCuttingFieldPanels( { attributes, setAttributes, insideRepeater = false } ) {
    // Hide CL on sub-fields (never fires) and on free installs (no evaluator).
    // Attribute stays so stored rules survive a save / downgrade.
    const conditionalLogicAvailable = window.wppbFb?.conditionalFields?.available !== false;
    const supportsConditionalLogic =
        has( attributes, 'conditional-logic-enabled' ) && ! insideRepeater && conditionalLogicAvailable;

    // Field Visibility only applies to top-level manage-fields rows.
    const supportsFieldVisibility = has( attributes, 'visibility' ) && ! insideRepeater;

    const supportsAdminApproval = has( attributes, 'edit-profile-approved-by-admin' );

    return (
        <>
            { supportsConditionalLogic && (
                <ConditionalLogicPanel attributes={ attributes } setAttributes={ setAttributes } />
            ) }
            { supportsFieldVisibility && (
                <FieldVisibilityPanel attributes={ attributes } setAttributes={ setAttributes } />
            ) }
            { supportsAdminApproval && (
                <EditProfileApprovedByAdminPanel attributes={ attributes } setAttributes={ setAttributes } />
            ) }
            <ExtraFieldPropertiesPanel
                attributes={ attributes }
                setAttributes={ setAttributes }
                insideRepeater={ insideRepeater }
            />
        </>
    );
}
