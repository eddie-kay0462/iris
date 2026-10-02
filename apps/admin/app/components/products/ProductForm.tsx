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
import { toast } from "sonner";
import { VariantsEditor, type LocalVariantDraft } from "./VariantsEditor";
import { ImagesEditor } from "./ImagesEditor";
import { CollectionsPicker } from "./CollectionsPicker";
import { useAddCollectionProducts } from "@/lib/api/collections";
import { Modal } from "../v2/Modal";
import { BEFORE_NAVIGATE_EVENT } from "@/lib/navigationGuard";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = ["Tops", "Bottoms", "Accessories", "Footwear"] as const;

const SUBCATEGORY_MAP: Record<string, string[]> = {
  Tops: ["T-Shirts", "Shirts", "Sweatshirts & Tracksuits"],
  Bottoms: ["Shorts", "Pants"],
  Accessories: ["Bags", "Caps", "Socks"],
  Footwear: ["Mules"],
};

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
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  // ── Create-mode: staged files collected before the product is created ──────
  // Key = localId assigned by ImagesEditor, value = the File to upload later.
  const stagedFiles = useRef<Map<string, File>>(new Map());
  const [localVariants, setLocalVariants] = useState<LocalVariantDraft[]>([]);

  // Where the user was heading when the unsaved-changes prompt opened.
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [savingToLeave, setSavingToLeave] = useState(false);
  // Set while saving from the prompt, so a create goes on to that destination
  // instead of to the new product.
  const afterSaveHref = useRef<string | null>(null);

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
      base_price: (product?.base_price ?? "") as unknown as number,
      status: product?.status || "draft",
      gender: product?.gender ?? "all",
      category: product?.category || "",
      product_type: product?.product_type || "",
      vendor: product?.vendor || "",
      tags: product?.tags || [],
      gsm: (product?.gsm ?? "") as unknown as number,
      hq_unit_count: product?.hq_unit_count ?? 1,
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

  // 2. In-app navigation: link clicks (sidebar, breadcrumbs, "Back to all
  //    products", notification items…) are caught in the capture phase,
  //    before Next's <Link> handler runs, and the ⌘/ search announces its
  //    jumps on BEFORE_NAVIGATE_EVENT. Either way the prompt opens instead.
  useEffect(() => {
    if (!isDirty) return;
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === window.location.pathname + window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveTo(url.pathname + url.search + url.hash);
    }
    function onNavigateRequest(e: Event) {
      const href = (e as CustomEvent<{ href: string }>).detail?.href;
      if (!href) return;
      e.preventDefault();
      setLeaveTo(href);
    }
    document.addEventListener("click", onClick, true);
    window.addEventListener(BEFORE_NAVIGATE_EVENT, onNavigateRequest);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(BEFORE_NAVIGATE_EVENT, onNavigateRequest);
    };
  }, [isDirty]);

  function discardAndLeave() {
    const href = leaveTo;
    reset(); // back to the saved values, which also clears isDirty
    setLeaveTo(null);
    if (href) router.push(href);
  }

  async function saveAndLeave() {
    const href = leaveTo;
    if (!href) return;
    setSavingToLeave(true);
    afterSaveHref.current = href;
    let saved = false;
    await handleSubmit(
      async (values) => {
        saved = await onSubmit(values);
      },
      () => {
        toast.error("Some fields need fixing before this can be saved.", { duration: 6000 });
      },
    )();
    afterSaveHref.current = null;
    setSavingToLeave(false);
    setLeaveTo(null);
    // On failure stay put: the errors are on the form, nothing is lost.
    if (saved) router.push(href);
  }

  // Watch tags so the chip state stays in sync
  const currentTags = watch("tags") as string[] | undefined;
  const watchedCategory = watch("category") as string | undefined;

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
  /** Returns true when the save went through. */
  async function onSubmit(values: ProductFormValues): Promise<boolean> {
    const payload = {
      ...values,
      early_access_start: values.early_access_start
        ? new Date(values.early_access_start).toISOString()
        : undefined,
      public_release_date: values.public_release_date
        ? new Date(values.public_release_date).toISOString()
        : undefined,
    };
    try {
      if (mode === "create") {
        const created = await createMutation.mutateAsync(
          payload as Record<string, unknown>,
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
                compare_at_price: v.compare_at_price ?? undefined,
                sku: v.sku,
                inventory_quantity: v.inventory_quantity,
                preorder_enabled: v.preorder_enabled ?? false,
                preorder_limit: v.preorder_enabled ? v.preorder_limit ?? null : null,
              },
            });
          } catch { /* best effort */ }
        }
        toast.success("Product created.");
        reset(values); // clear isDirty before navigating away
        // Saved from the leave prompt: the caller continues to that page.
        if (!afterSaveHref.current) router.push(`/products/${created.id}`);
      } else if (product) {
        await updateMutation.mutateAsync(payload as Record<string, unknown>);
        reset(values); // clear isDirty so the nav guard doesn't fire after save
        toast.success("Product saved.");
        onRefresh?.();
      }
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong", { duration: 6000 });
      return false;
    }
  }

  // ─── JSX ────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              {mode === "edit" && product && (product.product_variants?.length ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const price = watch("base_price");
                    if (price == null || price === ("" as unknown as number)) return;
                    const variants = product.product_variants ?? [];
                    let completed = 0;
                    variants.forEach((v) => {
                      updateVariant.mutate(
                        { variantId: v.id, data: { price: Number(price) } },
                        {
                          onSuccess: () => {
                            completed += 1;
                            if (completed === variants.length) {
                              onRefresh?.();
                              toast.success("All variant prices updated to base price");
                            }
                          },
                          onError: (err) =>
                            toast.error(err instanceof Error ? err.message : "Failed to update variant price", { duration: 6000 }),
                        }
                      );
                    });
                  }}
                  className="mt-1.5 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800"
                >
                  Refresh all variant prices to base price
                </button>
              )}
            </div>
          </div>

          {/* Variants — shown in both modes */}
          <div className="rounded-lg border border-slate-200 p-4">
            {mode === "edit" && product ? (
              <VariantsEditor
                productTitle={watch("title")}
                basePrice={watch("base_price")}
                category={watchedCategory}
                variants={product.product_variants || []}
                onAdd={(data) => addVariant.mutate(data, { onSuccess: onRefresh, onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add variant", { duration: 6000 }) })}
                onUpdate={(variantId, data) => updateVariant.mutate({ variantId, data }, { onSuccess: onRefresh, onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update variant", { duration: 6000 }) })}
                onDelete={(variantId) =>
                  deleteVariant.mutate(variantId, {
                    onSuccess: onRefresh,
                    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete variant", { duration: 6000 }),
                  })
                }
              />
            ) : (
              <VariantsEditor
                productTitle={watch("title")}
                basePrice={watch("base_price")}
                category={watchedCategory}
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
                    compare_at_price: (data.compare_at_price as number | null) ?? null,
                    sku: data.sku as string | undefined,
                    inventory_quantity: (data.inventory_quantity as number) || 0,
                    preorder_enabled: (data.preorder_enabled as boolean) ?? false,
                    preorder_limit: (data.preorder_limit as number | null) ?? null,
                  };
                  setLocalVariants((prev) => [...prev, draft]);
                }}
                onUpdateLocal={(localId, data) =>
                  setLocalVariants((prev) =>
                    prev.map((v) =>
                      v.localId === localId
                        ? {
                            ...v,
                            ...(data as Partial<LocalVariantDraft>),
                          }
                        : v,
                    ),
                  )
                }
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
                onAdd={(src, altText) =>
                  addImage.mutate(
                    { src, alt_text: altText },
                    { onSuccess: onRefresh, onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add image", { duration: 6000 }) },
                  )
                }
                onUpdateImage={(imageId, update) =>
                  updateImage.mutate(
                    {
                      imageId,
                      data: {
                        ...(update.imageType !== undefined && { image_type: update.imageType }),
                        ...(update.variantId !== undefined && { variant_id: update.variantId }),
                        ...(update.colorTags !== undefined && { color_tags: update.colorTags }),
                      },
                    },
                    { onSuccess: onRefresh, onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update image", { duration: 6000 }) },
                  )
                }
                onDelete={(imageId) =>
                  deleteImage
                    .mutateAsync(imageId, { onSuccess: onRefresh })
                    .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to delete image", { duration: 6000 }))
                }
                onReorder={(imageIds) => reorderImages.mutate(imageIds, { onSuccess: onRefresh, onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to reorder images", { duration: 6000 }) })}
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
            <p className="text-xs text-slate-500">
              Only <span className="font-medium">Active</span> products appear on the site and can be purchased.
              Draft and archived products are hidden.
            </p>
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

            {/* Category */}
            <div>
              <label className="mb-1 block text-xs text-slate-500">Category</label>
              <select
                {...register("category")}
                onChange={(e) => {
                  setValue("category", e.target.value);
                  setValue("product_type", "");
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">— Select category —</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Product type — filtered by category */}
            <div>
              <label className="mb-1 block text-xs text-slate-500">Type</label>
              <select
                {...register("product_type")}
                disabled={!watchedCategory}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">— Select type —</option>
                {(watchedCategory ? SUBCATEGORY_MAP[watchedCategory] ?? [] : []).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
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
                        "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors pointer-coarse:px-3 pointer-coarse:py-2",
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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(watch("hq_unit_count") ?? 1) > 1}
                  onChange={(e) =>
                    setValue("hq_unit_count", e.target.checked ? 2 : 1, {
                      shouldDirty: true,
                    })
                  }
                />
                Bundle (counts as multiple units)
              </label>
              {(watch("hq_unit_count") ?? 1) > 1 && (
                <div className="mt-2">
                  <label className="mb-1 block text-xs text-slate-500">
                    Counts as this many units toward Road to HQ
                  </label>
                  <input
                    type="number"
                    {...register("hq_unit_count")}
                    min={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                </div>
              )}
              <p className="mt-1 text-xs text-slate-400">
                Only affects the Road to HQ counter, not stock or sales reports.
              </p>
              {errors.hq_unit_count && (
                <p className="mt-1 text-xs text-red-500">{errors.hq_unit_count.message}</p>
              )}
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
            if (isDirty) setLeaveTo("/products");
            else router.push("/products");
          }}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </div>

      <Modal
        open={leaveTo !== null}
        onClose={() => !savingToLeave && setLeaveTo(null)}
        title="Unsaved changes"
        description={
          mode === "create"
            ? "This product hasn't been created yet."
            : "You've changed this product since it was last saved."
        }
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={discardAndLeave}
              disabled={savingToLeave}
              className="mr-auto inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              Discard changes
            </button>
            <button
              type="button"
              onClick={() => setLeaveTo(null)}
              disabled={savingToLeave}
              className="inline-flex h-9 items-center rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={saveAndLeave}
              disabled={savingToLeave}
              className="inline-flex h-9 items-center rounded-full bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
            >
              {savingToLeave ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Save them before you go, discard them, or stay and keep editing.
        </p>
      </Modal>
    </form>
  );
}
