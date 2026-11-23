import type { GuitarSpecs } from "@/types/guitars";

/** Spec keys that appear in the standard Custom Shop wizard (from SPEC_CATEGORIES). */
export type CustomShopCatalogSpecKey = keyof Pick<
  GuitarSpecs,
  | "bodyWood"
  | "topWood"
  | "neckWood"
  | "fretboardWood"
  | "pickupNeck"
  | "pickupBridge"
  | "pickupConfiguration"
  | "controls"
  | "switch"
  | "bridge"
  | "tuners"
  | "nut"
  | "pickguard"
  | "strings"
  | "stringGauge"
  | "scaleLength"
  | "action"
  | "finishType"
  | "binding"
  | "inlays"
  | "frets"
  | "neckProfile"
  | "radius"
  | "handedness"
>;

export interface CustomShopSpecOptionRow {
  label: string;
  /** Upgrade surcharge in AUD when this option is selected */
  priceDeltaAUD: number;
}

export interface CustomShopSpecConstraintRule {
  id: string;
  enabled: boolean;
  /** Shown to the client when the rule fires */
  message: string;
  /** If the current value of `field` is one of `anyOf`, the rule is active */
  when: { field: CustomShopCatalogSpecKey; anyOf: string[] };
  /** If active and `field`’s counterpart here is one of `anyOf`, submission / next step is blocked */
  block: { field: CustomShopCatalogSpecKey; anyOf: string[] };
}

export interface CustomShopSpecCatalogGlobal {
  schemaVersion: number;
  /** Indicative base before per-option add-ons */
  standardBasePriceAUD: number;
  /** Per-category option list + upgrade price */
  categories: Partial<Record<CustomShopCatalogSpecKey, { options: CustomShopSpecOptionRow[] }>>;
  /** Incompatible combinations (e.g. single-pickup layout + humbucker model) */
  constraintRules: CustomShopSpecConstraintRule[];
  updatedAt?: number;
}
