"use client";

import { useRef, useState, useCallback } from "react";
import type { ProductImage } from "@/lib/api/products";
import { uploadProductImage } from "@/lib/uploadProductImage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingImage {
  /** Unique local key */
  localId: string;
  file: File;
  /** Local blob URL for preview */
  previewUrl: string;
  /**
   * "staged"    → create mode: waiting for form submit before uploading
   * "uploading" → edit mode: actively uploading to Supabase
   * "done"      → upload finished (fades out)
   * "error"     → upload failed
   */
  status: "staged" | "uploading" | "done" | "error";
  error?: string;
}

interface ImagesEditorProps {
  /** Already-saved images from the database */
  images: ProductImage[];
  /**
   * Product handle used to build the storage path.
   * - When provided (edit mode): images are uploaded immediately on drop.
   * - When absent (create mode): images are staged locally; the parent is
   *   responsible for uploading them after the product is created.
   */
  productHandle?: string;
  /** Called once an image's storage path is ready (edit mode only) */
  onAdd: (storagePath: string, altText?: string) => void;
  onDelete: (imageId: string) => void;
  onReorder: (imageIds: string[]) => void;
  /** @deprecated kept for backward compatibility; not used internally */
  productId?: string;
  /**
   * Create-mode callbacks.
   * onStagedFile  → called when a file is queued locally (no upload yet).
   * onRemoveStagedFile → called when the user removes a staged file.
   */
  onStagedFile?: (file: File, localId: string) => void;
  onRemoveStagedFile?: (localId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImagesEditor({
  images,
  productHandle,
  onAdd,
  onDelete,
  onStagedFile,
  onRemoveStagedFile,
}: ImagesEditorProps) {
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sorted = [...images].sort((a, b) => a.position - b.position);

  // ── Handle a single file ─────────────────────────────────────────────────
  const handleFile = useCallback(
    (file: File, position: number) => {
      const localId = `${Date.now()}-${Math.random()}`;
      const previewUrl = URL.createObjectURL(file);

      if (!productHandle) {
        // ── Create mode: stage locally, no upload yet ───────────────────────
        setPending((prev) => [
          ...prev,
          { localId, file, previewUrl, status: "staged" },
        ]);
        onStagedFile?.(file, localId);
        return;
      }

      // ── Edit mode: upload immediately ────────────────────────────────────
      setPending((prev) => [
        ...prev,
        { localId, file, previewUrl, status: "uploading" },
      ]);

      uploadProductImage(file, productHandle, position)
        .then((storagePath) => {
          onAdd(storagePath, file.name.replace(/\.[^.]+$/, ""));
          setPending((prev) =>
            prev.map((p) =>
              p.localId === localId ? { ...p, status: "done" } : p,
            ),
          );
          setTimeout(() => {
            setPending((prev) => prev.filter((p) => p.localId !== localId));
            URL.revokeObjectURL(previewUrl);
          }, 1200);
        })
        .catch((err) => {
          setPending((prev) =>
            prev.map((p) =>
              p.localId === localId
                ? {
                    ...p,
                    status: "error",
                    error: err instanceof Error ? err.message : "Upload failed",
                  }
                : p,
            ),
          );
        });
    },
    [productHandle, onAdd, onStagedFile],
  );

  // ── Handle file selection (input or drop) ─────────────────────────────────
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const images_ = Array.from(files).filter((f) =>
        f.type.startsWith("image/"),
      );
      images_.forEach((file, idx) => {
        // position is 1-indexed; sorted.length counts existing saved images
        const position = sorted.length + idx + 1;
        handleFile(file, position);
      });
    },
    [handleFile, sorted.length],
  );

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── Remove a staged image ────────────────────────────────────────────────
  const removeStagedImage = (localId: string, previewUrl: string) => {
    setPending((prev) => prev.filter((p) => p.localId !== localId));
    URL.revokeObjectURL(previewUrl);
    onRemoveStagedFile?.(localId);
  };

  const hasImages = sorted.length > 0 || pending.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">Images</h3>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          + Add image
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Image grid — saved + pending */}
      {hasImages && (
        <div className="grid grid-cols-4 gap-3">
          {/* Already-saved images */}
          {sorted.map((img) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-lg border border-slate-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt_text || "Product image"}
                className="aspect-square w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onDelete(img.id)}
                className="absolute right-1 top-1 hidden rounded-full bg-red-500 p-1 text-white group-hover:flex items-center justify-center"
              >
                <XIcon />
              </button>
            </div>
          ))}

          {/* Pending / uploading / staged images */}
          {pending.map((p) => (
            <div
              key={p.localId}
              className="group relative overflow-hidden rounded-lg border border-slate-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.previewUrl}
                alt={p.status === "staged" ? "Staged" : "Uploading…"}
                className="aspect-square w-full object-cover"
              />

              {/* Staged: show remove button on hover, no blocking overlay */}
              {p.status === "staged" && (
                <button
                  type="button"
                  onClick={() => removeStagedImage(p.localId, p.previewUrl)}
                  className="absolute right-1 top-1 hidden rounded-full bg-slate-700/80 p-1 text-white group-hover:flex items-center justify-center"
                >
                  <XIcon />
                </button>
              )}

              {/* Uploading / done / error: blocking overlay */}
              {p.status !== "staged" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
                  {p.status === "uploading" && (
                    <>
                      <SpinnerIcon />
                      <span className="mt-1 text-[10px] font-medium text-slate-600">
                        Uploading…
                      </span>
                    </>
                  )}
                  {p.status === "done" && (
                    <>
                      <CheckIcon />
                      <span className="mt-1 text-[10px] font-medium text-green-600">
                        Done
                      </span>
                    </>
                  )}
                  {p.status === "error" && (
                    <>
                      <ErrorIcon />
                      <span className="mt-1 text-center text-[10px] font-medium text-red-600 px-1">
                        {p.error}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleFile(p.file, sorted.length + pending.indexOf(p) + 1)
                        }
                        className="mt-1 text-[10px] underline text-slate-600"
                      >
                        Retry
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 text-sm transition-colors",
          isDragging
            ? "border-slate-400 bg-slate-50"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
        ].join(" ")}
      >
        <UploadIcon />
        <span className="font-medium text-slate-600">
          {isDragging ? "Drop to upload" : "Drag & drop or click to upload"}
        </span>
        <span className="text-xs text-slate-400">
          {productHandle
            ? "PNG, JPG, WEBP — uploads immediately"
            : "PNG, JPG, WEBP — saved when you create the product"}
        </span>
      </button>
    </div>
  );
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-5 w-5 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9S3 16.97 3 12 7.03 3 12 3s9 4.03 9 9z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="h-7 w-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}
