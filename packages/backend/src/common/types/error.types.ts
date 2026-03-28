import { type Status } from "@core/errors/status.codes";

export interface CompassError extends Error {
  name: string;
  result?: string;
  stack?: string;
  status?: Status;
}

export interface ErrorMetadata {
  description: string;
  isOperational: boolean;
  status: Status;
}

export interface Info_Error {
  name?: string;
  message: string;
  stack?: string;
}
