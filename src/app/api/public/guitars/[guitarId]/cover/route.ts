import { NextRequest, NextResponse } from "next/server";

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ormsby-factory-standard-runs";

const ALLOWED_HOST_SUFFIXES = [
  "firebasestorage.googleapis.com",
  "firebasestorage.app",
  "storage.googleapis.com",
  "googleapis.com",
  "googleusercontent.com",
  "dropbox.com",
  "dropboxusercontent.com",
  "drive.google.com",
  "google.com",
];

function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    );
  } catch {
    return false;
  }
}

/**
 * Public profile image for Claude/ChatGPT reports.
 * Looks up coverPhotoUrl from publicGuitarProfiles and redirects (or streams).
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ guitarId: string }> }
) {
  const { guitarId } = await context.params;
  if (!guitarId || !/^[A-Za-z0-9_-]+$/.test(guitarId)) {
    return NextResponse.json({ error: "Invalid guitar id" }, { status: 400 });
  }

  try {
    const docUrl =
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
      `/databases/(default)/documents/publicGuitarProfiles/${encodeURIComponent(guitarId)}`;

    const res = await fetch(docUrl, { next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: "No public cover image for this guitar" },
        { status: 404 }
      );
    }

    const data = (await res.json()) as {
      fields?: { coverPhotoUrl?: { stringValue?: string } };
    };
    const coverPhotoUrl = data.fields?.coverPhotoUrl?.stringValue?.trim();
    if (!coverPhotoUrl || !isAllowedImageUrl(coverPhotoUrl)) {
      return NextResponse.json(
        { error: "No public cover image for this guitar" },
        { status: 404 }
      );
    }

    // Prefer redirect so Claude gets the real image bytes from Storage
    return NextResponse.redirect(coverPhotoUrl, 302);
  } catch (error) {
    console.error("public cover lookup failed:", error);
    return NextResponse.json({ error: "Failed to resolve cover image" }, { status: 500 });
  }
}
