/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps } from "@wordpress/block-editor";
import { RawHTML } from "@wordpress/element";

/**
 * The save function defines the way in which the different attributes should
 * be combined into the final markup, which is then serialized by the block
 * editor into `post_content`.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#save
 *
 * @return {WPElement} Element to render.
 */
const Save = ({ attributes }) => {
    const { wppbContentRestriction } = attributes;

    let shortcode = "";
    switch (wppbContentRestriction.display_to) {
        case "all":
            break;
        case "":
            shortcode = "[wppb-restrict";
            if (
                wppbContentRestriction.user_roles &&
                wppbContentRestriction.user_roles.length !== 0
            ) {
                shortcode += ' user_roles="';
                wppbContentRestriction.user_roles.map((slug) => {
                    shortcode += slug + ", ";
                });
                shortcode = shortcode.slice(0, -2);
                shortcode += '"';
            }
            if (
                wppbContentRestriction.users_ids &&
                wppbContentRestriction.users_ids.length !== 0
            ) {
                shortcode += ' users_id="';
                shortcode += wppbContentRestriction.users_ids;
                shortcode += '"';
            }
            if (
                wppbContentRestriction.enable_message_logged_in &&
                wppbContentRestriction.message_logged_in.length !== 0
            ) {
                shortcode += ' message="';
                shortcode += wppbContentRestriction.message_logged_in;
                shortcode += '"';
            }
            shortcode += "]";
            break;
        case "not_logged_in":
            shortcode = '[wppb-restrict display_to="not_logged_in"';
            if (
                wppbContentRestriction.enable_message_logged_out &&
                wppbContentRestriction.message_logged_out.length !== 0
            ) {
                shortcode += ' message="';
                shortcode += wppbContentRestriction.message_logged_out;
                shortcode += '"';
            }
            shortcode += "]";
            break;
        default:
            break;
    }
    return <RawHTML {...useBlockProps.save()}>{shortcode}</RawHTML>;
};

export default Save;
