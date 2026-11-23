"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Copy, Check, ExternalLink, Link2 } from "lucide-react";
import type { UserRole } from "@/types/guitars";
import {
  getPublicLinksForRole,
  resolvePublicLinkUrl,
  type PublicLinkDef,
} from "@/lib/publicLinks";

function PublicLinkRow({
  link,
  origin,
  active,
  onNavigate,
}: {
  link: PublicLinkDef;
  origin: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const fullUrl = useMemo(() => resolvePublicLinkUrl(link.href, origin), [link.href, origin]);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        window.prompt("Copy this link:", fullUrl);
      }
    },
    [fullUrl]
  );

  const rowClass = `group flex items-start gap-2 rounded-xl px-2 py-2 transition ${
    active ? "bg-white/10" : "hover:bg-white/5"
  }`;

  const content = (
    <>
      <span className="mt-0.5 shrink-0">
        {link.external ? (
          <ExternalLink className="h-3.5 w-3.5 text-white/50" />
        ) : (
          <Link2 className="h-3.5 w-3.5 text-white/50" />
        )}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm truncate ${active ? "text-white font-medium" : "text-white/80"}`}>
          {link.label}
        </span>
        {link.hint && (
          <span className="block text-[10px] text-white/45 truncate mt-0.5">{link.hint}</span>
        )}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        title="Copy link"
        aria-label={`Copy link for ${link.label}`}
        className="shrink-0 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 sm:opacity-70 sm:group-hover:opacity-100 focus:opacity-100 transition"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-teal" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </>
  );

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={rowClass}
        onClick={onNavigate}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={link.href} onClick={onNavigate} className={rowClass}>
      {content}
    </Link>
  );
}

export function PublicLinksNav({
  userRole,
  onNavigate,
}: {
  userRole: UserRole | null | undefined;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const links = getPublicLinksForRole(userRole);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://ormsby-factory-standard-runs.web.app";

  if (links.length === 0) return null;

  const isLinkActive = (href: string) => {
    if (/^https?:\/\//i.test(href)) return false;
    const path = href.split("?")[0];
    return pathname === path || pathname?.startsWith(path + "/");
  };

  return (
    <div className="pt-4 mt-2">
      <div className="h-px bg-white/10 mb-3" />
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
        Public links
      </p>
      <p className="px-3 pb-2 text-[10px] text-white/35 leading-snug">
        Share with clients — hover a row and click copy
      </p>
      <div className="space-y-0.5">
        {links.map((link) => (
          <PublicLinkRow
            key={link.id}
            link={link}
            origin={origin}
            active={isLinkActive(link.href)}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}
