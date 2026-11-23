import type { GuitarSpecs } from "@/types/guitars";
import type { CustomShopSpecConstraintRule } from "@/types/customShopSpecCatalog";

/**
 * Returns the first violated rule message, or null if all rules pass.
 * Each rule: when field value is in `when.anyOf`, block field must NOT be in `block.anyOf`.
 */
export function evaluateCustomShopConstraintRules(
  specs: Partial<GuitarSpecs>,
  rules: CustomShopSpecConstraintRule[] | undefined
): string | null {
  if (!rules || rules.length === 0) return null;
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const whenVal = specs[rule.when.field];
    if (typeof whenVal !== "string" || !rule.when.anyOf.includes(whenVal)) continue;
    const blockVal = specs[rule.block.field];
    if (typeof blockVal === "string" && rule.block.anyOf.includes(blockVal)) {
      return rule.message;
    }
  }
  return null;
}
