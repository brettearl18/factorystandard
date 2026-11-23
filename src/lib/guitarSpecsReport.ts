import type { GuitarBuild, GuitarNote, GuitarSpecs } from "@/types/guitars";
import { getNoteTypeLabel } from "@/utils/noteTypes";

const SPEC_LABELS: Record<keyof GuitarSpecs, string> = {
  bodyWood: "Body wood",
  neckWood: "Neck wood",
  fretboardWood: "Fretboard wood",
  topWood: "Top wood",
  bridge: "Bridge",
  tuners: "Tuners",
  nut: "Nut",
  pickguard: "Pickguard",
  pickups: "Pickups",
  pickupNeck: "Neck pickup",
  pickupBridge: "Bridge pickup",
  pickupConfiguration: "Pickup configuration",
  controls: "Controls",
  switch: "Switch",
  strings: "Strings",
  stringGauge: "String gauge",
  scaleLength: "Scale length",
  action: "Action",
  finishColor: "Finish color",
  finishType: "Finish type",
  binding: "Binding",
  inlays: "Inlays",
  frets: "Frets",
  neckProfile: "Neck profile",
  radius: "Radius",
  handedness: "Handedness",
  customNotes: "Custom notes",
};

export interface GuitarSpecsReportItem {
  guitar: GuitarBuild;
  runName?: string;
  stageLabel?: string;
  notes: GuitarNote[];
  /** e.g. https://ormsby-factory-standard-runs.web.app — builds stable public cover URL */
  publicBaseUrl?: string;
}

function formatTimestamp(ms?: number): string {
  if (!ms) return "—";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function formatSpecs(specs?: GuitarSpecs): string[] {
  if (!specs) return ["- (none)"];
  const lines: string[] = [];
  (Object.keys(SPEC_LABELS) as (keyof GuitarSpecs)[]).forEach((key) => {
    const value = specs[key];
    if (value != null && String(value).trim() !== "") {
      lines.push(`- ${SPEC_LABELS[key]}: ${String(value).trim()}`);
    }
  });
  return lines.length > 0 ? lines : ["- (none)"];
}

function formatNotes(notes: GuitarNote[]): string[] {
  if (!notes.length) return ["- (none)"];
  return [...notes]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((note) => {
      const typeLabel = getNoteTypeLabel(note.type);
      const photoCount = note.photoUrls?.length ?? 0;
      const photoBit = photoCount > 0 ? ` [${photoCount} photo${photoCount === 1 ? "" : "s"}]` : "";
      const message = (note.message || "").trim().replace(/\s+/g, " ");
      return `- ${formatTimestamp(note.createdAt)} — ${note.authorName || "Unknown"} [${typeLabel}]${photoBit}: ${message || "(no message)"}`;
    });
}

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const trimmed = url?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/** Cover, reference, and note image URLs for Claude/ChatGPT one-page reports. */
function formatImages(
  guitar: GuitarBuild,
  notes: GuitarNote[],
  publicBaseUrl?: string
): string[] {
  const lines: string[] = [];
  const label = `${guitar.model || "Guitar"} ${guitar.finish || ""}`.trim();
  const base = publicBaseUrl?.replace(/\/$/, "");

  if (base && guitar.coverPhotoUrl?.trim()) {
    const publicProfileUrl = `${base}/api/public/guitars/${guitar.id}/cover`;
    lines.push(`- Public profile image (use this in Claude): ${publicProfileUrl}`);
    lines.push(`  ![${label} profile](${publicProfileUrl})`);
  }

  if (guitar.coverPhotoUrl?.trim()) {
    const url = guitar.coverPhotoUrl.trim();
    lines.push(`- Cover (storage): ${url}`);
    lines.push(`  ![${label} cover](${url})`);
  }

  const refs = uniqueUrls(guitar.referenceImages || []);
  refs.forEach((url, i) => {
    lines.push(`- Reference ${i + 1}: ${url}`);
    lines.push(`  ![${label} reference ${i + 1}](${url})`);
  });

  const notePhotos = uniqueUrls(
    notes.flatMap((n) => n.photoUrls || [])
  ).filter((url) => url !== guitar.coverPhotoUrl?.trim() && !refs.includes(url));

  notePhotos.forEach((url, i) => {
    lines.push(`- Note photo ${i + 1}: ${url}`);
    lines.push(`  ![${label} note photo ${i + 1}](${url})`);
  });

  return lines.length > 0 ? lines : ["- (none)"];
}

export function formatGuitarSpecsReport(items: GuitarSpecsReportItem[]): string {
  const generatedAt = new Date().toISOString();
  const header = [
    `Bulk guitar specs report — ${generatedAt} — ${items.length} guitar${items.length === 1 ? "" : "s"}`,
    "",
    "Prefer the “Public profile image” URL for Claude/ChatGPT one-page reports (stable portal link). Storage URLs are also included.",
  ].join("\n");

  const sections = items.map((item) => {
    const { guitar, runName, stageLabel, notes, publicBaseUrl } = item;
    const customer =
      [guitar.customerName, guitar.customerEmail].filter(Boolean).join(" / ") || "—";

    const lines = [
      `## ${guitar.model || "Untitled"} — ${guitar.finish || "—"}`,
      `- Order #: ${guitar.orderNumber || "—"}`,
      `- Serial: ${guitar.serial || "—"}`,
      `- Customer: ${customer}`,
      `- Run: ${runName || "—"}`,
      `- Stage: ${stageLabel || "—"}`,
      `- Created: ${formatTimestamp(guitar.createdAt)}`,
      `- Updated: ${formatTimestamp(guitar.updatedAt)}`,
      "",
      "### Images (public URLs)",
      ...formatImages(guitar, notes, publicBaseUrl),
      "",
      "### Specs",
      ...formatSpecs(guitar.specs),
      "",
      "### Updates & Notes",
      ...formatNotes(notes),
    ];

    return lines.join("\n");
  });

  return [header, "", sections.join("\n\n---\n\n")].join("\n");
}
