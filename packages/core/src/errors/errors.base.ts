import { Status } from "./status.codes";

interface ErrorMetadata {
  description: string;
  status: Status;
  isOperational: boolean;
}

export type ErrorConstant = Record<string, ErrorMetadata>;

export class BaseError extends Error {
  public readonly result: string;
  public readonly description: string;
  // Tech debt: 'statusCode' does not match the
  // 'status' key in ErrorMetadata
  public readonly statusCode: Status;
  public readonly isOperational: boolean;

  constructor(
    result: string,
    description: string,
    statusCode: Status,
    isOperational: boolean,
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
