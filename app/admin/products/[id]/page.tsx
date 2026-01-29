type AdminProductDetailPageProps = {
  params: { id: string };
};

export default function AdminProductDetailPage({
  params,
}: AdminProductDetailPageProps) {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Product detail
        </p>
        <h1 className="text-2xl font-semibold">Product {params.id}</h1>
        <p className="text-sm text-slate-500">
          Edit product details, variants, and fulfillment rules.
        </p>
      </header>
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        Product edit form placeholder.
      </div>
    </section>
  );
}
