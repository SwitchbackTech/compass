import { ZodError, z } from "zod/v4";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";

export const BookingErrorCodeSchema = z.enum([
  "GOOGLE_NOT_CONNECTED",
  "DESTINATION_NOT_WRITABLE",
  "BLOCKING_CALENDAR_INVALID",
  "INVALID_INPUT",
  "BILLING_REQUIRED",
]);
export type BookingErrorCode = z.infer<typeof BookingErrorCodeSchema>;

const STATUS_BY_CODE: Record<BookingErrorCode, Status> = {
  GOOGLE_NOT_CONNECTED: Status.FORBIDDEN,
  DESTINATION_NOT_WRITABLE: Status.FORBIDDEN,
  BLOCKING_CALENDAR_INVALID: Status.BAD_REQUEST,
  INVALID_INPUT: Status.BAD_REQUEST,
  BILLING_REQUIRED: Status.FORBIDDEN,
};

export class BookingException extends BaseError {
  constructor(
    public readonly bookingCode: BookingErrorCode,
    message: string,
  ) {
    super(bookingCode, message, STATUS_BY_CODE[bookingCode], true, bookingCode);
  }
}

export const bookingError = (
  code: BookingErrorCode,
  message: string,
): BookingException => new BookingException(code, message);

export const toBookingErrorResponse = (
  e: unknown,
): { status: Status; body: { code: BookingErrorCode; message: string } } => {
  if (e instanceof BookingException) {
    return {
      status: STATUS_BY_CODE[e.bookingCode],
      body: { code: e.bookingCode, message: e.message },
    };
  }

  if (e instanceof ZodError) {
    const message = e.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    return {
      status: STATUS_BY_CODE.INVALID_INPUT,
      body: { code: "INVALID_INPUT", message },
    };
  }

  if (e instanceof BaseError && e.code) {
    const code = e.code as BookingErrorCode;
    if (code in STATUS_BY_CODE) {
      return {
        status: STATUS_BY_CODE[code],
        body: { code, message: e.description },
      };
    }
  }

  const message = e instanceof Error ? e.message : "Unexpected error";
  return {
    status: Status.INTERNAL_SERVER,
    body: { code: "INVALID_INPUT", message },
  };
};
