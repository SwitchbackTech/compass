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

export function createGetEventRepositoryBySource({
  createLocalEventRepository,
  createRemoteEventRepository,
}: Pick<
  EventRepositoryDependencies,
  "createLocalEventRepository" | "createRemoteEventRepository"
>) {
  return function getEventRepositoryBySource(
    source: EventRepositorySource,
  ): EventRepository {
    return source === "remote"
      ? createRemoteEventRepository()
      : createLocalEventRepository();
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
  const getEventRepositoryBySource = createGetEventRepositoryBySource({
    createLocalEventRepository,
    createRemoteEventRepository,
  });

  return function getEventRepository(sessionExists: boolean): EventRepository {
    return getEventRepositoryBySource(getEventRepositorySource(sessionExists));
  };
}
