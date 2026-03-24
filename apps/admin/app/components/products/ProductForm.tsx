"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { zodResolver } from "@/lib/validation/zod-resolver";
import { productSchema, type ProductFormValues } from "@/lib/validation/product";
import {
  useCreateProduct,
  useUpdateProduct,
  useAddVariant,
  useUpdateVariant,
  useDeleteVariant,
  useAddImage,
  useUpdateImage,
  useDeleteImage,
  useReorderImages,
  type Product,
} from "@/lib/api/products";
import { apiClient } from "@/lib/api/client";
import { uploadProductImage } from "@/lib/uploadProductImage";
import { VariantsEditor, type LocalVariantDraft } from "./VariantsEditor";
import { ImagesEditor } from "./ImagesEditor";
import { CollectionsPicker } from "./CollectionsPicker";
import { useAddCollectionProducts } from "@/lib/api/collections";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCT_TYPES = [
  "T-Shirt",
  "Hoodie",
  "Quarter Zip",
  "Sweatshirt",
  "Long Sleeve",
  "Cap",
  "Tote Bag",
  "Collab",
];

const VENDORS = ["1NRI", "Unlikely Alliances"] as const;

const SUGGESTED_TAGS = [
  "new-arrival",
  "bestseller",
  "limited-edition",
  "collaboration",
  "men",
  "women",
  "unisex",
  "sale",
  "bundle",
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductFormProps {
  mode: "create" | "edit";
  product?: Product;
  onRefresh?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductForm({ mode, product, onRefresh }: ProductFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  // ── Create-mode: staged files collected before the product is created ──────
  // Key = localId assigned by ImagesEditor, value = the File to upload later.
  const stagedFiles = useRef<Map<string, File>>(new Map());
  const [localVariants, setLocalVariants] = useState<LocalVariantDraft[]>([]);

  // Ref to skip the nav guard for form-internal navigations (e.g. after create)
  const bypassNavGuard = useRef(false);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(product?.id || "");
  const addVariant = useAddVariant(product?.id || "");
  const updateVariant = useUpdateVariant(product?.id || "");
  const deleteVariant = useDeleteVariant(product?.id || "");
  const addImage = useAddImage(product?.id || "");
  const updateImage = useUpdateImage(product?.id || "");
  const deleteImage = useDeleteImage(product?.id || "");
  const reorderImages = useReorderImages(product?.id || "");
  const addToCollections = useAddCollectionProducts("");

  // ── Form ────────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: product?.title || "",
      description: product?.description || "",
      handle: product?.handle || "",
      base_price: product?.base_price ?? undefined,
      status: product?.status || "draft",
      gender: product?.gender ?? "all",
      product_type: product?.product_type || "",
      vendor: product?.vendor || "",
      tags: product?.tags || [],
      published: product?.published ?? false,
      gsm: product?.gsm ?? undefined,
      seo_title: product?.seo_title || "",
      seo_description: product?.seo_description || "",
      is_new_arrival: product?.is_new_arrival ?? false,
      is_best_seller: product?.is_best_seller ?? false,
      is_featured: product?.is_featured ?? false,
      early_access_start: product?.early_access_start
        ? product.early_access_start.slice(0, 16)
        : "",
      public_release_date: product?.public_release_date
        ? product.public_release_date.slice(0, 16)
        : "",
    },
  });

  // ── Unsaved-changes guard ────────────────────────────────────────────────────
  // 1. Browser close / refresh / external navigation
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // 2. Next.js client-side navigation (Link clicks, sidebar, etc.)
  useEffect(() => {
    if (!isDirty) return;
    const originalPush = window.history.pushState.bind(window.history);
    window.history.pushState = (state, title, url) => {
      // Skip guard for form-internal navigations (e.g. after successful create)
      if (bypassNavGuard.current) {
        bypassNavGuard.current = false;
        originalPush(state, title, url);
        return;
      }
      // Skip guard if the URL isn't actually changing
      const newPath = url ? String(url) : "";
      if (newPath === window.location.pathname + window.location.search) {
        originalPush(state, title, url);
        return;
      }
      if (window.confirm("You have unsaved changes. Leave without saving?")) {
        originalPush(state, title, url);
      }
    };
    return () => {
      window.history.pushState = originalPush;
    };
  }, [isDirty]);

  // Watch tags so the chip state stays in sync
  const currentTags = watch("tags") as string[] | undefined;

  // ── Tags helpers ────────────────────────────────────────────────────────────
  function tagList(): string[] {
    return (currentTags || []).filter(Boolean);
  }

  function toggleSuggestedTag(tag: string) {
    const list = tagList();
    const next = list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag];
    setValue("tags", next);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function onSubmit(values: ProductFormValues) {
    setError("");
    try {
      if (mode === "create") {
        const created = await createMutation.mutateAsync(
          values as Record<string, unknown>,
        );
        // Add to collections
        for (const collId of selectedCollections) {
          try { await addToCollections.mutateAsync([created.id]); } catch { /* best effort */ }
        }
        // Upload staged images now that we have the product handle
        const files = Array.from(stagedFiles.current.entries());
        for (let i = 0; i < files.length; i++) {
          const [, file] = files[i];
          try {
            const storagePath = await uploadProductImage(file, created.handle, i + 1);
            await apiClient(`/products/${created.id}/images`, {
              method: "POST",
              body: { src: storagePath, alt_text: file.name.replace(/\.[^.]+$/, "") },
            });
          } catch { /* best effort */ }
        }
        stagedFiles.current.clear();
        // Flush queued variants
        for (const v of localVariants) {
          try {
            await apiClient(`/products/${created.id}/variants`, {
              method: "POST",
              body: {
                option1_name: v.option1_value ? v.option1_name : undefined,
                option1_value: v.option1_value || undefined,
                option2_name: v.option2_value ? v.option2_name : undefined,
                option2_value: v.option2_value || undefined,
                price: v.price,
                sku: v.sku,
                inventory_quantity: v.inventory_quantity,
              },
            });
          } catch { /* best effort */ }
        }
        bypassNavGuard.current = true;
        router.push(`/products/${created.id}`);
      } else if (product) {
        await updateMutation.mutateAsync(values as Record<string, unknown>);
        reset(values); // clear isDirty so the nav guard doesn't fire after save
        onRefresh?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  // ─── JSX ────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left column — main content ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
              <input
                {...register("title")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                {...register("description")}
                rows={4}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Base price</label>
              <input
                type="number"
                step="0.01"
                {...register("base_price")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              {errors.base_price && <p className="mt-1 text-xs text-red-500">{errors.base_price.message}</p>}
            </div>
          </div>

          {/* Variants — shown in both modes */}
          <div className="rounded-lg border border-slate-200 p-4">
            {mode === "edit" && product ? (
              <VariantsEditor
                productTitle={watch("title")}
                basePrice={watch("base_price")}
                variants={product.product_variants || []}
                productImages={product.product_images || []}
                onAdd={(data) => addVariant.mutate(data, { onSuccess: onRefresh, onError: (err) => setError(err instanceof Error ? err.message : "Failed to add variant") })}
                onUpdate={(variantId, data) => updateVariant.mutate({ variantId, data }, { onSuccess: onRefresh, onError: (err) => setError(err instanceof Error ? err.message : "Failed to update variant") })}
                onDelete={(variantId) => {
                  if (!confirm("Delete this variant?")) return;
                  deleteVariant.mutate(variantId, {
                    onSuccess: onRefresh,
                    onError: (err) => setError(err instanceof Error ? err.message : "Failed to delete variant"),
                  });
                }}
              />
            ) : (
              <VariantsEditor
                productTitle={watch("title")}
                basePrice={watch("base_price")}
                variants={[]}
                localVariants={localVariants}
                onAdd={(data) => {
                  const draft: LocalVariantDraft = {
                    localId: `${Date.now()}-${Math.random()}`,
                    option1_name: data.option1_name as string | undefined,
                    option1_value: data.option1_value as string | undefined,
                    option2_name: data.option2_name as string | undefined,
                    option2_value: data.option2_value as string | undefined,
                    price: data.price as number | undefined,
                    sku: data.sku as string | undefined,
                    inventory_quantity: (data.inventory_quantity as number) || 0,
                  };
                  setLocalVariants((prev) => [...prev, draft]);
                }}
                onDeleteLocal={(localId) =>
                  setLocalVariants((prev) => prev.filter((v) => v.localId !== localId))
                }
              />
            )}
          </div>

          {/* Images — shown in both modes */}
          <div className="rounded-lg border border-slate-200 p-4">
            {mode === "edit" && product ? (
              <ImagesEditor
                images={product.product_images || []}
                productId={product.id}
                productHandle={product.handle}
                productVariants={product.product_variants || []}
                onAdd={(src, altText) => addImage.mutate({ src, alt_text: altText })}
                onUpdateImageType={(imageId, imageType, variantId) =>
                  updateImage.mutate({ imageId, data: { image_type: imageType, variant_id: variantId } })
                }
                onDelete={(imageId) => deleteImage.mutate(imageId)}
                onReorder={(imageIds) => reorderImages.mutate(imageIds)}
              />
            ) : (
              <ImagesEditor
                images={[]}
                onAdd={() => { }}
                onDelete={() => { }}
                onReorder={() => { }}
                onStagedFile={(file, localId) => {
                  stagedFiles.current.set(localId, file);
                }}
                onRemoveStagedFile={(localId) => {
                  stagedFiles.current.delete(localId);
                }}
              />
            )}
          </div>
        </div>

        {/* ── Right sidebar ───────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Status */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-4">
            <h3 className="text-sm font-medium text-slate-700">Status</h3>
            <select
              {...register("status")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("published")} />
              Published
            </label>
          </div>

          {/* Organization */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-4">
            <h3 className="text-sm font-medium text-slate-700">Organization</h3>

            {/* Gender */}
            <div>
              <label className="mb-1 block text-xs text-slate-500">Gender</label>
              <select
                {...register("gender")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="all">All</option>
              </select>
            </div>

            {/* Product type — combobox with datalist */}
            <div>
              <label className="mb-1 block text-xs text-slate-500">Product type</label>
              <input
                {...register("product_type")}
                list="product-type-options"
                placeholder="Select or type a new type…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <datalist id="product-type-options">
                {PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            {/* Vendor — constrained dropdown */}
            <div>
              <label className="mb-1 block text-xs text-slate-500">Vendor</label>
              <select
                {...register("vendor")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">— Select vendor —</option>
                {VENDORS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* Tags — chip suggestions + free text */}
            <div>
              <label className="mb-1 block text-xs text-slate-500">Tags</label>
              {/* Suggested tag chips */}
              <div className="mb-2 flex flex-wrap gap-1.5">
                {SUGGESTED_TAGS.map((tag) => {
                  const active = tagList().includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleSuggestedTag(tag)}
                      className={[
                        "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700",
                      ].join(" ")}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              {/* Free-text input for custom tags */}
              <input
                placeholder="Add custom tags, comma-separated…"
                defaultValue={product?.tags?.filter((t) => !SUGGESTED_TAGS.includes(t)).join(", ") || ""}
                onChange={(e) => {
                  const custom = e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);
                  const suggested = tagList().filter((t) => SUGGESTED_TAGS.includes(t));
                  setValue("tags", [...new Set([...suggested, ...custom])]);
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              {/* Active tags preview */}
              {tagList().length > 0 && (
                <p className="mt-1.5 text-xs text-slate-400">
                  {tagList().join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* Merchandising */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-3">
            <h3 className="text-sm font-medium text-slate-700">Merchandising</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("is_new_arrival")} />
                New arrival
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("is_best_seller")} />
                Best seller
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("is_featured")} />
                Featured
              </label>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">GSM (fabric weight)</label>
              <input
                type="number"
                {...register("gsm")}
                placeholder="e.g. 320"
                min={100}
                max={500}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              {errors.gsm && <p className="mt-1 text-xs text-red-500">{errors.gsm.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Early access start</label>
              <input
                type="datetime-local"
                {...register("early_access_start")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Public release date</label>
              <input
                type="datetime-local"
                {...register("public_release_date")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {/* SEO */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-4">
            <h3 className="text-sm font-medium text-slate-700">SEO</h3>
            <div>
              <label className="mb-1 block text-xs text-slate-500">URL handle</label>
              <input
                {...register("handle")}
                placeholder="auto-generated-from-title"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">SEO title</label>
              <input
                {...register("seo_title")}
                placeholder="Override page title for search engines"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">SEO description</label>
              <textarea
                {...register("seo_description")}
                rows={2}
                placeholder="Override meta description for search engines"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {/* Collections (create mode only) */}
          {mode === "create" && (
            <div className="rounded-lg border border-slate-200 p-4">
              <CollectionsPicker
                selected={selectedCollections}
                onChange={setSelectedCollections}
              />
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-slate-900 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create"
              ? "Create product"
              : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (isDirty && !window.confirm("You have unsaved changes. Leave without saving?")) return;
            bypassNavGuard.current = true;
            router.push("/products");
          }}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
