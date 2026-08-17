import { InnerBlocks } from '@wordpress/block-editor';

// post_content is always blanked, so save() need not emit real markup. But
// because this block uses InnerBlocks, returning null would cause Gutenberg to
// drop the inner block tree on serialize. Emit the children via
// InnerBlocks.Content so the parse_blocks → flatten loop sees the structure.
export default function save() {
    return <InnerBlocks.Content />;
}
