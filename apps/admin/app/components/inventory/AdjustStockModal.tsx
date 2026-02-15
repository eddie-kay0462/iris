"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/validation/zod-resolver";
import {
  stockAdjustmentSchema,
  type StockAdjustmentValues,
} from "@/lib/validation/product";
import { useAdjustStock, type InventoryItem } from "@/lib/api/inventory";

interface AdjustStockModalProps {
  item: InventoryItem;
  onClose: () => void;
}

export function AdjustStockModal({ item, onClose }: AdjustStockModalProps) {
  const adjustStock = useAdjustStock();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StockAdjustmentValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      variant_id: item.id,
      quantity_change: 0,
      movement_type: "adjustment",
      notes: "",
    },
  });

  const quantityChange = watch("quantity_change") || 0;
  const newQuantity = Math.max(
    0,
    (item.inventory_quantity || 0) + Number(quantityChange),
  );

  async function onSubmit(values: StockAdjustmentValues) {
    await adjustStock.mutateAsync(values);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Adjust Stock</h2>

        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-medium">{item.product?.title}</p>
          <p className="text-slate-500">
            {item.option1_value || "Default"} {item.sku ? `· ${item.sku}` : ""}
          </p>
          <p className="mt-1 text-slate-600">
            Current stock: <strong>{item.inventory_quantity}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("variant_id")} />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Quantity change
            </label>
            <input
              type="number"
              {...register("quantity_change")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            {errors.quantity_change && (
              <p className="mt-1 text-xs text-red-500">
                {errors.quantity_change.message}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              New quantity:{" "}
              <strong
                className={newQuantity === 0 ? "text-red-600" : "text-green-600"}
              >
                {newQuantity}
              </strong>
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Reason
            </label>
            <select
              {...register("movement_type")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="adjustment">Adjustment</option>
              <option value="restock">Restock</option>
              <option value="return">Return</option>
              <option value="damaged">Damaged</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Notes (optional)
            </label>
            <textarea
              {...register("notes")}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Adjust"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
