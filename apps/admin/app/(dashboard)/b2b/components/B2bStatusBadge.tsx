"use client";

import { B2B_STATUS_LABELS, type B2bStatus } from "@/lib/api/b2b";
import { StatusPill } from "@/app/components/v2/StatusPill";

export function B2bStatusBadge({ status, overdue }: { status: B2bStatus; overdue?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusPill status={status} label={B2B_STATUS_LABELS[status]} />
      {overdue && <StatusPill status="overdue" />}
    </span>
  );
}
