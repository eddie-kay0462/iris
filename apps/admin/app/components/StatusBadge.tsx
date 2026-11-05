"use client";

import { StatusPill } from "./v2/StatusPill";

export function StatusBadge({ status }: { status: string }) {
  return <StatusPill status={status} />;
}
