import { it, expect } from "vitest";
import sharp from "sharp";
import { sanitizeImage, MAX_IMAGE_BYTES } from "./images";
it("re-encodes photos and strips EXIF/private metadata", async () => {
  const input = await sharp({
    create: { width: 64, height: 64, channels: 3, background: "#445566" },
  })
    .withExif({ IFD0: { ImageDescription: "PRIVATE GPS FIXTURE" } })
    .jpeg()
    .toBuffer();
  expect((await sharp(input).metadata()).exif).toBeDefined();
  const result = await sanitizeImage(input, "image/jpeg");
  const meta = await sharp(result.bytes).metadata();
  expect(meta.format).toBe("jpeg");
  expect(meta.exif).toBeUndefined();
  expect(meta.xmp).toBeUndefined();
  expect(result.bytes.includes(Buffer.from("PRIVATE GPS FIXTURE"))).toBe(false);
  expect(result.sha256).toHaveLength(64);
});
it("accepts a decoded PNG but never trusts its declared MIME", async () => {
  const png = await sharp({ create: { width: 40, height: 40, channels: 3, background: "#334455" } })
    .png()
    .toBuffer();
  await expect(sanitizeImage(png, "image/jpeg")).rejects.toThrow("FILE");
  expect((await sanitizeImage(png, "image/png")).mime).toBe("image/jpeg");
});
it.each([
  ["image/svg+xml", "<svg/>"],
  ["application/pdf", "%PDF-1.7"],
  ["image/jpeg", "not an image"],
])("rejects unsupported or spoofed %s", async (mime, text) => {
  await expect(sanitizeImage(Buffer.from(text), mime)).rejects.toThrow("FILE");
});
it("rejects excess bytes and invalid decoders before storage", async () => {
  await expect(sanitizeImage(Buffer.alloc(MAX_IMAGE_BYTES + 1), "image/png")).rejects.toThrow(
    "FILE",
  );
  await expect(sanitizeImage(Buffer.from([255, 216, 255, 0, 0]), "image/jpeg")).rejects.toThrow(
    "FILE",
  );
});
