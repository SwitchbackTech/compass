/* DB collection names*/
import { isDev } from "../helpers/common.helpers";

const useDevCollections = isDev();

export const Collections = {
  CALENDARLIST: useDevCollections ? "dev.calendarlist" : "calendarlist",
  DEV_WATCHLOG_GCAL: "dev.watch.gcal", // only for dev, so no conditional
  EVENT: useDevCollections ? "dev.event" : "event",
  OAUTH: useDevCollections ? "dev.oauth" : "oauth",
  PRIORITY: useDevCollections ? "dev.priority" : "priority",
  USER: useDevCollections ? "dev.user" : "user",
};
