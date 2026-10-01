"""Run with: pytest deploy/telegram-alerts"""

import json

from digest import Stats
from rules import Deduper, TextAssembler, fingerprint, normalize_route, parse_json_line, redact


def nest(context, message, level="log", stack=None):
    obj = {"level": level, "pid": 1, "timestamp": 1790000000000, "message": message, "context": context}
    if stack:
        obj["stack"] = stack
    return json.dumps(obj)


def test_request_line_is_a_metric():
    rec = parse_json_line("api1", nest("Request", "GET /api/products/5b0e1c2a-1111-2222-3333-444455556666?x=1 -> 200 (42ms)"))
    assert rec.kind == "request"
    assert rec.status == 200 and rec.ms == 42
    assert rec.route == "GET /api/products/:id"


def test_health_probes_are_ignored():
    assert parse_json_line("api1", nest("Request", "GET /api/health -> 200 (1ms)")) is None


def test_500_exception_alerts():
    rec = parse_json_line("api2", nest(
        "Exception", "POST /api/orders -> 500 user=abc :: duplicate key | 23505", level="error",
        stack="Error: duplicate key\n    at OrdersService.create"))
    assert rec.kind == "error" and rec.status == 500
    assert "OrdersService" in rec.stack


def test_4xx_exception_is_counted_not_alerted():
    rec = parse_json_line("api1", nest("Exception", "GET /api/admin/orders -> 401 :: Unauthorized", level="error"))
    assert rec.kind == "client_error"


def test_duplicate_nest_handler_line_is_dropped():
    assert parse_json_line("api1", nest("ExceptionsHandler", "boom", level="error")) is None


def test_cron_failure_alerts():
    rec = parse_json_line("worker", nest("OrdersReconciliationCron", "Pending-order reconciliation failed: timeout", level="error"))
    assert rec.kind == "error" and rec.service == "worker"


def test_scheduler_line_recorded():
    rec = parse_json_line("worker", nest("Bootstrap", "Schedulers ENABLED — 5 cron job(s) registered"))
    assert rec.kind == "scheduler"


def test_caddy_502_alerts_and_200_does_not():
    base = {"level": "info", "ts": 1790000000.1, "logger": "http.log.access.log0", "msg": "handled request",
            "request": {"method": "GET", "uri": "/api/products?page=2"}, "duration": 0.01}
    assert parse_json_line("caddy", json.dumps({**base, "status": 200})) is None
    rec = parse_json_line("caddy", json.dumps({**base, "status": 502}))
    assert rec.kind == "error" and rec.status == 502 and rec.route == "GET /api/products"


def test_caddy_tls_error_alerts():
    rec = parse_json_line("caddy", json.dumps({"level": "error", "ts": 1.0, "logger": "tls.obtain",
                                               "msg": "could not get certificate", "error": "rate limited"}))
    assert rec.kind == "error" and "rate limited" in rec.message


def test_python_traceback_is_one_record():
    a = TextAssembler("recommender")
    out = []
    for line in [
        "INFO:     172.18.0.5:0 - \"GET /recommend HTTP/1.1\" 200 OK",
        "ERROR:    Exception in ASGI application",
        "Traceback (most recent call last):",
        '  File "/app/src/api/main.py", line 80, in recommend',
        "    return model[user_id]",
        "KeyError: 'u-123'",
    ]:
        out += a.feed(line, now=0)
    assert out == []  # still open — could be more traceback
    out += a.flush_stale(now=10)
    assert len(out) == 1
    assert out[0].kind == "error"
    assert "KeyError" in out[0].message
    assert "main.py" in out[0].stack


def test_python_error_closed_by_next_line():
    a = TextAssembler("recommender")
    out = a.feed("2026-09-30 12:00:00 | ERROR    | src.api.main | model missing", now=0)
    out += a.feed("2026-09-30 12:00:01 | INFO     | src.api.main | ok", now=0)
    assert len(out) == 1 and out[0].message == "model missing"


def test_python_info_is_ignored():
    a = TextAssembler("recommender")
    assert a.feed("2026-09-30 12:00:00 | INFO     | src.api.main | ready", now=0) == []
    assert a.flush_stale(now=10) == []


def test_fingerprint_ignores_replica_user_and_ids():
    r1 = parse_json_line("api1", nest("Exception", "GET /api/orders/ORD-12345 -> 500 user=a :: row 9 missing", "error"))
    r2 = parse_json_line("api3", nest("Exception", "GET /api/orders/ORD-99999 -> 500 user=b :: row 17 missing", "error"))
    assert fingerprint(r1) == fingerprint(r2)


def test_deduper_groups_repeats():
    d = Deduper(window_seconds=600)
    assert d.offer("fp", "api1", now=0) is True
    for i in range(20):
        assert d.offer("fp", "api2", now=1 + i) is False
    assert d.expire(now=100) == []
    [(fp, n, services)] = d.expire(now=601)
    assert n == 20 and services == {"api2"}
    # Still firing → keeps grouping instead of a fresh full alert
    assert d.offer("fp", "api1", now=602) is False
    # Quiet window → group closes, next occurrence alerts again
    d.expire(now=1300)
    d.expire(now=2000)
    assert d.offer("fp", "api1", now=2001) is True


def test_redaction():
    s = redact('Authorization: Bearer abc.def.ghi token=xyz123 "password":"hunter2" sk_live_abcdef '
               'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U')
    for secret in ("abc.def.ghi", "xyz123", "hunter2", "sk_live_abcdef", "eyJhbGci"):
        assert secret not in s


def test_normalize_route():
    assert normalize_route("/api/orders/123/items?x=1") == "/api/orders/:id/items"
    assert normalize_route("/api/products") == "/api/products"


def test_digest_renders():
    s = Stats()
    s.record(parse_json_line("api1", nest("Request", "GET /api/products -> 200 (10ms)")))
    s.record(parse_json_line("api2", nest("Exception", "POST /api/orders -> 500 :: boom", "error")))
    s.record_container_event("api2 crash")
    text = s.render_digest({"api1": "120MB"})
    assert "Requests:" in text and "boom" in text and "api2 crash" in text


def test_redaction_keeps_html_intact():
    assert redact("<code>x token=abc123</code>") == "<code>x token=‹redacted›</code>"


def test_scheduler_owner_not_overwritten_by_replicas():
    s = Stats()
    s.record(parse_json_line("worker", nest("Bootstrap", "Schedulers ENABLED — 5 cron job(s) registered")))
    s.record(parse_json_line("api3", nest("Bootstrap", "Schedulers DISABLED on this instance (RUN_CRONS != true)")))
    assert s.scheduler_summary() == "✅ worker owns the crons"
    s.record(parse_json_line("worker", nest("Bootstrap", "Schedulers DISABLED on this instance (RUN_CRONS != true)")))
    assert "no container" in s.scheduler_summary()
