import type { UserRole } from "@/types/guitars";

export type PublicLinkDef = {
  id: string;
  label: string;
  /** Short note shown under the label in the sidebar */
  hint?: string;
  /** In-app path or absolute https URL */
  href: string;
  external?: boolean;
  roles: UserRole[];
};

/** Shareable URLs for staff — not shown in the client sidebar. */
export const PUBLIC_LINKS: PublicLinkDef[] = [
  {
    id: "custom-shop-login",
    label: "Custom Shop",
    hint: "Sign in, then submit a request",
    href: "/login?redirect=%2Fcustom-shop",
    roles: ["staff", "admin", "accounting"],
  },
  {
    id: "custom-shop-submit",
    label: "Submit Custom Shop request",
    href: "/custom-shop/submit",
    roles: ["staff", "admin"],
  },
  {
    id: "client-signup",
    label: "Client sign up",
    href: "/signup",
    roles: ["staff", "admin", "accounting"],
  },
  {
    id: "client-login",
    label: "Client login",
    href: "/login?role=client",
    roles: ["staff", "admin", "accounting"],
  },
  {
    id: "public-home",
    label: "Public landing page",
    href: "/",
    roles: ["staff", "admin"],
  },
  {
    id: "custom-shop-gallery",
    label: "Custom Shop gallery",
    href: "https://ormsbyguitars.com/pages/custom-shop",
    external: true,
    roles: ["staff", "admin", "accounting"],
  },
];

export function getPublicLinksForRole(role: UserRole | null | undefined): PublicLinkDef[] {
  if (!role) return [];
  return PUBLIC_LINKS.filter((link) => link.roles.includes(role));
}

export function resolvePublicLinkUrl(href: string, origin: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  const base = origin.replace(/\/$/, "");
  return `${base}${href.startsWith("/") ? href : `/${href}`}`;
}
