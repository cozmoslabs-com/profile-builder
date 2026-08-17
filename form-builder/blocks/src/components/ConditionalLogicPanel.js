import { __ } from '@wordpress/i18n';
import {
    PanelBody,
    SelectControl,
    TextControl,
    ToggleControl,
    Button,
    Flex,
    FlexItem,
    Notice,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useState, useMemo } from '@wordpress/element';

import { useExistingFieldsSnapshot } from '../lib/existingFieldsSnapshot';

const OPERATORS = [ 'is', 'is not', 'less than', 'more than' ];
// The VALUES above are the stored enum and must never be translated — the
// frontend compares them literally in features/conditional-fields/. Only the
// dropdown label is localised, via this map.
const OPERATOR_LABELS = () => ( {
    'is':        __( 'is', 'profile-builder' ),
    'is not':    __( 'is not', 'profile-builder' ),
    'less than': __( 'less than', 'profile-builder' ),
    'more than': __( 'more than', 'profile-builder' ),
} );
const NUMERIC_OPERATORS = [ 'less than', 'more than' ];

const blankRule = () => ( { field: '', operator: 'is', value: '' } );

// Same inline plus as AddFieldButton's, for one visual language across the
// editor's "add" affordances. Deliberately not @wordpress/icons — importing it
// would pull a `wp-icons` script handle into the bundle's dependency list.
const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);

/**
 * Reads window.wppbFb.conditionalFields with safe defaults so a missing localization
 * doesn't crash the editor — it just disables the source-field dropdown.
 */
function getConfig() {
    const fb = ( typeof window !== 'undefined' && window.wppbFb ) || {};
    const cfg = fb.conditionalFields || {};
    return {
        blockToFieldType:   cfg.blockToFieldType   || {},
        notAllowedAsSource: cfg.notAllowedAsSource || [],
        // [] and not a hardcoded copy of the server list — same reason as
        // reservedSubstrings in BaseFieldEdit: an absent bridge degrades to
        // "no numeric operators offered", never to a stale list.
        numericFieldTypes:  cfg.numericFieldTypes  || [],
        restRoot:           cfg.restRoot           || '',
        restNonce:          cfg.restNonce          || '',
    };
}

/**
 * Walks the live editor block tree (recursive — repeater children included) and
 * returns a `Map(id → { title, fieldType, attributes })` of every block that has
 * been allocated an id. Used both to overlay fresh edits onto the global snapshot
 * and to compute the in-form flag for each candidate.
 */
function collectCanvasMap( blocks, config, out = new Map() ) {
    for ( const block of blocks ) {
        const fieldType = config.blockToFieldType[ block.name ];
        const id = block.attributes?.id;
        if ( fieldType && id ) {
            out.set( id, {
                title: block.attributes[ 'field-title' ] || `(field #${ id })`,
                fieldType,
                attributes: block.attributes,
            } );
        }
        if ( block.innerBlocks && block.innerBlocks.length ) {
            collectCanvasMap( block.innerBlocks, config, out );
        }
    }
    return out;
}

/**
 * Merge global field snapshot with live canvas into CL rule sources.
 * Canvas wins on overlap; each entry has `inForm` for the off-form warning.
 */
function mergeSourceFields( snapshotEntries, canvasMap, config, currentId ) {
    const seen = new Set();
    const out  = [];

    const accept = ( id, fieldType ) => (
        id &&
        id !== currentId &&
        fieldType &&
        ! config.notAllowedAsSource.includes( fieldType )
    );

    canvasMap.forEach( ( info, id ) => {
        if ( ! accept( id, info.fieldType ) ) return;
        seen.add( id );
        out.push( {
            id,
            title: info.title,
            fieldType: info.fieldType,
            attributes: info.attributes,
            inForm: true,
        } );
    } );

    for ( const entry of snapshotEntries ) {
        const id = entry.id;
        if ( seen.has( id ) ) continue;
        if ( ! accept( id, entry.fieldType ) ) continue;
        out.push( {
            id,
            title: entry.title || `(field #${ id })`,
            fieldType: entry.fieldType,
            attributes: entry.attributes || {},
            inForm: false,
        } );
    }

    return out;
}

/**
 * Parses the rules JSON stored on the block, normalising the legacy shape (rules can
 * be either an object or array on disk) into a plain array.
 */
function parseLogic( raw ) {
    if ( ! raw ) {
        return { action_type: 'show', logic_type: 'all', rules: [] };
    }
    let parsed;
    try {
        parsed = JSON.parse( raw );
    } catch ( e ) {
        return { action_type: 'show', logic_type: 'all', rules: [] };
    }
    let rules = parsed.rules;
    if ( rules && ! Array.isArray( rules ) ) {
        rules = Object.keys( rules ).map( ( k ) => rules[ k ] );
    }
    return {
        action_type: parsed.action_type === 'hide' ? 'hide' : 'show',
        logic_type:  parsed.logic_type === 'any' ? 'any' : 'all',
        rules:       Array.isArray( rules ) ? rules : [],
    };
}

/**
 * Value control for a rule: Select or TextControl from the source field's options.
 * CPT/Taxonomy/User Role/Country/Currency load options from REST (ISO codes need labels).
 */
function RuleValueControl( { sourceField, value, onChange } ) {
    const config = getConfig();
    const [ remoteOptions, setRemoteOptions ] = useState( null );
    const [ loading, setLoading ] = useState( false );

    const enriched = sourceField && [
        'Select (CPT)',
        'Select (Taxonomy)',
        'Select (User Role)',
        'Select (Country)',
        'Select (Currency)',
    ].includes( sourceField.fieldType );

    const enrichmentKey = enriched
        ? sourceField.fieldType + '|' + (
              sourceField.attributes?.cpt
              || sourceField.attributes?.taxonomy
              || sourceField.attributes?.[ 'user-roles' ]
              || ''
          )
        : null;

    useEffect( () => {
        if ( ! enriched || ! enrichmentKey || ! config.restRoot ) {
            setRemoteOptions( null );
            return undefined;
        }
        // Cancellation guard for a fast source-field switch: a new fetch fires
        // while the previous is in flight, and an older response can resolve
        // last, overwriting `remoteOptions`/`loading` with stale data for the
        // wrong source field. Ignore any response whose effect run was
        // superseded / unmounted.
        let cancelled = false;
        setLoading( true );
        const params = new URLSearchParams( { field_type: sourceField.fieldType } );
        if ( sourceField.attributes?.cpt )         params.set( 'cpt', sourceField.attributes.cpt );
        if ( sourceField.attributes?.taxonomy )    params.set( 'taxonomy', sourceField.attributes.taxonomy );
        if ( sourceField.attributes?.[ 'user-roles' ] ) params.set( 'user_roles', sourceField.attributes[ 'user-roles' ] );

        fetch( config.restRoot + '?' + params.toString(), {
            credentials: 'same-origin',
            headers: { 'X-WP-Nonce': config.restNonce },
        } )
            .then( ( r ) => r.json() )
            .then( ( data ) => { if ( ! cancelled ) setRemoteOptions( data && data.values ? data : { values: [], labels: [] } ); } )
            .catch( () => { if ( ! cancelled ) setRemoteOptions( { values: [], labels: [] } ); } )
            .finally( () => { if ( ! cancelled ) setLoading( false ); } );

        return () => { cancelled = true; };
    }, [ enrichmentKey ] );

    if ( ! sourceField ) {
        return (
            <TextControl
                label={ __( 'Value', 'profile-builder' ) }
                value={ value }
                onChange={ onChange }
            />
        );
    }

    // Static options coming from the block's `options` attribute (Select/Radio/Checkbox).
    let staticValues = [];
    let staticLabels = [];
    const optsRaw = sourceField.attributes?.options;
    if ( typeof optsRaw === 'string' && optsRaw.trim() !== '' ) {
        staticValues = optsRaw.split( ',' ).map( ( v ) => v.trim() );
        const labelsRaw = sourceField.attributes?.labels;
        staticLabels = ( typeof labelsRaw === 'string' && labelsRaw.trim() !== '' )
            ? labelsRaw.split( ',' ).map( ( v ) => v.trim() )
            : staticValues;
    }

    const remoteValues = remoteOptions?.values || [];
    const remoteLabels = remoteOptions?.labels || [];

    if ( enriched ) {
        if ( loading ) {
            return <TextControl label={ __( 'Value', 'profile-builder' ) } value={ value } disabled />;
        }
        if ( remoteValues.length === 0 ) {
            return (
                <TextControl
                    label={ __( 'Value', 'profile-builder' ) }
                    value={ value }
                    onChange={ onChange }
                    help={ __( 'No options resolved from server. Type the value/ID directly.', 'profile-builder' ) }
                />
            );
        }
        const options = [
            { label: __( 'Choose…', 'profile-builder' ), value: '' },
            ...remoteValues.map( ( v, i ) => ( { value: v, label: remoteLabels[ i ] || v } ) ),
        ];
        return (
            <SelectControl
                label={ __( 'Value', 'profile-builder' ) }
                value={ value }
                options={ options }
                onChange={ onChange }
            />
        );
    }

    if ( staticValues.length > 0 ) {
        const options = [
            { label: __( 'Choose…', 'profile-builder' ), value: '' },
            ...staticValues.map( ( v, i ) => ( { value: v, label: staticLabels[ i ] || v } ) ),
        ];
        return (
            <SelectControl
                label={ __( 'Value', 'profile-builder' ) }
                value={ value }
                options={ options }
                onChange={ onChange }
            />
        );
    }

    return (
        <TextControl
            label={ __( 'Value', 'profile-builder' ) }
            value={ value }
            onChange={ onChange }
        />
    );
}

export default function ConditionalLogicPanel( { attributes, setAttributes } ) {
    const config = getConfig();
    const enabled = attributes[ 'conditional-logic-enabled' ] === 'yes';
    const logic = useMemo( () => parseLogic( attributes[ 'conditional-logic' ] ), [ attributes[ 'conditional-logic' ] ] );

    // Live canvas: in-form set + title overlay on the global snapshot.
    const canvasMap = useSelect( ( select ) => {
        const blocks = select( 'core/block-editor' ).getBlocks();
        return collectCanvasMap( blocks, config );
    }, [] );

    // Global live snapshot (not window.wppbFb — that stays frozen at page load).
    // Top-level rows only; sub-fields are not enforceable as CL sources.
    const snapshotEntries = useExistingFieldsSnapshot();
    const sourceFields = useMemo(
        () => mergeSourceFields( snapshotEntries, canvasMap, config, attributes.id ),
        [ snapshotEntries, canvasMap, attributes.id ]
    );

    const sourcesById = useMemo( () => {
        const m = {};
        sourceFields.forEach( ( f ) => { m[ f.id ] = f; } );
        return m;
    }, [ sourceFields ] );

    // Split + sort sources once for every rule's dropdown.
    const groupedSources = useMemo( () => {
        const byTitle = ( a, b ) => a.title.localeCompare( b.title );
        return {
            inForm:  sourceFields.filter( ( f ) =>   f.inForm ).sort( byTitle ),
            offForm: sourceFields.filter( ( f ) => ! f.inForm ).sort( byTitle ),
        };
    }, [ sourceFields ] );

    function commit( next ) {
        setAttributes( { 'conditional-logic': JSON.stringify( next ) } );
    }

    function setActionType( v ) { commit( { ...logic, action_type: v } ); }
    function setLogicType( v )  { commit( { ...logic, logic_type: v } ); }

    // No synthetic blank row — empty `rules: []` is valid; "Add rule" is the empty state.
    const rules = logic.rules;

    function updateRule( index, patch ) {
        commit( { ...logic, rules: rules.map( ( r, i ) => i === index ? { ...r, ...patch } : r ) } );
    }
    function addRule() {
        commit( { ...logic, rules: [ ...rules, blankRule() ] } );
    }
    function removeRule( index ) {
        commit( { ...logic, rules: rules.filter( ( _, i ) => i !== index ) } );
    }

    function toggleEnabled( on ) {
        if ( on ) {
            setAttributes( {
                'conditional-logic-enabled': 'yes',
                // Seed the envelope only — no starter rule. A source-less rule is
                // dropped by the write-path sanitizer anyway, so seeding one would
                // just make the editor and storage disagree; `rulesToRender`
                // supplies the blank row the user fills in.
                'conditional-logic': attributes[ 'conditional-logic' ] || JSON.stringify( {
                    action_type: 'show',
                    logic_type:  'all',
                    rules:       [],
                } ),
            } );
        } else {
            setAttributes( { 'conditional-logic-enabled': '' } );
        }
    }

    return (
        <PanelBody title={ __( 'Conditional Logic', 'profile-builder' ) } initialOpen={ false }>
            <ToggleControl
                label={ __( 'Enable conditional logic', 'profile-builder' ) }
                checked={ enabled }
                onChange={ toggleEnabled }
            />

            { enabled && (
                <>
                    { ! attributes.id && (
                        <Notice status="warning" isDismissible={ false }>
                            { __( 'Save the form once so this field gets an ID before referencing it from other rules.', 'profile-builder' ) }
                        </Notice>
                    ) }

                    <Flex>
                        <FlexItem>
                            <SelectControl
                                label={ __( 'Action', 'profile-builder' ) }
                                value={ logic.action_type }
                                options={ [
                                    { label: __( 'Show', 'profile-builder' ), value: 'show' },
                                    { label: __( 'Hide', 'profile-builder' ), value: 'hide' },
                                ] }
                                onChange={ setActionType }
                            />
                        </FlexItem>
                        <FlexItem>
                            <SelectControl
                                label={ __( 'Match', 'profile-builder' ) }
                                value={ logic.logic_type }
                                options={ [
                                    { label: __( 'All rules', 'profile-builder' ), value: 'all' },
                                    { label: __( 'Any rule', 'profile-builder' ),  value: 'any' },
                                ] }
                                onChange={ setLogicType }
                            />
                        </FlexItem>
                    </Flex>

                    { sourceFields.length === 0 && (
                        <Notice status="info" isDismissible={ false }>
                            { __( 'No fields available as rule sources yet. Add a field to this form or to the global field list first.', 'profile-builder' ) }
                        </Notice>
                    ) }

                    { rules.length === 0 && sourceFields.length > 0 && (
                        <p style={ { margin: '8px 0 0', color: '#757575' } }>
                            { __( 'No rules yet. Add a rule to control when this field is shown.', 'profile-builder' ) }
                        </p>
                    ) }

                    { rules.map( ( rule, index ) => {
                        const sourceField = sourcesById[ Number( rule.field ) ];
                        const isNumericSource = sourceField && config.numericFieldTypes.includes( sourceField.fieldType );
                        const ruleFieldId = rule.field ? Number( rule.field ) : 0;
                        // A rule references an off-form field when the picked
                        // source isn't on the current canvas. Covers both:
                        // (a) source picked from the global list that was never
                        // added to this form; (b) source previously added and
                        // since removed (the rule survives in attributes).
                        const refsOffFormField = !! ruleFieldId && (
                            ! sourceField || ! sourceField.inForm
                        );

                        // In-form vs off-form groups; disabled options are section headings.
                        const formatLabel = ( f ) => `${ f.title } [${ f.fieldType }]`;
                        const inFormSources  = groupedSources.inForm;
                        const offFormSources = groupedSources.offForm;

                        const fieldOptions = [
                            { label: __( 'Choose…', 'profile-builder' ), value: '' },
                        ];

                        if ( inFormSources.length ) {
                            // Only label the in-form group when there's an
                            // off-form group to contrast against — otherwise
                            // the heading is noise.
                            if ( offFormSources.length ) {
                                fieldOptions.push( {
                                    value:    '__hdr_in_form__',
                                    label:    '── ' + __( 'In this form', 'profile-builder' ) + ' ──',
                                    disabled: true,
                                } );
                            }
                            inFormSources.forEach( ( f ) => fieldOptions.push( {
                                value: String( f.id ),
                                label: formatLabel( f ),
                            } ) );
                        }

                        if ( offFormSources.length ) {
                            // Always label the off-form group so the user
                            // sees the boundary even if no in-form fields
                            // exist yet (e.g. empty form, references picked
                            // from the global list).
                            fieldOptions.push( {
                                value:    '__hdr_off_form__',
                                label:    '── ' + __( 'Not in this form', 'profile-builder' ) + ' ──',
                                disabled: true,
                            } );
                            offFormSources.forEach( ( f ) => fieldOptions.push( {
                                value: String( f.id ),
                                label: formatLabel( f ),
                            } ) );
                        }

                        // Reference to a field that no longer exists anywhere
                        // (deleted from the global list) — surface it in the
                        // dropdown under its own heading so the user can see
                        // what the rule pointed at and pick something else.
                        if ( ruleFieldId && ! sourceField ) {
                            fieldOptions.push( {
                                value:    '__hdr_missing__',
                                label:    '── ' + __( 'Missing field', 'profile-builder' ) + ' ──',
                                disabled: true,
                            } );
                            fieldOptions.push( {
                                value: String( ruleFieldId ),
                                label: `(${ __( 'missing field', 'profile-builder' ) } #${ ruleFieldId })`,
                            } );
                        }

                        const operatorLabels = OPERATOR_LABELS();
                        const operatorOptions = OPERATORS.map( ( op ) => ( {
                            label: operatorLabels[ op ] || op,
                            value: op,
                            disabled: NUMERIC_OPERATORS.includes( op ) && sourceField && ! isNumericSource,
                        } ) );

                        return (
                            <div
                                key={ index }
                                style={ {
                                    border: '1px solid #ddd',
                                    padding: '8px',
                                    marginTop: '8px',
                                    borderRadius: '3px',
                                } }
                            >
                                <SelectControl
                                    label={ __( 'Field', 'profile-builder' ) }
                                    value={ rule.field ? String( rule.field ) : '' }
                                    options={ fieldOptions }
                                    // Store `field` as a STRING to match the legacy canonical
                                    // shape ("291", not 291). Classic-authored rules write strings
                                    // (<select>.val()); the front-end readers compare loosely (==)
                                    // today, but storing a number is a latent robustness bug — any
                                    // future tightening to === / in_array(...,true) would silently
                                    // drop editor-authored rules.
                                    onChange={ ( val ) => updateRule( index, { field: val ? String( Number( val ) ) : '', value: '' } ) }
                                />
                                { refsOffFormField && (
                                    <Notice status="warning" isDismissible={ false }>
                                        { sourceField
                                            ? __( 'This rule references a field that is not in this form, so the rule will never trigger for the form.', 'profile-builder' )
                                            : __( 'This rule references a field that no longer exists. Pick a different field or remove the rule.', 'profile-builder' )
                                        }
                                    </Notice>
                                ) }
                                <SelectControl
                                    label={ __( 'Operator', 'profile-builder' ) }
                                    value={ rule.operator || 'is' }
                                    options={ operatorOptions }
                                    onChange={ ( val ) => updateRule( index, { operator: val } ) }
                                />
                                <RuleValueControl
                                    sourceField={ sourceField }
                                    value={ rule.value || '' }
                                    onChange={ ( val ) => updateRule( index, { value: val } ) }
                                />
                                <Flex justify="flex-end" style={ { marginTop: '8px' } }>
                                    <Button
                                        variant="tertiary"
                                        size="small"
                                        isDestructive
                                        onClick={ () => removeRule( index ) }
                                    >
                                        { __( 'Remove', 'profile-builder' ) }
                                    </Button>
                                </Flex>
                            </div>
                        );
                    } ) }

                    <Button
                        variant="secondary"
                        icon={ <PlusIcon /> }
                        onClick={ addRule }
                        style={ { marginTop: '12px' } }
                    >
                        { __( 'Add rule', 'profile-builder' ) }
                    </Button>
                </>
            ) }
        </PanelBody>
    );
}
