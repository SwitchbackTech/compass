import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { type TransformableInfo } from "logform";
import * as winston from "winston";
import { MB_50 } from "@core/constants/core.constants";

const otelLogger = logs.getLogger("compass");

const severityNumbers: Record<string, SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

const emitOpenTelemetryLog = (info: TransformableInfo) => {
  otelLogger.emit({
    severityText: info.level,
    severityNumber: severityNumbers[info.level],
    body: String(info.message),
    attributes: {
      namespace: String(info["namespace"] || ""),
    },
  });
};

const openTelemetryFormat = winston.format((info) => {
  emitOpenTelemetryLog(info);
  return info;
});

const consoleFormat = winston.format.combine(
  winston.format.splat(),
  winston.format.colorize(),
  winston.format.timestamp({ format: "YY-MM-DD HH:mm:ss" }),
  winston.format.printf((info: TransformableInfo) => {
    const { timestamp, namespace, level, message, ...meta } = info;
    const _namespace = (namespace || "") as string;
    const _timestamp = (timestamp || "") as string;
    return `${_timestamp} [${level}] ${_namespace}: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
    }`;
  }),
);

export const Logger = (namespace?: string) => {
  const logger = winston.createLogger({
    level: process.env["LOG_LEVEL"],
    format: openTelemetryFormat(),
    transports: [
      new winston.transports.File({
        filename: "logs/app.log",
        level: process.env["LOG_LEVEL"],
        maxsize: MB_50,
        maxFiles: 1,
      }),
      new winston.transports.Console({ format: consoleFormat }),
    ],
  });

  return namespace ? logger.child({ namespace }) : logger;
};
