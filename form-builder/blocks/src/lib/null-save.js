/**
 * Shared null save() for PB field blocks.
 *
 * `post_content` is blanked on save and the block tree is rebuilt from legacy
 * meta on REST read, so dynamic blocks never emit anything from save(). Field
 * and structural blocks import this rather than shipping an identical 3-line
 * save.js. Container blocks needing `<InnerBlocks.Content />` (Repeater, FFC)
 * keep their own save.js.
 */
export default function save() {
    return null;
}
