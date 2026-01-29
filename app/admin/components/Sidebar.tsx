import Link from "next/link";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/settings", label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Admin navigation
      </div>
      <nav className="mt-4 space-y-1 text-sm">
        {navItems.map((item) => (
          <Link
            key={item.href}
            className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
            href={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
