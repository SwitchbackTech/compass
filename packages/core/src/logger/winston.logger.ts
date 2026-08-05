import { type TransformableInfo } from "logform";
import * as winston from "winston";
import { MB_50 } from "@core/constants/core.constants";
import { OpenTelemetryTransport } from "@core/logger/otel.transport";
import { PostHogExceptionTransport } from "@core/logger/posthog-exception.transport";

const consoleFormat = winston.format.combine(
  winston.format.splat(),
  winston.format.colorize(),
  winston.format.timestamp({ format: "YY-MM-DD HH:mm:ss" }),
  winston.format.printf((info: TransformableInfo) => {
    const { timestamp, namespace, level, message, ...meta } = info;
    const _namespace = (namespace || "") as string;
    const _timestamp = (timestamp || "") as string;
    return `${_timestamp} [${level}] ${_namespace}: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta) : ""
    }`;
  }),
);

const createTransports = (): winston.transport[] => [
  new winston.transports.File({
    filename: "logs/app.log",
    level: process.env["LOG_LEVEL"],
    maxsize: MB_50,
    maxFiles: 1,
  }),
  new winston.transports.Console({ format: consoleFormat }),
  new OpenTelemetryTransport({
    level: process.env["LOG_LEVEL"],
  }),
  new PostHogExceptionTransport(),
];

export const Logger = (namespace?: string) => {
  const logger = winston.createLogger({
    level: process.env["LOG_LEVEL"],
    format: winston.format.splat(),
    transports: createTransports(),
  });

  return namespace ? logger.child({ namespace }) : logger;
};
