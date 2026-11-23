/**
 * Default Custom Shop catalog: seeds Firestore and client fallback when no doc exists.
 */
import { SPEC_CATEGORIES, PICKUP_BRIDGE_OPTIONS, PICKUP_NECK_OPTIONS } from "@/constants/guitarSpecs";
import type {
  CustomShopCatalogSpecKey,
  CustomShopSpecCatalogGlobal,
  CustomShopSpecConstraintRule,
  CustomShopSpecOptionRow,
} from "@/types/customShopSpecCatalog";
import { STANDARD_BASE_PRICE_AUD, STANDARD_OPTION_ADDONS } from "@/lib/customShopStandardPricing";

/** Neck models that are humbuckers / not single-coil — used for example conflict rules */
export const NECK_HUMBUCKER_LABELS = PICKUP_NECK_OPTIONS.filter(
  (o) => !o.includes("Single Coil") && o !== "Other Ormsby" && o !== "Non-Ormsby"
);

/** Bridge models that are humbuckers / not single-coil */
export const BRIDGE_HUMBUCKER_LABELS = PICKUP_BRIDGE_OPTIONS.filter(
  (o) => !o.includes("Single Coil") && o !== "Other Ormsby" && o !== "Non-Ormsby"
);

const DEFAULT_CONSTRAINT_RULES: CustomShopSpecConstraintRule[] = [
  {
    id: "s-neck-only-no-bridge-humbucker",
    enabled: true,
    message:
      "With “S (neck only)” you’re not using a bridge humbucker — pick a single-coil / “Non-Ormsby” bridge option, or change pickup configuration.",
    when: { field: "pickupConfiguration", anyOf: ["S (neck only)"] },
    block: { field: "pickupBridge", anyOf: [...BRIDGE_HUMBUCKER_LABELS] },
  },
  {
    id: "h-bridge-only-no-neck-humbucker",
    enabled: true,
    message:
      "With “H (bridge only)” you’re not using a neck humbucker — pick a single-coil / “Non-Ormsby” neck pickup, or change pickup configuration.",
    when: { field: "pickupConfiguration", anyOf: ["H (bridge only)"] },
    block: { field: "pickupNeck", anyOf: [...NECK_HUMBUCKER_LABELS] },
  },
  {
    id: "no-selector-single-no-dual-humbucker-neck",
    enabled: true,
    message:
      'With “No Selector (single pickup)” the neck slot should not be a humbucker unless that is your only pickup — pick a single-coil neck model or adjust configuration.',
    when: { field: "pickupConfiguration", anyOf: ["No Selector (single pickup)"] },
    block: { field: "pickupNeck", anyOf: [...NECK_HUMBUCKER_LABELS] },
  },
];

function optionsForCategory(key: CustomShopCatalogSpecKey): CustomShopSpecOptionRow[] {
  const cat = SPEC_CATEGORIES.find((c) => c.key === key);
  if (!cat) return [];
  const addonMap = STANDARD_OPTION_ADDONS[key as keyof typeof STANDARD_OPTION_ADDONS] as
    | Record<string, number>
    | undefined;
  return cat.options.map((label) => ({
    label,
    priceDeltaAUD: addonMap?.[label] ?? 0,
  }));
}

export function buildDefaultCustomShopSpecCatalog(): CustomShopSpecCatalogGlobal {
  const categories: CustomShopSpecCatalogGlobal["categories"] = {};
  for (const cat of SPEC_CATEGORIES) {
    categories[cat.key as CustomShopCatalogSpecKey] = {
      options: optionsForCategory(cat.key as CustomShopCatalogSpecKey),
    };
  }
  return {
    schemaVersion: 1,
    standardBasePriceAUD: STANDARD_BASE_PRICE_AUD,
    categories,
    constraintRules: DEFAULT_CONSTRAINT_RULES,
  };
}
