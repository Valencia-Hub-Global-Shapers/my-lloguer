export const LISTING_PHOTOS_BUCKET = "listing-photos";
export const MAX_PHOTOS = 8;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_MAX_DIMENSION = 1600;

export function photoUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${LISTING_PHOTOS_BUCKET}/${path}`;
}

/** storage path convention: <owner_id>/<listing_id|draft>/<file>.webp */
export function photoPath(ownerId: string, folder: string, fileName: string): string {
  return `${ownerId}/${folder}/${fileName}`;
}

/**
 * Downscale a File to <= PHOTO_MAX_DIMENSION px WebP in the browser.
 * Returns the original file when it cannot be processed.
 */
export async function downscaleToWebP(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    PHOTO_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.85),
  );
  return blob ?? file;
}
