import { getToken } from "./api/client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const BUCKET = "product-images";

/**
 * Resize an image file to the given dimensions (cover crop) and return a
 * JPEG Blob, using the browser's Canvas API.
 */
function resizeToJpeg(
  file: File | Blob,
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
 * Upload a single blob to Supabase Storage via the backend (service-role key).
 * The backend endpoint is authenticated with the admin JWT.
 */
async function uploadViaBackend(
  blob: Blob,
  storagePath: string,
  contentType: string,
): Promise<void> {
  const form = new FormData();
  form.append(
    "file",
    new File([blob], storagePath.split("/").pop()!, { type: contentType }),
  );
  form.append("path", storagePath);

  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/products/admin/upload-image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Upload failed: ${res.status}`);
  }
}

/**
 * Upload a product image via the backend (which uses the Supabase service-role
 * key to bypass storage RLS). Follows the project's folder structure:
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
 *          stored in `product_images.src`. The backend's resolveImageUrl()
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

  // ── 1. Upload the original file via backend ───────────────────────────────
  const originalPath = `originals/${handle}/${baseName}.${ext}`;
  await uploadViaBackend(file, originalPath, file.type);

  // ── 2. Generate resized variants and upload each via backend ──────────────
  const variants: Array<{ w: number; h: number; folder: string; suffix: string }> = [
    { w: 800, h: 800, folder: "optimized", suffix: "800x800" },
    { w: 400, h: 400, folder: "optimized", suffix: "400x400" },
    { w: 100, h: 100, folder: "thumbnails", suffix: "thumb" },
  ];

  for (const v of variants) {
    try {
      const blob = await resizeToJpeg(file, v.w, v.h);
      const variantPath = `${v.folder}/${handle}/${prefix}__${type}__${v.suffix}.jpg`;
      await uploadViaBackend(blob, variantPath, "image/jpeg");
    } catch (err) {
      // Non-fatal: log but don't abort the whole upload
      console.warn(`Variant upload failed (${v.folder}/${v.suffix}):`, err);
    }
  }

  // Return the storage path stored in product_images.src
  return `${BUCKET}/${originalPath}`;
}
