import type { ReactNode } from "react";

type AdminAuthLayoutProps = {
  children: ReactNode;
};

export default function AdminAuthLayout({ children }: AdminAuthLayoutProps) {
  return <div className="min-h-screen bg-slate-50 text-slate-900">{children}</div>;
}
