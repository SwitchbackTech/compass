import { Logger as createWinstonLogger } from "@core/logger/winston.logger";

export type LoggerInstance = ReturnType<typeof createWinstonLogger>;
export type LoggerFactoryFn = (namespace?: string) => LoggerInstance;

let loggerFactory: LoggerFactoryFn = createWinstonLogger;

/** Production default; tests replace via registerLoggerFactory. */
export function LoggerFactory(namespace?: string): LoggerInstance {
  return loggerFactory(namespace);
}

export function registerLoggerFactory(factory: LoggerFactoryFn): void {
  loggerFactory = factory;
}

export function resetLoggerFactory(): void {
  loggerFactory = createWinstonLogger;
}
