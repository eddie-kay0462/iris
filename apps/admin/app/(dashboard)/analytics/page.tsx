"use client";

import { useState } from "react";
import { StorefrontView } from "./components/StorefrontView";
import { PopupsView } from "./components/PopupsView";
import { BothView } from "./components/BothView";

type SourceTab = "storefront" | "popups" | "both";

const TABS: { id: SourceTab; label: string }[] = [
  { id: "storefront", label: "Storefront" },
  { id: "popups", label: "Pop-ups" },
  { id: "both", label: "Compare" },
];

export default function AdminAnalyticsPage() {
  const [sourceTab, setSourceTab] = useState<SourceTab>("storefront");

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-slate-500">Performance insights and sales data.</p>
      </header>

      {/* Source tab selector */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSourceTab(tab.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
              sourceTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {sourceTab === "storefront" && <StorefrontView />}
      {sourceTab === "popups" && <PopupsView />}
      {sourceTab === "both" && <BothView />}
    </section>
  );
}
