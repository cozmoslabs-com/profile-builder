import { __ } from '@wordpress/i18n';
import BaseFieldEdit from '../../components/BaseFieldEdit';
import { Button } from '@wordpress/components';

export default function Edit( props ) {
    return (
        <BaseFieldEdit { ...props }>
            <div>
                <Button isDestructive isSecondary disabled>
                    { __( 'Delete', 'profile-builder' ) }
                </Button>
            </div>
        </BaseFieldEdit>
    );
}
