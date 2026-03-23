import { Status } from "@core/errors/status.codes";

type ErrorWithStatus = {
  response?: {
    status?: unknown;
  };
};

const EXPECTED_SESSION_AUTH_ERROR_STATUSES = new Set<number>([
  Status.BAD_REQUEST,
  Status.UNAUTHORIZED,
]);

const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const status = (error as ErrorWithStatus).response?.status;
  return typeof status === "number" ? status : undefined;
};

export const isExpectedSessionAuthError = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  return (
    typeof status === "number" &&
    EXPECTED_SESSION_AUTH_ERROR_STATUSES.has(status)
  );
};
