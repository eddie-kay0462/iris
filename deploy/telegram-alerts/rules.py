"""
Turn one raw log line into something the alerter understands.

Pure functions only — no Docker, no network — so every rule here can be tested
against real sample lines (see test_rules.py).

The three shapes we see on the box:

  backend (api1-3, worker)  Nest ConsoleLogger with json:true, one object per line
      {"level":"error","pid":1,"timestamp":…,"message":"GET /api/x -> 500 user=… :: boom","context":"Exception","stack":"…"}
      {"level":"log","pid":1,"timestamp":…,"message":"GET /api/x -> 200 (12ms)","context":"Request"}

  caddy                     JSON access + runtime logs
      {"level":"info","logger":"http.log.access…","msg":"handled request","request":{…},"status":502,"duration":0.01}

  recommender               plain text, from src/utils/logging.py and uvicorn
      2026-09-30 12:00:00 | ERROR    | src.api.main | something broke
      ERROR:    Exception in ASGI application
      Traceback (most recent call last):
        File "…", line 1, in …
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# Parsed record
# ---------------------------------------------------------------------------


@dataclass
class Record:
    service: str
    # request      one served request (metrics only)
    # client_error a 4xx the exception filter logged (metrics only — 401/404 are normal)
    # error        worth a Telegram alert
    # scheduler    the worker announcing whether it owns the crons
    kind: str
    level: str = "info"
    context: str = ""
    message: str = ""
    stack: str = ""
    status: int | None = None
    ms: float | None = None
    route: str | None = None


_ARROW_STATUS = re.compile(r"^(?P<method>[A-Z]+) (?P<path>\S+) -> (?P<status>\d{3})")
_REQUEST_MS = re.compile(r"\((?P<ms>\d+)ms\)\s*$")

# Health probes hit every replica every few seconds (Caddy + Docker). Counting
# them would drown the real traffic in the digest.
_IGNORED_PATHS = ("/api/health",)


def normalize_route(path: str) -> str:
    """/api/orders/9b1c…-…?x=1 -> /api/orders/:id — so routes group in the digest."""
    path = path.split("?", 1)[0]
    parts = []
    for seg in path.split("/"):
        if _UUID.fullmatch(seg) or seg.isdigit() or _ORDER_REF.fullmatch(seg) or (
            len(seg) >= 16 and re.fullmatch(r"[A-Za-z0-9_-]+", seg) and any(c.isdigit() for c in seg)
        ):
            parts.append(":id")
        else:
            parts.append(seg)
    return "/".join(parts)


def _parse_backend(service: str, obj: dict) -> Record | None:
    level = str(obj.get("level", "log"))
    context = str(obj.get("context", ""))
    message = obj.get("message", "")
    if not isinstance(message, str):
        message = json.dumps(message, default=str)
    stack = obj.get("stack") or ""
    if isinstance(stack, list):
        stack = "\n".join(str(s) for s in stack)

    if context == "Request":
        m = _ARROW_STATUS.match(message)
        if not m or m["path"].startswith(_IGNORED_PATHS):
            return None
        ms = _REQUEST_MS.search(message)
        return Record(
            service, "request", level, context, message,
            status=int(m["status"]),
            ms=float(ms["ms"]) if ms else None,
            route=f'{m["method"]} {normalize_route(m["path"])}',
        )

    if context == "Exception":
        m = _ARROW_STATUS.match(message)
        status = int(m["status"]) if m else 500
        route = f'{m["method"]} {normalize_route(m["path"])}' if m else None
        if m and m["path"].startswith(_IGNORED_PATHS):
            return None
        kind = "error" if status >= 500 else "client_error"
        return Record(service, kind, level, context, message, str(stack), status=status, route=route)

    # Nest's own handler logs unknown errors a second time after our filter
    # already has — the "Exception" line above is the one with the request.
    if context == "ExceptionsHandler":
        return None

    if context == "Bootstrap" and "Schedulers" in message:
        return Record(service, "scheduler", level, context, message)

    if level in ("error", "fatal"):
        return Record(service, "error", level, context, message, str(stack))

    return None


def _parse_caddy(service: str, obj: dict) -> Record | None:
    level = str(obj.get("level", "info"))
    logger = str(obj.get("logger", ""))
    status = obj.get("status")

    if logger.startswith("http.log.access"):
        if isinstance(status, int) and status in (502, 503, 504):
            req = obj.get("request") or {}
            path = str(req.get("uri", ""))
            route = f'{req.get("method", "?")} {normalize_route(path)}'
            upstream = obj.get("upstream") or "no upstream"
            return Record(
                service, "error", "error", "caddy",
                f"{route} -> {status} ({upstream})",
                status=status, route=route,
            )
        return None

    # http.log.error duplicates the access line above; everything else at
    # error level (certificate renewal, config) is worth knowing about.
    if level in ("error", "fatal", "panic") and not logger.startswith("http.log"):
        msg = str(obj.get("msg", ""))
        err = obj.get("error")
        if err:
            msg = f"{msg}: {err}"
        return Record(service, "error", level, logger or "caddy", msg)

    return None


# Python text logs ----------------------------------------------------------

_PY_LEVEL = re.compile(r"^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d \| (?P<level>[A-Z]+)\s*\| (?P<name>[^|]+?) \| (?P<msg>.*)$")
_UVICORN_LEVEL = re.compile(r"^(?P<level>[A-Z]+):\s+(?P<msg>.*)$")


def _starts_new_entry(line: str) -> bool:
    return bool(_PY_LEVEL.match(line) or _UVICORN_LEVEL.match(line))


class TextAssembler:
    """
    Stitch a Python traceback back into one record.

    A traceback arrives as many lines; alerting on each would be a dozen
    messages for one crash. An error line opens a record, indented and
    "Traceback" lines extend it, and the next ordinary log line — or two
    seconds of silence (flush_stale) — closes it.
    """

    MAX_LINES = 40
    QUIET_SECONDS = 2.0

    def __init__(self, service: str):
        self.service = service
        self._open: Record | None = None
        self._lines: list[str] = []
        self._touched = 0.0

    def feed(self, line: str, now: float | None = None) -> list[Record]:
        now = time.monotonic() if now is None else now
        out: list[Record] = []

        if self._open is not None and not _starts_new_entry(line):
            if len(self._lines) < self.MAX_LINES:
                self._lines.append(line)
            self._touched = now
            return out

        out.extend(self._close())

        m = _PY_LEVEL.match(line)
        level = msg = context = None
        if m:
            level, msg, context = m["level"], m["msg"], m["name"].strip()
        elif (u := _UVICORN_LEVEL.match(line)):
            level, msg, context = u["level"], u["msg"], "uvicorn"
        elif line.startswith("Traceback"):
            level, msg, context = "ERROR", "Unhandled exception", "python"
            self._lines = [line]

        if level in ("ERROR", "CRITICAL"):
            self._open = Record(self.service, "error", level.lower(), context or "", msg or "")
            self._touched = now
        else:
            self._lines = []
        return out

    def flush_stale(self, now: float | None = None) -> list[Record]:
        now = time.monotonic() if now is None else now
        if self._open is not None and now - self._touched >= self.QUIET_SECONDS:
            return self._close()
        return []

    def _close(self) -> list[Record]:
        if self._open is None:
            return []
        rec = self._open
        rec.stack = "\n".join(self._lines)
        # "Exception in ASGI application" says nothing; the last traceback line
        # ("KeyError: 'x'") is the part that distinguishes one crash from another.
        if self._lines:
            tail = self._lines[-1].strip()
            if tail and tail not in rec.message:
                rec.message = f"{rec.message} — {tail}"
        self._open, self._lines = None, []
        return [rec]


def parse_json_line(service: str, line: str) -> Record | None:
    """For JSON-emitting services. Returns None for anything uninteresting."""
    line = line.strip()
    if not line.startswith("{"):
        return None
    try:
        obj = json.loads(line)
    except ValueError:
        return None
    if not isinstance(obj, dict):
        return None
    if service == "caddy" or "logger" in obj and "ts" in obj:
        return _parse_caddy(service, obj)
    return _parse_backend(service, obj)


# ---------------------------------------------------------------------------
# Fingerprints and de-duplication
# ---------------------------------------------------------------------------

_UUID = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
_ORDER_REF = re.compile(r"[A-Z]{2,5}-[A-Z0-9-]{3,}")
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_HEX = re.compile(r"\b[0-9a-fA-F]{12,}\b")
_NUM = re.compile(r"\d+")
_USER = re.compile(r" user=\S+")


def fingerprint(rec: Record) -> str:
    """
    Same bug, same fingerprint — regardless of which replica, user, order or
    id it hit. The service is deliberately left out so one failure across all
    three replicas groups into one alert.
    """
    msg = _USER.sub("", rec.message)
    for rx, repl in ((_UUID, "<id>"), (_EMAIL, "<email>"), (_ORDER_REF, "<ref>"), (_HEX, "<hex>"), (_NUM, "<n>")):
        msg = rx.sub(repl, msg)
    if rec.route:
        # The route is already normalised; prefer it over the raw path.
        msg = re.sub(r"^[A-Z]+ \S+ -> ", "", msg)
        msg = f"{rec.route} {msg}"
    family = "backend" if rec.service.startswith(("api", "worker")) else rec.service
    return f"{family}|{rec.context}|{msg[:200]}"


@dataclass
class _Group:
    first_sent: float
    suppressed: int = 0
    services: set[str] = field(default_factory=set)
    sample: str = ""


class Deduper:
    """
    First occurrence of a fingerprint goes out immediately. Repeats inside the
    window are counted, and when the window closes they go out as one summary
    line. While the error keeps happening that is one message per window, never
    one per occurrence.
    """

    def __init__(self, window_seconds: float = 600):
        self.window = window_seconds
        self._groups: dict[str, _Group] = {}

    def offer(self, fp: str, service: str, now: float) -> bool:
        """True if this occurrence should be sent now."""
        g = self._groups.get(fp)
        if g is None:
            self._groups[fp] = _Group(first_sent=now)  # this one is named in its own alert
            return True
        g.suppressed += 1
        g.services.add(service)
        return False

    def expire(self, now: float) -> list[tuple[str, int, set[str]]]:
        """Close finished windows; returns (fingerprint, repeats, services) to summarise."""
        summaries = []
        for fp, g in list(self._groups.items()):
            if now - g.first_sent < self.window:
                continue
            if g.suppressed:
                summaries.append((fp, g.suppressed, set(g.services)))
                # Still firing: keep grouping instead of re-sending the full alert.
                self._groups[fp] = _Group(first_sent=now, services=set())
            else:
                del self._groups[fp]
        return summaries


# ---------------------------------------------------------------------------
# Redaction — applied to every outgoing message
# ---------------------------------------------------------------------------

_REDACTIONS = [
    (re.compile(r"(?i)bearer\s+[\w.~+/=-]+"), "Bearer ‹redacted›"),
    (re.compile(r"eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}"), "‹jwt›"),
    (re.compile(r"\b(sk|pk)_(live|test)_\w+"), "‹paystack-key›"),
    (
        re.compile(r"(?i)\b(token|access_token|refresh_token|password|passwd|secret|api[_-]?key|authorization|otp)"
                   r"(\"?\s*[=:]\s*\"?)[^\s\"&,;}<]+"),
        r"\1\2‹redacted›",
    ),
]


def redact(text: str) -> str:
    for rx, repl in _REDACTIONS:
        text = rx.sub(repl, text)
    return text
