<?php
/**
 * Registry of decentralized Gutenberg blocks for the Form Builder.
 *
 * Reads block.json files from the blocks directory to build the registry.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class WPPB_FB_Field_Registry {
    private static $blocks = null;

    // Reverse index (block name → field type), built lazily so `by_block_name()`
    // is O(1) — the flatten loop calls it once per PB block on canvas.
    private static $by_block_name = null;

    // Per-request parse cache, keyed by absolute path. Both `all()` and
    // `wppb_fb_register_blocks()` scan the same directory, so routing both through
    // here decodes each block.json at most once per request.
    private static $json_cache = array();

    /**
     * Read/decode block.json once per request. Callers get a copy.
     *
     * @param string $path Absolute path to a block.json.
     * @return array|null
     */
    public static function read_block_json( $path ) {
        if ( array_key_exists( $path, self::$json_cache ) ) {
            return self::$json_cache[ $path ];
        }
        $data = null;
        if ( is_readable( $path ) ) {
            $decoded = json_decode( file_get_contents( $path ), true );
            if ( is_array( $decoded ) ) {
                $data = $decoded;
            }
        }
        self::$json_cache[ $path ] = $data;
        return $data;
    }

    public static function all() {
        if ( self::$blocks !== null ) return self::$blocks;

        self::$blocks = array();
        $blocks_dir = __DIR__ . '/blocks/src/blocks';
        if ( ! is_dir( $blocks_dir ) ) return array();

        $cf_disabled        = wppb_fb_cf_disabled_field_types();
        $no_meta_name_types = wppb_fb_no_meta_name_field_types();
        $default_meta_map   = wppb_fb_default_field_meta_names();

        $it = new DirectoryIterator( $blocks_dir );
        foreach ( $it as $fileinfo ) {
            if ( $fileinfo->isDir() && ! $fileinfo->isDot() ) {
                $json_file = $fileinfo->getPathname() . '/block.json';
                $json = self::read_block_json( $json_file );
                if ( $json && isset( $json['name'] ) ) {
                    // The field registry is strictly for `profile-builder/field-*`
                    // blocks. Structural blocks (e.g. profile-builder/msf-step-break)
                    // share the directory tree for bundling convenience but must
                    // not appear here — they don't round-trip through manage_fields.
                    if ( strpos( $json['name'], 'profile-builder/field-' ) !== 0 ) continue;

                    // block.json's `wppbFieldType` is the canonical field-type
                    // label; see get_field_type_from_block_name().
                    $field_type = self::get_field_type_from_block_name( $json['name'], $json );
                    $attributes = isset( $json['attributes'] ) ? $json['attributes'] : array();

                    // Any cross-cutting attribute MUST be injected through this
                    // shared helper, or this shadow (which the flatten projection
                    // reads) and the runtime registration silently drift.
                    $attributes = wppb_fb_compute_field_attributes(
                        $attributes,
                        $field_type,
                        $json['name'],
                        array(
                            'cf_disabled'        => $cf_disabled,
                            'default_meta_map'   => $default_meta_map,
                            'no_meta_name_types' => $no_meta_name_types,
                            'context_label'      => 'registry',
                        )
                    );

                    self::$blocks[ $field_type ] = array(
                        'block'      => $json['name'],
                        'title'      => isset( $json['title'] ) ? $json['title'] : $field_type,
                        'icon'       => isset( $json['icon'] ) ? $json['icon'] : 'admin-generic',
                        'attributes' => $attributes,
                        // Add-on-provided type: stays in the registry so existing
                        // instances render, but the inserter gates it. See
                        // wppb_fb_inactive_addon_field_blocks().
                        'addon_gated' => ! empty( $json['wppbAddonFieldType'] ),
                    );
                }
            }
        }

        return self::$blocks;
    }

    /**
     * PB field-type label from block name. Prefer `$metadata['wppbFieldType']` when present.
     *
     * @param string     $block_name e.g. "profile-builder/field-input"
     * @param array|null $metadata   Optional parsed block.json.
     * @return string
     */
    public static function get_field_type_from_block_name( $block_name, $metadata = null ) {
        if ( is_array( $metadata ) && ! empty( $metadata['wppbFieldType'] ) ) {
            return (string) $metadata['wppbFieldType'];
        }
        // Slug fallback, title-casing EVERY word so `field-foo-bar` becomes
        // `Foo Bar`. Surfaced under WP_DEBUG so silent drift gets caught.
        $slug = str_replace( 'profile-builder/field-', '', $block_name );
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG && function_exists( '_doing_it_wrong' ) ) {
            _doing_it_wrong(
                __METHOD__,
                sprintf(
                    'Falling back to slug derivation for block name %s — pass the parsed block.json as $metadata so wppbFieldType is honored.',
                    esc_html( $block_name )
                ),
                '3.16.0'
            );
        }
        return ucwords( str_replace( '-', ' ', $slug ) );
    }

    public static function by_block_name( $block_name ) {
        if ( self::$by_block_name === null ) {
            $blocks = self::all();
            self::$by_block_name = array();
            foreach ( $blocks as $type => $data ) {
                if ( isset( $data['block'] ) ) {
                    self::$by_block_name[ $data['block'] ] = $type;
                }
            }
        }
        if ( ! isset( self::$by_block_name[ $block_name ] ) ) {
            return null;
        }
        $type = self::$by_block_name[ $block_name ];
        return array_merge( self::$blocks[ $type ], array( 'field_type' => $type ) );
    }
}
