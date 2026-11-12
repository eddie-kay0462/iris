import { LoadingBar } from "@/components/shop/Loading";

/* Route-transition cue for every storefront page. Without this, clicking a link
   to a server-rendered page (e.g. the homepage) left the old page on screen with
   no feedback until the server answered. The header stays put; a hairline runs
   along the top edge of the viewport and fades in only if the wait is noticeable. */
export default function ShopLoading() {
  return (
    <div className="min-h-[70vh]" role="status" aria-live="polite">
      <div className="animate-gallery-loading fixed inset-x-0 top-0 z-[60]">
        <LoadingBar />
      </div>
      <span className="sr-only">Loading page</span>
    </div>
  );
}
