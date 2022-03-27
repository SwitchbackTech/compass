/* DB collection names*/
import { isDev } from "../helpers/common.helpers";

const useDevCollections = isDev();

export const Collections = {
  CALENDARLIST: useDevCollections ? "_dev.calendarlist" : "calendarlist",
  WATCHLOG_GCAL: useDevCollections ? "_dev.watch.gcal" : "watch.gcal",
  EVENT: useDevCollections ? "_dev.event" : "event",
  OAUTH: useDevCollections ? "_dev.oauth" : "oauth",
  PRIORITY: useDevCollections ? "_dev.priority" : "priority",
  USER: useDevCollections ? "_dev.user" : "user",
};
