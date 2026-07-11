import { type Response } from "express";
import { SSE_MESSAGE_EVENT } from "@core/constants/sse.constants";
import { Logger } from "@core/logger/winston.logger";
import { type CalendarId, type EventId } from "@core/types/domain-primitives";
import { type ServerMessage } from "@core/types/server-message.contracts";

const logger = Logger("app:sse.server");
const HEARTBEAT_INTERVAL_MS = 25_000;

class SSEServer {
  private connections = new Map<string, Set<Response>>();

  constructor() {
    // .unref() prevents the interval from keeping the Node.js process alive in
    // tests and graceful shutdown scenarios.
    setInterval(() => {
      for (const [userId, conns] of this.connections) {
        for (const res of conns) {
          try {
            res.write(": keepalive\n\n");
          } catch {
            this.removeConnection(userId, res);
          }
        }
      }
    }, HEARTBEAT_INTERVAL_MS).unref();
  }

  private removeConnection(userId: string, res: Response): void {
    const conns = this.connections.get(userId);
    if (!conns) return;
    conns.delete(res);
    if (conns.size === 0) this.connections.delete(userId);
    logger.debug(`SSE dead connection removed for user: ${userId}`);
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
      this.removeConnection(userId, res);
      logger.debug(`SSE connection closed for user: ${userId}`);
    };
  }

  publish(userId: string, message: ServerMessage): void {
    const conns = this.connections.get(userId);
    if (!conns?.size) return;
    const payload = `event: ${SSE_MESSAGE_EVENT}\ndata: ${JSON.stringify(message)}\n\n`;
    for (const res of conns) {
      try {
        res.write(payload);
      } catch {
        this.removeConnection(userId, res);
      }
    }
  }

  publishTo(res: Response, message: ServerMessage): void {
    const payload = `event: ${SSE_MESSAGE_EVENT}\ndata: ${JSON.stringify(message)}\n\n`;
    try {
      res.write(payload);
    } catch {
      // Connection already closed
    }
  }

  publishEventsChanged(
    userId: string,
    payload: {
      calendarId: CalendarId;
      eventIds: EventId[];
      reason: "created" | "updated" | "deleted" | "reconciled";
    },
  ): void {
    this.publish(userId, { type: "eventsChanged", ...payload });
  }

  publishCalendarsChanged(userId: string, calendarIds: CalendarId[]): void {
    this.publish(userId, { type: "calendarsChanged", calendarIds });
  }

  publishSyncStatus(
    userId: string,
    sync: Extract<ServerMessage, { type: "syncStatusChanged" }>["sync"],
  ): void {
    this.publish(userId, { type: "syncStatusChanged", sync });
  }

  publishImportCompleted(
    userId: string,
    payload: {
      operation: "full" | "incremental" | "repair";
      eventsCount: number;
      calendarsCount: number;
    },
  ): void {
    this.publish(userId, { type: "importCompleted", ...payload });
  }

  publishUserMetadata(userId: string, metadata: Record<string, unknown>): void {
    this.publish(userId, { type: "userMetadataChanged", metadata });
  }
}

export const sseServer = new SSEServer();
