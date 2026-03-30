import type { Response } from "express";
import {
  EVENT_CHANGED,
  GOOGLE_REVOKED,
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  SOMEDAY_EVENT_CHANGED,
} from "@core/constants/sse.constants";
import { Logger } from "@core/logger/winston.logger";
import type { ImportGCalEndPayload } from "@core/types/sse.types";

const logger = Logger("app:sse.server");
const HEARTBEAT_INTERVAL_MS = 25_000;

class SSEServer {
  private connections = new Map<string, Set<Response>>();

  constructor() {
    // .unref() prevents the interval from keeping the Node.js process alive in
    // tests and graceful shutdown scenarios.
    setInterval(() => {
      for (const conns of this.connections.values()) {
        for (const res of conns) {
          try {
            res.write(": keepalive\n\n");
          } catch {
            // Connection already closed
          }
        }
      }
    }, HEARTBEAT_INTERVAL_MS).unref();
  }

  subscribe(userId: string, res: Response): () => void {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const conns = this.connections.get(userId) ?? new Set<Response>();
    conns.add(res);
    this.connections.set(userId, conns);
    logger.debug(
      `SSE connection opened for user: ${userId} (total: ${conns.size})`,
    );

    return () => {
      conns.delete(res);
      if (conns.size === 0) this.connections.delete(userId);
      logger.debug(`SSE connection closed for user: ${userId}`);
    };
  }

  publish(userId: string, event: string, data: unknown = {}): void {
    const conns = this.connections.get(userId);
    if (!conns?.size) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of conns) {
      try {
        res.write(payload);
      } catch {
        // Will be cleaned up by close handler
      }
    }
  }

  handleImportGCalStart(userId: string): void {
    this.publish(userId, IMPORT_GCAL_START);
  }

  handleImportGCalEnd(userId: string, payload?: ImportGCalEndPayload): void {
    this.publish(userId, IMPORT_GCAL_END, payload ?? {});
  }

  handleBackgroundCalendarChange(userId: string): void {
    this.publish(userId, EVENT_CHANGED);
  }

  handleBackgroundSomedayChange(userId: string): void {
    this.publish(userId, SOMEDAY_EVENT_CHANGED);
  }

  handleGoogleRevoked(userId: string): void {
    this.publish(userId, GOOGLE_REVOKED);
  }
}

export const sseServer = new SSEServer();
