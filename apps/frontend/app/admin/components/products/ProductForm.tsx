"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@/lib/validation/zod-resolver";
import { productSchema, type ProductFormValues } from "@/lib/validation/product";
import {
  useCreateProduct,
  useUpdateProduct,
  useAddVariant,
  useUpdateVariant,
  useDeleteVariant,
  useAddImage,
  useDeleteImage,
  useReorderImages,
  type Product,
} from "@/lib/api/products";
import { VariantsEditor } from "./VariantsEditor";
import { ImagesEditor } from "./ImagesEditor";
import { CollectionsPicker } from "./CollectionsPicker";
import { useAddCollectionProducts } from "@/lib/api/collections";

interface ProductFormProps {
  mode: "create" | "edit";
  product?: Product;
}

export function ProductForm({ mode, product }: ProductFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(product?.id || "");
  const addVariant = useAddVariant(product?.id || "");
  const updateVariant = useUpdateVariant(product?.id || "");
  const deleteVariant = useDeleteVariant(product?.id || "");
  const addImage = useAddImage(product?.id || "");
  const deleteImage = useDeleteImage(product?.id || "");
  const reorderImages = useReorderImages(product?.id || "");
  const addToCollections = useAddCollectionProducts("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: product?.title || "",
      description: product?.description || "",
      handle: product?.handle || "",
      base_price: product?.base_price ?? undefined,
      status: product?.status || "draft",
      gender: product?.gender ?? undefined,
      product_type: product?.product_type || "",
      vendor: product?.vendor || "",
      tags: product?.tags || [],
      published: product?.published ?? false,
    },
  });

  async function onSubmit(values: ProductFormValues) {
    setError("");
    try {
      if (mode === "create") {
        const created = await createMutation.mutateAsync(
          values as Record<string, unknown>,
        );
        // Add to collections if selected
        for (const collId of selectedCollections) {
          try {
            await addToCollections.mutateAsync([created.id]);
          } catch {
            // Best effort
          }
        }
        router.push(`/admin/products/${created.id}`);
      } else if (product) {
        await updateMutation.mutateAsync(values as Record<string, unknown>);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const [tagsInput, setTagsInput] = useState(
    product?.tags?.join(", ") || "",
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Title
              </label>
              <input
                {...register("title")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                {...register("description")}
                rows={4}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Base price
              </label>
              <input
                type="number"
                step="0.01"
                {...register("base_price")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              {errors.base_price && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.base_price.message}
                </p>
              )}
            </div>
          </div>

          {/* Variants — only show on edit */}
          {mode === "edit" && product && (
            <div className="rounded-lg border border-slate-200 p-4">
              <VariantsEditor
                variants={product.product_variants || []}
                onAdd={(data) => addVariant.mutate(data)}
                onUpdate={(variantId, data) =>
                  updateVariant.mutate({ variantId, data })
                }
                onDelete={(variantId) => deleteVariant.mutate(variantId)}
              />
            </div>
          )}

          {/* Images — only show on edit */}
          {mode === "edit" && product && (
            <div className="rounded-lg border border-slate-200 p-4">
              <ImagesEditor
                images={product.product_images || []}
                onAdd={(url, altText) => addImage.mutate({ src: url, alt_text: altText })}
                onDelete={(imageId) => deleteImage.mutate(imageId)}
                onReorder={(imageIds) => reorderImages.mutate(imageIds)}
              />
            </div>
          )}
        </div>

        {/* Right sidebar */}
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
            <h3 className="text-sm font-medium text-slate-700">
              Organization
            </h3>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Gender
              </label>
              <select
                {...register("gender")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Product type
              </label>
              <input
                {...register("product_type")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Vendor
              </label>
              <input
                {...register("vendor")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Tags (comma separated)
              </label>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onBlur={() => {
                  // This is a workaround since tags is an array
                  // We'll handle this in onSubmit
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* SEO */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-4">
            <h3 className="text-sm font-medium text-slate-700">SEO</h3>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                URL handle
              </label>
              <input
                {...register("handle")}
                placeholder="auto-generated-from-title"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Collections */}
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
          onClick={() => router.push("/admin/products")}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
