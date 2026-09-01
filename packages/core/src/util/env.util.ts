import { NodeEnv } from "@core/constants/core.constants";

export const isDev = (nodeEnv: NodeEnv | string) =>
  nodeEnv === NodeEnv.Development;

/** Booking v1 is on in development, staging, and tests. Not production. */
export const isBookingEnabled = (nodeEnv: NodeEnv | string) =>
  nodeEnv !== NodeEnv.Production;
