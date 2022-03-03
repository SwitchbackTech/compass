import { errorHandler } from "./error.handler";

process.on("uncaughtException", (error: Error) => {
  errorHandler.log(error);
  if (!errorHandler.isOperational(error)) {
    errorHandler.exitAfterProgrammerError();
  }
});

// get the unhandled promise rejections/exceptions and throw it to the
// `uncaughtException` fallback handler
//@ts-ignore
process.on("unhandledRejection", (reason: Error, promise: Promise<any>) => {
  throw reason;
});
