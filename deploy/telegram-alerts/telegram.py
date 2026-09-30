"""
Telegram Bot API: a rate-limited outbound queue and a long-polling command loop.

Long polling (getUpdates) instead of a webhook means the bot needs no inbound
port — Caddy stays the only thing on the box that publishes one.
"""

from __future__ import annotations

import logging
import os
import queue
import threading
import time
from typing import Callable

import httpx

from rules import redact

log = logging.getLogger("telegram")

MAX_LEN = 4096
# Telegram allows about one message a second to a single chat. Staying a bit
# under that leaves headroom for command replies.
SEND_INTERVAL = 1.2


class Telegram:
    def __init__(self, token: str, chat_id: str):
        self.chat_id = str(chat_id)
        # Overridable only so the bot can be exercised against a local stub.
        api = os.environ.get("TELEGRAM_API_BASE", "https://api.telegram.org")
        self._base = f"{api}/bot{token}"
        self._http = httpx.Client(timeout=httpx.Timeout(10.0, read=65.0))
        self._q: queue.Queue[str] = queue.Queue(maxsize=1000)
        self._dropped = 0

    # -- outbound -----------------------------------------------------------

    def send(self, html: str):
        """Queue an HTML-formatted message. Never blocks the log readers."""
        try:
            self._q.put_nowait(html)
        except queue.Full:
            self._dropped += 1

    def run_sender(self):
        while True:
            first = self._q.get()
            # A burst (a replica crashing mid-traffic) arrives as many small
            # messages at once. Pack whatever is already queued into one send.
            batch = [first]
            size = len(first)
            while not self._q.empty():
                nxt = self._q.queue[0]
                if size + len(nxt) + 2 > MAX_LEN - 200:
                    break
                batch.append(self._q.get_nowait())
                size += len(nxt) + 2
            text = "\n\n".join(batch)
            if self._dropped:
                text += f"\n\n⚠️ {self._dropped} alert(s) dropped — queue was full."
                self._dropped = 0
            self._post_message(self.chat_id, text)
            time.sleep(SEND_INTERVAL)

    def _post_message(self, chat_id: str, html: str):
        html = redact(html)
        if len(html) > MAX_LEN:
            html = html[: MAX_LEN - 20] + "\n…(truncated)"
        for attempt in range(5):
            try:
                r = self._http.post(
                    f"{self._base}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": html,
                        "parse_mode": "HTML",
                        "disable_web_page_preview": True,
                    },
                )
                if r.status_code == 429:
                    wait = r.json().get("parameters", {}).get("retry_after", 5)
                    time.sleep(float(wait) + 0.5)
                    continue
                if r.status_code == 400 and "parse" in r.text.lower():
                    # Truncation can cut an HTML tag in half. Send it as plain
                    # text rather than lose the alert.
                    self._http.post(f"{self._base}/sendMessage", json={"chat_id": chat_id, "text": html})
                    return
                if r.is_success:
                    return
                log.warning("sendMessage %s: %s", r.status_code, r.text[:300])
                return
            except httpx.HTTPError as e:
                log.warning("sendMessage failed (attempt %d): %s", attempt + 1, e)
                time.sleep(2 ** attempt)

    # -- inbound ------------------------------------------------------------

    def run_poller(self, handle: Callable[[str], str | None]):
        """
        Answer commands from the configured chat only. Anything else — another
        user who finds the bot, a group it's added to — is ignored silently.
        """
        offset = None
        started = time.time()
        while True:
            try:
                r = self._http.get(
                    f"{self._base}/getUpdates",
                    params={"timeout": 50, "offset": offset, "allowed_updates": '["message"]'},
                )
                r.raise_for_status()
                updates = r.json().get("result", [])
            except (httpx.HTTPError, ValueError) as e:
                log.warning("getUpdates failed: %s", e)
                time.sleep(5)
                continue

            for u in updates:
                offset = u["update_id"] + 1
                msg = u.get("message") or {}
                if str(msg.get("chat", {}).get("id")) != self.chat_id:
                    continue
                # Don't replay commands that queued up while we were down.
                if msg.get("date", 0) < started - 120:
                    continue
                text = (msg.get("text") or "").strip()
                if not text.startswith("/"):
                    continue
                try:
                    reply = handle(text)
                except ValueError as e:  # bad arguments — the user's typo, not our bug
                    reply = f"⚠️ {e}"
                except Exception as e:  # a bad command must never kill the poller
                    log.exception("command failed")
                    reply = f"⚠️ {type(e).__name__}: {e}"
                if reply:
                    self._post_message(self.chat_id, reply)
