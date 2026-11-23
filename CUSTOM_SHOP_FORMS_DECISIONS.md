# Custom Shop configurable forms — locked decisions

Single reference for product rules agreed so far. Update this file when decisions change.

---

## Roles & forms

| Topic | Decision |
|--------|----------|
| Who builds forms | **Admin** |
| Who fills forms | **Logged-in clients** |
| Form types | **One standard** (default Custom Shop) **+ optional campaigns** (per build / push / guitar type) |
| Post-submit | **Same pipeline as today:** pending → staff review → approve / reject / convert (no separate quote step unless you add it later) |

---

## Campaign entry (v1)

| Topic | Decision |
|--------|----------|
| How clients open a campaign form | **URL only** — e.g. shared link with a form/campaign id query param (no campaign picker UI on `/custom-shop` for now) |

---

## Pricing (v1)

| Topic | Decision |
|--------|----------|
| Model | **Base price (AUD) + per-option add-on (AUD)** per selectable option |
| Currency | **AUD** for v1 |

Display rules for “from / range” can still be defined in `CUSTOM_SHOP_ORDER_FORM_TEMPLATE.md` (rounding, buffer %, disclaimer copy).

---

## Deposit

| Topic | Decision |
|--------|----------|
| Amount | **$1,000 AUD** — align with existing `CustomShopRequest` / submit page (`DEPOSIT_AUD = 1000`) |
| Note | Ignore any external specs that mention **$500**; Factory Standards stays at **$1,000** |

---

## Data direction (implementation hint)

- **Form definitions** in Firestore (or config): standard default + campaign forms with allowed options and `priceDeltaAUD` per option (and a campaign **base** in AUD).
- **Submissions** continue as **`CustomShopRequest`** (extend with `formId` / `formVersion` and optional pricing snapshot).
- **Campaign traffic:** resolve form by id from URL; default URL uses standard form.

---

## Implementation (standard form — shipped)

- **Client flow:** `/custom-shop/submit` — 7-step wizard; options and upgrade prices load from Firestore `customShopSpecSettings/global` (falls back to code defaults if the doc is missing).
- **Staff settings:** `/settings/custom-shop-specs` — set **standard base price (AUD)**, add/remove/rename **options per category**, set **+$ AUD** per option, manage **conflict rules** (when field A is one of X, block field B from being one of Y). Linked from the sidebar as **Custom Shop specs**.
- **Conflict rules:** Evaluated on **Next** and on **Submit**; message comes from the rule text you enter. Seeded defaults cover single-pickup configurations vs humbucker neck/bridge lists (`src/lib/customShopCatalogDefaults.ts`).
- **Firestore:** Deploy **`firestore.rules`** so `customShopSpecSettings` is **read** by any signed-in user (wizard) and **write** by staff.
- **Legacy constants:** `src/lib/customShopStandardPricing.ts` still seeds **default** prices when resetting the editor; live pricing is the Firestore catalog after first save.
- **Saved on `CustomShopRequest`:** unchanged (`formId` `standard`, `specs`, `estimatedTotalAUD`, etc.).

**Campaigns (next):** URL `?form=` resolution and separate campaign form documents are not implemented yet.

---

*Last updated from product conversation — campaign entry URL-only; pricing base + per-option AUD.*
