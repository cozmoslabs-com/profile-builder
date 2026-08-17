import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ __( 'Heading Settings', 'profile-builder' ) }>
            <SelectControl
                label={ __( 'Heading Tag', 'profile-builder' ) }
                value={ attributes[ 'heading-tag' ] }
                options={ [
                    { label: 'h2', value: 'h2' },
                    { label: 'h3', value: 'h3' },
                    { label: 'h4', value: 'h4' },
                    { label: 'h5', value: 'h5' },
                ] }
                onChange={ ( val ) => setAttributes( { 'heading-tag': val } ) }
            />
        </PanelBody>
    );

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels } hidePreview />
    );
}
