import { __ } from '@wordpress/i18n';
import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes } = props;

    return (
        <BaseFieldEdit { ...props }>
            <div className="wppb-fb-gdpr-preview">
                <label>
                    <input type="checkbox" disabled />
                    <span style={ { marginLeft: '5px' } }>
                        { attributes.description || __( '(GDPR agreement text will appear here from the Description field)', 'profile-builder' ) }
                    </span>
                </label>
            </div>
        </BaseFieldEdit>
    );
}
