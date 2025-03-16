import { ErrorMetadata } from "./error.types";
import { BaseError } from "./errors.base";
import { Status } from "./status.codes";

export const error = (cause: ErrorMetadata, result: string) => {
  return new BaseError(
    result,
    cause.description,
    cause.status,
    cause.isOperational,
  );
};

export const genericError = (
  e: unknown,
  result: string,
  status = Status.INTERNAL_SERVER,
  isOperational = true,
) => {
  const _e = e as Error;
  const name = _e.name || "GenericName";
  const description = `${name}: ${_e.message || "GenericMsg"}`;
  const cause = { description, isOperational, status };
  return error(cause, result);
};

class ErrorHandler {
  public isOperational(error: Error): boolean {
    if (error instanceof BaseError) {
      return error.isOperational;
    }
    return true;
  }

  public log(error: Error): void {
    const msg = JSON.stringify(error);
    console.error(msg);
  }

  exitAfterProgrammerError(): void {
    console.error(
      "Programmer error occured. Exiting to prevent app instability",
    );
    // uses 500 as code for the response error, but if the error is one of our own,
    // then a more accurate code will be given in the payload
    process.exit(1);
  }
}

export const errorHandler = new ErrorHandler();
