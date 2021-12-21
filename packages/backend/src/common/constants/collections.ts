/* DB collection names*/
import { isDev } from "../helpers/common.helpers";

const useDevCollections = isDev();

export const Collections = {
  EVENT: useDevCollections ? "wip_dev_event" : "event_v2",
  CALENDAR: useDevCollections ? "wip_dev_calendar" : "calendar",
  OAUTH: useDevCollections ? "wip_dev_oauth" : "oauth_v2",
  PRIORITY: useDevCollections ? "wip_dev_priority" : "priority_v2",
  USER: useDevCollections ? "wip_dev_user" : "user_v2",
};
