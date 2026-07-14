import { SSE_MESSAGE_EVENT } from "@core/constants/sse.constants";
import {
  type ServerMessage,
  ServerMessageSchema,
} from "@core/types/server-message.contracts";
import { ENV_WEB } from "@web/common/constants/env.constants";

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

let es: EventSource | null = null;
let forwardingHandler: ((e: MessageEvent) => void) | null = null;

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
  es.addEventListener(SSE_MESSAGE_EVENT, forwardingHandler);
  return es;
};

export const closeStream = (): void => {
  if (es && forwardingHandler) {
    es.removeEventListener(SSE_MESSAGE_EVENT, forwardingHandler);
  }
  es?.close();
  es = null;
  forwardingHandler = null;
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

export type OnServerMessage = typeof onServerMessage;
