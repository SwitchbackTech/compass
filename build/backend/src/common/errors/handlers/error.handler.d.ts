declare class ErrorHandler {
  isOperational(error: Error): boolean;
  log(error: Error): void;
  exitAfterProgrammerError(): void;
}
export declare const errorHandler: ErrorHandler;
export {};
//# sourceMappingURL=error.handler.d.ts.map
