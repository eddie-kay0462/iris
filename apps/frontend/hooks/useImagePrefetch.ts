import { useEffect } from "react";

interface PrefetchableImage {
  src: string;
  position: number;
  color_tags?: string[];
}

interface UseImagePrefetchOptions {
  /** Max images to warm for the active colour. */
  maxPriority?: number;
  /** Width to request — should match what the rendered <Image> will pick. */
  width?: number;
  quality?: number;
}

/**
 * Build the same URL `next/image` requests, so a prefetch is a cache hit (and so we
 * never prefetch the heavy raw original). Width/quality must match the rendered
 * <Image> for the warmed entry to be reused.
 */
export function nextImageUrl(src: string, width: number, quality = 75): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

/** Warm the browser cache for an optimised image (client-only, no-op on the server). */
export function prefetchImage(src: string, width: number, quality = 75): void {
  if (typeof window === "undefined" || !src) return;
  const img = new window.Image();
  img.src = nextImageUrl(src, width, quality);
}

/**
 * Warm the browser cache for a raw image URL — for the places that render a plain
 * `<img src>` (not next/image), where the optimised URL wouldn't be a cache hit.
 */
export function prefetchRawImage(src: string): void {
  if (typeof window === "undefined" || !src) return;
  const img = new window.Image();
  img.src = src;
}

/**
 * PDP-only: idle-prefetch the optimised URLs for the current colour's image set
 * (capped). Replaces the previous behaviour that eagerly loaded every raw original.
 */
export function useImagePrefetch(
  images: PrefetchableImage[],
  activeColor: string,
  options: UseImagePrefetchOptions = {},
) {
  const { maxPriority = 6, width = 1080, quality = 80 } = options;

  useEffect(() => {
    if (typeof window === "undefined" || !images.length) return;

    const normalizedActive = activeColor.toLowerCase();
    // Untagged images apply to every colour; tagged ones only to the active colour.
    const inActiveColor = (img: PrefetchableImage) => {
      const tags = img.color_tags ?? [];
      return (
        tags.length === 0 ||
        tags.some((t) => t.toLowerCase() === normalizedActive)
      );
    };

    const targets = images
      .filter(inActiveColor)
      .sort((a, b) => a.position - b.position)
      .slice(0, maxPriority);

    let idleId: number | undefined;
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const run = () =>
      targets.forEach((img) => prefetchImage(img.src, width, quality));

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(run, { timeout: 2000 });
    } else {
      timerId = setTimeout(run, 800);
    }

    return () => {
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timerId !== undefined) clearTimeout(timerId);
    };
  }, [images, activeColor, maxPriority, width, quality]);
}
