/* DB collection names*/
import { isDev } from "../helpers/common.helpers";

const useDevCollections = isDev();

export const Collections = {
  CALENDARLIST: useDevCollections ? "dev.calendarlist" : "calendarlist",
  WATCHLOG_GCAL: useDevCollections ? "dev.watch.gcal" : "watch.gcal",
  EVENT: useDevCollections ? "dev.event" : "event",
  OAUTH: useDevCollections ? "dev.oauth" : "oauth",
  PRIORITY: useDevCollections ? "dev.priority" : "priority",
  USER: useDevCollections ? "dev.user" : "user",
};
