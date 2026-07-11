import { type z } from "zod/v4";
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
  PROVIDER_FAILURE: 502 as Status,
};

const RETRYABLE_BY_CODE: Record<EventMutationErrorCode, boolean> = {
  EVENT_NOT_FOUND: false,
  CALENDAR_NOT_FOUND: false,
  CALENDAR_READ_ONLY: false,
  RECURRENCE_CONFLICT: false,
  DUPLICATE_EVENT_ID: false,
  INVALID_SCHEDULE: false,
  PROVIDER_FAILURE: true,
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

  const message = e instanceof Error ? e.message : "Unexpected error";
  return {
    status: Status.INTERNAL_SERVER,
    body: { code: "PROVIDER_FAILURE", message, retryable: true },
  };
};
