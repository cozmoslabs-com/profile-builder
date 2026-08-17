/**
 * Shared editor for MailChimp / MailPoet / Campaign Monitor Subscribe blocks.
 * Each block passes `config` (bridgeKey, list/hide/defaultChecked attrs, labels).
 * Empty `lists` → notice; single-select list id matches legacy.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, ToggleControl, Notice, ExternalLink } from '@wordpress/components';
import BaseFieldEdit from './BaseFieldEdit';

export default function SubscribeFieldEdit( props ) {
    const { config, ...blockProps } = props;
    const { attributes, setAttributes } = props;

    const fb = ( typeof window !== 'undefined' && window.wppbFb ) || {};
    const bridge = ( config && fb[ config.bridgeKey ] ) || {};
    const lists = Array.isArray( bridge.lists ) ? bridge.lists : [];
    const settingsUrl = bridge.settingsUrl || '';

    const setYesNo = ( attr, on ) => setAttributes( { [ attr ]: on ? 'yes' : '' } );

    const panel = (
        <PanelBody title={ `${ config.serviceLabel } ${ __( 'Settings', 'profile-builder' ) }` }>
            { lists.length > 0 ? (
                <SelectControl
                    label={ config.listLabel }
                    value={ attributes[ config.listAttr ] || '' }
                    options={ [
                        { value: '', label: __( 'Select a list…', 'profile-builder' ) },
                        ...lists,
                    ] }
                    onChange={ ( val ) => setAttributes( { [ config.listAttr ]: val } ) }
                    help={ __( 'The list new subscribers are added to.', 'profile-builder' ) }
                />
            ) : (
                <Notice status="warning" isDismissible={ false }>
                    { __( 'No lists available — configure the integration in its settings page, then reopen this form.', 'profile-builder' ) }
                    { settingsUrl && ' ' }
                    { settingsUrl && (
                        <ExternalLink href={ settingsUrl }>
                            { `${ config.serviceLabel } ${ __( 'settings', 'profile-builder' ) }` }
                        </ExternalLink>
                    ) }
                </Notice>
            ) }

            { config.defaultCheckedAttr && (
                <ToggleControl
                    label={ __( 'Checked by default (register forms)', 'profile-builder' ) }
                    checked={ attributes[ config.defaultCheckedAttr ] === 'yes' }
                    onChange={ ( on ) => setYesNo( config.defaultCheckedAttr, on ) }
                    help={ __( 'Pre-check the subscribe box on registration forms.', 'profile-builder' ) }
                />
            ) }
            <ToggleControl
                label={ __( 'Hide on Edit Profile forms', 'profile-builder' ) }
                checked={ attributes[ config.hideFieldAttr ] === 'yes' }
                onChange={ ( on ) => setYesNo( config.hideFieldAttr, on ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...blockProps } inspectorPanels={ panel } hideDescription>
            <label style={ { display: 'flex', alignItems: 'center', gap: '6px' } }>
                <input
                    type="checkbox"
                    disabled
                    readOnly
                    checked={ !! config.defaultCheckedAttr && attributes[ config.defaultCheckedAttr ] === 'yes' }
                />
                <span>{ attributes[ 'field-title' ] }</span>
            </label>
        </BaseFieldEdit>
    );
}
