import { SPEC_CATEGORIES } from "@/constants/guitarSpecs";
import type { GuitarSpecs } from "@/types/guitars";
import type {
  CustomShopCatalogSpecKey,
  CustomShopSpecCatalogGlobal,
  CustomShopSpecOptionRow,
} from "@/types/customShopSpecCatalog";

export function getOptionPriceFromCatalog(
  catalog: CustomShopSpecCatalogGlobal,
  key: CustomShopCatalogSpecKey,
  optionLabel: string
): number {
  const rows = catalog.categories[key]?.options;
  if (!rows) return 0;
  const row = rows.find((o) => o.label === optionLabel);
  return typeof row?.priceDeltaAUD === "number" && !Number.isNaN(row.priceDeltaAUD) ? row.priceDeltaAUD : 0;
}

export function computeEstimateFromCatalog(
  specs: Partial<GuitarSpecs>,
  catalog: CustomShopSpecCatalogGlobal
): { base: number; optionsTotal: number; estimatedTotal: number } {
  let optionsTotal = 0;
  for (const cat of SPEC_CATEGORIES) {
    const k = cat.key as CustomShopCatalogSpecKey;
    const val = specs[k];
    if (typeof val === "string" && val.trim() !== "") {
      optionsTotal += getOptionPriceFromCatalog(catalog, k, val);
    }
  }
  const base =
    typeof catalog.standardBasePriceAUD === "number" && !Number.isNaN(catalog.standardBasePriceAUD)
      ? catalog.standardBasePriceAUD
      : 0;
  return { base, optionsTotal, estimatedTotal: base + optionsTotal };
}

export type WizardCategoryRow = {
  key: CustomShopCatalogSpecKey;
  label: string;
  options: CustomShopSpecOptionRow[];
};

export function buildWizardCategoriesFromCatalog(catalog: CustomShopSpecCatalogGlobal): WizardCategoryRow[] {
  return SPEC_CATEGORIES.map((cat) => {
    const key = cat.key as CustomShopCatalogSpecKey;
    const fromDb = catalog.categories[key]?.options;
    const options: CustomShopSpecOptionRow[] =
      fromDb && fromDb.length > 0
        ? fromDb
        : cat.options.map((label) => ({ label, priceDeltaAUD: 0 }));
    return { key, label: cat.label, options };
  });
}
