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
      <div className="flex items-center gap-6 border-b border-line">
        {genderTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onGenderChange(tab.value)}
            className={`pb-3 text-xs font-semibold uppercase tracking-widest transition ${
              gender === tab.value
                ? "border-b-2 border-invert-bg text-text"
                : "text-text-muted hover:text-text"
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
            className="w-40 border-b border-line-strong bg-transparent py-1.5 text-sm text-text outline-none placeholder:text-text-placeholder focus:border-invert-bg"
          /> */}
        </div>

        {/* Broad category tabs */}
        <div className="flex flex-1 items-center gap-4 overflow-x-auto">
          {categoryTabs.map((tab) => (
            <button
              key={tab.value}
              // onCategoryChange also resets product_type. Calling
              // onProductTypeChange here too would issue a second URL update
              // built from the pre-click params, clobbering the category.
              onClick={() => onCategoryChange(tab.value)}
              className={`whitespace-nowrap text-xs transition ${
                category === tab.value
                  ? "font-semibold text-text underline underline-offset-4"
                  : "text-text-secondary hover:text-text"
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
          className="border-b border-line-strong bg-transparent py-1.5 text-xs text-text-secondary outline-none"
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
            <span className="flex items-center gap-1.5 rounded-full border border-line-strong bg-fill px-3 py-1 text-xs text-text-secondary">
              <svg className="h-3 w-3 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/></svg>
              &ldquo;{search}&rdquo;
              <button onClick={() => onSearchChange("")} className="ml-0.5 text-text-muted hover:text-text">×</button>
            </span>
          )}
          {category && (
            <span className="flex items-center gap-1.5 rounded-full border border-line-strong bg-fill px-3 py-1 text-xs text-text-secondary">
              {category}
              <button onClick={() => onCategoryChange("")} className="ml-0.5 text-text-muted hover:text-text">×</button>
            </span>
          )}
          {productType && (
            <span className="flex items-center gap-1.5 rounded-full border border-line-strong bg-fill px-3 py-1 text-xs text-text-secondary">
              {productType}
              <button onClick={() => onProductTypeChange("")} className="ml-0.5 text-text-muted hover:text-text">×</button>
            </span>
          )}
          {gender && (
            <span className="flex items-center gap-1.5 rounded-full border border-line-strong bg-fill px-3 py-1 text-xs text-text-secondary">
              {gender === "men" ? "Men's" : "Women's"}
              <button onClick={() => onGenderChange("")} className="ml-0.5 text-text-muted hover:text-text">×</button>
            </span>
          )}
          <button
            onClick={onClearAll}
            className="text-xs text-text-muted underline underline-offset-2 transition hover:text-text"
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
                  ? "border-invert-bg bg-invert-bg text-invert-fg"
                  : "border-line-strong text-text-secondary hover:border-invert-bg hover:text-text"
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
