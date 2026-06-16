"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { ProductImage, ProductVariant } from "@/lib/api/products";
import { uploadProductImage } from "@/lib/uploadProductImage";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

interface ImageUpdate {
  imageType?: string;
  variantId?: string | null;
  colorTags?: string[];
}

interface ImagesEditorProps {
  /** Already-saved images from the database */
  images: ProductImage[];
  productHandle?: string;
  /** Variants — used to derive the available colour options */
  productVariants?: ProductVariant[];
  onAdd: (storagePath: string, altText?: string) => void;
  /** Called when the admin changes mapping on a saved image */
  onUpdateImage?: (imageId: string, update: ImageUpdate) => void;
  /** @deprecated use onUpdateImage */
  onUpdateImageType?: (imageId: string, imageType: string, variantId: string | null) => void;
  onDelete: (imageId: string) => void;
  onReorder: (imageIds: string[]) => void;
  productId?: string;
  onStagedFile?: (file: File, localId: string) => void;
  onRemoveStagedFile?: (localId: string) => void;
}

// ─── ImageCard ────────────────────────────────────────────────────────────────

function ImageCard({
  img,
  availableColors,
  canEdit,
  onUpdate,
  onDelete,
}: {
  img: ProductImage;
  availableColors: string[];
  canEdit: boolean;
  onUpdate: (update: ImageUpdate) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const colorTags: string[] = img.color_tags ?? [];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  function toggleColor(color: string) {
    const next = colorTags.includes(color)
      ? colorTags.filter((c) => c !== color)
      : [...colorTags, color];
    onUpdate({ colorTags: next });
  }

  function clearAllColors() {
    onUpdate({ colorTags: [] });
  }

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="relative group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.src}
          alt={img.alt_text || "Product image"}
          className="aspect-square w-full object-cover"
        />
        {/* Drag handle — always grabbable, shown on hover */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute left-1 top-1 hidden group-hover:flex rounded bg-black/70 p-1 text-white items-center justify-center cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
        >
          <DragHandleIcon />
        </button>
        {/* Delete button */}
        <button
          type="button"
          onClick={() => {
            if (confirm("Remove this image? This can't be undone.")) {
              onDelete();
            }
          }}
          className="absolute right-1 top-1 hidden group-hover:flex rounded-full bg-red-500 p-1 text-white items-center justify-center"
        >
          <XIcon />
        </button>
        {/* Edit toggle */}
        {canEdit && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="absolute left-1 bottom-1 hidden group-hover:flex rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white items-center gap-1"
            style={{ marginBottom: colorTags.length > 0 || availableColors.length > 0 ? "1.25rem" : undefined }}
          >
            {open ? "▲ close" : "▼ colours"}
          </button>
        )}
        {/* Color tag badges */}
        {colorTags.length > 0 && (
          <div className="absolute bottom-1 right-1 flex flex-wrap justify-end gap-0.5 max-w-[90%]">
            {colorTags.map((c) => (
              <span
                key={c}
                className="rounded bg-black/70 px-1 py-px text-[9px] font-medium text-white leading-tight"
              >
                {c}
              </span>
            ))}
          </div>
        )}
        {colorTags.length === 0 && availableColors.length > 0 && (
          <div className="absolute bottom-1 right-1">
            <span className="rounded bg-amber-500/80 px-1 py-px text-[9px] font-medium text-white leading-tight">
              all colours
            </span>
          </div>
        )}
      </div>

      {/* Expanded color mapping panel */}
      {open && canEdit && (
        <div className="bg-slate-50 border-t border-slate-200 p-2 space-y-2">
          {availableColors.length > 0 ? (
            <>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                Show for colours
              </p>
              <div className="flex flex-wrap gap-1">
                {availableColors.map((color) => {
                  const checked = colorTags.includes(color);
                  return (
                    <label
                      key={color}
                      className={`flex items-center gap-1 cursor-pointer rounded px-1.5 py-0.5 text-[10px] border select-none ${
                        checked
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-slate-700 border-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleColor(color)}
                      />
                      {color}
                    </label>
                  );
                })}
              </div>
              <p className="text-[9px] text-slate-400">
                {colorTags.length === 0
                  ? "No colours selected — image shows for all colours."
                  : `Shows only for: ${colorTags.join(", ")}`}
              </p>
              {colorTags.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllColors}
                  className="text-[10px] text-slate-500 underline hover:text-slate-800"
                >
                  Clear — show for all colours
                </button>
              )}
            </>
          ) : (
            <p className="text-[10px] text-slate-400">
              Add colour variants to the product to enable colour mapping.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImagesEditor({
  images,
  productHandle,
  productVariants = [],
  onAdd,
  onUpdateImage,
  onUpdateImageType,
  onDelete,
  onReorder,
  onStagedFile,
  onRemoveStagedFile,
}: ImagesEditorProps) {
  // Shim: if only the legacy callback is provided, wrap it.
  const handleUpdate = (imageId: string, update: ImageUpdate) => {
    if (onUpdateImage) {
      onUpdateImage(imageId, update);
    } else if (onUpdateImageType && update.imageType !== undefined) {
      onUpdateImageType(imageId, update.imageType, update.variantId ?? null);
    }
  };

  // Unique colour values across all variants (option1 = primary colour slot).
  const availableColors: string[] = Array.from(
    new Set(productVariants.map((v) => v.option1_value).filter(Boolean) as string[]),
  );
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [isDropping, setIsDropping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const baseSorted = [...images].sort((a, b) => a.position - b.position);

  // Local order state for instant visual feedback while the server catches up.
  const [orderedIds, setOrderedIds] = useState<string[]>(() =>
    baseSorted.map((img) => img.id),
  );

  // Sync when images prop changes (e.g. after server refetch).
  useEffect(() => {
    setOrderedIds(baseSorted.map((img) => img.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  // Sorted list driven by local order state.
  const sorted = orderedIds
    .map((id) => baseSorted.find((img) => img.id === id))
    .filter(Boolean) as ProductImage[];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedIds((ids) => {
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      const next = arrayMove(ids, oldIndex, newIndex);
      onReorder(next);
      return next;
    });
  }

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
    setIsDropping(true);
  };
  const onDragLeave = () => setIsDropping(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropping(false);
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-4 gap-3 items-start">
              {/* Already-saved images */}
              {sorted.map((img) => (
                <ImageCard
                  key={img.id}
                  img={img}
                  availableColors={availableColors}
                  canEdit={!!(onUpdateImage || onUpdateImageType)}
                  onUpdate={(update) => handleUpdate(img.id, update)}
                  onDelete={() => onDelete(img.id)}
                />
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
          </SortableContext>
        </DndContext>
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
          isDropping
            ? "border-slate-400 bg-slate-50"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
        ].join(" ")}
      >
        <UploadIcon />
        <span className="font-medium text-slate-600">
          {isDropping ? "Drop to upload" : "Drag & drop or click to upload"}
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

function DragHandleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <circle cx="4" cy="2.5" r="1" /><circle cx="8" cy="2.5" r="1" />
      <circle cx="4" cy="6" r="1" /><circle cx="8" cy="6" r="1" />
      <circle cx="4" cy="9.5" r="1" /><circle cx="8" cy="9.5" r="1" />
    </svg>
  );
}

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
