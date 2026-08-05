import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import TransportStream from "winston-transport";
import { type TransformableInfo } from "logform";

const otelLogger = logs.getLogger("compass");

const severityNumbers: Record<string, SeverityNumber> = {
  trace: SeverityNumber.TRACE,
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
  fatal: SeverityNumber.FATAL,
  verbose: SeverityNumber.DEBUG,
  http: SeverityNumber.INFO,
  silly: SeverityNumber.TRACE,
};

export class OpenTelemetryTransport extends TransportStream {
  log(info: TransformableInfo, next: () => void): void {
    const attributes: Record<string, string | number | boolean | undefined> = {};

    for (const [key, value] of Object.entries(info)) {
      if (
        key === "level" ||
        key === "message" ||
        typeof key === "symbol" ||
        key.startsWith("[")
      ) {
        continue;
      }

      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        attributes[key] = value;
      } else if (value !== undefined && value !== null) {
        attributes[key] = JSON.stringify(value);
      }
    }

    otelLogger.emit({
      severityText: info.level,
      severityNumber: severityNumbers[info.level] ?? SeverityNumber.INFO,
      body: String(info.message),
      attributes,
    });

    next();
  }
}
