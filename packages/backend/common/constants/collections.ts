/* DB collection names*/
import { isDev } from "../helpers/common.helpers";

const useDevCollections = isDev();

export const Collections = {
  OAUTH: useDevCollections ? "dev_oauth" : "oauth_v2",
  USER: useDevCollections ? "dev_user" : "user_v2",
  EVENT: useDevCollections ? "dev_event" : "event_v2",
  PRIORITY: useDevCollections ? "dev_priority" : "priority_v2",
};
