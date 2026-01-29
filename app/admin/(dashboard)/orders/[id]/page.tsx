type AdminOrderDetailPageProps = {
  params: { id: string };
};

export default function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Order detail
        </p>
        <h1 className="text-2xl font-semibold">Order {params.id}</h1>
        <p className="text-sm text-slate-500">
          Review payment, fulfillment, and shipment timeline.
        </p>
      </header>
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        Order detail placeholder.
      </div>
    </section>
  );
}
