/**
 * Form Fields in Columns document sidebar: per-form on/off (`wppb_fb_ffc_enable`).
 */
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { ToggleControl, Notice } from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';

const FFC_COLUMNS_BLOCK = 'profile-builder/ffc-columns';

const FfcPanel = () => {
    const postType = useSelect( ( select ) => select( 'core/editor' ).getCurrentPostType(), [] );
    if ( ! [ 'wppb-rf-cpt', 'wppb-epf-cpt' ].includes( postType ) ) return null;
    // Gate behind the Form Fields in Columns add-on's bridge (see file header):
    // the `wppb_fb_ffc_enable` virtual REST key, the Columns block's inserter
    // entry and the front-end wrapping all ship with the add-on, so with it
    // deactivated the toggle would write an unregistered meta key that REST
    // drops. Same contract as the Progress Bar / Multi-Step Forms panels.
    if ( ! ( window.wppbFb && window.wppbFb.ffc ) ) return null;

    const [ meta, setMeta ] = useEntityProp( 'postType', postType, 'meta' );
    if ( ! meta ) return null;

    // Treat empty / missing as 'yes' — matches the legacy default (see
    // wppb_in_ffc_meta_boxes_content's first-load default of ['ffc-enable' => 'yes']).
    const stored = meta.wppb_fb_ffc_enable;
    const enabled = stored === '' || stored === undefined ? true : stored === 'yes';

    const wrapperCount = useSelect( ( select ) => {
        const editor = select( 'core/block-editor' );
        if ( ! editor ) return 0;
        return editor.getBlocks().filter( ( b ) => b && b.name === FFC_COLUMNS_BLOCK ).length;
    }, [] );

    return (
        <PluginDocumentSettingPanel
            name="wppb-ffc-settings"
            title={ __( 'Form Fields in Columns', 'profile-builder' ) }
        >
            { wrapperCount === 0 && (
                <Notice status="info" isDismissible={ false }>
                    { __( 'Insert a "Columns" block and drop two or more field blocks inside it to wrap them in a horizontal row on the front end.', 'profile-builder' ) }
                </Notice>
            ) }

            <ToggleControl
                label={ __( 'Render columns on the front end', 'profile-builder' ) }
                checked={ enabled }
                onChange={ ( on ) => setMeta( { wppb_fb_ffc_enable: on ? 'yes' : 'no' } ) }
                help={ __( 'When off, Columns blocks are ignored at render time and their fields render in a normal vertical stack. Useful for temporarily disabling the layout without removing the blocks.', 'profile-builder' ) }
            />
        </PluginDocumentSettingPanel>
    );
};

registerPlugin( 'wppb-ffc-settings-plugin', { render: FfcPanel } );
