/* DB collection names*/
import { isDev } from "../helpers/common.helpers";

const useDevCollections = isDev();

export const Collections = {
  CALENDARLIST: useDevCollections ? "dev.calendarlist" : "calendarlist.v2",
  EVENT: useDevCollections ? "dev.event" : "event.v2",
  OAUTH: useDevCollections ? "dev.oauth" : "oauth.v2",
  PRIORITY: useDevCollections ? "dev.priority" : "priority.v2",
  USER: useDevCollections ? "dev.user" : "user.v2",
};
