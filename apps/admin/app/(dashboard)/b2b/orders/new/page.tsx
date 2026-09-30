"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useCan } from "@/lib/rbac/RoleContext";
import { OrderForm } from "../../components/OrderForm";

function NewB2bOrder() {
  const router = useRouter();
  const clientId = useSearchParams().get("client") ?? undefined;
  const canManage = useCan("b2b:manage");

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link
          href={clientId ? `/b2b/clients/${clientId}` : "/b2b"}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-2xl font-semibold">New B2B order</h1>
      </header>

      {canManage ? (
        <OrderForm initialClientId={clientId} onSaved={(o) => router.push(`/b2b/orders/${o.id}`)} />
      ) : (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Only managers and admins can create B2B orders.
        </p>
      )}
    </section>
  );
}

// useSearchParams needs a Suspense boundary to build.
export default function NewB2bOrderPage() {
  return (
    <Suspense>
      <NewB2bOrder />
    </Suspense>
  );
}
