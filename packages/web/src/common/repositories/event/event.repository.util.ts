import { EventRepository } from "./event.repository.interface";
import { LocalEventRepository } from "./local.event.repository";
import { RemoteEventRepository } from "./remote.event.repository";

/**
 * Factory function to get the appropriate event repository based on session state.
 * Can be used in sagas or other non-React contexts.
 * @param sessionExists - Whether a session exists (from session.doesSessionExist())
 */
export function getEventRepository(sessionExists: boolean): EventRepository {
  return sessionExists
    ? new RemoteEventRepository()
    : new LocalEventRepository();
}
