import TransportStream from "winston-transport";
import { type TransformableInfo } from "logform";
import { getPostHogClient } from "./otel-logs";

export class PostHogExceptionTransport extends TransportStream {
  constructor() {
    super({ level: "error" });
  }

  log(info: TransformableInfo, next: () => void): void {
    const posthog = getPostHogClient();
    if (!posthog) {
      next();
      return;
    }

    const message = String(info.message || "Error");
    const stack = info["stack"] ? String(info["stack"]) : undefined;
    const userId = info["userId"] ? String(info["userId"]) : undefined;

    const err = new Error(message);
    if (stack) {
      err.stack = stack;
    }

    const distinctId = userId || "unknown";
    const properties: Record<string | number, unknown> = {};

    for (const [key, value] of Object.entries(info)) {
      if (
        key === "level" ||
        key === "message" ||
        key === "stack" ||
        key === "userId" ||
        typeof key === "symbol" ||
        key.startsWith("[")
      ) {
        continue;
      }

      properties[key] = value;
    }

    posthog.captureException(err, distinctId, properties);

    next();
  }
}
