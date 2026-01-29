type AdminCustomerDetailPageProps = {
  params: { id: string };
};

export default function AdminCustomerDetailPage({
  params,
}: AdminCustomerDetailPageProps) {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Customer detail
        </p>
        <h1 className="text-2xl font-semibold">Customer {params.id}</h1>
        <p className="text-sm text-slate-500">
          Review customer profile, orders, and preferences.
        </p>
      </header>
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        Customer detail placeholder.
      </div>
    </section>
  );
}
