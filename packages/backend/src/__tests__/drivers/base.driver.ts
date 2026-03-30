import http from "node:http";
import { type Request, agent } from "supertest";
import { initExpressServer } from "@backend/servers/express/express.server";

export class BaseDriver {
  private readonly app = initExpressServer();
  private readonly http = http.createServer(this.app);
  private readonly server = agent(this.http);

  private serverUri?: string;

  private getSessionCookie(session?: { userId: string }): string {
    return `session=${JSON.stringify(session)}`;
  }

  constructor() {
    this.http.timeout = 3000;
    this.http.keepAliveTimeout = 4000;
  }

  /**
   * listen
   *
   * @returns {string} the server's address
   */
  async listen(): Promise<string> {
    this.serverUri = await new Promise((resolve, reject) => {
      this.http.listen(0);
      this.http.on("listening", () => {
        const address = this.http.address();
        if (address && typeof address === "object") {
          resolve(`http://localhost:${address.port}`);
        } else {
          reject(new Error("Could not determine server address"));
        }
      });
      this.http.on("error", reject);
    });

    return this.serverUri;
  }

  setSessionPlugin(session?: { userId: string }) {
    return (req: Request & { session?: { getUserId: () => string } }): void => {
      if (session) req.set("Cookie", this.getSessionCookie(session));
    };
  }

  getServer() {
    return this.server;
  }

  getServerUri() {
    if (!this.serverUri) throw new Error("did you forget to call `listen`?");

    return this.serverUri;
  }

  /**
   * openSSEStream
   *
   * Opens an SSE stream for a user, collects events, and returns
   * a handle to close the stream and retrieve collected events.
   */
  openSSEStream(user?: { userId: string; sessionId?: string }): {
    close: () => void;
    waitForEvent: (eventName: string, timeoutMs?: number) => Promise<unknown>;
  } {
    if (!this.serverUri) throw new Error("did you forget to call `listen`?");

    const eventListeners = new Map<string, Array<(data: unknown) => void>>();

    const cookie = user ? this.getSessionCookie(user) : undefined;

    let controller: AbortController | undefined;

    const startStream = async () => {
      controller = new AbortController();
      const headers: Record<string, string> = {
        Accept: "text/event-stream",
      };
      if (cookie) headers["Cookie"] = cookie;

      try {
        const response = await fetch(`${this.serverUri}/api/events/stream`, {
          headers,
          signal: controller.signal,
        });

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let eventName = "message";
          let dataLine = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventName = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataLine = line.slice(6).trim();
            } else if (line === "") {
              if (dataLine) {
                const parsed = JSON.parse(dataLine) as unknown;
                const listeners = eventListeners.get(eventName) ?? [];
                for (const cb of listeners) cb(parsed);
                eventName = "message";
                dataLine = "";
              }
            }
          }
        }
      } catch {
        // Stream closed or aborted
      }
    };

    void startStream();

    return {
      close: () => controller?.abort(),
      waitForEvent: (eventName: string, timeoutMs = 5000) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for SSE event: ${eventName}`));
          }, timeoutMs);

          const listeners = eventListeners.get(eventName) ?? [];
          listeners.push((data) => {
            clearTimeout(timer);
            resolve(data);
          });
          eventListeners.set(eventName, listeners);
        }),
    };
  }

  async teardown() {
    try {
      if (!this.http.listening) return;

      await new Promise<void>((resolve, reject) => {
        this.http.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    } catch (error) {
      console.error(error);
    }
  }
}
