/**
 * Custom field icons + inserter hover previews via registerBlockType filter.
 * Preview short-circuits edit before BaseFieldEdit (no ID allocation REST).
 * Must load before blocks register.
 */
import { addFilter } from '@wordpress/hooks';
import { useBlockProps } from '@wordpress/block-editor';
import { FIELD_ICONS } from './icons';
import { FIELD_PREVIEWS } from './previews';

// Example-only marker; never serialized on real blocks.
const PREVIEW_ATTR = '__wppbPreview';

const FieldPreview = ( { name } ) => {
    // Inline geometry: inserter iframe styles load late and would reflow.
    const blockProps = useBlockProps( {
        className: 'wppb-fb-field-art-preview',
        style: { width: '224px', maxWidth: 'none', margin: '6px auto', padding: 0, color: '#1e1e1e' },
    } );
    return <div { ...blockProps }>{ FIELD_PREVIEWS[ name ] || null }</div>;
};

addFilter(
    'blocks.registerBlockType',
    'profile-builder/field-art',
    ( settings, name ) => {
        if ( typeof name !== 'string' || ! name.startsWith( 'profile-builder/' ) ) {
            return settings;
        }

        let next = settings;

        if ( FIELD_ICONS[ name ] ) {
            next = { ...next, icon: FIELD_ICONS[ name ] };
        }

        if ( FIELD_PREVIEWS[ name ] ) {
            const OriginalEdit = next.edit;
            next = {
                ...next,
                attributes: {
                    ...( next.attributes || {} ),
                    [ PREVIEW_ATTR ]: { type: 'boolean', default: false },
                },
                example: {
                    attributes: { [ PREVIEW_ATTR ]: true },
                    viewportWidth: 248,
                },
                edit: ( props ) =>
                    props?.attributes?.[ PREVIEW_ATTR ]
                        ? <FieldPreview name={ name } />
                        : <OriginalEdit { ...props } />,
            };
        }

        return next;
    }
);
