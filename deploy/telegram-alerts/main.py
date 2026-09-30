"""
Iris → Telegram: alerts, a daily digest, and a few read-only commands.

Threads:
  logs-<service>  one per container, follows its log stream (sources.py)
  events          Docker container events: crash, OOM, unhealthy, recovery
  sender          rate-limited outbound Telegram queue (telegram.py)
  poller          long-polls Telegram for commands
  housekeeping    closes de-dup windows, flushes tracebacks, sends the digest

See deploy/README.md → "Telegram alerts" for setup.
"""

from __future__ import annotations

import html
import logging
import os
import re
import threading
import time
from datetime import datetime
from zoneinfo import ZoneInfo

from digest import Stats
from rules import Deduper, Record, fingerprint
from sources import DockerSource
from telegram import Telegram

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("alerts")
# httpx logs every request URL at INFO, and a Bot API URL contains the token.
logging.getLogger("httpx").setLevel(logging.WARNING)

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
DIGEST_HOUR = int(os.environ.get("ALERT_DIGEST_HOUR", "21"))
TZ = ZoneInfo(os.environ.get("TZ", "Africa/Accra"))
DEDUP_WINDOW = int(os.environ.get("ALERT_DEDUP_SECONDS", "600"))


def esc(s: str) -> str:
    return html.escape(s, quote=False)


class Alerter:
    def __init__(self, tg: Telegram):
        self.tg = tg
        self.stats = Stats()
        self.dedup = Deduper(DEDUP_WINDOW)
        self.samples: dict[str, str] = {}
        self.muted_until = 0.0
        self._lock = threading.Lock()
        self.docker = DockerSource(self.on_record, self.on_container_event)

    # -- inputs -------------------------------------------------------------

    def on_record(self, rec: Record):
        self.stats.record(rec)
        if rec.kind != "error":
            return
        fp = fingerprint(rec)
        with self._lock:
            send_now = self.dedup.offer(fp, rec.service, time.time())
            self.samples.setdefault(fp, rec.message)
        if send_now and not self.muted:
            self.tg.send(self.format_error(rec))

    def on_container_event(self, kind: str, service: str, template: str):
        # Container-level problems bypass /mute: a dead replica is exactly the
        # thing you want to hear about even mid-maintenance.
        if kind in ("crash", "oom", "unhealthy"):
            self.stats.record_container_event(f"{service} {kind}")
        self.tg.send(template.format(s=esc(service)))

    @property
    def muted(self) -> bool:
        return time.time() < self.muted_until

    # -- formatting ---------------------------------------------------------

    @staticmethod
    def format_error(rec: Record) -> str:
        head = "🔥" if (rec.status or 0) >= 500 or rec.level in ("fatal", "critical") else "❗"
        where = f"[{esc(rec.service)}]"
        ctx = f" {esc(rec.context)}" if rec.context else ""
        parts = [f"{head} <b>{where}</b>{ctx}", f"<code>{esc(rec.message[:1500])}</code>"]
        if rec.stack:
            # The top of a stack is where the bug is; the bottom is framework.
            top = "\n".join(rec.stack.strip().splitlines()[:8])
            parts.append(f"<pre>{esc(top[:1500])}</pre>")
        return "\n".join(parts)

    # -- housekeeping -------------------------------------------------------

    def housekeeping(self):
        last_digest_day = None
        last_attach = 0.0
        while True:
            time.sleep(2)
            now = time.time()
            try:
                self.docker.flush_assemblers()

                with self._lock:
                    summaries = self.dedup.expire(now)
                for fp, n, services in summaries:
                    if self.muted:
                        continue
                    sample = self.samples.get(fp, fp)
                    mins = DEDUP_WINDOW // 60
                    self.tg.send(
                        f"🔁 <b>×{n} more</b> in the last {mins} min "
                        f"({esc(', '.join(sorted(services)))})\n<code>{esc(sample[:300])}</code>"
                    )

                # Belt and braces for the event stream: pick up any container
                # we somehow missed starting.
                if now - last_attach > 30:
                    self.docker.attach_all()
                    last_attach = now

                local = datetime.now(TZ)
                if local.hour == DIGEST_HOUR and last_digest_day != local.date():
                    last_digest_day = local.date()
                    self.tg.send(self.stats.render_digest(self.docker.memory(), reset=True))
                    with self._lock:
                        self.samples = {fp: m for fp, m in self.samples.items() if fp in self.dedup._groups}
            except Exception:
                log.exception("housekeeping tick failed")

    # -- commands -----------------------------------------------------------

    def handle_command(self, text: str) -> str | None:
        cmd, *args = text.split()
        cmd = cmd.split("@", 1)[0].lower()  # "/status@iris_ops_bot" in groups

        if cmd in ("/start", "/help"):
            return HELP

        if cmd == "/status":
            req, c4, err = self.stats.last_hour()
            mute = f"\n🔕 muted for another {int((self.muted_until - time.time()) // 60)} min" if self.muted else ""
            return (
                "<b>Iris status</b>\n" + "\n".join(self.docker.status_lines()) +
                f"\n\n<b>Last hour:</b> {req:,} requests · {c4:,} 4xx · {err:,} errors{mute}"
            )

        if cmd == "/errors":
            window = parse_duration(args[0]) if args else 3600
            rows = self.stats.errors_since(window)
            if not rows:
                return f"✨ No errors in the last {fmt_duration(window)}."
            lines = [f"<b>Errors, last {fmt_duration(window)}</b>"]
            for _fp, n, services, msg in rows[:10]:
                lines.append(f"\n<b>{n}×</b> [{esc(', '.join(sorted(services)))}]\n<code>{esc(msg[:300])}</code>")
            return "\n".join(lines)

        if cmd == "/tail":
            if not args:
                return "Usage: /tail &lt;service&gt; [lines]\ne.g. /tail api1 20"
            n = min(int(args[1]), 50) if len(args) > 1 and args[1].isdigit() else 20
            out = self.docker.tail(args[0], n).strip() or "(no output)"
            # Keep the newest lines when it doesn't fit, not the oldest.
            out = out[-3500:]
            return f"<b>{esc(args[0])}</b> — last {n} lines\n<pre>{esc(out)}</pre>"

        if cmd == "/digest":
            return self.stats.render_digest(self.docker.memory(), reset=False)

        if cmd == "/mute":
            secs = parse_duration(args[0]) if args else 3600
            self.muted_until = time.time() + secs
            return f"🔕 Error alerts muted for {fmt_duration(secs)}. Crashes and health failures still come through. /unmute to undo."

        if cmd == "/unmute":
            self.muted_until = 0
            return "🔔 Alerts back on."

        return "Unknown command. /help"


HELP = """<b>Iris ops bot</b>
/status — containers, health, last hour at a glance
/errors [30m|1h|6h|1d] — recent errors, grouped
/tail &lt;service&gt; [n] — last n log lines (max 50)
   services: api1 api2 api3 worker recommender caddy
/digest — today's digest so far
/mute [1h] — silence error alerts (crashes still alert)
/unmute"""


def parse_duration(s: str) -> int:
    m = re.fullmatch(r"(\d+)\s*([smhd]?)", s.strip().lower())
    if not m:
        raise ValueError(f"can't read duration '{s}' — try 30m, 1h, 1d")
    n, unit = int(m[1]), m[2] or "m"
    return n * {"s": 1, "m": 60, "h": 3600, "d": 86400}[unit]


def fmt_duration(secs: int) -> str:
    if secs % 86400 == 0:
        return f"{secs // 86400}d"
    if secs % 3600 == 0:
        return f"{secs // 3600}h"
    return f"{secs // 60}m"


def main():
    if not TOKEN or not CHAT_ID:
        # Don't crash-loop under restart: unless-stopped — just sit idle until
        # someone fills in .env and recreates the container.
        log.warning("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set; alerts are disabled.")
        while True:
            time.sleep(3600)

    tg = Telegram(TOKEN, CHAT_ID)
    alerter = Alerter(tg)
    log.info("watching compose project '%s'", alerter.docker.project)

    alerter.docker.attach_all()
    for name, target, args in (
        ("sender", tg.run_sender, ()),
        ("events", alerter.docker.run_events, ()),
        ("poller", tg.run_poller, (alerter.handle_command,)),
    ):
        threading.Thread(target=target, args=args, name=name, daemon=True).start()

    tg.send(f"🟢 <b>Iris alerts online</b> — watching {len(alerter.docker.status_lines())} containers. /help")
    alerter.housekeeping()


if __name__ == "__main__":
    main()
