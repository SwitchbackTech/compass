import { IS_DEV } from "@backend/common/constants/config.constants";

export const Collections = {
  BILLING_EVENT: IS_DEV ? "_dev.billingEvent" : "billingEvent",
  CALENDAR: IS_DEV ? "_dev.calendar" : "calendar",
  EVENT: IS_DEV ? "_dev.event" : "event",
  OAUTH: IS_DEV ? "_dev.oauth" : "oauth",
  USER: IS_DEV ? "_dev.user" : "user",
};
