import { EventEmitter2 } from "eventemitter2";
import {
  EVENT_CHANGED,
  GOOGLE_REVOKED,
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  SOMEDAY_EVENT_CHANGED,
  USER_METADATA,
} from "@core/constants/sse.constants";
import { ENV_WEB } from "@web/common/constants/env.constants";

const SSE_EVENTS = [
  EVENT_CHANGED,
  SOMEDAY_EVENT_CHANGED,
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  GOOGLE_REVOKED,
  USER_METADATA,
] as const;

// Stable emitter that survives stream reconnects. Hooks subscribe here instead
// of directly to the EventSource, so closeStream()+openStream() cycles are
// invisible to anything above this module.
export const sseEmitter = new EventEmitter2({
  wildcard: false,
  maxListeners: 20,
  verboseMemoryLeak: true,
});

let es: EventSource | null = null;
let forwardingHandlers: Map<string, (e: Event) => void> | null = null;

export const openStream = (): EventSource => {
  if (es) return es;
  es = new EventSource(`${ENV_WEB.BACKEND_BASEURL}/api/events/stream`, {
    withCredentials: true,
  });
  forwardingHandlers = new Map();
  for (const eventName of SSE_EVENTS) {
    const handler = (e: Event) => sseEmitter.emit(eventName, e);
    forwardingHandlers.set(eventName, handler);
    es.addEventListener(eventName, handler);
  }
  return es;
};

export const closeStream = (): void => {
  if (es && forwardingHandlers) {
    for (const [eventName, handler] of forwardingHandlers) {
      es.removeEventListener(eventName, handler);
    }
  }
  es?.close();
  es = null;
  forwardingHandlers = null;
};

export const getStream = (): EventSource | null => es;
