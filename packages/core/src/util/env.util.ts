import { NodeEnv } from "@core/constants/core.constants";

export const isDev = (nodeEnv: NodeEnv | string) =>
  nodeEnv === NodeEnv.Development;

/** True when `nodeEnv` is not production. */
export const isNonProduction = (nodeEnv: NodeEnv | string) =>
  nodeEnv !== NodeEnv.Production;

/** Booking v1 is on in development, staging, and tests. Not production. */
export const isBookingEnabled = (nodeEnv: NodeEnv | string) =>
  isNonProduction(nodeEnv);

/**
 * Microsoft sign-in and connect stay off in production until publisher
 * verification lands. Staging, local, and tests can still offer it.
 */
export const isMicrosoftOffered = (nodeEnv: NodeEnv | string) =>
  isNonProduction(nodeEnv);
