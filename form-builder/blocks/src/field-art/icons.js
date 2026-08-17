/**
 * Custom block icons (name → JSX). Stroke on ROOT; inline style beats editor `svg { fill }`.
 */

// Inline fill/stroke: Gutenberg's `svg { fill: currentColor }` beats attributes.
const ROOT = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    xmlns: 'http://www.w3.org/2000/svg',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: { fill: 'none', stroke: 'currentColor' },
};

// Filled accents (radio dot, slider knobs, calendar day, progress fill, step
// marker). Inline style so the fill survives the same block-icon CSS.
const DOT = { style: { fill: 'currentColor', stroke: 'none' } };

export const FIELD_ICONS = {
    /* ---------------------------------------------------------------- Default */

    // Name (Heading) — person accent + title line over a section rule.
    'profile-builder/field-default-name-heading': (
        <svg { ...ROOT }>
            <circle cx="6.3" cy="7.3" r="2.3" />
            <path d="M3 12.8c0-1.9 1.5-3 3.3-3s3.3 1.1 3.3 3" />
            <line x1="11.5" y1="8" x2="21" y2="8" />
            <line x1="3" y1="18.5" x2="21" y2="18.5" />
        </svg>
    ),

    // Contact Info (Heading) — envelope accent + title line over a rule.
    'profile-builder/field-default-contact-info-heading': (
        <svg { ...ROOT }>
            <rect x="3" y="6" width="7.6" height="5.6" rx="1.2" />
            <path d="M3.4 6.7 6.8 9.1 10.2 6.7" />
            <line x1="12.4" y1="8.8" x2="21" y2="8.8" />
            <line x1="3" y1="18.5" x2="21" y2="18.5" />
        </svg>
    ),

    // About Yourself (Heading) — text-lines accent + title line over a rule.
    'profile-builder/field-default-about-yourself-heading': (
        <svg { ...ROOT }>
            <line x1="3" y1="6.6" x2="9.5" y2="6.6" />
            <line x1="3" y1="9.8" x2="9.5" y2="9.8" />
            <line x1="12.4" y1="8.2" x2="21" y2="8.2" />
            <line x1="3" y1="18.5" x2="21" y2="18.5" />
        </svg>
    ),

    // Username — person inside an account ring.
    'profile-builder/field-default-username': (
        <svg { ...ROOT }>
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="9.6" r="2.8" />
            <path d="M6.6 18.4c.8-2.3 2.9-3.6 5.4-3.6s4.6 1.3 5.4 3.6" />
        </svg>
    ),

    // First Name — person over a single name line.
    'profile-builder/field-default-first-name': (
        <svg { ...ROOT }>
            <circle cx="12" cy="7.3" r="3" />
            <path d="M6 14.7c0-2.6 2.7-4.2 6-4.2s6 1.6 6 4.2" />
            <line x1="7" y1="19.6" x2="17" y2="19.6" />
        </svg>
    ),

    // Last Name — person over two name lines.
    'profile-builder/field-default-last-name': (
        <svg { ...ROOT }>
            <circle cx="12" cy="6.8" r="2.9" />
            <path d="M6.4 13.6c0-2.5 2.5-4 5.6-4s5.6 1.5 5.6 4" />
            <line x1="7" y1="18.2" x2="17" y2="18.2" />
            <line x1="9" y1="21" x2="15" y2="21" />
        </svg>
    ),

    // Nickname — quotation marks.
    'profile-builder/field-default-nickname': (
        <svg { ...ROOT }>
            <path d="M9 7.5C6.8 7.5 5 9.3 5 11.5 5 13.4 6.3 14.5 8 14.5c1 0 1.9-.7 1.9-1.8 0-1-.8-1.7-1.8-1.7-.3 0-.5 0-.7.1.2-1.4 1.3-2.5 2.6-2.6z" />
            <path d="M18 7.5c-2.2 0-4 1.8-4 4 0 1.9 1.3 3 3 3 1 0 1.9-.7 1.9-1.8 0-1-.8-1.7-1.8-1.7-.3 0-.5 0-.7.1.2-1.4 1.3-2.5 2.6-2.6z" />
        </svg>
    ),

    // E-mail (Default) — envelope.
    'profile-builder/field-default-email': (
        <svg { ...ROOT }>
            <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
            <path d="M4 7.5 12 13 20 7.5" />
        </svg>
    ),

    // Website — globe.
    'profile-builder/field-default-website': (
        <svg { ...ROOT }>
            <circle cx="12" cy="12" r="8.5" />
            <line x1="3.5" y1="12" x2="20.5" y2="12" />
            <path d="M12 3.5c2.6 2.4 2.6 14.6 0 17" />
            <path d="M12 3.5c-2.6 2.4-2.6 14.6 0 17" />
        </svg>
    ),

    // Password — padlock.
    'profile-builder/field-default-password': (
        <svg { ...ROOT }>
            <rect x="5" y="10" width="14" height="10.5" rx="2.3" />
            <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
            <circle cx="12" cy="14.5" r="1.2" { ...DOT } />
            <line x1="12" y1="15.4" x2="12" y2="17.6" />
        </svg>
    ),

    // Repeat Password — padlock with a confirmation check (a refresh roundel
    // would be unintelligible at the 24px in-editor size). Body + shackle
    // match the Password icon so they read as siblings.
    'profile-builder/field-default-repeat-password': (
        <svg { ...ROOT }>
            <rect x="5" y="10" width="14" height="10.5" rx="2.3" />
            <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
            <path d="M9 15.2 11.2 17.4 15.2 13" />
        </svg>
    ),

    // Biographical Info — open book.
    'profile-builder/field-default-biographical-info': (
        <svg { ...ROOT }>
            <path d="M12 6c-1.8-1.3-4-2-6.5-2H3.5v13H6c2.4 0 4.5.7 6 2" />
            <path d="M12 6c1.8-1.3 4-2 6.5-2h1.5v13H18c-2.4 0-4.5.7-6 2" />
            <line x1="12" y1="6" x2="12" y2="19" />
        </svg>
    ),

    // Display Name — ID badge with avatar + name lines.
    'profile-builder/field-default-display-name': (
        <svg { ...ROOT }>
            <rect x="3" y="5" width="18" height="14" rx="2.3" />
            <circle cx="8" cy="10" r="2" />
            <path d="M5 16c0-1.7 1.3-3 3-3s3 1.3 3 3" />
            <line x1="13.5" y1="9.5" x2="18" y2="9.5" />
            <line x1="13.5" y1="13" x2="18" y2="13" />
        </svg>
    ),

    // AIM — chat bubble with dots.
    'profile-builder/field-default-aim': (
        <svg { ...ROOT }>
            <path d="M4 4.5h16a1.5 1.5 0 0 1 1.5 1.5v7.5A1.5 1.5 0 0 1 20 15H10l-4.5 4v-4H4a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 4 4.5z" />
            <circle cx="8.5" cy="9.7" r="1" { ...DOT } />
            <circle cx="12" cy="9.7" r="1" { ...DOT } />
            <circle cx="15.5" cy="9.7" r="1" { ...DOT } />
        </svg>
    ),

    // Yahoo IM — chat bubble with a smiley.
    'profile-builder/field-default-yim': (
        <svg { ...ROOT }>
            <path d="M4 4.5h16a1.5 1.5 0 0 1 1.5 1.5v7.5A1.5 1.5 0 0 1 20 15H10l-4.5 4v-4H4a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 4 4.5z" />
            <circle cx="9.6" cy="8.3" r="0.85" { ...DOT } />
            <circle cx="14.4" cy="8.3" r="0.85" { ...DOT } />
            <path d="M9.3 10.6a3.2 3.2 0 0 0 5.4 0" />
        </svg>
    ),

    // Jabber / Google Talk — chat bubble with an "@".
    'profile-builder/field-default-jabber': (
        <svg { ...ROOT }>
            <path d="M4 4.5h16a1.5 1.5 0 0 1 1.5 1.5v7.5A1.5 1.5 0 0 1 20 15H10l-4.5 4v-4H4a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 4 4.5z" />
            <circle cx="11.8" cy="9.5" r="1.7" />
            <path d="M13.5 9.5c0 1 .1 2 1.2 2 1 0 1.4-1 1.2-2.3-.3-1.8-2-2.7-3.6-2.4" />
        </svg>
    ),

    /* --------------------------------------------------------------- Standard */

    // Text — stacked text lines.
    'profile-builder/field-input': (
        <svg { ...ROOT }>
            <line x1="4" y1="8" x2="20" y2="8" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="16" x2="13" y2="16" />
        </svg>
    ),

    // Textarea — bordered multi-line box.
    'profile-builder/field-textarea': (
        <svg { ...ROOT }>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <line x1="6" y1="9" x2="18" y2="9" />
            <line x1="6" y1="12" x2="18" y2="12" />
            <line x1="6" y1="15" x2="13" y2="15" />
        </svg>
    ),

    // Select — dropdown box with chevron.
    'profile-builder/field-select': (
        <svg { ...ROOT }>
            <rect x="3" y="6" width="18" height="12" rx="2.5" />
            <line x1="6.5" y1="12" x2="11.5" y2="12" />
            <path d="M15 10.8 16.8 12.6 18.6 10.8" />
        </svg>
    ),

    // Select (Multiple) — checklist.
    'profile-builder/field-select-multiple': (
        <svg { ...ROOT }>
            <path d="M3.3 7 4.5 8.2 6.8 5.8" />
            <path d="M3.3 12 4.5 13.2 6.8 10.8" />
            <path d="M3.3 17 4.5 18.2 6.8 15.8" />
            <line x1="9.5" y1="7" x2="20" y2="7" />
            <line x1="9.5" y1="12" x2="20" y2="12" />
            <line x1="9.5" y1="17" x2="20" y2="17" />
        </svg>
    ),

    // Checkbox — box with tick.
    'profile-builder/field-checkbox': (
        <svg { ...ROOT }>
            <rect x="4" y="4" width="16" height="16" rx="3.5" />
            <path d="M8 12 10.6 14.6 16.2 9" />
        </svg>
    ),

    // Radio — two options, top one selected.
    'profile-builder/field-radio': (
        <svg { ...ROOT }>
            <circle cx="6.5" cy="8" r="2.7" />
            <circle cx="6.5" cy="8" r="1.1" { ...DOT } />
            <line x1="11" y1="8" x2="20" y2="8" />
            <circle cx="6.5" cy="16" r="2.7" />
            <line x1="11" y1="16" x2="20" y2="16" />
        </svg>
    ),

    // Heading — letter H.
    'profile-builder/field-heading': (
        <svg { ...ROOT }>
            <line x1="6" y1="5" x2="6" y2="19" />
            <line x1="18" y1="5" x2="18" y2="19" />
            <line x1="6" y1="12" x2="18" y2="12" />
        </svg>
    ),

    // Avatar — framed person photo.
    'profile-builder/field-avatar': (
        <svg { ...ROOT }>
            <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
            <circle cx="12" cy="10" r="2.8" />
            <path d="M6.6 18c.8-2.4 3-3.8 5.4-3.8s4.6 1.4 5.4 3.8" />
        </svg>
    ),

    // Number — hash.
    'profile-builder/field-number': (
        <svg { ...ROOT }>
            <line x1="9.5" y1="4" x2="7.5" y2="20" />
            <line x1="16.5" y1="4" x2="14.5" y2="20" />
            <line x1="5" y1="9" x2="19" y2="9" />
            <line x1="4" y1="15" x2="18" y2="15" />
        </svg>
    ),

    // Input (Hidden) — eye with a slash.
    'profile-builder/field-input-hidden': (
        <svg { ...ROOT }>
            <path d="M4 12s3.4-5.5 8-5.5 8 5.5 8 5.5-3.4 5.5-8 5.5c-1 0-2-.2-2.9-.5" />
            <circle cx="12" cy="12" r="2.4" />
            <line x1="4.5" y1="4.5" x2="19.5" y2="19.5" />
        </svg>
    ),

    // Language — "A / 文" translate.
    'profile-builder/field-language': (
        <svg { ...ROOT }>
            <path d="M3 13 6 5l3 8" />
            <line x1="4" y1="10.5" x2="8" y2="10.5" />
            <line x1="13" y1="6" x2="20.5" y2="6" />
            <path d="M16.7 6v1.8c0 3-1.6 5.2-3.7 6.4" />
            <path d="M14.8 9.6c.6 2.1 2.2 3.7 5.4 4.8" />
        </svg>
    ),

    // WYSIWYG — editor with a toolbar.
    'profile-builder/field-wysiwyg': (
        <svg { ...ROOT }>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="6" y1="6.5" x2="8.5" y2="6.5" />
            <line x1="11" y1="6.5" x2="13.5" y2="6.5" />
            <line x1="6" y1="13" x2="18" y2="13" />
            <line x1="6" y1="16.5" x2="14" y2="16.5" />
        </svg>
    ),

    // HTML — code brackets.
    'profile-builder/field-html': (
        <svg { ...ROOT }>
            <path d="M8.5 8 4.5 12 8.5 16" />
            <path d="M15.5 8 19.5 12 15.5 16" />
            <line x1="13.4" y1="6" x2="10.6" y2="18" />
        </svg>
    ),

    // Upload — arrow into a tray.
    'profile-builder/field-upload': (
        <svg { ...ROOT }>
            <path d="M12 15V4" />
            <path d="M7.5 8.5 12 4 16.5 8.5" />
            <path d="M5 15v3a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18v-3" />
        </svg>
    ),

    // International Telephone Input — handset + globe.
    'profile-builder/field-international-telephone-input': (
        <svg { ...ROOT }>
            <path d="M3.6 4.4h2.3l1.2 3-1.5 1.1a8.5 8.5 0 0 0 3.9 3.9l1.1-1.5 3 1.2v2.3a1.6 1.6 0 0 1-1.6 1.6A11.5 11.5 0 0 1 2 6 1.6 1.6 0 0 1 3.6 4.4z" />
            <circle cx="17.5" cy="6.5" r="3.6" />
            <line x1="13.9" y1="6.5" x2="21.1" y2="6.5" />
            <path d="M17.5 2.9c1.4 1.1 1.4 6.1 0 7.2" />
        </svg>
    ),

    /* --------------------------------------------------------------- Advanced */

    // Select2 — searchable dropdown.
    'profile-builder/field-select2': (
        <svg { ...ROOT }>
            <rect x="3" y="6" width="18" height="12" rx="2.5" />
            <circle cx="8.8" cy="11.4" r="2.3" />
            <line x1="10.6" y1="13.2" x2="12.4" y2="15" />
            <path d="M15.4 10.8 17.1 12.5 18.8 10.8" />
        </svg>
    ),

    // Phone — handset.
    'profile-builder/field-phone': (
        <svg { ...ROOT }>
            <path d="M6.5 3.5h2.8l1.4 4-2 1.5a11 11 0 0 0 4.8 4.8l1.5-2 4 1.4V20a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4 6.5a2 2 0 0 1 2-2z" />
        </svg>
    ),

    // Select (Country) — flag on a pole.
    'profile-builder/field-select-country': (
        <svg { ...ROOT }>
            <line x1="6" y1="3" x2="6" y2="21" />
            <path d="M6 4h12l-2.6 3.3L18 10.6H6z" />
        </svg>
    ),

    // Select (Timezone) — world clock.
    'profile-builder/field-select-timezone': (
        <svg { ...ROOT }>
            <circle cx="12" cy="12" r="8.3" />
            <line x1="3.7" y1="12" x2="20.3" y2="12" />
            <path d="M12 7v5l3.4 2" />
        </svg>
    ),

    // Select (Currency) — coin with a currency mark.
    'profile-builder/field-select-currency': (
        <svg { ...ROOT }>
            <circle cx="12" cy="12" r="8.3" />
            <path d="M14.6 9.4c-.7-.8-1.7-1.2-2.7-1.2-1.5 0-2.6.8-2.6 2 0 1.3 1.1 1.8 2.6 2.1 1.5.3 2.7.8 2.7 2.1 0 1.2-1.1 2-2.7 2-1.1 0-2.1-.4-2.8-1.2" />
            <line x1="12" y1="6" x2="12" y2="18" />
        </svg>
    ),

    // Select (CPT) — document.
    'profile-builder/field-select-cpt': (
        <svg { ...ROOT }>
            <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
            <path d="M13.5 3v4h4" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="16.5" x2="13" y2="16.5" />
        </svg>
    ),

    // Select (Taxonomy) — hierarchy tree.
    'profile-builder/field-select-taxonomy': (
        <svg { ...ROOT }>
            <circle cx="5.5" cy="12" r="2" />
            <circle cx="18.5" cy="6.5" r="2" />
            <circle cx="18.5" cy="17.5" r="2" />
            <path d="M7.5 12h4.5a1.5 1.5 0 0 0 1.5-1.5V8a1.5 1.5 0 0 1 1.5-1.5h1.5" />
            <path d="M7.5 12h4.5a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 0 1.5 1.5h1.5" />
        </svg>
    ),

    // Terms and Conditions — document with a check.
    'profile-builder/field-checkbox-toa': (
        <svg { ...ROOT }>
            <rect x="5" y="3" width="14" height="18" rx="2" />
            <line x1="8" y1="7.5" x2="16" y2="7.5" />
            <line x1="8" y1="10.5" x2="16" y2="10.5" />
            <line x1="8" y1="13.5" x2="12.5" y2="13.5" />
            <path d="M8 17.3 9.4 18.7 13 15.2" />
        </svg>
    ),

    // Datepicker — calendar with a marked day.
    'profile-builder/field-datepicker': (
        <svg { ...ROOT }>
            <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
            <line x1="4" y1="9.5" x2="20" y2="9.5" />
            <line x1="8.5" y1="3.5" x2="8.5" y2="7" />
            <line x1="15.5" y1="3.5" x2="15.5" y2="7" />
            <circle cx="9" cy="14" r="1.2" { ...DOT } />
        </svg>
    ),

    // Timepicker — clock.
    'profile-builder/field-timepicker': (
        <svg { ...ROOT }>
            <circle cx="12" cy="12" r="8.3" />
            <path d="M12 7v5l3.5 2" />
        </svg>
    ),

    // Colorpicker — paint droplet.
    'profile-builder/field-colorpicker': (
        <svg { ...ROOT }>
            <path d="M12 3.5c3.2 3.8 5.2 6.4 5.2 9.2a5.2 5.2 0 0 1-10.4 0c0-2.8 2-5.4 5.2-9.2z" />
        </svg>
    ),

    // Validation — clipboard with a check.
    'profile-builder/field-validation': (
        <svg { ...ROOT }>
            <rect x="5" y="4.5" width="14" height="16.5" rx="2" />
            <rect x="9" y="2.5" width="6" height="3.6" rx="1" />
            <path d="M8.5 13 10.5 15 14.5 10.5" />
        </svg>
    ),

    // Map — location pin.
    'profile-builder/field-map': (
        <svg { ...ROOT }>
            <path d="M12 21c4.5-4.3 7-7.6 7-11a7 7 0 1 0-14 0c0 3.4 2.5 6.7 7 11z" />
            <circle cx="12" cy="10" r="2.5" />
        </svg>
    ),

    // Additional Map — pin with a plus.
    'profile-builder/field-additional-map': (
        <svg { ...ROOT }>
            <path d="M9.5 18.6c3.4-3.3 5.3-5.8 5.3-8.4a5.3 5.3 0 1 0-10.6 0c0 2.6 1.9 5.1 5.3 8.4z" />
            <circle cx="9.5" cy="10.2" r="1.9" />
            <line x1="18.5" y1="4" x2="18.5" y2="9" />
            <line x1="16" y1="6.5" x2="21" y2="6.5" />
        </svg>
    ),

    // reCAPTCHA — circular arrow roundel with a check.
    'profile-builder/field-recaptcha': (
        <svg { ...ROOT }>
            <path d="M19.2 12a7.2 7.2 0 1 1-2.1-5.1" />
            <path d="M19.5 5v3.2h-3.2" />
            <path d="M9 12.2 11 14.2 15 10" />
        </svg>
    ),

    // Turnstile — cloud with a check.
    'profile-builder/field-turnstile': (
        <svg { ...ROOT }>
            <path d="M7 17h9.6a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.7-1.4A4 4 0 0 0 7 17z" />
            <path d="M10 12.3 11.6 13.9 15 10.5" />
        </svg>
    ),

    // Select (User Role) — person with a role shield.
    'profile-builder/field-select-user-role': (
        <svg { ...ROOT }>
            <circle cx="9" cy="8" r="3" />
            <path d="M3.5 18c0-3 2.5-5 5.5-5 .8 0 1.6.1 2.3.4" />
            <path d="M17.5 11l3 1.2v2.2c0 1.9-1.3 3.4-3 3.9-1.7-.5-3-2-3-3.9v-2.2z" />
        </svg>
    ),

    // Blog Details — browser window with article lines.
    'profile-builder/field-default-blog-details': (
        <svg { ...ROOT }>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="3" y1="8" x2="21" y2="8" />
            <circle cx="5.6" cy="6" r="0.6" { ...DOT } />
            <line x1="6" y1="12" x2="18" y2="12" />
            <line x1="6" y1="15.5" x2="14" y2="15.5" />
        </svg>
    ),

    // MailChimp Subscribe — envelope with a star.
    'profile-builder/field-mailchimp-subscribe': (
        <svg { ...ROOT }>
            <rect x="3" y="6" width="14" height="11" rx="1.8" />
            <path d="M3.4 7 10 11.5 16.6 7" />
            <path d="M19 3 19.9 4.8 21.9 5.1 20.4 6.5 20.8 8.5 19 7.5 17.2 8.5 17.6 6.5 16.1 5.1 18.1 4.8z" />
        </svg>
    ),

    // MailPoet Subscribe — envelope with a leaf.
    'profile-builder/field-mailpoet-subscribe': (
        <svg { ...ROOT }>
            <rect x="3" y="6" width="14" height="11" rx="1.8" />
            <path d="M3.4 7 10 11.5 16.6 7" />
            <path d="M21.5 3.5c-3 0-5 1.8-5 4 0 .7.2 1.2.6 1.7 2-1 3.8-3 4.4-5.7z" />
            <path d="M17.2 9c.8-1.3 2.1-2.6 4.3-4.5" />
        </svg>
    ),

    // Campaign Monitor Subscribe — envelope with a bar chart.
    'profile-builder/field-campaign-monitor-subscribe': (
        <svg { ...ROOT }>
            <rect x="3" y="6" width="14" height="11" rx="1.8" />
            <path d="M3.4 7 10 11.5 16.6 7" />
            <line x1="16.8" y1="8" x2="16.8" y2="4" />
            <line x1="19.4" y1="8" x2="19.4" y2="3" />
            <line x1="22" y1="8" x2="22" y2="5.5" />
        </svg>
    ),

    // WooCommerce Billing Address — credit card.
    'profile-builder/field-woo-billing-address': (
        <svg { ...ROOT }>
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="6" y1="14" x2="11" y2="14" />
        </svg>
    ),

    // WooCommerce Shipping Address — package box.
    'profile-builder/field-woo-shipping-address': (
        <svg { ...ROOT }>
            <path d="M12 3 20 7v9l-8 4-8-4V7z" />
            <path d="M4 7 12 11 20 7" />
            <line x1="12" y1="11" x2="12" y2="20" />
        </svg>
    ),

    /* ------------------------------------------------------------------ Other */

    // Email (custom) — at sign.
    'profile-builder/field-email': (
        <svg { ...ROOT }>
            <circle cx="12" cy="12" r="3.2" />
            <path d="M15.2 12c0 1.1.1 3 2 3 1.7 0 2.6-1.6 2.6-3.8 0-4.2-3.1-6.7-6.9-6.7a8 8 0 1 0 4.4 14.7" />
        </svg>
    ),

    // Email Confirmation — envelope with a check badge.
    'profile-builder/field-email-confirmation': (
        <svg { ...ROOT }>
            <rect x="2.5" y="5.5" width="14" height="11" rx="2" />
            <path d="M3 6.5 9.5 11 16 6.5" />
            <circle cx="18" cy="16" r="4" />
            <path d="M16.3 16 17.5 17.2 19.8 14.8" />
        </svg>
    ),

    // GDPR Checkbox — shield with a check.
    'profile-builder/field-gdpr-checkbox': (
        <svg { ...ROOT }>
            <path d="M12 3 19 5.5v5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5v-5z" />
            <path d="M8.8 12 11 14.2 15.2 9.8" />
        </svg>
    ),

    // GDPR Communication Preferences — sliders.
    'profile-builder/field-gdpr-communication-preferences': (
        <svg { ...ROOT }>
            <line x1="4" y1="7" x2="20" y2="7" />
            <circle cx="9" cy="7" r="2.2" { ...DOT } />
            <line x1="4" y1="12" x2="20" y2="12" />
            <circle cx="15" cy="12" r="2.2" { ...DOT } />
            <line x1="4" y1="17" x2="20" y2="17" />
            <circle cx="11" cy="17" r="2.2" { ...DOT } />
        </svg>
    ),

    // Subscription Plans (PMS) — pricing tiers of increasing height (premium filled).
    'profile-builder/field-pms-subscription-plans': (
        <svg { ...ROOT }>
            <rect x="3.5" y="13" width="4.4" height="6" rx="1" />
            <rect x="9.8" y="9" width="4.4" height="10" rx="1" />
            <rect x="16.1" y="5" width="4.4" height="14" rx="1" { ...DOT } />
        </svg>
    ),

    // Billing Fields (PMS) — a receipt with a torn zigzag bottom edge.
    'profile-builder/field-pms-billing-fields': (
        <svg { ...ROOT }>
            <path d="M6 4h12v16l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z" />
            <line x1="9" y1="8.5" x2="15" y2="8.5" />
            <line x1="9" y1="12" x2="15" y2="12" />
        </svg>
    ),

    // GDPR Delete Button — trash can.
    'profile-builder/field-gdpr-delete': (
        <svg { ...ROOT }>
            <line x1="5" y1="7" x2="19" y2="7" />
            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            <path d="M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
            <line x1="10" y1="10.5" x2="10" y2="16.5" />
            <line x1="14" y1="10.5" x2="14" y2="16.5" />
        </svg>
    ),

    // Honeypot — a bug (anti-spam trap).
    'profile-builder/field-honeypot': (
        <svg { ...ROOT }>
            <ellipse cx="12" cy="13.5" rx="4.3" ry="5.5" />
            <line x1="12" y1="8.5" x2="12" y2="19" />
            <circle cx="12" cy="6.4" r="2" />
            <line x1="10.6" y1="5" x2="9.2" y2="3.6" />
            <line x1="13.4" y1="5" x2="14.8" y2="3.6" />
            <line x1="7.8" y1="11" x2="4.6" y2="9.5" />
            <line x1="7.5" y1="13.5" x2="4" y2="13.5" />
            <line x1="7.8" y1="16" x2="4.6" y2="17.5" />
            <line x1="16.2" y1="11" x2="19.4" y2="9.5" />
            <line x1="16.5" y1="13.5" x2="20" y2="13.5" />
            <line x1="16.2" y1="16" x2="19.4" y2="17.5" />
        </svg>
    ),

    // URL — chain link. Both hooks are 180deg rotations of each other about the
    // 24x24 centre and their semicircular caps sit ON the 45deg axis, so the
    // connector bar runs straight through the middle of both openings.
    'profile-builder/field-input-url': (
        <svg { ...ROOT }>
            <path d="M9.4 14.6 14.6 9.4" />
            <path d="M10.7 6.7 12.7 4.8a4.65 4.65 0 0 1 6.58 6.58l-1.97 1.97" />
            <path d="M13.3 17.3 11.3 19.2a4.65 4.65 0 0 1-6.58-6.58l1.97-1.97" />
        </svg>
    ),

    // Select2 (Multiple) — a field holding two selected chips, wrapped onto two
    // rows. Each chip is a true pill (width well over its height) — at the old
    // 5.3x5 with rx 2.5 they were circles side by side and the icon read as
    // goggles. Chips align left like real wrapped chips, but their combined
    // bounds are centred in the frame on BOTH axes (x 5.5-18.5, y 6.6-17.4).
    'profile-builder/field-select2-multiple': (
        <svg { ...ROOT }>
            <rect x="3" y="4" width="18" height="16" rx="2.2" />
            <rect x="5.5" y="6.6" width="13" height="4.2" rx="2.1" />
            <rect x="5.5" y="13.2" width="8" height="4.2" rx="2.1" />
        </svg>
    ),

    // Repeater — overlapping cards (repeating group).
    'profile-builder/field-repeater': (
        <svg { ...ROOT }>
            <rect x="8" y="3.5" width="12.5" height="12.5" rx="2.2" />
            <path d="M16 16v2.3a2.2 2.2 0 0 1-2.2 2.2H5.7a2.2 2.2 0 0 1-2.2-2.2V10.2A2.2 2.2 0 0 1 5.7 8H8" />
        </svg>
    ),

    /* ------------------------------------------------------------- Structural */

    // Step Break — connected step nodes (current step filled).
    'profile-builder/msf-step-break': (
        <svg { ...ROOT }>
            <circle cx="4.6" cy="12" r="2.1" />
            <line x1="7" y1="12" x2="10" y2="12" />
            <circle cx="12" cy="12" r="2.1" { ...DOT } />
            <line x1="14" y1="12" x2="17" y2="12" />
            <circle cx="19.4" cy="12" r="2.1" />
        </svg>
    ),

    // Columns — two columns side by side.
    'profile-builder/ffc-columns': (
        <svg { ...ROOT }>
            <rect x="3.5" y="5" width="7" height="14" rx="1.5" />
            <rect x="13.5" y="5" width="7" height="14" rx="1.5" />
        </svg>
    ),

    // Progress Bar — track with a partial fill.
    'profile-builder/progress-bar': (
        <svg { ...ROOT }>
            <rect x="3" y="9.5" width="18" height="5" rx="2.5" />
            <rect x="5" y="11.1" width="7" height="1.8" rx="0.9" { ...DOT } />
        </svg>
    ),
};
