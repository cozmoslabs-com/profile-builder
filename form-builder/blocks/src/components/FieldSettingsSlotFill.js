import { createSlotFill } from '@wordpress/components';

/**
 * Slot/Fill that moves field inspector panels into the Field Settings PluginSidebar.
 */
const { Fill, Slot } = createSlotFill( 'WppbFbFieldSettings' );

export const FieldSettingsFill = Fill;
export const FieldSettingsSlot = Slot;
