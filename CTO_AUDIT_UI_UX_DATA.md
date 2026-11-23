# CTO audit: UI/UX flow & data gaps

**Status:** Parked for later — not scheduled for implementation.  
**Last reviewed:** May 2026  
**Scope:** Factory Standards — major gaps in UI/UX flow and data integrity (not a full bug list).

---

## Executive summary

| Area | Health | Biggest risk |
|------|--------|----------------|
| Staff run/guitar ops | Strong | Per-run spec rules not enforced when staff add guitars |
| Client guitar profile | Good | Run access not scoped; money shown two different ways |
| Accounting / payments | Functional | Duplicate notifications; accounting can’t reach run financials easily |
| Custom Shop | Partially built | Approve/reject works; **convert → build** is UI-only |
| Security / access | Client-side guards only | No middleware; dev routes & weak admin pages |
| Firestore indexes | Under-specified | Production queries may fail as data grows |

---

## P0 — Fix before scaling users or money

### 1. Custom Shop: no real “convert to build”

Decisions doc (`CUSTOM_SHOP_FORMS_DECISIONS.md`) says: pending → review → approve / reject / **convert**.

- UI shows `converted` status and copy (“check your guitars”).
- **Nothing sets** `status: "converted"` or `convertedGuitarId` / `convertedClientId` / `convertedInvoiceId`.
- Staff can only approve/reject today.

**UX impact:** Clients think a build exists; ops must manually create guitar + client elsewhere.

**Data impact:** Dead fields on `CustomShopRequest`; `estimatedTotalAUD` can drift if catalog prices change after submit (option-level prices not snapshotted).

### 2. Two competing “when to invoice” models

- **Guitar:** `invoiceTriggerStageId` — saved in UI (`GuitarInvoiceManager`), **never used** in automation.
- **Run stage:** `invoiceSchedule` + invoice `triggeredByStageId` — actual behavior.

**UX impact:** Staff configure a trigger that does nothing → missed or surprise invoices.

### 3. Two competing “how much is owed” models

- Per-guitar: `guitars.price` + invoices (run financials, `GuitarInvoiceManager`).
- Per-client: `clients.totalOrderAmount` (client dashboard / contact card).

These are **not synced**. Same client can show different balances on different screens.

### 4. Payment notifications duplicated / mis-typed

When a client records a payment:

- Client code fires `notifyAllStaff` with type `guitar_note_added` (misleading) — `firestore.ts` ~987.
- Cloud Function `onInvoiceUpdated` also fires `payment_pending_approval`.

**UX impact:** Double bells; wrong icon/label for one.

### 5. Composite indexes mostly missing

`firestore.indexes.json` only defines audit logs + custom shop requests. Code queries guitars by `runId` / `clientUid`, collection-group invoices, filtered run updates/notes, notifications, etc.

**Risk:** Fine in dev; **will break in prod** as collections grow.

---

## P1 — Role & navigation UX gaps

### Accounting

- Can open `/runs/[runId]/financials` but **no sidebar path to runs**.
- Notification bell sends non-payment items to `/runs/{id}/board` — accounting users may be redirected away from `/`.

**Fix direction:** Accounting nav: runs list (read-only) or financial reports index; bell routes payments → `/accounting`, run financials → `/runs/{id}/financials`.

### Factory

- `/guitars` allowed by guards but **not in factory sidebar** (factory uses `/factory` mobile shell).

### Clients

- **`assignedRunIds`** set at client creation; enforced on **onboard only**.
- `my-guitars` shows **all** guitars for `clientUid`, ignoring run assignment.
- Copy on create says client will only see assigned runs — **misleading** after onboard.

### Custom Shop discovery

- Landing `/` CTA → `/custom-shop`, but layout **requires login** — guests hit login first.
- **Campaign forms** (`?form=` URL-only per decisions) — **not implemented**.
- Custom Shop **not in client sidebar** (only via my-guitars links).

### Staff / admin clutter

- Custom Shop admin links **duplicated** (main nav + Admin block).
- Orphan route `/clients/new` (modal is the real path).
- Dashboard **Analytics = “Coming soon”** — dead affordance.

### Guitar detail: two entry points

- Staff: modal on run board vs `/guitars/[id]` page.
- Finance on `/guitars/[id]#finance` for staff/admin; modal may still be primary for daily ops — **inconsistent** where invoices are managed.

---

## P1 — Data integrity & rules vs UI

### Run spec constraints

- Runs can define `specConstraints` (edit run UI).
- **Onboard (client):** respects constraints.
- **AddGuitarModal / EditGuitarModal (staff):** global `settings.runSpecs` only — **ignores per-run constraints**.

**Impact:** Staff can enter specs clients cannot; build docs may not match what client was allowed to pick.

### `updateGuitarPaymentInfo` stub

Computes balance but **writes nothing**; comment promises denormalized fields. UI always recalculates.

### `Run.endsAt`

Shown on runs list; **never written** (`createRun` overwrites caller `startsAt` with server time).

### Notification settings

`settings.notifications` (`notifyOnNewGuitar`, etc.) editable in admin — **never read** when sending notifications.

### Invoice `overdue` status

UI treats overdue as status or past `dueDate`; backend only sets `pending` | `partial` | `paid` — **`overdue` never persisted**.

### Sensitive data

`initialPassword` on client profile in Firestore (client can read own profile per rules) — security/process gap.

### Auth model

- **No Next.js middleware** — role checks are client `useEffect` redirects only.
- `/admin/set-role` — sidebar link, **weak page guard**.
- `/dev/client-dashboard` — **no auth** in production builds.

---

## P2 — UX polish & consistency

| Topic | Gap |
|--------|-----|
| Client ↔ staff communication | Run-update comments removed for clients; guitar-note comments are the channel — staff must monitor (badge: `guitar_note_comment`) |
| `guitar_assigned` notification type | Defined, **never created** |
| Archive filtering | `archived` filtered in memory after fetch, not in query |
| Finish / specs | `guitar.finish` vs `specs.finishColor` / `finishType` — dual fields, drift risk |
| Legacy `specs.pickups` vs `pickupNeck`/`pickupBridge` | Mixed shapes on old vs new guitars |
| Custom shop catalog | Estimate at submit; **per-option prices not frozen** on request document |
| Firestore rules | Custom shop create: minimal validation; client invoice updates: payments/status only — amounts not rule-enforced |

---

## What’s working well (don’t rebuild)

- Run board + stages + drag workflow for staff.
- Client **my-guitars** timeline, thumbs-up, gallery, invoices (staff payment approval).
- Run **financial report** (`/runs/[runId]/financials`) — balances, payment history, CSV.
- Factory mobile portal (`/factory`).
- Custom Shop **standard wizard + admin catalog + conflict rules**.
- Audit logs for client views (guitar, run updates).
- Email hooks (Mailgun in admin) for stage/run events.
- Run-update comments removed on client view; guidance to use **Updates & Progress** for questions (May 2026).

---

## Recommended roadmap

### Now (2–4 weeks)

1. Custom Shop **convert** → guitar/client (+ link fields).
2. **Single money model** (guitar price vs `totalOrderAmount`).
3. Wire or **remove** `invoiceTriggerStageId`.
4. Fix **payment notifications** (one type, avoid duplicate with Cloud Function).
5. **Deploy Firestore composite indexes**.

### Next (4–8 weeks)

6. Enforce `assignedRunIds` everywhere clients see runs/guitars, or remove the feature.
7. Staff Add/Edit guitar forms respect `run.specConstraints`.
8. Accounting nav + notification deep links.
9. Campaign form resolver (`?form=`).

### Later

10. Next.js middleware; harden `/admin/set-role` and remove/guard `/dev/*`.
11. Dashboard analytics or remove “Coming soon” card.
12. Snapshot catalog prices on custom shop submit.

---

## Persona checklist

| Persona | Can complete main job? | Main friction |
|---------|------------------------|---------------|
| **Client** | Yes | Run assignment misleading; custom shop post-approve unclear |
| **Staff** | Yes | Two guitar UIs; spec constraints bypass; convert custom shop manual |
| **Factory** | Yes | No path to guitar list if needed |
| **Accounting** | Yes | Hard to find run financials; noisy notifications |
| **Admin** | Yes | Settings that don’t affect behavior; set-role page exposure |

---

## Route map (reference)

32 App Router pages; roles: `client` | `staff` | `admin` | `factory` | `accounting`.

**Notable gaps:**

- `/clients/new` — orphan (use `AddClientModal`).
- `/runs/[runId]/financials` — accounting allowed, no nav discovery.
- `/dev/client-dashboard` — unguarded.
- Custom Shop — auth required; campaign URLs not built.

---

## Related docs

- `CUSTOM_SHOP_FORMS_DECISIONS.md`
- `CUSTOM_SHOP_ORDER_FORM_TEMPLATE.md`
- `GUITAR_SPEC_OPTIONS.md`

---

## Changelog

| Date | Note |
|------|------|
| May 2026 | Initial audit parked from CTO review conversation |
