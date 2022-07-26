import { Status } from "./status.codes";

export class BaseError extends Error {
  public readonly result: string;
  public readonly description: string;
  public readonly statusCode: Status;
  public readonly isOperational: boolean;

  constructor(
    result: string,
    description: string,
    statusCode: Status,
    isOperational: boolean
  ) {
    super(description);
    Object.setPrototypeOf(this, new.target.prototype);

    this.result = result;
    this.description = description;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this);
  }
}

/*example of how to extend
export class APIError extends BaseError {
  constructor(
    name: string,
    statusCode = StatusCodes.INTERNAL_SERVER,
    description = "Internal server error",
    isOperational = true
  ) {
    super(name, statusCode, description, isOperational);
  }
}
*/
