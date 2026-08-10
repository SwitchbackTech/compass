import { SSE_MESSAGE_EVENT } from "@core/constants/sse.constants";
import {
  type ServerMessage,
  ServerMessageSchema,
} from "@core/types/server-message.contracts";
import { getPosthogClient } from "@web/auth/posthog/posthog.bootstrap";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { createExternalStore } from "@web/common/utils/external-store.util";

// The backend publishes one `message` SSE event per B10; its JSON `data` is a
// ServerMessageSchema member. This module is the single parse point: every
// consumer subscribes here by the message's own `type` and receives the
// already-validated ServerMessage, never the raw EventSource payload.
const listenersByType = new Map<
  ServerMessage["type"],
  Set<(message: ServerMessage) => void>
>();

function getListeners(
  type: ServerMessage["type"],
): Set<(message: ServerMessage) => void> {
  let listeners = listenersByType.get(type);
  if (!listeners) {
    listeners = new Set();
    listenersByType.set(type, listeners);
  }
  return listeners;
}

const reopenListeners = new Set<() => void>();

let es: EventSource | null = null;
let forwardingHandler: ((e: MessageEvent) => void) | null = null;
let openHandler: (() => void) | null = null;
let errorHandler: (() => void) | null = null;
let degradedTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectCount = 0;
let hasReportedDegraded = false;

const DEGRADED_AFTER_MS = 15_000;

// Whether the live stream has been down long enough that displayed data can
// no longer be trusted as fresh. Previously this was analytics-only
// (sse_connection_degraded, PostHog) with no UI representation at all: a tab
// with a dead stream kept showing "Calendar connected" and a "Updated N
// minutes ago" timestamp that both silently stopped being true.
const sseDegradedStore = createExternalStore(false);

export function isSseDegraded(): boolean {
  return sseDegradedStore.get();
}

export function subscribeSseDegraded(onChange: () => void): () => void {
  return sseDegradedStore.subscribe(onChange);
}

function clearDegradedTimer() {
  if (degradedTimer !== null) {
    clearTimeout(degradedTimer);
    degradedTimer = null;
  }
}

function reportSseDegraded() {
  sseDegradedStore.set(true);
  if (hasReportedDegraded) return;
  hasReportedDegraded = true;
  getPosthogClient()?.capture("sse_connection_degraded", {
    reconnect_count: reconnectCount,
  });
}

function armDegradedTimer() {
  clearDegradedTimer();
  degradedTimer = setTimeout(() => {
    if (es && es.readyState !== EventSource.OPEN) {
      reportSseDegraded();
    }
  }, DEGRADED_AFTER_MS);
}

export const openStream = (): EventSource => {
  if (es) return es;
  es = new EventSource(`${ENV_WEB.BACKEND_BASEURL}/api/events/stream`, {
    withCredentials: true,
  });
  forwardingHandler = (e: MessageEvent) => {
    let raw: unknown;
    try {
      raw = JSON.parse(e.data as string);
    } catch {
      // eslint-disable-next-line no-console
      console.error("[sse] malformed message payload", e.data);
      return;
    }

    const parsed = ServerMessageSchema.safeParse(raw);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.error("[sse] unrecognized message shape", parsed.error, raw);
      return;
    }

    for (const listener of getListeners(parsed.data.type)) {
      listener(parsed.data);
    }
  };
  // Native EventSource reconnects after laptop sleep without going through
  // openStream() again; the open event is the seam that refetches the gap.
  openHandler = () => {
    clearDegradedTimer();
    hasReportedDegraded = false;
    sseDegradedStore.set(false);
    for (const listener of reopenListeners) {
      listener();
    }
  };
  errorHandler = () => {
    reconnectCount += 1;
    armDegradedTimer();
  };
  es.addEventListener(SSE_MESSAGE_EVENT, forwardingHandler);
  es.addEventListener("open", openHandler);
  es.addEventListener("error", errorHandler);
  return es;
};

export const closeStream = (): void => {
  clearDegradedTimer();
  sseDegradedStore.set(false);
  if (es && forwardingHandler) {
    es.removeEventListener(SSE_MESSAGE_EVENT, forwardingHandler);
  }
  if (es && openHandler) {
    es.removeEventListener("open", openHandler);
  }
  if (es && errorHandler) {
    es.removeEventListener("error", errorHandler);
  }
  es?.close();
  es = null;
  forwardingHandler = null;
  openHandler = null;
  errorHandler = null;
};

export const getStream = (): EventSource | null => es;

// Typed subscribe helper so hooks never have to re-narrow `ServerMessage` by
// hand; the emitter is otherwise stringly-typed (EventEmitter2's own API).
export function onServerMessage<T extends ServerMessage["type"]>(
  type: T,
  handler: (message: Extract<ServerMessage, { type: T }>) => void,
): () => void {
  const listener = (message: ServerMessage) => handler(message as never);
  const listeners = getListeners(type);
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function onStreamReopen(handler: () => void): () => void {
  reopenListeners.add(handler);
  return () => {
    reopenListeners.delete(handler);
  };
}

export type OnServerMessage = typeof onServerMessage;
