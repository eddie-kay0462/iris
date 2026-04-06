"use client";

import { useState, useEffect } from "react";
import { Save, AlertCircle } from "lucide-react";
import { useRevenueTarget, useUpdateRevenueTarget } from "@/lib/api/orders";

export default function GeneralSettingsPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [draftTarget, setDraftTarget] = useState<string>("");

  const { data: targetData, isLoading } = useRevenueTarget(selectedYear);
  const [success, setSuccess] = useState(false);
  const { mutate: updateTarget, isPending } = useUpdateRevenueTarget();

  useEffect(() => {
    if (targetData !== undefined && targetData !== null) {
      setDraftTarget(String(targetData));
    } else {
      setDraftTarget("");
    }
  }, [targetData]);

  const handleSave = () => {
    const numericTarget = parseFloat(draftTarget.replace(/,/g, ""));
    if (!isNaN(numericTarget) && numericTarget > 0) {
      updateTarget(
        { year: selectedYear, target: numericTarget },
        {
          onSuccess: () => {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
          },
        }
      );
    }
  };

  return (
    <section className="space-y-6 max-w-4xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">General Settings</h1>
        <p className="text-sm text-slate-500">
          Manage system-wide settings, brand parameters, and yearly targets.
        </p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Brand Targets Section */}
        <div className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Yearly Revenue Goal</h2>
            <p className="text-sm text-slate-500 mt-1">
              Set the global revenue target for the dashboard. This target is visible to all admins and is used to compute progress in the main dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Financial Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {[...Array(5)].map((_, i) => (
                  <option key={i} value={currentYear - 2 + i}>
                    {currentYear - 2 + i}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Target Amount (GH₵)</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-slate-500 sm:text-sm">₵</span>
                </div>
                <input
                  type="number"
                  value={draftTarget}
                  onChange={(e) => setDraftTarget(e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={isPending || isLoading || !draftTarget}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isPending ? "Saving..." : "Save target"}
              </button>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Takes effect immediately across all sessions.</span>
              </div>
            </div>

            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 animate-in fade-in slide-in-from-top-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Revenue target updated successfully!
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
