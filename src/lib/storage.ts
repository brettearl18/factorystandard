import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

export async function uploadGuitarPhoto(
  guitarId: string,
  stageId: string,
  file: File
): Promise<string> {
  // Use timestamp + random string to ensure unique filenames even for rapid uploads
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  const filename = `${timestamp}_${randomStr}_${file.name}`;
  const storageRef = ref(storage, `guitars/${guitarId}/${stageId}/${filename}`);
  
  try {
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading photo:", error);
    throw new Error(`Failed to upload photo: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
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

export async function uploadPaymentReceipt(
  clientUid: string,
  invoiceId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const filename = `${timestamp}_${file.name}`;
  const storageRef = ref(storage, `invoices/${clientUid}/${invoiceId}/receipts/${filename}`);

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
  assetType: "logo" | "favicon" | "background",
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const filename = `${timestamp}_${file.name}`;
  const storageRef = ref(storage, `branding/${assetType}/${filename}`);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

export async function uploadRunUpdateImage(
  runId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const filename = `${timestamp}_${file.name}`;
  const storageRef = ref(storage, `runs/${runId}/updates/${filename}`);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

export async function uploadColorInspirationImage(
  file: File,
  tempId: string = "temp"
): Promise<string> {
  const timestamp = Date.now();
  const filename = `${timestamp}_${file.name}`;
  const storageRef = ref(storage, `guitars/${tempId}/color-inspiration/${filename}`);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

/**
 * Upload a gallery image for a guitar (client-submitted)
 * Path: guitars/{guitarId}/gallery/{filename}
 */
export async function uploadGuitarGalleryImage(
  guitarId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  const filename = `${timestamp}_${randomStr}_${file.name}`;
  const storageRef = ref(storage, `guitars/${guitarId}/gallery/${filename}`);
  
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

/**
 * Deletes an image from Firebase Storage
 * Extracts the file path from a Firebase Storage download URL
 */
export async function deleteImageFromStorage(imageUrl: string): Promise<void> {
  try {
    // Extract the path from the Firebase Storage URL
    // Firebase Storage URLs look like: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?alt=media&token=TOKEN
    const url = new URL(imageUrl);
    
    // Extract the encoded path from the URL
    const pathMatch = url.pathname.match(/\/o\/(.+)/);
    if (!pathMatch) {
      throw new Error("Invalid Firebase Storage URL");
    }
    
    // Decode the path (it's URL encoded)
    const decodedPath = decodeURIComponent(pathMatch[1]);
    
    // Create a reference to the file
    const storageRef = ref(storage, decodedPath);
    
    // Delete the file
    await deleteObject(storageRef);
  } catch (error: any) {
    // If file doesn't exist, that's okay - just log and continue
    if (error?.code === 'storage/object-not-found') {
      console.log("Image already deleted or doesn't exist:", imageUrl);
      return;
    }
    throw error;
  }
}/**
 * Deletes a guitar reference image from storage
 */
export async function deleteGuitarReferenceImage(guitarId: string, imageUrl: string): Promise<void> {
  // Check if it's a Google Drive link - can't delete those
  if (isGoogleDriveLink(imageUrl)) {
    return; // Just return - we'll remove it from the array but can't delete from Drive
  }
  
  // Check if it's a Firebase Storage URL
  if (imageUrl.includes('firebasestorage.googleapis.com')) {
    await deleteImageFromStorage(imageUrl);
  }
}

/**
 * Deletes a photo from a guitar note
 */
export async function deleteGuitarNotePhoto(guitarId: string, stageId: string, imageUrl: string): Promise<void> {
  // Check if it's a Google Drive link - can't delete those
  if (isGoogleDriveLink(imageUrl)) {
    return; // Just return - we'll remove it from the array but can't delete from Drive
  }
  
  // Check if it's a Firebase Storage URL
  if (imageUrl.includes('firebasestorage.googleapis.com')) {
    await deleteImageFromStorage(imageUrl);
  }
}

/**
 * Deletes a run thumbnail from storage
 */
export async function deleteRunThumbnail(runId: string, imageUrl: string): Promise<void> {
  // Check if it's a Firebase Storage URL
  if (imageUrl.includes('firebasestorage.googleapis.com')) {
    await deleteImageFromStorage(imageUrl);
  }
}
