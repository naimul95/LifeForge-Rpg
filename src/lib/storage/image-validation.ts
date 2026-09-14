export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;

export type SupportedImageMimeType = (typeof SUPPORTED_IMAGE_MIME_TYPES)[number];

function startsWith(buffer: Buffer, value: string, offset = 0) {
  return buffer.subarray(offset, offset + value.length).toString() === value;
}

export function detectImageMimeType(buffer: Buffer): SupportedImageMimeType | null {
  const header = buffer.subarray(0, 12);

  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return "image/jpeg";
  if (header.toString("hex") === "89504e470d0a1a0a") return "image/png";
  if (startsWith(header, "GIF87a") || startsWith(header, "GIF89a")) return "image/gif";
  if (startsWith(header, "RIFF") && startsWith(header, "WEBP", 8)) return "image/webp";
  if (startsWith(header, "\x00\x00\x00") && startsWith(header, "ftyp", 4)) {
    const brand = buffer.subarray(8, 12).toString().toLowerCase();
    if (["heic", "heix", "hevc", "hevx"].includes(brand)) return "image/heic";
    if (["mif1", "msf1"].includes(brand)) return "image/heif";
  }

  return null;
}

export function getUploadType(declaredType: string, buffer: Buffer) {
  return detectImageMimeType(buffer) ?? declaredType.toLowerCase().split(";")[0].trim();
}
