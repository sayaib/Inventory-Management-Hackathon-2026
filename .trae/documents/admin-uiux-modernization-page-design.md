# Admin Panel UI/UX Modernization — Page Design Spec (Desktop-first)

## Global Styles (Design System)
- Layout grid: 12-column grid (max content width 1200–1440px), 24px gutters; main shell uses a fixed sidebar + fluid content.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48.
- Typography: base 14–16px; headings use a clear scale (H1 24–28, H2 18–20, H3 16–18); tabular numbers for metrics.
- Color tokens:
  - Background: neutral 0/50; Surface: white; Border: neutral 200.
  - Text: neutral 900/700/500.
  - Accent: primary 600 with hover 700; Focus ring: primary 400.
  - Status: success/warn/error/info tokens with consistent icon + copy patterns.
- Components:
  - Buttons: primary/secondary/ghost/destructive; consistent heights (32/40) and icon spacing.
  - Inputs: consistent label placement, helper text, error message area.
  - Tables: sticky header option, row hover, selected state.
- Interaction & accessibility:
  - Always-visible focus ring for keyboard navigation.
  - Minimum target size ~40x40 for key controls.
  - Dialogs: focus trap, ESC closes, aria-labelledby/aria-describedby.
  - Contrast: meet WCAG AA for text and essential UI states.

## Page 1 — Sign-in
### Layout
- Centered single-column card (max width 420–480px) with generous vertical spacing.
- Uses Flexbox for vertical alignment and consistent spacing.

### Meta Information
- Title: “Admin Sign-in”
- Description: “Secure sign-in for the admin console.”
- Open Graph: title/description aligned to above.

### Page Structure
1. Brand area (logo + product name)
2. Sign-in form card
3. Support links (e.g., “Forgot password?” if it exists today)

### Sections & Components
- Form
  - Email/username input with label, placeholder, and helper text.
  - Password input with show/hide toggle (button with accessible name).
  - Primary CTA button (disabled while submitting).
  - Inline validation and submission error banner (announced via aria-live).
- States
  - Loading: button spinner, form disabled.
  - Error: field-level messages + top summary if needed.

### Responsive behavior
- On small screens: full-width card with 16px page padding.

## Page 2 — Admin Home (Shell + Overview)
### Layout
- Desktop-first shell:
  - Left sidebar (240px) + top header (56–64px) + main content.
  - CSS Grid for shell; main content uses stacked sections.

### Meta Information
- Title: “Admin Console”
- Description: “Admin overview and navigation.”
- Open Graph: title/description aligned to above.

### Page Structure
1. Sidebar navigation
2. Top header (page title + utilities)
3. Content area (overview sections)

### Sections & Components
- Sidebar
  - Primary navigation list (icons + labels).
  - Current section highlighted; expandable groups if needed.
  - Collapse control (collapsed shows icons + tooltips).
- Header
  - Breadcrumbs when in deeper areas.
  - Search (optional if it exists today), notifications (optional), user menu.
- Overview content
  - “Key metrics” cards (4-up grid on desktop; 2-up tablet; 1-up mobile).
  - “Recent activity” list (dense but readable rows).
  - “Quick actions” block (secondary buttons) aligned consistently.
- Global system feedback
  - Standard empty state pattern (icon, title, guidance, optional CTA).
  - Toast notifications for success; alerts for errors requiring attention.

### Responsive behavior
- Sidebar collapses to icon rail; on small screens becomes a slide-in drawer.
- Header utilities move into overflow menu to prevent wrapping.

## Page 3 — Management Workspace (Table + Details + Forms)
### Layout
- Desktop: two-pane layout using CSS Grid:
  - Left: table/list area
  - Right: details panel (or opens as drawer/modal depending on space)
- Uses sticky toolbar at top for filters/actions.

### Meta Information
- Title: “Management Workspace”
- Description: “Browse and manage records in a consistent workspace.”
- Open Graph: title/description aligned to above.

### Page Structure
1. Workspace header (title + breadcrumbs)
2. Toolbar (filters/search/actions)
3. Table/list area
4. Details panel (read/edit)

### Sections & Components
- Toolbar
  - Filter controls (chips/selects) with clear “Reset” option.
  - Primary action button aligned right (if actions exist today).
- Table
  - Column headers with sort affordances.
  - Pagination controls with clear range text.
  - Row selection pattern only if currently supported.
  - Loading: skeleton rows; Empty: guidance and next step.
- Details
  - Sectioned layout: summary → key fields → related info.
  - Action bar: primary action + secondary + destructive separated.
  - Forms: standardized label/field spacing; inline validation; save/cancel placement consistent.
- Accessibility specifics
  - Table announced with proper roles; headers associated with cells.
  - Dialog/drawer follows focus management and ESC behavior.

### Responsive behavior
- Tablet: details panel becomes a drawer.
- Mobile: single-column flow; table becomes stacked rows/cards; details open as full-screen panel.

## Cross-page Interaction Guidelines
- Navigation should preserve context (return to previous scroll position when feasible).
- All destructive actions require confirmation with clear consequences.
- Copy guidelines: short, action-oriented labels; consistent terminology across navigation, headings, and buttons.