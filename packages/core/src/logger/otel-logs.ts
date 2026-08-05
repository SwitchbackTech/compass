import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import { PostHog } from "posthog-node";
import { NodeEnv } from "@core/constants/core.constants";

export interface OtelLogsOptions {
  serviceName: string;
  nodeEnv: NodeEnv;
  posthogKey?: string;
  posthogHost?: string;
}

let loggerProvider: LoggerProvider | undefined;
let posthogClient: PostHog | undefined;

export function startOtelLogs(options: OtelLogsOptions): PostHog | null {
  const isRemoteLoggingEnvironment =
    options.nodeEnv === NodeEnv.Staging ||
    options.nodeEnv === NodeEnv.Production;

  if (isRemoteLoggingEnvironment && options.posthogKey) {
    const host = options.posthogHost || "https://us.i.posthog.com";

    loggerProvider = new LoggerProvider({
      resource: resourceFromAttributes({
        "service.name": options.serviceName,
      }),
      processors: [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({
            url: `${host}/i/v1/logs`,
            headers: {
              Authorization: `Bearer ${options.posthogKey}`,
            },
          }),
        }),
      ],
    });

    logs.setGlobalLoggerProvider(loggerProvider);

    posthogClient = new PostHog(options.posthogKey, {
      host,
      flushInterval: 1000,
    });

    return posthogClient;
  }

  return null;
}

export async function stopOtelLogs(): Promise<void> {
  await loggerProvider?.shutdown();
  await posthogClient?.shutdown();
}

export function getPostHogClient(): PostHog | null {
  return posthogClient ?? null;
}
