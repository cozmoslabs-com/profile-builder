import BaseFieldEdit from '../../components/BaseFieldEdit';

export default function Edit( props ) {
    const { attributes } = props;

    return (
        <BaseFieldEdit { ...props } hideLabel>
            <div className="wppb-fb-toa-preview">
                <label>
                    <input type="checkbox" disabled />
                    <span style={ { marginLeft: '5px' } }>
                        { attributes[ 'field-title' ] }
                        { attributes.required === 'Yes' && (
                            <span className="wppb-fb-field-required">*</span>
                        ) }
                    </span>
                </label>
            </div>
        </BaseFieldEdit>
    );
}
