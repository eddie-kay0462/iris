# 1NRI Storefront — SEO Fix Prompt for Claude Code

> Paste this entire prompt into Claude Code at the root of the `storefront.1nri.store` Next.js project.

---

## Context

This is a Next.js (App Router) e-commerce storefront for 1NRI Worldwide, a Ghana-based streetwear and manufacturing brand. The site is currently at `storefront.1nri.store`. A full SEO audit has identified critical issues that are causing **zero pages to be indexed by Google**. Your job is to implement every fix described below. Work through them in the order they are listed — the first three are the most urgent.

Do not change any visual styling, layout, component logic, or copy unless a task explicitly says to. This is a pure SEO/metadata/infrastructure pass.

---

## Task 1 — Create `sitemap.ts` (Critical)

Create the file `app/sitemap.ts`. This tells Google every URL that exists on the site.

**Requirements:**
- Use Next.js `MetadataRoute.Sitemap` return type.
- The base URL must be `https://storefront.1nri.store`.
- Include static routes: `/`, `/products`, `/about`.
- If there is a Supabase client or product-fetching utility already in the codebase, import it and dynamically include each product's URL (e.g. `/products/[slug]`) in the sitemap. If a product slug or id field exists in the database schema, use it. If you cannot find a product fetching function, add a `// TODO: add dynamic product URLs here` comment and include only the static routes for now.
- Set `lastModified` to `new Date()` for all entries.
- Set `changeFrequency` to `'weekly'` for `/products` and individual product pages, `'monthly'` for `/about`, and `'daily'` for `/`.
- Set `priority` to `1.0` for `/`, `0.9` for `/products`, `0.8` for product detail pages, and `0.6` for `/about`.

```ts
// Expected shape — adapt to match the actual codebase
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://storefront.1nri.store'
  // static routes ...
  // dynamic product routes ...
  return [ ... ]
}
```

---

## Task 2 — Create `robots.ts` (Critical)

Create the file `app/robots.ts`.

**Requirements:**
- Allow all crawlers on all paths.
- Disallow `/profile`, `/orders`, `/cart`, `/favourites` — these are authenticated or transactional pages with no SEO value.
- Point the sitemap to `https://storefront.1nri.store/sitemap.xml`.

```ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/profile', '/orders', '/cart', '/favourites'],
    },
    sitemap: 'https://storefront.1nri.store/sitemap.xml',
  }
}
```

---

## Task 3 — Fix the root layout metadata (Critical)

Open `app/layout.tsx` (or wherever the root `<Metadata>` export lives).

Replace the existing `metadata` export with the following. Preserve everything else in the file exactly as-is.

```ts
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://storefront.1nri.store'),
  title: {
    default: '1NRI — Contemporary Streetwear Made in Accra, Ghana',
    template: '%s | 1NRI',
  },
  description:
    '1NRI Worldwide is a Ghana-based streetwear and fashion manufacturing brand. Designed in Accra, built for durability, shipped worldwide.',
  keywords: [
    'Ghana streetwear',
    'Accra fashion brand',
    'made in Ghana clothing',
    'African streetwear',
    '1NRI',
    'Ghana fashion',
    'contemporary African fashion',
  ],
  authors: [{ name: '1NRI Worldwide' }],
  creator: '1NRI Worldwide',
  publisher: '1NRI Worldwide',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://storefront.1nri.store',
    siteName: '1NRI Worldwide',
    title: '1NRI — Contemporary Streetwear Made in Accra, Ghana',
    description:
      '1NRI Worldwide is a Ghana-based streetwear and fashion manufacturing brand. Designed in Accra, built for durability, shipped worldwide.',
    images: [
      {
        url: '/homepage/7.jpg',
        width: 1200,
        height: 630,
        alt: '1NRI Worldwide — streetwear made in Accra, Ghana',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '1NRI — Contemporary Streetwear Made in Accra, Ghana',
    description:
      'Ghana-based streetwear brand. Designed in Accra, built for durability, shipped worldwide.',
    images: ['/homepage/7.jpg'],
    creator: '@1nriworldwide',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your Google Search Console verification token here once you have it
    // google: 'your-verification-token',
  },
}
```

---

## Task 4 — Add page-level metadata to every route (Critical)

Each page must export its own `metadata` object or `generateMetadata` function. The root layout's `template: '%s | 1NRI'` will automatically append the brand name.

### 4a. Homepage — `app/page.tsx`

Add this export near the top of the file, below any imports:

```ts
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Road to HQ — Shop the Drop',
  description:
    'Six thousand units stand between 1NRI and a permanent home in Accra. Every piece you buy moves the needle. Shop Ghana-made contemporary streetwear now.',
  openGraph: {
    title: 'Road to HQ — Shop 1NRI Streetwear',
    description:
      'Six thousand units. One headquarters. Shop Ghana-made streetwear and be part of the road to Accra HQ.',
    images: [{ url: '/homepage/7.jpg', width: 1200, height: 630, alt: '1NRI Road to HQ campaign' }],
  },
}
```

### 4b. Products page — `app/products/page.tsx`

```ts
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shop All Products',
  description:
    'Browse the full 1NRI collection — contemporary streetwear designed in Accra and made in Ghana. Hoodies, tees, quarter-zips and more, shipped worldwide.',
  openGraph: {
    title: 'Shop 1NRI — Ghana-Made Streetwear',
    description:
      'Contemporary streetwear designed in Accra, made in Ghana. Browse the full 1NRI collection and shop now.',
  },
}
```

### 4c. About page — `app/about/page.tsx`

```ts
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About 1NRI Worldwide',
  description:
    '1NRI Worldwide is a fashion and manufacturing brand headquartered in Accra, Ghana — combining contemporary streetwear design with structured, locally-made garment production.',
  openGraph: {
    title: 'About 1NRI Worldwide — Built in Accra, Worn Everywhere',
    description:
      'Learn about 1NRI: a Ghana-based fashion and manufacturing brand serving style-conscious customers across Ghana, Nigeria, the UK, Canada, and the US.',
  },
}
```

### 4d. Individual product pages — `app/products/[slug]/page.tsx` (or equivalent dynamic route)

Find the dynamic product page file. Replace or add a `generateMetadata` function. Adapt the field names to match whatever product object shape is returned from your data source:

```ts
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  // Replace fetchProduct with whatever data-fetching function already exists
  const product = await fetchProduct(params.slug)

  if (!product) {
    return {
      title: 'Product Not Found',
    }
  }

  return {
    title: product.name,
    description:
      product.description ??
      `Shop ${product.name} by 1NRI — Ghana-made contemporary streetwear, designed in Accra and built to last.`,
    openGraph: {
      title: `${product.name} | 1NRI`,
      description:
        product.description ??
        `Shop ${product.name} — Ghana-made streetwear by 1NRI Worldwide.`,
      images: product.image_url
        ? [
            {
              url: product.image_url,
              width: 800,
              height: 800,
              alt: `${product.name} by 1NRI`,
            },
          ]
        : [],
    },
  }
}
```

---

## Task 5 — Add JSON-LD structured data (High Priority)

### 5a. Organization schema — root layout

In `app/layout.tsx`, inside the `<body>` tag (but outside the main content), add a `<script>` tag with the Organization JSON-LD. Place it after the existing children render:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: '1NRI Worldwide',
      url: 'https://storefront.1nri.store',
      logo: 'https://storefront.1nri.store/homepage_img/no-bg-1NRI.png',
      description:
        'Ghana-based fashion and manufacturing brand. Contemporary streetwear designed in Accra.',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Accra',
        addressCountry: 'GH',
      },
      sameAs: [
        'https://instagram.com/_1nriworldwide',
        'https://www.tiktok.com/@1nriworldwide',
        'https://youtube.com/@1nriworldwide',
        'https://www.linkedin.com/in/1nriworldwide/',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        email: '1nriiworldwide@gmail.com',
        contactType: 'customer service',
      },
    }),
  }}
/>
```

### 5b. Product schema — dynamic product page

In the dynamic product page component (not `generateMetadata` — in the actual rendered component), add a Product JSON-LD block. Adapt field names to your actual product shape:

```tsx
// Inside the product page component, after data is fetched
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: product.image_url,
      brand: {
        '@type': 'Brand',
        name: '1NRI Worldwide',
      },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'GHS',
        price: product.price,
        availability:
          product.in_stock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        url: `https://storefront.1nri.store/products/${product.slug}`,
        seller: {
          '@type': 'Organization',
          name: '1NRI Worldwide',
        },
      },
    }),
  }}
/>
```

### 5c. WebSite schema with SearchAction — root layout

Add this alongside the Organization schema in `app/layout.tsx`:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: '1NRI Worldwide',
      url: 'https://storefront.1nri.store',
    }),
  }}
/>
```

---

## Task 6 — Fix all image alt text (High Priority)

Across the entire codebase, find every `<Image>` component (Next.js) and `<img>` tag that has an empty `alt=""` or no `alt` prop. Add descriptive alt text to each one based on the image path or context.

Apply these specific fixes first — these are confirmed from the audit:

| Image path / context | Alt text to use |
|---|---|
| `/homepage/7.jpg` (hero image) | `1NRI model wearing streetwear in Accra, Ghana` |
| `/homepage/2.jpeg` (CTA section image) | `1NRI clothing collection — shop the drop` |
| `/homepage/1.jpeg` (About page editorial) | `1NRI editorial shot — FW '25, Accra, Ghana` |
| `/homepage/3.png` (About page Road to HQ section) | `1NRI manufacturing and production in Ghana` |
| `/homepage_img/no-bg-1NRI.png` (logo) | `1NRI Worldwide logo` |
| Milestone images from Supabase (quarter-zip product shots) | `1NRI [product name] — [colour] colourway` (use product name/colour from the URL or surrounding context) |

For any remaining images without alt text found during your search, write descriptive alt text that includes the product name and "1NRI" where applicable, or describes the scene/content for editorial images.

---

## Task 7 — Fix social links in the footer (Medium Priority)

Find the footer component. The social links are currently pointing to bare platform homepages (`https://instagram.com`, `https://x.com`, `https://tiktok.com`). Replace them with the correct profile URLs:

| Platform | Current (wrong) | Correct URL |
|---|---|---|
| Instagram | `https://instagram.com` | `https://instagram.com/_1nriworldwide` |
| X / Twitter | `https://x.com` | `https://x.com/1nriworldwide` |
| TikTok | `https://tiktok.com` | `https://www.tiktok.com/@1nriworldwide` |

Also add `rel="noopener noreferrer"` and `target="_blank"` to all external social links if not already present.

---

## Task 8 — Add canonical tags (Medium Priority)

In `app/layout.tsx`, inside the root `metadata` export, add a canonical URL. Also ensure that the query-string filter pages (`/products?tag=new`, `/products?tag=collections`) do not produce duplicate content.

In the `metadata` export in `app/layout.tsx`, add:

```ts
alternates: {
  canonical: 'https://storefront.1nri.store',
},
```

In `app/products/page.tsx`, update the metadata export to include:

```ts
alternates: {
  canonical: 'https://storefront.1nri.store/products',
},
```

This ensures all tag-filtered variants (`?tag=new`, `?tag=collections`) point back to the canonical products URL and do not compete with each other in search rankings.

---

## Task 9 — Fix Next.js Image sizing for the hero (High Priority)

Find the hero `<Image>` component on the homepage (uses `/homepage/7.jpg`, currently configured with `w=3840`). This is being served at 4K width to all devices, causing slow page loads and a poor LCP score.

Update the `<Image>` component to use responsive sizing:

```tsx
<Image
  src="/homepage/7.jpg"
  alt="1NRI model wearing streetwear in Accra, Ghana"
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
  priority
  quality={85}
/>
```

- Add `priority` to the hero image — it's above the fold and should be preloaded.
- Set `quality={85}` instead of the default 75 for the hero, but remove any hard-coded `w=3840` override.
- Apply the same `sizes` fix to any other full-width editorial images on the homepage that are currently using `w=3840`.

---

## Task 10 — Verify product pages render on the server (Critical)

Find the products listing page (`app/products/page.tsx`) and each individual product page. Check how data is fetched:

- If products are fetched inside a `useEffect` or client component marked `'use client'` with no server fallback, **this is the problem**. Google's crawler sees an empty page.
- Convert the data-fetching logic to an async Server Component. Move the `fetch` or Supabase query to the server component level, outside of any `useEffect`.

The pattern should be:

```tsx
// app/products/page.tsx — Server Component (no 'use client' at the top)
import { createClient } from '@/lib/supabase/server' // or whatever your server client path is

export default async function ProductsPage() {
  const supabase = createClient()
  const { data: products } = await supabase.from('products').select('*')

  return (
    <main>
      {products?.map((product) => (
        // render product cards here
      ))}
    </main>
  )
}
```

If the products page has interactive client-side filtering, the fix is to:
1. Fetch and render all products on the server.
2. Wrap only the interactive filter UI in a separate `'use client'` component.
3. Pass the full product list as a prop to the client component for client-side filtering.

This ensures Google sees the full product HTML even without JavaScript.

---

## Task 11 — Add BreadcrumbList schema to product pages (Medium Priority)

In the individual product page component, add breadcrumb JSON-LD after the Product schema:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://storefront.1nri.store',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Products',
          item: 'https://storefront.1nri.store/products',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: product.name,
          item: `https://storefront.1nri.store/products/${product.slug}`,
        },
      ],
    }),
  }}
/>
```

---

## Task 12 — Final verification checklist

After completing all tasks, run the following checks and report back on each:

1. `curl -I https://storefront.1nri.store/sitemap.xml` — should return `200 OK`
2. `curl -I https://storefront.1nri.store/robots.txt` — should return `200 OK`
3. `curl https://storefront.1nri.store/products` — the response HTML should contain product names and prices, not just navigation. If it doesn't, Task 10 is incomplete.
4. Check that `<title>` tags are unique per page — grep the rendered HTML of `/`, `/products`, and `/about` for `<title>` and confirm they differ.
5. Confirm no `<img>` or Next.js `<Image>` components have empty `alt` attributes — run: `grep -r 'alt=""' ./app ./components` and fix any remaining instances.
6. Confirm social links in the footer now point to profile URLs, not platform homepages.
7. Run `npx next build` — confirm no new build errors were introduced.

---

## Notes for Claude Code

- This is a **Next.js App Router** project. Do not use the Pages Router `_document.tsx` pattern or `next/head` — all metadata goes through the App Router `metadata` / `generateMetadata` API.
- Do not modify any Tailwind classes, component logic, animation code, or visual layout.
- Do not change the Supabase schema or any database queries, except where Task 10 requires moving a fetch from `useEffect` to a server component.
- If you encounter a file path that doesn't match what's described above (e.g. the products page is at `app/shop/page.tsx` instead of `app/products/page.tsx`), adapt accordingly and note the deviation.
- Complete all 12 tasks in one pass. At the end, provide a summary table showing which tasks were completed, which were partially completed, and any that need manual follow-up (e.g. the Google Search Console verification token in Task 3).
