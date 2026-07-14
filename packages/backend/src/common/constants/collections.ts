import { IS_DEV } from "@backend/common/constants/config.constants";

export const Collections = {
  CALENDAR: IS_DEV ? "_dev.calendar" : "calendar",
  EVENT: IS_DEV ? "_dev.event" : "event",
  OAUTH: IS_DEV ? "_dev.oauth" : "oauth",
  SYNC: IS_DEV ? "_dev.sync" : "sync",
  USER: IS_DEV ? "_dev.user" : "user",
  WATCH: IS_DEV ? "_dev.watch" : "watch",
};
