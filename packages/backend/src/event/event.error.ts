import { ZodError, type z } from "zod/v4";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import {
  type EventMutationError,
  type EventMutationErrorCodeSchema,
} from "@core/types/event-command.contracts";

export type EventMutationErrorCode = z.infer<
  typeof EventMutationErrorCodeSchema
>;

const STATUS_BY_CODE: Record<EventMutationErrorCode, Status> = {
  EVENT_NOT_FOUND: Status.NOT_FOUND,
  CALENDAR_NOT_FOUND: Status.NOT_FOUND,
  CALENDAR_READ_ONLY: Status.FORBIDDEN,
  RECURRENCE_CONFLICT: Status.CONFLICT,
  DUPLICATE_EVENT_ID: Status.CONFLICT,
  INVALID_SCHEDULE: Status.BAD_REQUEST,
  INVALID_OCCURRENCE_ID: Status.BAD_REQUEST,
  PROVIDER_FAILURE: 502 as Status,
  // 410 Gone, not 401: SuperTokens treats every 401 as a Compass session
  // expiry and retries the request after refresh. Google revocation must not
  // share that status or event creates loop until maxRetryAttemptsForSessionRefresh.
  GOOGLE_REVOKED: Status.GONE,
  MAINTENANCE: Status.SERVICE_UNAVAILABLE,
  MOVE_UNSUPPORTED: Status.BAD_REQUEST,
  INVALID_INPUT: Status.BAD_REQUEST,
  BILLING_REQUIRED: Status.FORBIDDEN,
  // 403 like CALENDAR_READ_ONLY: the provider refuses the operation for this
  // event (e.g. deleting one occurrence of a Google birthday event) — not a
  // provider outage, so never the retryable 502 it used to surface as.
  UNSUPPORTED_OPERATION: Status.FORBIDDEN,
};

const RETRYABLE_BY_CODE: Record<EventMutationErrorCode, boolean> = {
  EVENT_NOT_FOUND: false,
  CALENDAR_NOT_FOUND: false,
  CALENDAR_READ_ONLY: false,
  RECURRENCE_CONFLICT: false,
  DUPLICATE_EVENT_ID: false,
  INVALID_SCHEDULE: false,
  INVALID_OCCURRENCE_ID: false,
  PROVIDER_FAILURE: true,
  GOOGLE_REVOKED: false,
  MAINTENANCE: true,
  MOVE_UNSUPPORTED: false,
  INVALID_INPUT: false,
  BILLING_REQUIRED: false,
  UNSUPPORTED_OPERATION: false,
};

export class EventMutationException extends BaseError {
  constructor(
    public readonly mutationCode: EventMutationErrorCode,
    message: string,
  ) {
    super(
      mutationCode,
      message,
      STATUS_BY_CODE[mutationCode],
      true,
      mutationCode,
    );
  }
}

export const eventMutationError = (
  code: EventMutationErrorCode,
  message: string,
): EventMutationException => new EventMutationException(code, message);

/**
 * Maps any thrown error into the strict EventMutationError envelope (B5).
 * Never leaks the generic `{ result, message }` shape from event/calendar
 * routes.
 */
export const toEventMutationError = (
  e: unknown,
): { status: Status; body: EventMutationError } => {
  if (e instanceof EventMutationException) {
    return {
      status: STATUS_BY_CODE[e.mutationCode],
      body: {
        code: e.mutationCode,
        message: e.message,
        retryable: RETRYABLE_BY_CODE[e.mutationCode],
      },
    };
  }

  if (e instanceof BaseError && e.code) {
    const code = e.code as EventMutationErrorCode;
    if (code in STATUS_BY_CODE) {
      return {
        status: STATUS_BY_CODE[code],
        body: {
          code,
          message: e.description,
          retryable: RETRYABLE_BY_CODE[code],
        },
      };
    }
  }

  // A contract violation (e.g. CreateEventInputSchema.parse rejecting an
  // unrecognized key) is a client-side mistake, not a provider outage — map
  // it to its own code/status rather than falling into the provider-failure
  // catch-all below, which used to mislabel it as a retryable 500.
  if (e instanceof ZodError) {
    const message = e.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    return {
      status: STATUS_BY_CODE.INVALID_INPUT,
      body: {
        code: "INVALID_INPUT",
        message,
        retryable: RETRYABLE_BY_CODE.INVALID_INPUT,
      },
    };
  }

  // Programmer bugs and unexpected throws are not provider outages — never
  // advertise them as retryable or clients will hammer the same broken path.
  const message = e instanceof Error ? e.message : "Unexpected error";
  return {
    status: Status.INTERNAL_SERVER,
    body: { code: "PROVIDER_FAILURE", message, retryable: false },
  };
};
