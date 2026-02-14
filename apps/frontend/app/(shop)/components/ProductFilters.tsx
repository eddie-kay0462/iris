"use client";

interface ProductFiltersProps {
  gender: string;
  sort: string;
  search: string;
  category: string;
  onGenderChange: (gender: string) => void;
  onSortChange: (sort: string) => void;
  onSearchChange: (search: string) => void;
  onCategoryChange: (category: string) => void;
}

const genderTabs = [
  { value: "", label: "Shop All" },
  { value: "men", label: "Men's" },
  { value: "women", label: "Women's" },
];

const categoryTabs = [
  { value: "", label: "All" },
  { value: "sale", label: "Sale" },
  { value: "shirts", label: "Shirts" },
  { value: "pants", label: "Pants" },
  { value: "shorts", label: "Shorts" },
  { value: "hoodies", label: "Hoodies and Sweatshirts" },
  { value: "hats", label: "Ties/Hats" },
  { value: "accessories", label: "Accessories" },
];

export function ProductFilters({
  gender,
  sort,
  search,
  category,
  onGenderChange,
  onSortChange,
  onSearchChange,
  onCategoryChange,
}: ProductFiltersProps) {
  return (
    <div className="space-y-6">
      {/* Gender tabs — uppercase nav style */}
      <div className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-800">
        {genderTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onGenderChange(tab.value)}
            className={`pb-3 text-xs font-semibold uppercase tracking-widest transition ${
              gender === tab.value
                ? "border-b-2 border-black text-black dark:border-white dark:text-white"
                : "text-gray-400 hover:text-black dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Category row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Match..."
            className="w-40 border-b border-gray-300 bg-transparent py-1.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-black dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-white"
          />
        </div>

        {/* Category tabs — scrollable */}
        <div className="flex flex-1 items-center gap-4 overflow-x-auto">
          {categoryTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onCategoryChange(tab.value)}
              className={`whitespace-nowrap text-xs transition ${
                category === tab.value
                  ? "font-semibold text-black underline underline-offset-4 dark:text-white"
                  : "text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="border-b border-gray-300 bg-transparent py-1.5 text-xs text-gray-600 outline-none dark:border-gray-600 dark:text-gray-400"
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
