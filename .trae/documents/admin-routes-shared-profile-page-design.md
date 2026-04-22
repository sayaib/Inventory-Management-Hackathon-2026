# Page Design Spec — Admin Routes + Shared Profile (Desktop-first)

## Global Styles (applies to all pages)
- Layout system: Flexbox for top bars/rows; CSS Grid for form grids and KPI card grids.
- Spacing: 8px base spacing; page padding 16–24px; card padding 16–24px.
- Typography: 12–14px body; 16–20px section titles; 24px page titles.
- Colors: light gray app background; white cards; primary accent for CTAs; red for destructive actions.
- Buttons: primary filled (hover darken); secondary outlined; disabled reduces opacity.
- Links: primary colored with underline on hover.

## Page: Admin Layout (shared shell for /admin/*)
### Layout
- Two-column layout (desktop):
  - Left: fixed-width sidebar (nav sections).
  - Right: scrollable content area rendered via nested route outlet.
- Responsive behavior:
  - Tablet/mobile: sidebar collapses to hamburger drawer; active route highlighted.

### Meta Information
- Title pattern: `Admin — {Section}`
- Description: `Administration tools and reporting.`
- Open Graph: title/description mirror above.

### Structure & Components
1. Top bar (optional if already present)
   - App logo + “Admin” label
   - Global actions: “Go to Dashboard”, “Profile”, “Logout”
2. Sidebar navigation
   - Items (in order): Overview, Project Status, Predictions, Users, Audit Logs, Reports, Settings
   - Active state: based on current route (not local tab state)
3. Content outlet area
   - Renders the selected Admin section page

## Page: Admin Overview (/admin/overview)
- Structure: KPI card row + trend/summary blocks (reuse existing content).
- Components: KPI cards, charts/tables, loading skeletons/spinners, error banners.

## Page: Admin Project Status (/admin/project-status)
- Structure: filter row (search + department + expand controls) + results table.
- Components: searchable table, expandable rows, empty state.

## Page: Admin Predictions (/admin/predictions)
- Structure: controls panel (project select, horizon/lookback, run) + results table + summary.
- States: idle, running, success, error; disable Run while loading.

## Page: Admin Users (/admin/users)
- Structure: user list table + inline actions/modals (reuse existing UserManagement).
- Components: filters/search, pagination if present, confirmation dialogs.

## Page: Admin Audit Logs (/admin/audit-logs)
- Structure: filter controls + audit log table (reuse existing AuditLog).
- Components: date/type filters, pagination, empty state.

## Page: Admin Reports (/admin/reports)
- Structure: report tabs/sections inside the page (allowed), export controls, paginated tables.
- Components: download/export button, filter chips, numeric summaries.

## Page: Admin Settings (/admin/settings)
- Structure: stacked cards (Company Directory, Departments, Asset Categories, thresholds).
- Components: add/rename/delete rows; save button with success/error alerts.

## Page: Profile (shared) (/profile)
### Layout
- Single-column centered container (max width ~5xl) with a profile card.
- Use the existing form structure; ensure it is identical for Admin and non-Admin users.

### Meta Information
- Title: `Profile`
- Description: `Update your account profile.`

### Structure & Components
1. Header
   - Back link (to Dashboard; Admin may also navigate back to Admin)
   - Role badge (read-only)
2. Profile form card
   - Identity: Username (editable), Email (read-only)
   - Avatar: preview + Upload/Remove actions
   - Personal fields + address + bio
   - Footer actions: Clear (destructive) and Save (primary)
3. States
   - Loading spinner while fetching
   - Inline success/error messaging on save/upload/clear
