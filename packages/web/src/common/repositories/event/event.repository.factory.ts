import { type EventRepository } from "./event.repository.interface";

export type EventRepositorySource = "local" | "remote";

type EventRepositoryDependencies = {
  createLocalEventRepository: () => EventRepository;
  createRemoteEventRepository: () => EventRepository;
  hasUserEverAuthenticated: () => boolean;
  isBackendUnavailable: () => boolean;
  isGoogleRevoked: () => boolean;
};

export function createGetEventRepositorySource({
  hasUserEverAuthenticated,
  isBackendUnavailable,
  isGoogleRevoked,
}: Omit<
  EventRepositoryDependencies,
  "createLocalEventRepository" | "createRemoteEventRepository"
>) {
  return function getEventRepositorySource(
    sessionExists: boolean,
  ): EventRepositorySource {
    if (isGoogleRevoked()) {
      return "local";
    }

    if (isBackendUnavailable()) {
      return "local";
    }

    if (hasUserEverAuthenticated()) {
      return "remote";
    }

    if (sessionExists) {
      return "remote";
    }

    return "local";
  };
}

export function createGetEventRepository({
  createLocalEventRepository,
  createRemoteEventRepository,
  hasUserEverAuthenticated,
  isBackendUnavailable,
  isGoogleRevoked,
}: EventRepositoryDependencies) {
  const getEventRepositorySource = createGetEventRepositorySource({
    hasUserEverAuthenticated,
    isBackendUnavailable,
    isGoogleRevoked,
  });

  return function getEventRepository(sessionExists: boolean): EventRepository {
    const source = getEventRepositorySource(sessionExists);
    return source === "remote"
      ? createRemoteEventRepository()
      : createLocalEventRepository();
  };
}
