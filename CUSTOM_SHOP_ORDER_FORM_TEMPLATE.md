# Custom Shop order form — specs & pricing template

Use this document to define **one** order form (general or a campaign). Duplicate the file per campaign if needed.

---

## 0. Form identity

| Field | Your value |
|--------|------------|
| **Form name** (internal) | e.g. `custom-shop-general-2026` |
| **Client-facing title** | e.g. “Custom Shop build configurator” |
| **Type** | ☐ General (default) ☐ Campaign |
| **Campaign ID / slug** (if campaign) | |
| **Linked guitar** (model name or SKU, if campaign) | |
| **Currency** | e.g. AUD |
| **Last updated** | YYYY-MM-DD |
| **Owner (admin)** | |

**Post-submit workflow** (pick one):

- ☐ **A)** Same as today: pending → staff review → approve / reject / convert  
- ☐ **B)** Add a formal **quote** step before deposit (describe below)

If **B**, describe the quote step in 2–3 sentences:

```
(paste here)
```

---

## 1. Client-facing messaging

| Item | Copy / rule |
|------|-------------|
| **Intro blurb** (short, above the form) | |
| **Price estimate disclaimer** (required legal/UX line) | e.g. “Figures are indicative only and not a binding quote.” |
| **What we show** | ☐ “From $X” only ☐ “$X – $Y” range ☐ Both |
| **Deposit rule** | ☐ Fixed amount: $____ AUD ☐ Other: ________________ |

---

## 2. Specs — section list

For **each** section below, copy the **block template** from §2.1 and fill it in.  
Order matters: list sections in the order clients should see them.

---

### 2.1 Block template (copy per section)

#### Section: `[SECTION NAME]`

| Attribute | Value |
|-----------|--------|
| **Section ID** (machine-friendly, no spaces) | e.g. `finish_type` |
| **Required?** | ☐ Yes ☐ No |
| **Choice type** | ☐ Single choice ☐ Multi select (max ___ options) |
| **Help text** (optional, under label) | |
| **Visibility** | ☐ General form ☐ This campaign only ☐ Both (explain if both) |

**Options** (one row per option):

| # | Option label (exact client-facing text) | Option ID (optional, for devs) | Notes / when hidden |
|---|------------------------------------------|-------------------------------|----------------------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

☐ Include **“Other — describe”** free text (max ___ characters): Yes / No  

**Dependencies** (optional): e.g. “Only show if Section X = Option Y”

```
(paste here)
```

---

### 2.2 General form — section checklist

Paste your filled **§2.1 blocks** below for the **general** Custom Shop form.

<!-- Start general form sections -->

*(paste blocks here)*

<!-- End general form sections -->

---

### 2.3 Campaign-only differences (if any)

If this file is for a **campaign**, list sections **removed**, **added**, or **options changed** vs the general form.

| Change type | Section / detail |
|-------------|------------------|
| Added | |
| Removed | |
| Options changed | |

---

## 3. Pricing model

Pick the primary model (you can mix with notes):

- ☐ **Model A — Base + add-ons:** one base price + each option has a $ delta (can be 0).  
- ☐ **Model B — Tiers:** categories map to tiers (e.g. Finish tier 1/2/3).  
- ☐ **Model C — Matrix:** specific combinations map to a price or band (use §3.3).  
- ☐ **Other** (describe):

```
(paste here)
```

---

### 3.1 Base price(s)

| Label | Amount (AUD) | Notes |
|-------|----------------|-------|
| Base instrument (general form) | $ | |
| Base instrument (this campaign, if different) | $ | |

---

### 3.2 Option add-ons (Model A / B)

Use one table per **priced** section, or one combined table with a **Section ID** column.

**Table: option surcharges**

| Section ID | Option label (must match §2) | Add-on (AUD) | Notes |
|------------|------------------------------|--------------|-------|
| | | $ | |
| | | $ | |
| | | $ | |

**Negative amounts** (discounts): allowed? ☐ Yes ☐ No  

---

### 3.3 Combination rules (Model C or overrides)

Use when price depends on **more than one** selection (optional).

| Condition (plain language) | Effect on price (AUD or %) |
|----------------------------|----------------------------|
| e.g. If finish = X and top wood = Y | +$____ or use band |
| | |

**Caps / floors** (optional):

| Rule | Value |
|------|--------|
| Minimum total estimate | $ |
| Maximum before “Call for quote” | $ |

---

### 3.4 How we compute the displayed range

Describe in one short paragraph so engineering can implement the same math:

```
Example: Sum base + all selected add-ons. Range low = that sum; range high = sum + 15% buffer for wood variance. 
(Replace with your real rule.)
```

| Display | Rule |
|---------|------|
| Low end | |
| High end | |
| Rounding | e.g. nearest $50 / nearest $100 |

---

## 4. Deposit & submission

| Field | Value |
|--------|--------|
| Deposit amount (AUD) | |
| Deposit text shown at submit | |
| Must agree to deposit to submit? | ☐ Yes ☐ No |

---

## 5. Open questions / later phases

*(Anything you’re not deciding yet — e.g. PDF summary, email to staff, multi-currency.)*

```
(paste here)
```

---

## 6. Sign-off

| Role | Name | Date |
|------|------|------|
| Product / admin | | |
| Notes for dev | | |

When this template is complete for **general** and at least one **campaign** (if needed), hand it to engineering to map to Firestore + UI.
