import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import { NodeEnv } from "@core/constants/core.constants";
import { CONFIG } from "@backend/common/constants/config.constants";

const isRemoteLoggingEnvironment =
  CONFIG.NODE_ENV === NodeEnv.Staging || CONFIG.NODE_ENV === NodeEnv.Production;

const loggerProvider =
  isRemoteLoggingEnvironment && CONFIG.POSTHOG_KEY
    ? new LoggerProvider({
        resource: resourceFromAttributes({
          "service.name": "compass-backend",
        }),
        processors: [
          new BatchLogRecordProcessor({
            exporter: new OTLPLogExporter({
              url: `${CONFIG.POSTHOG_HOST}/i/v1/logs`,
              headers: {
                Authorization: `Bearer ${CONFIG.POSTHOG_KEY}`,
              },
            }),
          }),
        ],
      })
    : undefined;

export function startPostHogLogs(): void {
  if (loggerProvider) logs.setGlobalLoggerProvider(loggerProvider);
}

export async function stopPostHogLogs(): Promise<void> {
  await loggerProvider?.shutdown();
}
