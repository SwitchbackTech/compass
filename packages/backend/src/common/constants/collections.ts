/* DB collection names*/
import { isDev } from "../helpers/common.helpers";

const useDevCollections = isDev();

export const Collections = {
  OAUTH: useDevCollections ? "wip_dev_oauth" : "oauth_v2",
  USER: useDevCollections ? "wip_dev_user" : "user_v2",
  EVENT: useDevCollections ? "wip_dev_event" : "event_v2",
  PRIORITY: useDevCollections ? "wip_dev_priority" : "priority_v2",
};
