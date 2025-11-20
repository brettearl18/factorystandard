import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export async function uploadGuitarPhoto(
  guitarId: string,
  stageId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const filename = `${timestamp}_${file.name}`;
  const storageRef = ref(storage, `guitars/${guitarId}/${stageId}/${filename}`);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

export async function uploadReferenceImage(
  file: File,
  tempId: string = "temp"
): Promise<string> {
  const timestamp = Date.now();
  const filename = `${timestamp}_${file.name}`;
  const storageRef = ref(storage, `guitars/${tempId}/reference/${filename}`);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

export async function uploadInvoiceFile(
  clientUid: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const filename = `${timestamp}_${file.name}`;
  const storageRef = ref(storage, `invoices/${clientUid}/${filename}`);

  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadRunThumbnail(
  runId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const filename = `${timestamp}_${file.name}`;
  const storageRef = ref(storage, `runs/${runId}/thumbnail/${filename}`);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

export async function uploadBrandingAsset(
  assetType: "logo" | "favicon",
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const filename = `${timestamp}_${file.name}`;
  const storageRef = ref(storage, `branding/${assetType}/${filename}`);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

/**
 * Converts a Google Drive share link to a direct image URL
 * Supports formats like:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID (already direct)
 */
export function convertGoogleDriveLink(link: string): string {
  // If it's already a direct link, return as is
  if (link.includes('drive.google.com/uc')) {
    return link;
  }

  // Extract file ID from various Google Drive link formats
  let fileId: string | null = null;

  // Format: https://drive.google.com/file/d/FILE_ID/view
  const fileIdMatch = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch) {
    fileId = fileIdMatch[1];
  }

  // Format: https://drive.google.com/open?id=FILE_ID
  if (!fileId) {
    const openMatch = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (openMatch) {
      fileId = openMatch[1];
    }
  }

  // If we found a file ID, convert to direct image URL
  if (fileId) {
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  // If we can't parse it, return the original link
  // User might have pasted a direct link or a different format
  return link;
}

/**
 * Validates if a string looks like a Google Drive link
 */
export function isGoogleDriveLink(url: string): boolean {
  return url.includes('drive.google.com');
}

