"""
In-memory counters behind the daily digest, /status and /errors.

Nothing is persisted: a restart of this sidecar loses the day's partial digest,
which is an acceptable price for having no state on disk to look after.
"""

from __future__ import annotations

import threading
import time
from collections import Counter, defaultdict, deque
from dataclasses import dataclass

from rules import Record, fingerprint

# Enough to keep percentiles honest on a busy day without growing without bound.
_MAX_SAMPLES = 20_000
_MAX_ROUTE_SAMPLES = 500


def _pct(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    return s[min(len(s) - 1, int(round(p * (len(s) - 1))))]


@dataclass
class ErrorEntry:
    ts: float
    service: str
    fp: str
    message: str


class Stats:
    def __init__(self):
        self._lock = threading.Lock()
        self.recent_errors: deque[ErrorEntry] = deque(maxlen=500)
        # minute -> [requests, 4xx, 5xx]; drives /status's "last hour"
        self._minutes: dict[int, list[int]] = defaultdict(lambda: [0, 0, 0])
        # service -> owns the schedulers? Every replica announces its mode at
        # boot; exactly one (the worker) should say ENABLED.
        self.schedulers: dict[str, bool] = {}
        self._reset_day()

    def _reset_day(self):
        self.since = time.time()
        self.requests_by_service: Counter[str] = Counter()
        self.status_classes: Counter[str] = Counter()
        self.latencies: list[float] = []
        self.route_latencies: dict[str, deque[float]] = defaultdict(lambda: deque(maxlen=_MAX_ROUTE_SAMPLES))
        self.error_counts: Counter[str] = Counter()
        self.error_samples: dict[str, str] = {}
        self.client_errors: Counter[str] = Counter()
        self.container_events: Counter[str] = Counter()
        self.cron_failures = 0

    # -- recording ----------------------------------------------------------

    def record(self, rec: Record, now: float | None = None):
        now = time.time() if now is None else now
        minute = int(now // 60)
        with self._lock:
            bucket = self._minutes[minute]
            if rec.kind == "request":
                self.requests_by_service[rec.service] += 1
                bucket[0] += 1
                if rec.status:
                    self.status_classes[f"{rec.status // 100}xx"] += 1
                if rec.ms is not None:
                    if len(self.latencies) < _MAX_SAMPLES:
                        self.latencies.append(rec.ms)
                    if rec.route:
                        self.route_latencies[rec.route].append(rec.ms)
            elif rec.kind == "client_error":
                bucket[0] += 1
                bucket[1] += 1
                self.status_classes["4xx"] += 1
                self.client_errors[f"{rec.route or '?'} -> {rec.status}"] += 1
            elif rec.kind == "error":
                if rec.status:
                    bucket[0] += 1
                    self.status_classes[f"{rec.status // 100}xx"] += 1
                bucket[2] += 1
                fp = fingerprint(rec)
                self.error_counts[fp] += 1
                self.error_samples.setdefault(fp, rec.message)
                self.recent_errors.append(ErrorEntry(now, rec.service, fp, rec.message))
                if "reconciliation failed" in rec.message.lower() or "cron" in rec.context.lower():
                    self.cron_failures += 1
            elif rec.kind == "scheduler":
                self.schedulers[rec.service] = "ENABLED" in rec.message
            self._prune(minute)

    def record_container_event(self, label: str):
        with self._lock:
            self.container_events[label] += 1

    def _prune(self, minute: int):
        for m in [m for m in self._minutes if m < minute - 60]:
            del self._minutes[m]

    # -- reading ------------------------------------------------------------

    def last_hour(self) -> tuple[int, int, int]:
        cutoff = int(time.time() // 60) - 60
        with self._lock:
            rows = [v for m, v in self._minutes.items() if m >= cutoff]
        return tuple(sum(r[i] for r in rows) for i in range(3))  # type: ignore[return-value]

    def errors_since(self, seconds: float) -> list[tuple[str, int, set[str], str]]:
        """(fingerprint, count, services, latest message), most frequent first."""
        cutoff = time.time() - seconds
        grouped: dict[str, list[ErrorEntry]] = defaultdict(list)
        with self._lock:
            for e in self.recent_errors:
                if e.ts >= cutoff:
                    grouped[e.fp].append(e)
        out = [(fp, len(es), {e.service for e in es}, es[-1].message) for fp, es in grouped.items()]
        return sorted(out, key=lambda r: -r[1])

    def scheduler_summary(self) -> str:
        owners = sorted(s for s, on in self.schedulers.items() if on)
        if not self.schedulers:
            return "no container has started since alerts came up"
        if len(owners) == 1:
            return f"✅ {owners[0]} owns the crons"
        if not owners:
            return "⚠️ no container has the crons enabled — reconciliation is not running"
        return f"⚠️ crons enabled on {', '.join(owners)} — jobs will run more than once"

    def render_digest(self, memory: dict[str, str] | None = None, reset: bool = False) -> str:
        with self._lock:
            hours = max(1, round((time.time() - self.since) / 3600))
            total = sum(self.requests_by_service.values()) + sum(self.client_errors.values())
            lines = [f"<b>📊 Iris daily digest</b> (last ~{hours}h)", ""]

            lines.append(f"<b>Requests:</b> {total:,}")
            if self.requests_by_service:
                per = ", ".join(f"{s} {n:,}" for s, n in sorted(self.requests_by_service.items()))
                lines.append(f"  by replica: {per}")
            if self.status_classes:
                lines.append("  " + " · ".join(f"{k} {v:,}" for k, v in sorted(self.status_classes.items())))
            if self.latencies:
                lines.append(f"  latency p50 {_pct(self.latencies, .5):.0f}ms · p95 {_pct(self.latencies, .95):.0f}ms")

            slow = sorted(
                ((r, _pct(list(v), .95), len(v)) for r, v in self.route_latencies.items() if len(v) >= 5),
                key=lambda t: -t[1],
            )[:5]
            if slow:
                lines += ["", "<b>Slowest routes (p95):</b>"]
                lines += [f"  {p:.0f}ms  {_esc(r)} ({n}×)" for r, p, n in slow]

            lines += ["", f"<b>Errors (5xx / crashes):</b> {sum(self.error_counts.values()):,}"]
            for fp, n in self.error_counts.most_common(5):
                lines.append(f"  {n}×  {_esc(_short(self.error_samples[fp]))}")

            if self.client_errors:
                lines += ["", "<b>Top 4xx:</b>"]
                lines += [f"  {n}×  {_esc(k)}" for k, n in self.client_errors.most_common(3)]

            lines += ["", "<b>Containers:</b>"]
            if self.container_events:
                lines += [f"  {n}× {_esc(k)}" for k, n in self.container_events.most_common()]
            else:
                lines.append("  no crashes or health failures")
            if memory:
                lines.append("  memory: " + ", ".join(f"{s} {m}" for s, m in sorted(memory.items())))

            lines += ["", "<b>Schedulers:</b>", f"  {_esc(self.scheduler_summary())}"]
            lines.append(f"  cron failures today: {self.cron_failures}")

            if reset:
                self._reset_day()
        return "\n".join(lines)


def _short(s: str, n: int = 160) -> str:
    s = s.replace("\n", " ")
    return s if len(s) <= n else s[: n - 1] + "…"


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
