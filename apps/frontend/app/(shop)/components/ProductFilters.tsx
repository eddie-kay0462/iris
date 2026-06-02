"use client";

interface ProductFiltersProps {
  gender: string;
  sort: string;
  search: string;
  category: string;
  productType: string;
  onGenderChange: (gender: string) => void;
  onSortChange: (sort: string) => void;
  onSearchChange: (search: string) => void;
  onCategoryChange: (category: string) => void;
  onProductTypeChange: (productType: string) => void;
  onClearAll: () => void;
}

const genderTabs = [
  { value: "", label: "Shop All" },
  { value: "men", label: "Men's" },
  { value: "women", label: "Women's" },
];

const categoryTabs = [
  { value: "", label: "All" },
  { value: "Tops", label: "Tops" },
  { value: "Bottoms", label: "Bottoms" },
  { value: "Accessories", label: "Accessories" },
  { value: "Footwear", label: "Footwear" },
];

const subcategoryMap: Record<string, { value: string; label: string }[]> = {
  Tops: [
    { value: "T-Shirts", label: "T-Shirts" },
    { value: "Shirts", label: "Shirts" },
    { value: "Sweatshirts & Tracksuits", label: "Sweatshirts & Tracksuits" },
  ],
  Bottoms: [
    { value: "Shorts", label: "Shorts" },
    { value: "Pants", label: "Pants" },
  ],
  Accessories: [
    { value: "Bags", label: "Bags" },
    { value: "Caps", label: "Caps" },
    { value: "Socks", label: "Socks" },
  ],
  Footwear: [
    { value: "Mules", label: "Mules" },
  ],
};

export function ProductFilters({
  gender,
  sort,
  search,
  category,
  productType,
  onGenderChange,
  onSortChange,
  onSearchChange,
  onCategoryChange,
  onProductTypeChange,
  onClearAll,
}: ProductFiltersProps) {
  const subcategories = category ? subcategoryMap[category] ?? [] : [];
  const hasActiveFilters =
    search !== "" ||
    category !== "" ||
    productType !== "" ||
    gender !== "" ||
    sort !== "created_at:desc";

  return (
    <div className="space-y-6">
      {/* Gender tabs */}
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
          {/* <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Match..."
            className="w-40 border-b border-gray-300 bg-transparent py-1.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-black dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-white"
          /> */}
        </div>

        {/* Broad category tabs */}
        <div className="flex flex-1 items-center gap-4 overflow-x-auto">
          {categoryTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                onCategoryChange(tab.value);
                onProductTypeChange("");
              }}
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

      {/* Active filter chips + clear all */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {search && (
            <span className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/></svg>
              "{search}"
              <button onClick={() => onSearchChange("")} className="ml-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">×</button>
            </span>
          )}
          {category && (
            <span className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {category}
              <button onClick={() => { onCategoryChange(""); onProductTypeChange(""); }} className="ml-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">×</button>
            </span>
          )}
          {productType && (
            <span className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {productType}
              <button onClick={() => onProductTypeChange("")} className="ml-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">×</button>
            </span>
          )}
          {gender && (
            <span className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {gender === "men" ? "Men's" : "Women's"}
              <button onClick={() => onGenderChange("")} className="ml-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">×</button>
            </span>
          )}
          <button
            onClick={onClearAll}
            className="text-xs text-gray-400 underline underline-offset-2 transition hover:text-black dark:hover:text-white"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Subcategory pills — appear when a broad category is selected */}
      {subcategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {subcategories.map((sub) => (
            <button
              key={sub.value}
              onClick={() =>
                onProductTypeChange(productType === sub.value ? "" : sub.value)
              }
              className={`rounded-full border px-3 py-1 text-xs transition ${
                productType === sub.value
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-gray-300 text-gray-600 hover:border-black hover:text-black dark:border-gray-600 dark:text-gray-400 dark:hover:border-white dark:hover:text-white"
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
