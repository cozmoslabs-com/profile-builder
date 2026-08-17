import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'Timepicker Settings', 'profile-builder' ) }>
            <SelectControl
                label={ __( 'Time Format', 'profile-builder' ) }
                value={ attributes[ 'time-format' ] }
                options={ [
                    { label: __( '12 Hours', 'profile-builder' ), value: '12' },
                    { label: __( '24 Hours', 'profile-builder' ), value: '24' },
                ] }
                onChange={ ( val ) => setAttributes( { 'time-format': val } ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            <div style={ { display: 'flex', alignItems: 'center' } }>
                <select disabled style={ { marginRight: '5px', padding: '5px' } }>
                    <option>12</option>
                </select>
                <span>:</span>
                <select disabled style={ { marginLeft: '5px', padding: '5px' } }>
                    <option>00</option>
                </select>
                { attributes[ 'time-format' ] === '12' && (
                    <span style={ { marginLeft: '5px' } }>am</span>
                ) }
            </div>
        </BaseFieldEdit>
    );
}
