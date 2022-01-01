import { BaseError } from "@core/errors/errors.base";

import { Logger } from "../../logger/common.logger";

const logger = Logger("app:error.handler");

class ErrorHandler {
  public isOperational(error: Error): boolean {
    if (error instanceof BaseError) {
      return error.isOperational;
    }
    return false;
  }

  public log(error: Error): void {
    //TODO parse Error before logging (?)
    logger.error(error);
  }

  exitAfterProgrammerError(): void {
    logger.error(
      "Programmer error occured. Exiting to prevent app instability"
    );
    // uses 500 as code for the response error, but if the error is one of our own,
    // then a more accurate code will be given in the payload
    process.exit(1);
  }
}

export const errorHandler = new ErrorHandler();
