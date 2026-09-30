"""
Everything that talks to Docker: following container logs, watching container
events, and the read-only queries behind /status and /tail.

All of it goes through docker-socket-proxy (DOCKER_HOST=tcp://docker-proxy:2375),
which only allows GET on containers and events. Even if this process were
compromised it could read logs, not start or exec into containers.
"""

from __future__ import annotations

import logging
import socket
import threading
import time
from datetime import datetime, timezone
from typing import Callable

import docker
from docker.errors import APIError, NotFound

from rules import Record, TextAssembler, parse_json_line

log = logging.getLogger("sources")

# Plain-text services. Everything else in the stack logs JSON.
TEXT_SERVICES = {"recommender"}

# A die this soon after a kill/stop was asked for — i.e. deploy.sh recreating a
# container, or `docker compose stop` — is intentional, not a crash.
INTENTIONAL_WINDOW = 60


class DockerSource:
    def __init__(self, on_record: Callable[[Record], None], on_container_event: Callable[[str, str, str], None]):
        self.client = docker.from_env()
        self.on_record = on_record
        self.on_container_event = on_container_event
        self.project = self._detect_project()
        self._following: set[str] = set()
        self._assemblers: dict[str, TextAssembler] = {}
        self._lock = threading.Lock()
        self._stop_requested: dict[str, float] = {}
        self._unhealthy: set[str] = set()
        self._crashed: set[str] = set()

    def _detect_project(self) -> str:
        """Our own compose project label, so we only ever watch this stack."""
        try:
            me = self.client.containers.get(socket.gethostname())
            return me.labels["com.docker.compose.project"]
        except (NotFound, KeyError, APIError):
            return "iris"

    @property
    def _label(self) -> str:
        return f"com.docker.compose.project={self.project}"

    @staticmethod
    def service_of(container) -> str:
        return container.labels.get("com.docker.compose.service", container.name)

    def containers(self, all_: bool = False):
        return self.client.containers.list(all=all_, filters={"label": self._label})

    # -- logs ---------------------------------------------------------------

    def attach_all(self):
        """Start a follower for every running container we aren't following yet."""
        for c in self.containers():
            self._follow(c)

    def _follow(self, container):
        service = self.service_of(container)
        if service in ("log-alerts", "docker-proxy"):
            return
        with self._lock:
            if container.id in self._following:
                return
            self._following.add(container.id)
        threading.Thread(target=self._run_follower, args=(container, service), daemon=True,
                         name=f"logs-{service}").start()

    def _run_follower(self, container, service: str):
        assembler = TextAssembler(service) if service in TEXT_SERVICES else None
        if assembler:
            with self._lock:
                self._assemblers[container.id] = assembler
        buf = b""
        try:
            # since=now: on a restart of this sidecar, don't re-alert on history.
            stream = container.logs(stream=True, follow=True, since=int(time.time()))
            for chunk in stream:
                buf += chunk
                *lines, buf = buf.split(b"\n")
                for raw in lines:
                    line = raw.decode("utf-8", "replace").rstrip("\r")
                    if not line:
                        continue
                    if assembler:
                        with self._lock:
                            recs = assembler.feed(line)
                    else:
                        rec = parse_json_line(service, line)
                        recs = [rec] if rec else []
                    for rec in recs:
                        self.on_record(rec)
        except Exception as e:  # container went away mid-stream, proxy hiccup, …
            log.info("stopped following %s: %s", service, e)
        finally:
            with self._lock:
                self._following.discard(container.id)
                a = self._assemblers.pop(container.id, None)
            if a:
                for rec in a.flush_stale(now=float("inf")):
                    self.on_record(rec)

    def flush_assemblers(self):
        """Close any traceback that has gone quiet. Called from the housekeeping loop."""
        with self._lock:
            items = list(self._assemblers.values())
            recs = [r for a in items for r in a.flush_stale()]
        for r in recs:
            self.on_record(r)

    # -- events -------------------------------------------------------------

    def run_events(self):
        while True:
            try:
                for ev in self.client.events(decode=True, filters={"type": "container", "label": self._label}):
                    self._handle_event(ev)
            except Exception as e:
                log.warning("event stream broke (%s); reconnecting", e)
                time.sleep(3)
                self.attach_all()  # anything that started while we were blind

    def _handle_event(self, ev: dict):
        action: str = ev.get("Action") or ev.get("status") or ""
        cid: str = ev.get("id") or ev.get("Actor", {}).get("ID", "")
        attrs = ev.get("Actor", {}).get("Attributes", {})
        service = attrs.get("com.docker.compose.service") or attrs.get("name", cid[:12])
        if service in ("log-alerts", "docker-proxy"):
            return
        now = time.time()

        if action in ("kill", "stop"):
            self._stop_requested[cid] = now
        elif action == "start":
            try:
                self._follow(self.client.containers.get(cid))
            except NotFound:
                pass
            if cid in self._crashed:
                self._crashed.discard(cid)
                self.on_container_event("restarted", service, "🔁 <b>{s}</b> restarted after the crash")
        elif action == "oom":
            self.on_container_event("oom", service, "🔴 <b>{s}</b> ran out of memory (OOM kill)")
        elif action == "die":
            asked = self._stop_requested.pop(cid, None)
            if asked is not None and now - asked < INTENTIONAL_WINDOW:
                return
            code = attrs.get("exitCode", "?")
            self._crashed.add(cid)
            self.on_container_event("crash", service, f"🔴 <b>{{s}}</b> crashed (exit code {code})")
        elif action.startswith("health_status"):
            state = action.split(":", 1)[-1].strip()
            if state == "unhealthy":
                self._unhealthy.add(cid)
                self.on_container_event("unhealthy", service, "🟠 <b>{s}</b> is failing its health check")
            elif state == "healthy" and cid in self._unhealthy:
                self._unhealthy.discard(cid)
                self.on_container_event("healthy", service, "✅ <b>{s}</b> is healthy again")
        elif action == "destroy":
            self._stop_requested.pop(cid, None)
            self._unhealthy.discard(cid)
            self._crashed.discard(cid)

    # -- queries for commands -----------------------------------------------

    def status_lines(self) -> list[str]:
        rows = []
        for c in sorted(self.containers(all_=True), key=self.service_of):
            svc = self.service_of(c)
            state = c.attrs.get("State", {})
            health = (state.get("Health") or {}).get("Status")
            status = state.get("Status", c.status)
            icon = "🟢" if status == "running" and health in (None, "healthy") else (
                "🟠" if status == "running" else "🔴")
            up = _age(state.get("StartedAt")) if status == "running" else status
            extra = f", {health}" if health and health != "healthy" else ""
            restarts = c.attrs.get("RestartCount", 0)
            rs = f", {restarts} restarts" if restarts else ""
            rows.append(f"{icon} <b>{svc}</b> — up {up}{extra}{rs}")
        return rows

    def tail(self, service: str, n: int) -> str:
        matches = [c for c in self.containers(all_=True) if self.service_of(c) == service]
        if not matches:
            names = ", ".join(sorted({self.service_of(c) for c in self.containers(all_=True)}))
            raise ValueError(f"no service '{service}'. Try one of: {names}")
        out = matches[0].logs(tail=n, timestamps=False).decode("utf-8", "replace")
        return out

    def memory(self) -> dict[str, str]:
        out = {}
        for c in self.containers():
            svc = self.service_of(c)
            try:
                st = c.stats(stream=False, one_shot=True)
                used = st.get("memory_stats", {}).get("usage")
                if used:
                    out[svc] = f"{used / 1_048_576:.0f}MB"
            except Exception:
                pass
        return out


def _age(started_at: str | None) -> str:
    if not started_at:
        return "?"
    try:
        ts = datetime.fromisoformat(started_at[:26].rstrip("Z") + "+00:00")
    except ValueError:
        return "?"
    secs = int((datetime.now(timezone.utc) - ts).total_seconds())
    if secs < 3600:
        return f"{secs // 60}m"
    if secs < 86400:
        return f"{secs // 3600}h{(secs % 3600) // 60:02d}m"
    return f"{secs // 86400}d{(secs % 86400) // 3600}h"
