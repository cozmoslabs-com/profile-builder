import { __ } from '@wordpress/i18n';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    return (
        <BaseFieldEdit { ...props }>
            <div style={ { display: 'flex', alignItems: 'center' } }>
                <div
                    style={ {
                        width: '30px',
                        height: '30px',
                        backgroundColor: '#fff',
                        border: '1px solid #ccc',
                        marginRight: '10px',
                    } }
                />
                <input
                    type="text"
                    disabled
                    placeholder={ __( 'Select color...', 'profile-builder' ) }
                    style={ { flex: 1 } }
                />
            </div>
        </BaseFieldEdit>
    );
}
