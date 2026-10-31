import sharp from "sharp";
import { createHash } from "node:crypto";
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export async function sanitizeImage(input: Buffer, mime: string) {
  if (!input.length || input.length > MAX_IMAGE_BYTES) throw new Error("FILE");
  const png = input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = input[0] === 255 && input[1] === 216 && input[2] === 255;
  if (!((png && mime === "image/png") || (jpeg && mime === "image/jpeg"))) throw new Error("FILE");
  try {
    const image = sharp(input, { limitInputPixels: 25_000_000, failOn: "warning" });
    const metadata = await image.metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width < 32 ||
      metadata.height < 32 ||
      (metadata.pages ?? 1) > 1
    )
      throw new Error();
    // rotate applies orientation; re-encoding without withMetadata strips EXIF/GPS,
    // XMP/IPTC and trailing/polyglot content, rather than trusting the file extension.
    const bytes = await image
      .rotate()
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 86 })
      .toBuffer();
    if (bytes.length > 3 * 1024 * 1024) throw new Error();
    return {
      bytes,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      mime: "image/jpeg" as const,
    };
  } catch {
    throw new Error("FILE");
  }
}
