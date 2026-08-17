/**
 * Form Editor blocks entry.
 */

// Before block imports: registerBlockType filters (uniqueness, CL, extras, …).
import './register-block-type-filters';

// Toolbar Delete (Layer 15). Order not load-bearing.
import './components/BlockToolbarDelete';

// Icons + hover previews — must run before block imports.
import './field-art';

// After filters, before editor plugins. See register-blocks.js.
import './register-blocks';

// Import editor styles
import './style.scss';

// Body class for scoped chrome CSS (PB form CPTs).
import './components/EditorBodyClass';

// Editor plugins. FormShortcodePanel first → top of Form Settings sidebar.
import './components/FormShortcodePanel';
import './components/RepeaterScopeGuard';
import './components/FormSettingsPanel';
import './components/ProgressBarPanel';
import './components/AutoSeedRegistrationForm';

// "Preview" button injected into the top-right editor header (next to Save).
import './components/FormPreviewButton';

// Existing-fields inserter section
import './components/ExistingFieldsPanel';

// Swap root "Add field" for mini inserter.
import './components/RootCanvasAppender';

// Mini inserter at between-block / empty-block "+" clicks.
import './components/CanvasPointInserter';

// Focus mini-inserter search when the popover opens.
import './components/MiniInserterSearchFocus';

// Click empty canvas padding to deselect.
import './components/CanvasPaddingDeselect';

// Keep inserter open on PB form CPTs.
import './components/ForceOpenInserter';

// Tooltip on greyed-out once-per-form New Fields entries.
import './components/UniqueFieldTooltip';

// Keep fullscreen off (no chrome left to exit it).
import './components/ForceDisableFullscreen';

// Disable Gutenberg keyboard shortcuts on PB form CPTs.
import './components/DisableKeyboardShortcuts';

// Disable block clipboard; text editing in settings still works.
import './components/DisableBlockClipboard';

// Document-bar title out of tab order (CSS handles pointer-events).
import './components/DisableDocumentBar';

// Per-edit REST mirror + client-side ID dedup on duplicate.
import './components/BlockAttributeMirror';

// Multi-Step Forms document-sidebar panel + post-save sync
import './components/MsfPanel';

// Form Fields in Columns document-sidebar panel
import './components/FfcPanel';
