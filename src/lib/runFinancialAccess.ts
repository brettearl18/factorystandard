import type { UserRole } from "@/types/guitars";

/** Staff, admin, and accounting can open per-run financial reports. */
export function canViewRunFinancials(role: UserRole | null | undefined): boolean {
  return role === "staff" || role === "admin" || role === "accounting";
}

/** Accounting sees a read-only runs list (financial reports only, not the production board). */
export function isAccountingRunsView(role: UserRole | null | undefined): boolean {
  return role === "accounting";
}
