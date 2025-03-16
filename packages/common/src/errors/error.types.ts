export interface CompassError extends Error {
  name: string;
  result?: string;
  stack?: string;
  status?: number;
}

export interface ErrorMetadata {
  description: string;
  isOperational: boolean;
  status: number;
}

export interface Info_Error {
  name?: string;
  message: string;
  stack?: string;
}
