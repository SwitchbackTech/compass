import { MB_50 } from "@core/constants/core.constants";
import { TransformableInfo } from "logform";
import * as winston from "winston";

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
  })
);

const transports = (logFileName?: string) => {
  const fileTransport = new winston.transports.File({
    filename: logFileName ? logFileName : "logs/app.log",
    level: process.env["LOG_LEVEL"],
    maxsize: MB_50,
    maxFiles: 1,
  });
  const consoleTransport = new winston.transports.Console({
    format: consoleFormat,
  });

  if (logFileName) {
    return [fileTransport];
  } else {
    return [fileTransport, consoleTransport];
  }
};

export const Logger = (namespace?: string, logFile?: string) => {
  if (!namespace) {
    return winston.createLogger({
      level: process.env["LOG_LEVEL"],
      transports: transports(),
    });
  }

  if (logFile) {
    const secondaryLogger = winston.createLogger({
      level: process.env["LOG_LEVEL"],
      transports: transports(logFile),
    });
    return secondaryLogger.child({ namespace });
  }

  const primaryLogger = winston.createLogger({
    level: process.env["LOG_LEVEL"],
    transports: transports(),
  });

  return primaryLogger.child({ namespace });
};
