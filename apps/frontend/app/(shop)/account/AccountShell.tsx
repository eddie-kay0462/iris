"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient, clearToken } from "@/lib/api/client";
import { parseDefaultAddress } from "@/lib/api/profile";
import type { PaginatedOrders } from "@/lib/api/orders";
import type { MyPreorder } from "@/lib/api/preorders";
import { toast } from "sonner";
import ProfileTab from "./ProfileTab";
import OrdersTab from "./OrdersTab";
import PreordersTab from "./PreordersTab";
import ShippingTab from "./ShippingTab";

type TabId = "profile" | "orders" | "preorders" | "shipping";

const TABS: { id: TabId; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "orders", label: "Orders" },
  { id: "preorders", label: "Pre-orders" },
  { id: "shipping", label: "Shipping" },
];

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  email_notifications?: boolean;
  sms_notifications?: boolean;
  default_address: unknown;
  avatar_url?: string | null;
}

interface Props {
  profile: ProfileData;
}

export default function AccountShell({ profile }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [loggingOut, setLoggingOut] = useState(false);

  // Read initial tab from URL hash
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as TabId;
    if (TABS.some((t) => t.id === hash)) setActiveTab(hash);
  }, []);

  function switchTab(tab: TabId) {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prefetchTab(tab: TabId) {
    if (tab === "orders") {
      queryClient.prefetchQuery({
        queryKey: ["my-orders", { limit: 100 }],
        queryFn: () => apiClient<PaginatedOrders>("/orders/my?limit=100"),
      });
    } else if (tab === "preorders") {
      queryClient.prefetchQuery({
        queryKey: ["my-preorders"],
        queryFn: () => apiClient<MyPreorder[]>("/preorders/my"),
      });
    }
  }

  async function handleSignOut() {
    setLoggingOut(true);
    try {
      await apiClient("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      clearToken();
      router.push("/");
    }
  }

  const firstName = profile.first_name ?? "";
  const parsedAddress = parseDefaultAddress(
    profile.default_address as Parameters<typeof parseDefaultAddress>[0]
  );

  return (
    <div className="max-w-[1280px] mx-auto px-4">
      {/* Account header */}
      <div className="flex items-end justify-between pt-10">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#111] dark:text-[#ededed]">
            My Account
          </div>
          {firstName && (
            <div className="mt-1 text-[13px] text-[#999] dark:text-neutral-500">
              Welcome back, {firstName}
            </div>
          )}
        </div>
        <button
          className="border border-[#ddd] dark:border-neutral-700 bg-transparent px-3 py-1.5 text-[11px] text-[#666] dark:text-neutral-400 cursor-pointer transition-colors duration-200 hover:border-[#111] dark:hover:border-white hover:text-[#111] dark:hover:text-white disabled:opacity-50"
          onClick={handleSignOut}
          disabled={loggingOut}
          type="button"
        >
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-6 border-b border-[#e5e5e5] dark:border-neutral-800 mt-6 sticky top-[65px] z-40 bg-white dark:bg-[#0a0a0a] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        role="tablist"
        aria-label="Account sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`pb-3 -mb-px text-[11px] font-semibold uppercase tracking-[0.12em] bg-transparent border-b-2 cursor-pointer whitespace-nowrap transition-colors duration-200 flex-shrink-0 ${
              activeTab === tab.id
                ? "text-[#111] dark:text-white border-[#111] dark:border-white"
                : "text-[#bbb] dark:text-neutral-600 border-transparent hover:text-[#111] dark:hover:text-white"
            }`}
            onClick={() => switchTab(tab.id)}
            onMouseEnter={() => prefetchTab(tab.id)}
            onTouchStart={() => prefetchTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-8 pb-20">
        {activeTab === "profile" && (
          <div
            id="tabpanel-profile"
            role="tabpanel"
            aria-labelledby="tab-profile"
            className="acct-tab-panel"
          >
            <ProfileTab profile={profile} />
          </div>
        )}
        {activeTab === "orders" && (
          <div
            id="tabpanel-orders"
            role="tabpanel"
            aria-labelledby="tab-orders"
            className="acct-tab-panel"
          >
            <OrdersTab />
          </div>
        )}
        {activeTab === "preorders" && (
          <div
            id="tabpanel-preorders"
            role="tabpanel"
            aria-labelledby="tab-preorders"
            className="acct-tab-panel"
          >
            <PreordersTab />
          </div>
        )}
        {activeTab === "shipping" && (
          <div
            id="tabpanel-shipping"
            role="tabpanel"
            aria-labelledby="tab-shipping"
            className="acct-tab-panel"
          >
            <ShippingTab
              defaultAddress={parsedAddress as any}
              profileName={[profile.first_name, profile.last_name].filter(Boolean).join(" ")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
