# Factory Standards (Ormsby Hub) — Work Order Design Upgrade

> **Implementation brief for Cursor / coding agent**  
> Direction: **02 — Work Order / Shop-Floor Industrial**  
> Scope: **Visual redesign of an existing application, not a rebuild**  
> Reference prototype: `factory-standards-work-order-with-images.html` (attach or place alongside this brief in the project)  
> Priority: Preserve every existing role, route, data contract, permission and workflow.

## 1. Mission

Upgrade the existing Factory Standards UI to the approved **Work Order** aesthetic: industrial, purposeful, high contrast, dense, and easy to scan. The visual language should suggest a production terminal used to build premium electric guitars, rather than a generic admin SaaS dashboard.

**Critical new requirement: guitars must have visible photographs wherever guitars are represented visually** — particularly on the production run board, in the All Guitars table/grid, on guitar detail pages, and in client build views. Images must correspond to the actual guitar/build record where available.

The supplied HTML prototype is a **visual and interaction reference**, not the application architecture or a source of truthful guitar data. Its product photographs, counts, statuses, serials, finishes, run IDs and demo interactions may be illustrative. Do not hard-code them into the production app.

## 2. Non-negotiable constraints

1. **Cosmetic upgrade only.** Do not add, remove, or rename features, modules, roles, permissions, workflows, navigation destinations or stages.
2. **Keep the current information architecture.** Preserve the actual sidebar item names, order, groups, URLs and breadcrumbs in the real codebase. The reference HTML has demonstration navigation; do not use it to override the real navigation.
3. **Keep all data contracts and business logic.** Do not modify database schema, API endpoints, authorization, query/filter/sort semantics, state transitions, invoice calculations, upload behaviour, or client visibility rules merely to achieve this redesign.
4. **Work within the existing tech stack.** Inspect the repository and reuse its routing, component library, styling conventions, icons, image infrastructure and design-system conventions. No rewrite and no dependency spree.
5. **Treat the existing UI as the source of truth for fields and actions.** The mockup may omit existing functionality. Preserve what is actually present.
6. **Preserve accessibility and mobile usability.** Visual density on desktop must not result in undersized factory-floor touch targets or unreadable text.
7. **No changes to real user or production data.** Do not seed example guitars, replace real photos, or change existing records for design demonstration.
8. **No fake functionality.** All actions in the upgraded app must remain wired to their existing handlers and permissions.
9. **Do not make different apps for different roles.** Keep role-specific shells and access boundaries as implemented; apply a consistent visual system adapted to each.

## 3. Approved direction at a glance

- **Feel:** Braun industrial controls, machine HMIs, workshop identification plates, safety wayfinding, precision measurement tools.
- **Look:** Warm-cool industrial greys, near-black charcoal, signal yellow used sparingly, muted teal, square edges, visible separators.
- **Composition:** Bold condensed headings, compact data tables, clearly outlined work-order cards, explicit status blocks, practical form controls.
- **Avoid:** Navy/orange admin dashboard; huge soft white cards; 16–24px radii; glassmorphism; purple gradients; glowing buttons; decorative charts; excessive blank space; ornamental animations.
- **Premium adjustment:** Strong alignment, crisp type, disciplined colours, beautifully presented **real Ormsby guitar photography**. Industrial rather than cheap or warehouse-generic.

## 4. Design tokens

Use one central set of semantic tokens in the project's existing design system. These are target colours; validate text contrast for their actual background/context and adjust accessible text treatments if needed.

| Token | Value | Use |
|---|---|---|
| `page-bg` | `#D7DBD8` | Main content canvas |
| `surface` | `#F3F4F0` | Tables, work orders, panels, cards |
| `sidebar-bg` | `#252B2C` | Main navigation and dark header bands |
| `surface-alt` | `#E4E8E4` | Board lanes and alternate content |
| `topbar-bg` | `#EDF0EC` | Header chrome |
| `text` | `#202728` | Primary copy and headings |
| `text-muted` | `#53605D` | Metadata on light surfaces |
| `border` | `#AAB1AE` | Structural panel and input borders |
| `border-soft` | `#CED2CF` | Row separators |
| `accent-primary` | `#F2C230` | Primary CTA, selected edge, key count |
| `accent-hover` | `#FFD34A` | Primary-button hover |
| `accent-secondary` | `#527D75` | Technical accents, progress, secondary status |
| `status-success` | `#28734B` | Complete / success |
| `status-warning` | `#F2C230` | Warning / action attention; dark text |
| `status-error` | `#B84B38` | Error / hold, with verified contrast |
| `status-neutral` | `#677471` | Queued / neutral |
| `text-on-dark` | `#F3F4F0` | Sidebar, lane headings |

**Status mappings must follow existing domain semantics.** Do not automatically classify a guitar stage as an error just because the demo screenshot does; use actual status/hold flags and established business rules. Never use colour as the only status cue: include plain-language text, and icons where already supported.

### Typography

- **Display / headlines:** `Barlow Condensed`, weights **600, 700, 800**.
- **Body / interface:** `IBM Plex Sans`, weights **400, 500, 600, 700**.
- **IDs / serials / metadata / numeric labels:** `IBM Plex Mono`, weights **400, 500, 600**.
- Reasonable fallback stacks required if web fonts fail; use locally provisioned fonts if the repository already supports them.
- Page headings: condensed, bold, uppercase where appropriate, approximately **36–52px** responsive.
- Section headings: condensed, bold, approximately **22–28px**.
- Body: approximately **13–15px** on desktop, **14–16px** on mobile.
- Utility labels: **10–12px**, with modest tracking. Never render critical data in tiny decorative text.
- Numeric alignment: tabular figures for production counts, serial-oriented columns and monetary amounts.

### Shapes and spacing

- Radius: **0–2px by default**, at most **4px** for selected controls if necessary. Square, crisp, engineered.
- Borders: **1px solid** structural lines; occasionally thicker left-edge indicators.
- Shadows: none for most surfaces; only a restrained shadow on actual overlays/modals.
- Desktop density: compact-to-medium, not airy marketing-site spacing.
- Desktop table rows: approximately **52–72px** with thumbnails, as content requires.
- Mobile touch controls: aim for **44px** minimum interactive target size.
- Use consistent spacing based on the existing app's scale; avoid global spacing overrides that break established screens.

## 5. Core component specifications

### Navigation shell

- Dark charcoal (`#252B2C`) sidebar, with the existing brand identity and existing real navigation structure.
- Section labels may use small IBM Plex Mono uppercase type.
- Active nav item: darker/lighter charcoal field plus **4px signal-yellow left bar** and clear white label.
- Normal nav items remain legible with distinct hover and keyboard-focus states.
- Light grey topbar with compact breadcrumbs and existing user/account controls.
- Preserve responsive sidebar, collapsed states, mobile menus and any existing permissions-based visibility.

### Buttons

- Primary: **solid signal yellow**, dark text, near-square geometry, bold label.
- Secondary: dark charcoal with off-white text, or a light outlined button as appropriate.
- Tertiary: flat text/action buttons with obvious focus and hover states.
- Destructive: existing confirmation flow, red semantic treatment, never repurpose yellow for delete.
- Loading, disabled, pending and success states remain intact.

### Panels and metrics

- Flat light industrial surfaces, 1px borders, sharp corners.
- Large condensed values; labels are modest mono uppercase.
- Do not invent new analytics, counts or charts. Style only the metric widgets already present.
- Prefer borders and tonal differentiation to shadows.

### Tables and lists

- Strong legibility and compact metadata arrangement.
- Mono column headers, clear horizontal rules, subtle row hover, consistent alignment.
- Preserve columns, sorting, filtering, pagination, checkbox selection, bulk operations, row actions and horizontal overflow.
- **Add a compact image alongside the guitar name/model where an image exists.** See image policy below.
- Keep numeric data, stage labels and controls visible; images must not make tables unnecessarily tall.

### Status labels

- Rectangular coloured labels, not pill-shaped badges.
- Clear text e.g. `QUEUED`, `NECK FIT`, `QC HOLD`, `COMPLETE` **only if those labels correspond to actual real statuses**.
- Contrast-conscious combinations; consistent across dashboard, table, board, detail and client screens.
- Keep existing statuses and state machine unchanged.

### Forms and modals

- Square inputs, clearly outlined borders, uppercase but readable field labels, prominent keyboard focus.
- Existing required fields, validation and help text must be retained.
- Modal: charcoal header band, light body, crisp border, existing actions, existing confirmations and behaviour.
- Do not convert a standard edit form into a wizard or restructure the Custom Shop flow.

## 6. Guitar photography — mandatory

This is a key acceptance requirement, not optional decoration.

### Source and data integrity

- Use the **actual existing image/media field(s) attached to each guitar or build**, following the current file-storage/CDN/image-loading mechanisms.
- First inspect how guitars, finishes, photo updates, and image variants are represented in the app. Use current relationships and permissions.
- Prefer the record's designated primary/hero image. If the app has no primary marker, use a consistent, documented fallback order among **existing authorised record images**.
- **Do not show the wrong guitar or wrong finish.** Never use random illustrative guitar images or assign a generic product picture as though it were the client's specific instrument.
- If no real image exists, show a clearly labelled neutral **“No guitar photo yet”** placeholder with a subtle guitar silhouette or the project's existing empty-state asset.
- Do not automatically fetch random retailer images or hotlink the external image URLs used in the sample HTML. Those URLs are demonstration assets only, may disappear, and do not reliably match build configurations.
- Preserve all current image access permissions; do not leak private client-build photos to unauthorised viewers.
- Respect alt text, correct aspect ratio, image loading and error fallback. Use lazy loading for off-screen image lists; optimise thumbnails using the repo's image tooling where possible.

### Where photography appears

**Run board (highest priority)**
- Each existing guitar card/work order shows a clearly visible photo near its top, followed by serial / ID, model, finish, current stage, status and existing card actions.
- Suggested desktop thumbnail composition: a dedicated image area approximately **140–190px tall**, adjustable to actual card dimensions.
- Prefer `object-fit: contain` for whole-guitar packshots so headstocks and guitar bodies are not cropped. Use a quiet neutral background.
- If current images are portrait-oriented, preserve their proportions in a consistently framed image box. Avoid stretching.
- Board columns remain legible and independently horizontally scrollable at narrower desktop widths if that is how the existing board operates.
- Do not remove cards, drag/drop, quick actions, stage controls or keyboard interactions.
- Consider a **compact board density** if existing production use demands many records on screen. The initial image-enabled layout must still support practical scanning.

**All Guitars table/grid**
- Thumbnail around **48 × 64px** or similar beside the existing model/record title.
- Keep serial, finish, run, stage, status and row-action fields present in their existing positions/relationships.
- Clicking the row or image should follow the current navigation semantics, not introduce new routes.

**Guitar detail**
- Larger real primary image in the existing image/specification area.
- Preserve existing photo gallery, build specs, notes, updates, upload controls and chronology.
- Images attached to a production note remain associated with **that note**, rather than being silently replaced by a product hero photo.

**Client build / dashboard**
- Prominent real photo of that client's guitar/build where authorised.
- No photo yet: neutral placeholder and truthful copy.
- Maintain existing client-safe content and visibility rules.

**Other guitar references**
- Where existing search results, selection dialogs or related-guitar references already show the guitar identity, add a small thumbnail **only when it improves recognition without obscuring actions**.
- Do not expand scope to invent new galleries, photo management capabilities or upload flows.

### Image QA cases

Check portrait images, landscape images, transparent packshots, missing images, failed image loads, large files, repeated guitar model names with different finishes, authorised/private photos and narrow-screen layouts.

## 7. Screen-by-screen adaptation

The following are **existing product surfaces**, not a mandate to add routes. Only update surfaces present in the actual codebase.

| Surface | Work Order visual treatment | Must preserve |
|---|---|---|
| Login | Charcoal + yellow identity, technical typography, uncluttered authentication form | Current auth options, errors, redirects |
| Sidebar / shell | Dark functional navigation, yellow active-edge marker, mono utility labels | Real nav order, responsive behaviour, role rules |
| Dashboard | Bordered metrics, compact summaries, clear section bands | Existing data, KPI logic, actions |
| All Guitars | Compact industrial table/grid **with actual guitar thumbnails** | Filters, sorting, pagination, bulk selection, columns |
| Guitar detail + notes | Large real guitar photo, precise specs, chronological photo updates | Editing, uploads, notes, history, permissions |
| Run board | Charcoal stage headers, yellow counts, photo-first guitar cards, status blocks | Actual lanes, stages, drag/drop, quick updates |
| Client dashboard | Same visual language with simpler hierarchy, large authorised build photo | Client-only access and update visibility |
| Custom Shop forms | Squared inputs, clear sections, industrial primary actions | Every field, validation, step and submission |
| Bulk update modal | Dark header, outlined form fields, yellow submit action | Selection scope, validation, permission checks, confirmation |
| Factory-floor mobile shell | Bold labels, large tap targets, glanceable photos and stage status | Existing lightweight workflows and mobile navigation |
| Accounting / invoices | Compact rows and clear semantic statuses | Amount calculations, permissions, actual payment states |

## 8. Responsive and accessibility rules

- Desktop-first for staff; mobile-first interaction sizing for factory workers.
- Respect existing responsive breakpoints unless a layout defect requires a targeted improvement.
- Maintain visible keyboard focus, logical tab order, proper labels, accessible modal focus trapping and Escape behaviour where appropriate.
- Ensure text contrast meets **WCAG AA** (generally 4.5:1 for normal text, 3:1 for large text and essential UI boundaries). Test especially small muted labels and white text on teal/red badges.
- Do not use colour alone to distinguish production stages, QC holds, warnings or completed records.
- Avoid motion unless it clarifies an existing interaction; respect reduced-motion preferences.
- Avoid layout shifts from image loading by reserving image dimensions.
- Respect touch targets, scrolling, long guitar names, serials, empty states, and translated/longer labels if present.

## 9. Cursor implementation sequence

### Step 1 — Audit before editing

Inspect the actual repository and report briefly:
- Frontend framework, styling setup, routing and design tokens.
- Current shared components for shell, navigation, buttons, cards, tables, badges, forms and modals.
- Exact files for dashboard, All Guitars, guitar detail/notes, run board, client dashboard, Custom Shop, factory mobile and accounting.
- Existing guitar image/media fields, transformations, permissions and placeholder handling.
- Existing test, lint, typecheck and build commands.

**Do not guess paths, fields, component names or data contracts.**

### Step 2 — Introduce shared visual foundations

Add or update the existing theme tokens and typography centrally, then restyle common primitives: shell, navigation, buttons, inputs, badges, panels, tables, modal and focus states.

Avoid broad CSS selectors that unintentionally change unrelated public-facing pages.

### Step 3 — Apply to core staff screens

Prioritise in this order:
1. **Run board**, including actual guitar images.
2. **All Guitars**, including thumbnails.
3. **Guitar detail**, including photo/specs/notes.
4. Dashboard and general shell.

Preserve all existing handlers, existing statuses, routes and data rendering.

### Step 4 — Apply across remaining roles and screens

Extend shared components carefully to client dashboard, factory mobile UI, Custom Shop, bulk update modals, login and accounting views. Respect existing role distinctions.

### Step 5 — Validate and refine

Run the project's actual available typecheck, lint, unit/integration tests and build. Manually exercise core flows at representative widths. Fix regressions before completion.

## 10. Acceptance criteria

- [ ] App visually reads as **Work Order**: grey industrial canvas, dark charcoal shell, restrained signal yellow, sharply bordered flat surfaces.
- [ ] Display, body and technical type hierarchy are coherent and consistent.
- [ ] Existing roles, links, navigation groups, screen structure and workflows are unchanged.
- [ ] Existing counts, status mappings, ordering and permissions are unchanged.
- [ ] Every applicable run-board guitar card displays its **correct record photo** or a truthful missing-photo state.
- [ ] All Guitars renders correct per-record thumbnail or missing-photo state.
- [ ] Guitar detail shows a correct primary image and preserves note attachments.
- [ ] Client views display only permitted photos of the corresponding client's build.
- [ ] Images do not crop essential parts of a guitar, distort geometry or cause significant layout shift.
- [ ] Missing or broken images never break the card or page layout.
- [ ] Stage and status information remains readable without relying solely on colour.
- [ ] Factory-floor mobile layout remains fast to scan and easy to tap.
- [ ] Existing forms, selection, bulk updates, search, filters and modals behave as before.
- [ ] No new packages or schema changes unless absolutely necessary and explicitly explained.
- [ ] No real records mutated as part of the design upgrade.
- [ ] Existing build/tests pass; any pre-existing failures are clearly distinguished from new failures.

## 11. Reference prototype: what to copy and what NOT to copy

### Copy as aesthetic guidance
- Charcoal left sidebar with numbered utility styling and a yellow selected item marker.
- Condensed uppercase production headings.
- Light grey bordered metrics with oversized condensed numbers.
- Four-stage style board with dark lane headers, strong counts and compact work-order cards **adapted to actual lanes/stages**.
- Rectangular stage/status labels with dark-on-yellow and light-on-dark treatments.
- Real guitar images integrated into board cards and tables.
- Square industrial buttons and modal design.

### Do NOT copy as application truth
- Hard-coded example run `026`, `GT-0264`, or any sample records.
- Mock counts such as `08 / 18 / 14 / 60%`.
- The prototype's navigation route names or order if they differ from production.
- Demo guitar-to-photo mappings; several external images may not match the listed finish.
- Prototype-only JS logic, invented status changes, fake saving or demo permissions.
- Static image URLs from guitar shops or unrelated external CDNs.
- Any feature that the current app does not already provide.

## 12. Definition of done / agent reporting

At completion, provide:

1. A short summary of the design changes.
2. A list of changed files/components.
3. A clear description of **where each guitar photo comes from**, the chosen fallback behaviour, and how client privacy is respected.
4. Build/typecheck/test results and any unresolved issues.
5. Before/after screenshots of the key pages **if local preview tooling exists**; otherwise state that screenshots were not captured.
6. A note on any areas intentionally left unchanged to honour the cosmetic-only constraint.

## 13. Copy/paste instruction for Cursor Agent

> Read `FACTORY_STANDARDS_WORK_ORDER_DESIGN_UPGRADE.md` and inspect the existing codebase before changing anything. Implement this as a **cosmetic-only design system upgrade** to the approved Work Order industrial direction, using `factory-standards-work-order-with-images.html` as a visual reference only. Keep all current routing, navigation, features, workflows, role access, data and business logic unchanged. The top priority is showing **correct, real guitar photos from existing record media** on run-board cards, All Guitars and detail/client pages, with a truthful fallback when none exists. Do not hard-code sample records or hotlink demo images. Work incrementally using existing app components and styling conventions. Validate the existing build and tests and report modified files, image data sources and any limitations.
