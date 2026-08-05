import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { type TransformableInfo } from "logform";
import TransportStream from "winston-transport";

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
    const attributes = Object.entries(info)
      .filter(
        ([key]) =>
          key !== "level" &&
          key !== "message" &&
          !key.startsWith("[") &&
          typeof key !== "symbol",
      )
      .reduce<Record<string, string | number | boolean | undefined>>(
        (acc, [key, value]) => {
          if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
          ) {
            acc[key] = value;
          } else if (value != null) {
            acc[key] = JSON.stringify(value);
          }
          return acc;
        },
        {},
      );

    otelLogger.emit({
      severityText: info.level,
      severityNumber: severityNumbers[info.level] ?? SeverityNumber.INFO,
      body: String(info.message),
      attributes,
    });

    next();
  }
}
