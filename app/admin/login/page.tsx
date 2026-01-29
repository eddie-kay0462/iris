export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Admin login</h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to manage products, orders, and operations.
        </p>
        <form className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input
              className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2"
              name="email"
              placeholder="admin@store.com"
              type="email"
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2"
              name="password"
              placeholder="••••••••"
              type="password"
            />
          </label>
          <button
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            type="button"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
