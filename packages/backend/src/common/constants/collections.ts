import { IS_DEV } from "@backend/common/constants/env.constants";

export const Collections = {
  CALENDAR: IS_DEV ? "_dev.calendar" : "calendar",
  EVENT: IS_DEV ? "_dev.event" : "event",
  OAUTH: IS_DEV ? "_dev.oauth" : "oauth",
  PRIORITY: IS_DEV ? "_dev.priority" : "priority",
  SYNC: IS_DEV ? "_dev.sync" : "sync",
  USER: IS_DEV ? "_dev.user" : "user",
  WAITLIST: IS_DEV ? "_dev.waitlist" : "waitlist",
  WATCH: IS_DEV ? "_dev.watch" : "watch",
};
