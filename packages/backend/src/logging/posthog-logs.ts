import { startOtelLogs, stopOtelLogs } from "@core/logger/otel-logs";
import { CONFIG } from "@backend/common/constants/config.constants";

export function startPostHogLogs(): void {
  startOtelLogs({
    serviceName: "compass-backend",
    nodeEnv: CONFIG.NODE_ENV,
    posthogKey: CONFIG.POSTHOG_KEY,
    posthogHost: CONFIG.POSTHOG_HOST,
  });
}

export async function stopPostHogLogs(): Promise<void> {
  await stopOtelLogs();
}
