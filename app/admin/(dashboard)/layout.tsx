import type { ReactNode } from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <Sidebar />
        <main className="flex-1 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {children}
        </main>
      </div>
    </div>
  );
}
