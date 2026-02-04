/**
 * Client-side image compression for uploads (e.g. Custom Shop inspiration images).
 * Resizes to max 1920px on longest side and compresses as JPEG.
 */

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;

export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      let w = width;
      let h = height;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          w = MAX_DIMENSION;
          h = Math.round((height * MAX_DIMENSION) / width);
        } else {
          h = MAX_DIMENSION;
          w = Math.round((width * MAX_DIMENSION) / height);
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
          resolve(new File([blob], name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
