import { type EventRepository } from "./event.repository.interface";

type EventRepositoryDependencies = {
  createLocalEventRepository: () => EventRepository;
  createRemoteEventRepository: () => EventRepository;
  hasUserEverAuthenticated: () => boolean;
  isBackendUnavailable: () => boolean;
  isGoogleRevoked: () => boolean;
};

export function createGetEventRepository({
  createLocalEventRepository,
  createRemoteEventRepository,
  hasUserEverAuthenticated,
  isBackendUnavailable,
  isGoogleRevoked,
}: EventRepositoryDependencies) {
  return function getEventRepository(sessionExists: boolean): EventRepository {
    if (isGoogleRevoked()) {
      return createLocalEventRepository();
    }

    if (isBackendUnavailable()) {
      return createLocalEventRepository();
    }

    if (hasUserEverAuthenticated()) {
      return createRemoteEventRepository();
    }

    if (sessionExists) {
      return createRemoteEventRepository();
    }

    return createLocalEventRepository();
  };
}
