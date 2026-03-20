import { supabase } from "./supabase-client";

const BUCKET = "product-images";

/**
 * Resize an image file to the given dimensions (cover crop) and return a
 * JPEG Blob, using the browser's Canvas API.
 */
function resizeToJpeg(
  file: File,
  width: number,
  height: number,
  quality = 0.85,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context unavailable"));

      // Cover crop: keep aspect ratio, fill the target box
      const srcAspect = img.width / img.height;
      const dstAspect = width / height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (srcAspect > dstAspect) {
        sw = img.height * dstAspect;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / dstAspect;
        sy = (img.height - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for resizing"));
    };

    img.src = objectUrl;
  });
}

/**
 * Upload a product image to Supabase Storage following the project's
 * established folder structure:
 *
 *   originals/{handle}/{prefix}__{type}__{timestamp}.{ext}   ← stored in DB
 *   optimized/{handle}/{prefix}__{type}__800x800.jpg
 *   optimized/{handle}/{prefix}__{type}__400x400.jpg
 *   thumbnails/{handle}/{prefix}__{type}__thumb.jpg
 *
 * @param file         The image File to upload.
 * @param handle       Product handle (becomes the sub-folder name).
 * @param position     1-indexed position; 1 → "main", N → "shot-N".
 * @param colorPrefix  Optional colour / option-1 value (e.g. "black").
 *                     Defaults to "product" when not supplied.
 * @returns The storage path `product-images/originals/…` that should be
 *          stored in `product_images.src`.  The backend's resolveImageUrl()
 *          will convert it to a full public URL on read.
 */
export async function uploadProductImage(
  file: File,
  handle: string,
  position: number,
  colorPrefix = "product",
): Promise<string> {
  const prefix = colorPrefix.toLowerCase().replace(/\s+/g, "-");
  const type = position === 1 ? "main" : `shot-${position}`;
  const ts = Date.now();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const baseName = `${prefix}__${type}__${ts}`;

  // ── 1. Upload the original file ──────────────────────────────────────────
  const originalPath = `originals/${handle}/${baseName}.${ext}`;
  const { error: origError } = await supabase.storage
    .from(BUCKET)
    .upload(originalPath, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (origError) throw new Error(`Original upload failed: ${origError.message}`);

  // ── 2. Generate and upload optimised / thumbnail variants ────────────────
  const variants: Array<{ w: number; h: number; folder: string; suffix: string }> = [
    { w: 800, h: 800, folder: "optimized", suffix: "800x800" },
    { w: 400, h: 400, folder: "optimized", suffix: "400x400" },
    { w: 100, h: 100, folder: "thumbnails", suffix: "thumb" },
  ];

  for (const v of variants) {
    const blob = await resizeToJpeg(file, v.w, v.h);
    const variantPath = `${v.folder}/${handle}/${prefix}__${type}__${v.suffix}.jpg`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(variantPath, blob, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: true,
      });
    if (error) {
      // Non-fatal: log but don't abort the whole upload
      console.warn(`Variant upload failed (${variantPath}): ${error.message}`);
    }
  }

  // Return the storage path that goes into product_images.src
  return `${BUCKET}/${originalPath}`;
}
