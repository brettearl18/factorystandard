/**
 * Standard Custom Shop form — pricing (v1).
 * Model: base AUD + per-option add-ons. Edit STANDARD_BASE_PRICE_AUD and
 * STANDARD_OPTION_ADDONS here until admin-managed forms exist in Firestore.
 */
import { SPEC_CATEGORIES } from "@/constants/guitarSpecs";
import type { GuitarSpecs } from "@/types/guitars";

export const STANDARD_CUSTOM_SHOP_FORM_ID = "standard";
export const STANDARD_CUSTOM_SHOP_FORM_VERSION = "1.0";

/** Starting point before add-ons — adjust to match your price list. */
export const STANDARD_BASE_PRICE_AUD = 7500;

export type StandardPricedSpecKey = (typeof SPEC_CATEGORIES)[number]["key"];

/** Optional budget band (shown on submit step). */
export const CUSTOM_SHOP_BUDGET_RANGES = [
  { value: "", label: "Prefer not to say" },
  { value: "Under $5,000 AUD", label: "Under $5,000 AUD" },
  { value: "$5,000–$8,000 AUD", label: "$5,000–$8,000 AUD" },
  { value: "$8,000–$12,000 AUD", label: "$8,000–$12,000 AUD" },
  { value: "$12,000–$20,000 AUD", label: "$12,000–$20,000 AUD" },
  { value: "$20,000+ AUD", label: "$20,000+ AUD" },
  { value: "Not sure — please advise", label: "Not sure — please advise" },
] as const;

/**
 * Sparse map: spec field → option label → add-on AUD.
 * Unlisted options default to 0. Add rows as you lock in pricing.
 */
export const STANDARD_OPTION_ADDONS: Partial<
  Record<StandardPricedSpecKey, Record<string, number>>
> = {
  topWood: {
    "Brazilian Rosewood": 1500,
    "Ziricote": 900,
    "Snakewood": 800,
    "Printed Graphic (Copper / Rust / etc.)": 400,
    "Composite / Acrylic / Mixed Media": 450,
  },
  bodyWood: {
    "Carbon Fibre": 500,
    "Koa": 400,
    "Claro Walnut": 350,
  },
  neckWood: {
    "Ziricote": 600,
    "Brazilian Rosewood": 800,
    "Carbon Fibre": 400,
  },
  fretboardWood: {
    "Brazilian Rosewood": 700,
    "Ziricote": 550,
    "Snakewood": 500,
    "Pale Moon Ebony": 250,
  },
  bridge: {
    "Evertune": 450,
    "Floyd Rose Original": 350,
    "Ormsby Multiscale Tremolo": 300,
  },
  finishType: {
    "Graphic / Print": 350,
    "Crackle / Relic Effect": 400,
  },
};

export function getStandardOptionAddon(
  key: StandardPricedSpecKey,
  optionLabel: string
): number {
  const map = STANDARD_OPTION_ADDONS[key];
  if (!map) return 0;
  return map[optionLabel] ?? 0;
}

export function computeStandardEstimate(specs: Partial<GuitarSpecs>): {
  base: number;
  optionsTotal: number;
  estimatedTotal: number;
} {
  let optionsTotal = 0;
  for (const cat of SPEC_CATEGORIES) {
    const val = specs[cat.key];
    if (typeof val === "string" && val.trim() !== "") {
      optionsTotal += getStandardOptionAddon(cat.key, val);
    }
  }
  return {
    base: STANDARD_BASE_PRICE_AUD,
    optionsTotal,
    estimatedTotal: STANDARD_BASE_PRICE_AUD + optionsTotal,
  };
}
