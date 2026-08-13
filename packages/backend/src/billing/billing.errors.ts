import Stripe from "stripe";
import { Status } from "@core/errors/status.codes";

export class BillingHttpError extends Error {
  readonly status: number;
  readonly clientMessage: string;

  constructor(status: number, clientMessage: string, cause?: unknown) {
    const detail = cause instanceof Error ? cause.message : clientMessage;
    super(detail);
    this.name = "BillingHttpError";
    this.status = status;
    this.clientMessage = clientMessage;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

const BILLING_CLIENT_MESSAGE =
  "Couldn't start billing. Please try again in a moment.";

export function wrapStripeFailure(e: unknown): never {
  if (e instanceof BillingHttpError) throw e;
  if (e instanceof Stripe.errors.StripeError) {
    const stripeStatus = e.statusCode ?? 0;
    const status =
      stripeStatus === 429 || stripeStatus >= 500
        ? Status.BAD_GATEWAY
        : Status.BAD_REQUEST;
    throw new BillingHttpError(status, BILLING_CLIENT_MESSAGE, e);
  }
  throw e;
}
