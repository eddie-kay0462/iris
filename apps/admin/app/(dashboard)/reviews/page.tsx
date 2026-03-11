"use client";

import { useState } from "react";
import { Star, Check, Trash2, ShieldCheck } from "lucide-react";
import {
  useReviews,
  useApproveReview,
  useDeleteReview,
  type Review,
} from "@/lib/api/reviews";

type Tab = "pending" | "approved";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-200 text-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

function ReviewRow({
  review,
  onApprove,
  onDelete,
  canModerate,
}: {
  review: Review;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  canModerate: boolean;
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-slate-800">
            {review.products?.title ?? "—"}
          </p>
          <p className="text-xs text-slate-400">{review.products?.handle}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <StarRating rating={review.rating} />
      </td>
      <td className="px-4 py-3 max-w-xs">
        {review.title && (
          <p className="text-sm font-medium text-slate-800 truncate">
            {review.title}
          </p>
        )}
        {review.review_text && (
          <p className="text-xs text-slate-500 truncate">{review.review_text}</p>
        )}
        {!review.title && !review.review_text && (
          <span className="text-xs text-slate-400">No text</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="space-y-0.5">
          <p className="text-sm text-slate-700">{review.name || "Anonymous"}</p>
          {review.email && (
            <p className="text-xs text-slate-400">{review.email}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {review.is_verified_purchase ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
            <ShieldCheck className="h-3 w-3" />
            Verified
          </span>
        ) : (
          <span className="text-xs text-slate-400">Unverified</span>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-slate-400">
          {new Date(review.created_at).toLocaleDateString()}
        </p>
      </td>
      {canModerate && (
        <td className="py-3">
          <div className="flex items-center gap-2">
            {!review.is_approved && (
              <button
                onClick={() => onApprove(review.id)}
                className="flex items-center gap-1 rounded-md border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </button>
            )}
            <button
              onClick={() => {
                if (confirm("Delete this review?")) onDelete(review.id);
              }}
              className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}

export default function ReviewsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useReviews({
    is_approved: tab === "approved" ? "true" : "false",
    page,
    limit: 20,
  });

  const approveMutation = useApproveReview();
  const deleteMutation = useDeleteReview();

  // TODO: wire up real role from session; for now allow moderation
  const canModerate = true;

  const reviews = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Content moderation
        </p>
        <h1 className="text-2xl font-semibold">Product Reviews</h1>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(["pending", "approved"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-slate-900 text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
            {data && (
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs">
                {data.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            No {tab} reviews
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Review</th>
                  <th className="px-4 py-3">Reviewer</th>
                  <th className="px-4 py-3">Purchase</th>
                  <th className="px-4 py-3">Date</th>
                  {canModerate && <th className="px-4 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <ReviewRow
                    key={review.id}
                    review={review}
                    onApprove={(id) => approveMutation.mutate(id)}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    canModerate={canModerate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
