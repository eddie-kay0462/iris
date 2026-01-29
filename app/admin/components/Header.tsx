export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Iris admin
          </p>
          <h2 className="text-lg font-semibold text-slate-900">Operations</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">Admin user</p>
            <p className="text-xs text-slate-500">admin@iris.com</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-slate-200" />
        </div>
      </div>
    </header>
  );
}
