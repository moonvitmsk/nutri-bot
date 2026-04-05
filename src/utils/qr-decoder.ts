import jsQR from 'jsqr';
import sharp from 'sharp';

export async function decodeQrFromBuffer(imageBuffer: Buffer): Promise<string | null> {
  // Convert to raw RGBA using sharp
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  return code?.data || null;
}

export function extractQrCode(rawText: string): string | null {
  // QR codes under Moonvit caps have format: MV-SKU-XXXXXXXX
  // Or may contain a URL like https://t.me/... with a code param
  const mvMatch = rawText.match(/MV-[A-Z0-9-]+/i);
  if (mvMatch) return mvMatch[0].toUpperCase();

  // Try to extract from URL params
  const urlMatch = rawText.match(/[?&]code=([A-Za-z0-9-]+)/);
  if (urlMatch) return urlMatch[1].toUpperCase();

  // Return raw if short enough to be a code
  if (rawText.length < 50 && /^[A-Z0-9-]+$/i.test(rawText.trim())) {
    return rawText.trim().toUpperCase();
  }

  return null;
}
