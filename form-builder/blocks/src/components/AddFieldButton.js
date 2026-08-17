/**
 * Dashed "Add field" appender for container blocks (Columns, Repeater).
 * Opens the full mini inserter scoped to that container.
 */
import { Inserter } from '@wordpress/block-editor';
import { Button } from '@wordpress/components';
import { useState } from '@wordpress/element';

import { resolveMiniInserterPositionFor } from '../lib/miniInserterPlacement';
import { setMiniInserterTarget, clearMiniInserterTarget } from '../lib/miniInserterTarget';

const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);

/**
 * @param {Object} props
 * @param {string} [props.rootClientId] Container to insert into (undefined = root list).
 * @param {string} props.label          Translatable button label.
 */
export default function AddFieldButton( { rootClientId, label } ) {
    const [ position, setPosition ] = useState( 'bottom center' );

    return (
        <Inserter
            rootClientId={ rootClientId }
            isAppender
            // Full menu (not quick) so Existing Fields tab is available.
            position={ position }
            onToggle={ ( isOpen ) =>
                isOpen ? setMiniInserterTarget( { rootClientId } ) : clearMiniInserterTarget()
            }
            renderToggle={ ( { onToggle, disabled } ) => (
                <Button
                    className="wppb-fb-add-button"
                    onClick={ ( event ) => {
                        setPosition( resolveMiniInserterPositionFor( event.currentTarget ) );
                        onToggle();
                    } }
                    disabled={ disabled }
                    aria-haspopup="true"
                    aria-label={ label }
                >
                    <PlusIcon />
                    <span>{ label }</span>
                </Button>
            ) }
        />
    );
}
