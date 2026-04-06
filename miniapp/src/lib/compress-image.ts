// Client-side image compression via Canvas API
// Runs on device GPU, ~50-150ms on any 2020+ smartphone

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.85;
const MAX_BASE64_SIZE = 1_400_000; // ~1MB base64 ≈ 1.4MB string

export interface CompressResult {
  base64: string;    // data:image/jpeg;base64,...
  sizeKB: number;    // approximate size in KB
  width: number;
  height: number;
}

/**
 * Compress an image file from <input type="file"> to a JPEG data URI.
 * - Resizes to max 1280px on the longest side
 * - JPEG quality 0.85
 * - If still too large, reduces quality step by step
 */
export async function compressImage(file: File): Promise<CompressResult> {
  const bitmap = await createImageBitmap(file);
  const { width: origW, height: origH } = bitmap;

  // Calculate new dimensions
  let width = origW;
  let height = origH;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width > height) {
      height = Math.round((height / width) * MAX_DIMENSION);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width / height) * MAX_DIMENSION);
      height = MAX_DIMENSION;
    }
  }

  // Draw to canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Compress with decreasing quality if needed
  let quality = JPEG_QUALITY;
  let base64 = canvas.toDataURL('image/jpeg', quality);

  while (base64.length > MAX_BASE64_SIZE && quality > 0.4) {
    quality -= 0.1;
    base64 = canvas.toDataURL('image/jpeg', quality);
  }

  const sizeKB = Math.round((base64.length * 3) / 4 / 1024);

  return { base64, sizeKB, width, height };
}
