"use client";

interface ProductFiltersProps {
  gender: string;
  sort: string;
  search: string;
  onGenderChange: (gender: string) => void;
  onSortChange: (sort: string) => void;
  onSearchChange: (search: string) => void;
}

const genderTabs = [
  { value: "", label: "All" },
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "unisex", label: "Unisex" },
];

export function ProductFilters({
  gender,
  sort,
  search,
  onGenderChange,
  onSortChange,
  onSearchChange,
}: ProductFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Gender tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {genderTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onGenderChange(tab.value)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              gender === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sort + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-gray-400"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="created_at:desc">Newest</option>
          <option value="created_at:asc">Oldest</option>
          <option value="base_price:asc">Price: Low to High</option>
          <option value="base_price:desc">Price: High to Low</option>
          <option value="title:asc">A to Z</option>
        </select>
      </div>
    </div>
  );
}
