/**
 * Hover-preview SVG mockups (block name → JSX). Inline fill/stroke — see icons.js.
 */

// Fixed pixel size so the preview iframe stylesheet cannot reflow the SVG.
const ROOT = {
    viewBox: '0 0 240 110',
    xmlns: 'http://www.w3.org/2000/svg',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: { fill: 'none', stroke: 'currentColor', display: 'block', width: '224px', height: '103px', maxWidth: 'none' },
};

const FILL = { fill: 'currentColor', stroke: 'none' };
const LABEL = { fontFamily: 'sans-serif', fontSize: 15, fontWeight: 600, style: FILL };
const PLACE = { fontFamily: 'sans-serif', fontSize: 13, opacity: 0.5, style: FILL };
const VALUE = { fontFamily: 'sans-serif', fontSize: 13, opacity: 0.8, style: FILL };
const SMALL = { fontFamily: 'sans-serif', fontSize: 11, opacity: 0.65, style: FILL };

// --- shared primitives -----------------------------------------------------

const lab = ( t ) => <text x="16" y="27" { ...LABEL }>{ t }</text>;
const frame = ( y, h ) => <rect x="16" y={ y } width="208" height={ h } rx="7" strokeWidth="1.6" />;
const chevron = <path d="M198 59 205 66 212 59" strokeWidth="1.8" />;

// --- left-of-input glyphs (≈ x28–46, vertical centre y62) ------------------

const gEnvelope = (
    <g strokeWidth="1.4">
        <rect x="28" y="56" width="17" height="12" rx="2" />
        <path d="M28.6 57 36.5 63 44.4 57" />
    </g>
);
const gLock = (
    <g strokeWidth="1.4">
        <rect x="30" y="60" width="13" height="9" rx="1.6" />
        <path d="M32.6 60V58a3.9 3.9 0 0 1 7.8 0v2" />
    </g>
);
const gGlobe = (
    <g strokeWidth="1.4">
        <circle cx="37" cy="62" r="7" />
        <path d="M30 62h14" />
        <path d="M37 55c2.4 2 2.4 12 0 14" />
        <path d="M37 55c-2.4 2-2.4 12 0 14" />
    </g>
);
const gPhone = (
    <path strokeWidth="1.4" d="M31 55h2.1l1 3-1.3 1a7 7 0 0 0 3.2 3.2l1-1.3 3 1v2.1a1.3 1.3 0 0 1-1.3 1.3A9.5 9.5 0 0 1 29.7 56.3 1.3 1.3 0 0 1 31 55z" />
);
const gAt = (
    <g strokeWidth="1.4">
        <circle cx="37" cy="62" r="2.9" />
        <path d="M39.9 62c0 1.5 0 3 1.7 3 1.4 0 2.1-1.5 2.1-3.4 0-3.6-2.8-5.6-6-5.6a6.4 6.4 0 1 0 3.7 11.7" />
    </g>
);
const gLink = (
    <g strokeWidth="1.4">
        <path d="M34 65 41 58" />
        <path d="M35 56.6 36.5 55a3 3 0 0 1 4.2 4.2L39 61" />
        <path d="M40 67.4 38.5 69a3 3 0 0 1-4.2-4.2L36 63" />
    </g>
);
const gPerson = (
    <g strokeWidth="1.4">
        <circle cx="37" cy="59.4" r="2.6" />
        <path d="M32.4 69c0-2.5 2-4 4.6-4s4.6 1.5 4.6 4" />
    </g>
);
const gFlag = (
    <g strokeWidth="1.4">
        <path d="M32 55v14" />
        <path d="M32 56h8.2l-1.8 2.3 1.8 2.3H32z" />
    </g>
);
const gMagnifier = (
    <g strokeWidth="1.4">
        <circle cx="36" cy="61" r="4.4" />
        <path d="M39.4 64.4 43 68" />
    </g>
);

// --- right-of-input picker glyphs ------------------------------------------

const gCalendar = (
    <g strokeWidth="1.4">
        <rect x="196" y="55" width="16" height="14" rx="2" />
        <path d="M196 59.5h16" />
        <path d="M200 53v3M208 53v3" />
    </g>
);
const gClock = (
    <g strokeWidth="1.4">
        <circle cx="205" cy="62" r="6.8" />
        <path d="M205 58v4.2l2.6 1.6" />
    </g>
);

// --- control renderers -----------------------------------------------------

const textInput = ( label, placeholder, glyph = null ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        { frame( 42, 40 ) }
        { glyph }
        <text x={ glyph ? 54 : 30 } y="67" { ...PLACE }>{ placeholder }</text>
    </svg>
);

const selectInput = ( label, value, glyph = null ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        { frame( 42, 40 ) }
        { glyph }
        <text x={ glyph ? 54 : 30 } y="67" { ...VALUE }>{ value }</text>
        { chevron }
    </svg>
);

const searchSelect = ( label, value ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        { frame( 42, 40 ) }
        { gMagnifier }
        <text x="54" y="67" { ...VALUE }>{ value }</text>
        { chevron }
    </svg>
);

const multiSelect = ( label, chips ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        { frame( 42, 40 ) }
        { chips.map( ( c, i ) => {
            const x = 28 + i * 76;
            return (
                <g key={ i }>
                    <rect x={ x } y="52" width="70" height="20" rx="10" strokeWidth="1.3" />
                    <text x={ x + 12 } y="66" { ...VALUE }>{ c }</text>
                </g>
            );
        } ) }
        { chevron }
    </svg>
);

const textareaInput = ( label ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        { frame( 40, 58 ) }
        <line x1="30" y1="56" x2="210" y2="56" strokeWidth="1.3" opacity="0.45" />
        <line x1="30" y1="68" x2="210" y2="68" strokeWidth="1.3" opacity="0.45" />
        <line x1="30" y1="80" x2="150" y2="80" strokeWidth="1.3" opacity="0.45" />
    </svg>
);

const wysiwygInput = ( label ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        { frame( 40, 58 ) }
        <line x1="16" y1="56" x2="224" y2="56" strokeWidth="1.3" />
        <line x1="28" y1="48" x2="38" y2="48" strokeWidth="1.6" />
        <line x1="46" y1="48" x2="56" y2="48" strokeWidth="1.6" />
        <line x1="64" y1="48" x2="74" y2="48" strokeWidth="1.6" />
        <line x1="30" y1="70" x2="210" y2="70" strokeWidth="1.3" opacity="0.45" />
        <line x1="30" y1="82" x2="150" y2="82" strokeWidth="1.3" opacity="0.45" />
    </svg>
);

const pickerInput = ( label, placeholder, rightGlyph ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        { frame( 42, 40 ) }
        <text x="30" y="67" { ...PLACE }>{ placeholder }</text>
        { rightGlyph }
    </svg>
);

const colorInput = ( label ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        { frame( 42, 40 ) }
        <rect x="29" y="54" width="16" height="16" rx="3" style={ FILL } opacity="0.85" />
        <text x="56" y="67" { ...VALUE }>#3858E9</text>
    </svg>
);

const checkboxInput = ( label, optionText ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        <rect x="16" y="48" width="18" height="18" rx="4" strokeWidth="1.6" />
        <path d="M20 57.5 23 60.5 30 53.5" strokeWidth="1.6" />
        <text x="44" y="62" { ...VALUE }>{ optionText }</text>
    </svg>
);

const checkboxGroup = ( label, options ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        { options.map( ( o, i ) => {
            const y = 42 + i * 22;
            return (
                <g key={ i }>
                    <rect x="16" y={ y } width="15" height="15" rx="3.5" strokeWidth="1.5" />
                    { o.checked && <path d={ `M19.5 ${ y + 7.5 } 22 ${ y + 10 } 27.5 ${ y + 4 }` } strokeWidth="1.5" /> }
                    <text x="40" y={ y + 12 } { ...VALUE }>{ o.label }</text>
                </g>
            );
        } ) }
    </svg>
);

const radioInput = ( label, options ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        { options.map( ( o, i ) => {
            const cy = 50 + i * 22;
            return (
                <g key={ i }>
                    <circle cx="24" cy={ cy } r="7.5" strokeWidth="1.5" />
                    { o.selected && <circle cx="24" cy={ cy } r="3.4" style={ FILL } /> }
                    <text x="40" y={ cy + 4.5 } { ...VALUE }>{ o.label }</text>
                </g>
            );
        } ) }
    </svg>
);

const headingPreview = ( text ) => (
    <svg { ...ROOT }>
        <text x="16" y="44" fontFamily="sans-serif" fontSize="20" fontWeight="700" style={ FILL }>{ text }</text>
        <line x1="16" y1="56" x2="150" y2="56" strokeWidth="2" />
    </svg>
);

const uploadInput = ( label ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        <rect x="16" y="40" width="208" height="56" rx="7" strokeWidth="1.6" strokeDasharray="5 4" />
        <path d="M120 76V58" strokeWidth="1.6" />
        <path d="M114 64 120 58 126 64" strokeWidth="1.6" />
        <text x="120" y="89" textAnchor="middle" { ...SMALL }>Drop a file or browse</text>
    </svg>
);

const avatarPreview = ( label ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        <circle cx="42" cy="68" r="16" strokeWidth="1.6" />
        <circle cx="42" cy="63" r="5" strokeWidth="1.4" />
        <path d="M33 78c1.4-3.6 16.6-3.6 18 0" strokeWidth="1.4" />
        <rect x="70" y="60" width="86" height="17" rx="8.5" strokeWidth="1.4" />
        <text x="113" y="72" textAnchor="middle" { ...VALUE }>Upload</text>
    </svg>
);

const mapPreview = ( label ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        { frame( 40, 58 ) }
        <path d="M16 64 70 52 130 70 224 54" strokeWidth="1.2" opacity="0.4" />
        <path d="M90 98 86 56" strokeWidth="1.2" opacity="0.4" />
        <path d="M120 70c4-3.8 6.2-6.7 6.2-9.7a6.2 6.2 0 1 0-12.4 0c0 3 2.2 5.9 6.2 9.7z" strokeWidth="1.6" />
        <circle cx="120" cy="60.5" r="2.2" strokeWidth="1.6" />
    </svg>
);

const captchaWidget = ( optionText, badge ) => (
    <svg { ...ROOT }>
        <rect x="36" y="38" width="168" height="46" rx="6" strokeWidth="1.6" />
        <rect x="50" y="53" width="16" height="16" rx="3" strokeWidth="1.5" />
        <text x="76" y="65" { ...VALUE }>{ optionText }</text>
        { badge }
    </svg>
);

const buttonPreview = ( text ) => (
    <svg { ...ROOT }>
        <rect x="16" y="44" width="168" height="36" rx="7" strokeWidth="1.6" />
        <text x="100" y="66" textAnchor="middle" { ...VALUE }>{ text }</text>
    </svg>
);

const hiddenPreview = ( label, note ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        <rect x="16" y="44" width="208" height="38" rx="7" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.55" />
        <g strokeWidth="1.4" opacity="0.7">
            <path d="M34 63s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6z" />
            <circle cx="43" cy="63" r="2.4" />
            <path d="M35 55 51 71" />
        </g>
        <text x="60" y="67" { ...SMALL }>{ note }</text>
    </svg>
);

const repeaterPreview = ( label ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        <rect x="16" y="38" width="208" height="62" rx="7" strokeWidth="1.6" />
        <rect x="28" y="48" width="184" height="16" rx="4" strokeWidth="1.3" />
        <rect x="28" y="68" width="184" height="16" rx="4" strokeWidth="1.3" />
        <path d="M30 92h7M33.5 88.5v7" strokeWidth="1.5" />
        <text x="46" y="95" { ...SMALL }>Add row</text>
    </svg>
);

// PMS "Subscription Plans" — radio rows with a right-aligned price, so the
// preview reads as "pick a paid plan" instead of a generic radio group.
const plansPreview = ( label, plans ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        { plans.map( ( p, i ) => {
            const cy = 48 + i * 22;
            return (
                <g key={ i }>
                    <circle cx="24" cy={ cy } r="7.5" strokeWidth="1.5" />
                    { p.selected && <circle cx="24" cy={ cy } r="3.4" style={ FILL } /> }
                    <text x="40" y={ cy + 4.5 } { ...VALUE }>{ p.label }</text>
                    <text x="224" y={ cy + 4.5 } textAnchor="end" { ...SMALL }>{ p.price }</text>
                </g>
            );
        } ) }
    </svg>
);

// A stack of inputs carrying their name as an in-input placeholder — for a field
// type that renders a GROUP of inputs (PMS billing fields). Deliberately unlike
// addressPreview (labels ABOVE each row) so the two don't read identically.
const stackedInputs = ( label, placeholders ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        { placeholders.map( ( p, i ) => {
            const y = 38 + i * 24;
            return (
                <g key={ i }>
                    <rect x="16" y={ y } width="208" height="20" rx="5" strokeWidth="1.4" />
                    <text x="30" y={ y + 14 } { ...PLACE }>{ p }</text>
                </g>
            );
        } ) }
    </svg>
);

const addressPreview = ( label, rows ) => (
    <svg { ...ROOT }>
        { lab( label ) }
        { rows.map( ( r, i ) => {
            const y = 40 + i * 30;
            return (
                <g key={ i }>
                    <text x="16" y={ y } { ...SMALL }>{ r }</text>
                    <rect x="16" y={ y + 5 } width="208" height="20" rx="5" strokeWidth="1.4" />
                </g>
            );
        } ) }
    </svg>
);

// --- structural ------------------------------------------------------------

const stepBreakPreview = (
    <svg { ...ROOT }>
        <text x="16" y="27" { ...LABEL }>Step Break</text>
        <circle cx="40" cy="64" r="9" strokeWidth="1.6" />
        <text x="40" y="68.5" textAnchor="middle" { ...VALUE }>1</text>
        <line x1="52" y1="64" x2="108" y2="64" strokeWidth="1.6" strokeDasharray="4 4" />
        <circle cx="120" cy="64" r="9" strokeWidth="1.6" style={ { fill: 'currentColor' } } />
        <text x="120" y="68.5" textAnchor="middle" fontFamily="sans-serif" fontSize="13" style={ { fill: '#fff', stroke: 'none' } }>2</text>
        <line x1="132" y1="64" x2="188" y2="64" strokeWidth="1.6" strokeDasharray="4 4" />
        <circle cx="200" cy="64" r="9" strokeWidth="1.6" />
        <text x="200" y="68.5" textAnchor="middle" { ...VALUE }>3</text>
    </svg>
);

const columnsPreview = (
    <svg { ...ROOT }>
        <text x="16" y="27" { ...LABEL }>Columns</text>
        <rect x="16" y="40" width="98" height="58" rx="6" strokeWidth="1.6" />
        <rect x="126" y="40" width="98" height="58" rx="6" strokeWidth="1.6" />
        <line x1="30" y1="58" x2="100" y2="58" strokeWidth="1.3" opacity="0.45" />
        <line x1="30" y1="74" x2="90" y2="74" strokeWidth="1.3" opacity="0.45" />
        <line x1="140" y1="58" x2="210" y2="58" strokeWidth="1.3" opacity="0.45" />
        <line x1="140" y1="74" x2="200" y2="74" strokeWidth="1.3" opacity="0.45" />
    </svg>
);

const progressBarPreview = (
    <svg { ...ROOT }>
        <text x="16" y="27" { ...LABEL }>Progress Bar</text>
        <rect x="16" y="48" width="208" height="16" rx="8" strokeWidth="1.6" />
        <rect x="19" y="51" width="100" height="10" rx="5" style={ FILL } />
        <text x="120" y="86" textAnchor="middle" { ...SMALL }>50% complete</text>
    </svg>
);

// --- map -------------------------------------------------------------------

export const FIELD_PREVIEWS = {
    /* Default */
    'profile-builder/field-default-name-heading': headingPreview( 'Name' ),
    'profile-builder/field-default-contact-info-heading': headingPreview( 'Contact Info' ),
    'profile-builder/field-default-about-yourself-heading': headingPreview( 'About Yourself' ),
    'profile-builder/field-default-username': textInput( 'Username *', 'your_username', gPerson ),
    'profile-builder/field-default-first-name': textInput( 'First Name', 'Jane' ),
    'profile-builder/field-default-last-name': textInput( 'Last Name', 'Doe' ),
    'profile-builder/field-default-nickname': textInput( 'Nickname', 'jane' ),
    'profile-builder/field-default-email': textInput( 'E-mail *', 'name@site.com', gEnvelope ),
    'profile-builder/field-default-website': textInput( 'Website', 'https://example.com', gGlobe ),
    'profile-builder/field-default-password': textInput( 'Password *', '••••••••', gLock ),
    'profile-builder/field-default-repeat-password': textInput( 'Repeat Password *', '••••••••', gLock ),
    'profile-builder/field-default-biographical-info': textareaInput( 'Biographical Info' ),
    'profile-builder/field-default-display-name': selectInput( 'Display name publicly as', 'Jane Doe' ),
    'profile-builder/field-default-aim': textInput( 'AIM', 'screenname' ),
    'profile-builder/field-default-yim': textInput( 'Yahoo IM', 'screenname' ),
    'profile-builder/field-default-jabber': textInput( 'Jabber / Google Talk', 'user@xmpp.org' ),

    /* Standard */
    'profile-builder/field-input': textInput( 'Text', 'Type here…' ),
    'profile-builder/field-textarea': textareaInput( 'Textarea' ),
    'profile-builder/field-select': selectInput( 'Choose an option', 'Select…' ),
    'profile-builder/field-select-multiple': multiSelect( 'Select (Multiple)', [ 'Option A', 'Option B' ] ),
    'profile-builder/field-checkbox': checkboxInput( 'Checkbox', 'Yes, sign me up' ),
    'profile-builder/field-radio': radioInput( 'Radio', [ { label: 'Option one', selected: true }, { label: 'Option two' } ] ),
    'profile-builder/field-heading': headingPreview( 'Heading' ),
    'profile-builder/field-avatar': avatarPreview( 'Avatar' ),
    'profile-builder/field-number': textInput( 'Number', '0' ),
    'profile-builder/field-input-hidden': hiddenPreview( 'Hidden Field', 'Not shown on the form' ),
    'profile-builder/field-language': selectInput( 'Language', 'English (United States)' ),
    'profile-builder/field-wysiwyg': wysiwygInput( 'WYSIWYG' ),
    'profile-builder/field-html': textareaInput( 'HTML' ),
    'profile-builder/field-upload': uploadInput( 'Upload' ),
    'profile-builder/field-international-telephone-input': textInput( 'Phone', '+1 (555) 000-0000', gFlag ),

    /* Advanced */
    'profile-builder/field-select2': searchSelect( 'Select2', 'Search…' ),
    'profile-builder/field-phone': textInput( 'Phone', '+1 (555) 000-0000', gPhone ),
    'profile-builder/field-select-country': selectInput( 'Country', 'United States', gFlag ),
    'profile-builder/field-select-timezone': selectInput( 'Timezone', 'UTC+00:00 — London' ),
    'profile-builder/field-select-currency': selectInput( 'Currency', 'USD — US Dollar ($)' ),
    'profile-builder/field-select-cpt': selectInput( 'Select (CPT)', 'Choose a post…' ),
    'profile-builder/field-select-taxonomy': selectInput( 'Select (Taxonomy)', 'Choose a category…' ),
    'profile-builder/field-checkbox-toa': checkboxInput( 'Terms and Conditions', 'I agree to the Terms' ),
    'profile-builder/field-datepicker': pickerInput( 'Datepicker', 'YYYY-MM-DD', gCalendar ),
    'profile-builder/field-timepicker': pickerInput( 'Timepicker', 'HH : MM', gClock ),
    'profile-builder/field-colorpicker': colorInput( 'Colorpicker' ),
    'profile-builder/field-validation': textInput( 'Validation', 'Enter the code' ),
    'profile-builder/field-map': mapPreview( 'Map' ),
    'profile-builder/field-additional-map': mapPreview( 'Additional Map' ),
    'profile-builder/field-recaptcha': captchaWidget( "I'm not a robot", (
        <g strokeWidth="1.4" opacity="0.75">
            <path d="M188 53a6 6 0 1 0 1.7 4.2" />
            <path d="M188 49v4h-4" />
            <text x="186" y="78" textAnchor="middle" fontFamily="sans-serif" fontSize="8" style={ FILL } opacity="0.6">reCAPTCHA</text>
        </g>
    ) ),
    'profile-builder/field-turnstile': captchaWidget( 'Verify you are human', (
        <path strokeWidth="1.4" opacity="0.75" d="M180 64h11a3 3 0 0 0 .3-6 4 4 0 0 0-7.7-1.1A3.2 3.2 0 0 0 180 64z" />
    ) ),
    'profile-builder/field-select-user-role': selectInput( 'User Role', 'Subscriber' ),
    'profile-builder/field-default-blog-details': textInput( 'Blog Title', 'My blog' ),
    'profile-builder/field-mailchimp-subscribe': checkboxInput( 'MailChimp', 'Subscribe to our newsletter' ),
    'profile-builder/field-mailpoet-subscribe': checkboxInput( 'MailPoet', 'Subscribe to our newsletter' ),
    'profile-builder/field-campaign-monitor-subscribe': checkboxInput( 'Campaign Monitor', 'Subscribe to our newsletter' ),
    'profile-builder/field-woo-billing-address': addressPreview( 'Billing Address', [ 'Full name', 'Street address' ] ),
    'profile-builder/field-woo-shipping-address': addressPreview( 'Shipping Address', [ 'Full name', 'Street address' ] ),

    /* Other */
    'profile-builder/field-email': textInput( 'Email', 'name@site.com', gAt ),
    'profile-builder/field-email-confirmation': textInput( 'Confirm E-mail', 'name@site.com', gEnvelope ),
    'profile-builder/field-gdpr-checkbox': checkboxInput( 'GDPR Agreement', 'I consent to my data being stored' ),
    'profile-builder/field-gdpr-communication-preferences': checkboxGroup( 'Communication Preferences', [
        { label: 'E-mail', checked: true },
        { label: 'Phone' },
        { label: 'SMS' },
    ] ),
    'profile-builder/field-gdpr-delete': buttonPreview( 'Delete my account' ),
    'profile-builder/field-pms-subscription-plans': plansPreview( 'Subscription Plans', [
        { label: 'Free', price: '$0', selected: true },
        { label: 'Monthly', price: '$9 / mo' },
        { label: 'Yearly', price: '$90 / yr' },
    ] ),
    'profile-builder/field-pms-billing-fields': stackedInputs( 'Billing Fields', [
        'Billing First Name',
        'Billing Address',
        'Billing Country',
    ] ),
    'profile-builder/field-honeypot': hiddenPreview( 'Honeypot', 'Anti-spam — hidden from users' ),
    'profile-builder/field-input-url': textInput( 'URL', 'https://example.com', gLink ),
    'profile-builder/field-select2-multiple': multiSelect( 'Select2 (Multiple)', [ 'Tag one', 'Tag two' ] ),
    'profile-builder/field-repeater': repeaterPreview( 'Repeater' ),

    /* Structural */
    'profile-builder/msf-step-break': stepBreakPreview,
    'profile-builder/ffc-columns': columnsPreview,
    'profile-builder/progress-bar': progressBarPreview,
};
