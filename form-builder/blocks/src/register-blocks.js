/**
 * Register every ./blocks/* folder via require.context.
 * Imported as a module so filters in index.js install before first registerBlockType.
 * BLOCK_ORDER sets the curated "New Fields" inserter order.
 */
import { registerBlockType } from '@wordpress/blocks';
import nullSave from './lib/null-save';

const blockMeta = require.context( './blocks', true, /\/block\.json$/ );
const blockEdit = require.context( './blocks', true, /\/edit\.js$/ );
const blockSave = require.context( './blocks', true, /\/save\.js$/ );

const BLOCK_ORDER = [
	'field-input', 'field-textarea', 'field-select', 'field-select-multiple', 'field-select2',
	'field-select2-multiple', 'field-select-country', 'field-select-timezone', 'field-select-currency', 'field-select-cpt',
	'field-select-taxonomy', 'field-checkbox', 'field-checkbox-toa', 'field-radio', 'field-number',
	'field-phone', 'field-upload', 'field-avatar', 'field-colorpicker', 'field-datepicker',
	'field-timepicker', 'field-wysiwyg', 'field-html', 'field-input-hidden', 'field-language',
	'field-input-url', 'field-validation', 'field-gdpr-checkbox', 'field-gdpr-delete', 'field-gdpr-communication-preferences',
	'field-mailchimp-subscribe', 'field-mailpoet-subscribe', 'field-campaign-monitor-subscribe', 'field-woo-billing-address', 'field-woo-shipping-address',
	'field-pms-subscription-plans', 'field-pms-billing-fields',
	'field-international-telephone-input', 'field-map', 'field-additional-map', 'field-email', 'field-honeypot',
	'field-default-aim', 'field-default-yim', 'field-default-jabber', 'field-default-blog-details', 'field-recaptcha',
	'field-turnstile', 'field-heading', 'field-repeater', 'field-default-username', 'field-default-email',
	'field-default-password', 'field-default-first-name', 'field-default-last-name', 'field-default-nickname', 'field-default-biographical-info',
	'field-default-display-name', 'field-default-website', 'field-default-name-heading', 'field-default-contact-info-heading', 'field-default-about-yourself-heading',
	'field-default-repeat-password', 'field-email-confirmation', 'field-select-user-role', 'msf-step-break', 'ffc-columns',
	'progress-bar',
];

const dirOf = ( key ) => key.replace( /^\.\//, '' ).split( '/' )[ 0 ];
const def = ( mod ) => ( mod && mod.default !== undefined ? mod.default : mod );

const orderOf = ( dir ) => {
	const i = BLOCK_ORDER.indexOf( dir );
	return i === -1 ? BLOCK_ORDER.length : i;
};

const saveKeys = blockSave.keys();

blockMeta
	.keys()
	.sort( ( a, b ) => orderOf( dirOf( a ) ) - orderOf( dirOf( b ) ) )
	.forEach( ( metaKey ) => {
		const dir = dirOf( metaKey );
		const metadata = def( blockMeta( metaKey ) );
		const edit = def( blockEdit( `./${ dir }/edit.js` ) );
		const saveKey = `./${ dir }/save.js`;
		const save = saveKeys.includes( saveKey ) ? def( blockSave( saveKey ) ) : nullSave;

		registerBlockType( metadata.name, { ...metadata, edit, save } );
	} );
