import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, TextareaControl } from '@wordpress/components';
import BaseFieldEdit from './BaseFieldEdit';

// Shared preview renderer for the comma-separated options/labels field
// family. 'select' / 'select-multiple' render a native <select>; 'radio' /
// 'checkbox' render a list of disabled inputs — the two shapes the six
// consuming blocks (Select, Select2, Select (Multiple), Select2 (Multiple),
// Radio, Checkbox) actually need.
function renderPreview( previewType, optionsList, labelsList ) {
    const rows = optionsList.length > 0 ? optionsList : null;

    if ( previewType === 'radio' || previewType === 'checkbox' ) {
        const className = previewType === 'radio' ? 'wppb-fb-radios' : 'wppb-fb-checkboxes';
        return (
            <div className={ className }>
                { rows ? rows.map( ( opt, i ) => (
                    <div key={ i } style={ { marginBottom: '5px' } }>
                        <input type={ previewType } disabled />
                        <label style={ { marginLeft: '5px' } }>
                            { labelsList[ i ] ? labelsList[ i ].trim() : opt.trim() }
                        </label>
                    </div>
                ) ) : <div>{ __( '(no options defined)', 'profile-builder' ) }</div> }
            </div>
        );
    }

    const isMultiple = previewType === 'select-multiple';
    return (
        <select disabled multiple={ isMultiple } style={ isMultiple ? { width: '100%', height: '100px' } : { width: '100%' } }>
            { rows ? rows.map( ( opt, i ) => (
                <option key={ i } value={ opt.trim() }>
                    { labelsList[ i ] ? labelsList[ i ].trim() : opt.trim() }
                </option>
            ) ) : <option>{ __( '(no options defined)', 'profile-builder' ) }</option> }
        </select>
    );
}

/**
 * Shared editor for the comma-separated options/labels field family. Each
 * consuming block keeps its own edit.js (required by the register-blocks.js
 * require.context glob, which discovers blocks by their edit.js default
 * export) and its own __( 'X Settings', … ) panel-title call (required for
 * .pot extraction — the string must be a literal at the call site), passed
 * in as `panelTitle`. Everything else — the Options/Labels textareas, the
 * Default Value control, and the preview markup — lives here once.
 */
export default function OptionsFieldEdit( { panelTitle, previewType = 'select', defaultValueAttr = 'default-option', showDefaultHelp = false, extraControls = null, ...props } ) {
    const { attributes, setAttributes } = props;

    const extraPanels = (
        <PanelBody title={ panelTitle }>
            <TextareaControl
                label={ __( 'Options', 'profile-builder' ) }
                value={ attributes.options }
                onChange={ ( val ) => setAttributes( { options: val } ) }
                help={ __( 'Enter options separated by comma.', 'profile-builder' ) }
            />
            <TextareaControl
                label={ __( 'Labels', 'profile-builder' ) }
                value={ attributes.labels }
                onChange={ ( val ) => setAttributes( { labels: val } ) }
                help={ __( 'Enter labels separated by comma. If empty, options will be used.', 'profile-builder' ) }
            />
            <TextControl
                label={ __( 'Default Value', 'profile-builder' ) }
                value={ attributes[ defaultValueAttr ] }
                onChange={ ( val ) => setAttributes( { [ defaultValueAttr ]: val } ) }
                help={ showDefaultHelp ? __( 'Enter default selected options separated by comma.', 'profile-builder' ) : undefined }
            />
            { extraControls }
        </PanelBody>
    );

    const optionsList = attributes.options ? attributes.options.split( ',' ) : [];
    const labelsList = attributes.labels ? attributes.labels.split( ',' ) : [];

    return (
        <BaseFieldEdit { ...props } inspectorPanels={ extraPanels }>
            { renderPreview( previewType, optionsList, labelsList ) }
        </BaseFieldEdit>
    );
}
