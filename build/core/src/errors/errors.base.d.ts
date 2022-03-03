import { Status } from "./status.codes";
export declare class BaseError extends Error {
  readonly name: string;
  readonly description: string;
  readonly statusCode: Status;
  readonly isOperational: boolean;
  constructor(
    name: string,
    description: string,
    statusCode: Status,
    isOperational: boolean
  );
}
//# sourceMappingURL=errors.base.d.ts.map
