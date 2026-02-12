import { DollarSign, ShoppingCart, Users, AlertTriangle } from "lucide-react";
import { StatsCard } from "../components/StatsCard";

const stats = [
  { label: "Total sales", value: "$24,120", icon: DollarSign, helperText: "Lifetime revenue" },
  { label: "Orders", value: "312", icon: ShoppingCart, helperText: "All-time orders" },
  { label: "Customers", value: "189", icon: Users, helperText: "Registered accounts" },
  { label: "Low stock", value: "7 items", icon: AlertTriangle, helperText: "Below reorder threshold" },
];

export default function AdminDashboardPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Admin dashboard</h1>
        <p className="text-sm text-slate-500">
          Overview of store performance and operations.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatsCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            helperText={stat.helperText}
          />
        ))}
      </div>
    </section>
  );
}
