import { EventEmitter2 } from "eventemitter2";
import { SSE_MESSAGE_EVENT } from "@core/constants/sse.constants";
import { ENV_WEB } from "@web/common/constants/env.constants";

// TODO(packet-03-phase-3): the backend now publishes a single `message` SSE
// event whose JSON `data` is a ServerMessageSchema member (B10) instead of
// the six named events this emitter used to forward 1:1. This is a minimal
// mechanical fix so the module compiles: it re-emits using the payload's own
// `type` field (the new ServerMessage type strings, e.g. "eventsChanged"),
// which do not match the old EVENT_CHANGED/SOMEDAY_EVENT_CHANGED/etc names
// consumers still listen for. Hooks need to be rewired to parse
// ServerMessageSchema and switch on `type`.

// Stable emitter that survives stream reconnects. Hooks subscribe here instead
// of directly to the EventSource, so closeStream()+openStream() cycles are
// invisible to anything above this module.
export const sseEmitter = new EventEmitter2({
  wildcard: false,
  maxListeners: 20,
  verboseMemoryLeak: true,
});

let es: EventSource | null = null;
let forwardingHandler: ((e: MessageEvent) => void) | null = null;

export const openStream = (): EventSource => {
  if (es) return es;
  es = new EventSource(`${ENV_WEB.BACKEND_BASEURL}/api/events/stream`, {
    withCredentials: true,
  });
  forwardingHandler = (e: MessageEvent) => {
    try {
      const message = JSON.parse(e.data as string) as { type?: string };
      if (message.type) sseEmitter.emit(message.type, e);
    } catch {
      // malformed message: log + ignore (B10)
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
