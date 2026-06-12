/**
 * First-party analytics beacon.
 *
 * Batches storefront events (page views, add-to-cart, checkout, purchase)
 * and posts them to the backend ingest endpoint. Everything here must fail
 * silently — analytics can never break the shopping experience.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const SESSION_KEY = "iris_sid";
const SESSION_TS_KEY = "iris_sid_ts";
const VISITOR_KEY = "iris_vid";
const SESSION_IDLE_MS = 30 * 60 * 1000; // new session after 30 min inactivity

type TrackedEventType =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "checkout_started"
  | "purchase";

interface TrackProps {
  productId?: string;
  orderId?: string;
  value?: number;
  path?: string;
}

interface QueuedEvent {
  sessionId: string;
  visitorId: string;
  eventType: TrackedEventType;
  path: string;
  deviceType: string;
  referrer?: string;
  landingPage?: string;
  productId?: string;
  orderId?: string;
  value?: number;
}

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable
  }
}

export function getVisitorId(): string {
  let vid = safeGet(VISITOR_KEY);
  if (!vid) {
    vid = uuid();
    safeSet(VISITOR_KEY, vid);
  }
  return vid;
}

// Set when a new session id is minted so the first event of the session
// carries the landing page + referrer.
let newSession = false;

export function getSessionId(): string {
  const now = Date.now();
  const lastSeen = parseInt(safeGet(SESSION_TS_KEY) ?? "0", 10);
  let sid = safeGet(SESSION_KEY);
  if (!sid || now - lastSeen > SESSION_IDLE_MS) {
    sid = uuid();
    safeSet(SESSION_KEY, sid);
    newSession = true;
  }
  safeSet(SESSION_TS_KEY, String(now));
  return sid;
}

function deviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

// ── Queue + flush ─────────────────────────────────────────────────────────────

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;

function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;
  const events = queue.slice(0, 20);
  queue = queue.slice(20);
  try {
    // fetch keepalive survives page unloads and supports JSON cross-origin
    // (sendBeacon can't send application/json across origins).
    fetch(`${API_BASE_URL}/analytics/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never surface tracking failures
  }
  if (queue.length > 0) scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 5_000);
}

function bindListeners() {
  if (listenersBound) return;
  listenersBound = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

export function track(eventType: TrackedEventType, props: TrackProps = {}) {
  if (typeof window === "undefined") return;
  try {
    bindListeners();
    const sessionId = getSessionId();
    const event: QueuedEvent = {
      sessionId,
      visitorId: getVisitorId(),
      eventType,
      path: props.path ?? window.location.pathname,
      deviceType: deviceType(),
      productId: props.productId,
      orderId: props.orderId,
      value: props.value,
    };
    if (newSession) {
      event.landingPage = window.location.pathname;
      event.referrer = document.referrer || undefined;
      newSession = false;
    }
    queue.push(event);
    // Purchases and checkouts are too important to wait for the timer.
    if (eventType === "purchase" || eventType === "checkout_started") flush();
    else scheduleFlush();
  } catch {
    // never surface tracking failures
  }
}

// ── Checkout snapshots (abandoned-checkout capture) ──────────────────────────

export interface CheckoutSnapshotItem {
  productId?: string;
  variantId?: string;
  productName: string;
  variantTitle?: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
}

export interface CheckoutSnapshotPayload {
  email?: string;
  phone?: string;
  customerName?: string;
  userId?: string;
  items: CheckoutSnapshotItem[];
  subtotal?: number;
  completedOrderId?: string;
}

export function snapshotCheckout(payload: CheckoutSnapshotPayload) {
  if (typeof window === "undefined") return;
  try {
    fetch(`${API_BASE_URL}/analytics/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getSessionId(),
        visitorId: getVisitorId(),
        ...payload,
        email: payload.email || undefined,
        phone: payload.phone || undefined,
        customerName: payload.customerName || undefined,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never surface tracking failures
  }
}
