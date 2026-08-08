import { type EventRepository } from "./event.repository.types";

export type EventRepositorySource = "local" | "remote";

type EventRepositoryDependencies = {
  createLocalEventRepository: () => EventRepository;
  createRemoteEventRepository: () => EventRepository;
  hasUserEverAuthenticated: () => boolean;
  isBackendUnavailable: () => boolean;
};

export function createGetEventRepositorySource({
  hasUserEverAuthenticated,
  isBackendUnavailable,
}: Omit<
  EventRepositoryDependencies,
  "createLocalEventRepository" | "createRemoteEventRepository"
>) {
  return function getEventRepositorySource(
    sessionExists: boolean,
  ): EventRepositorySource {
    // Per-account reconnect-required must not demote healthy Google accounts
    // to IndexedDB. Write gates block the broken account; remote stays active.
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
}: EventRepositoryDependencies) {
  const getEventRepositorySource = createGetEventRepositorySource({
    hasUserEverAuthenticated,
    isBackendUnavailable,
  });
  const getEventRepositoryBySource = createGetEventRepositoryBySource({
    createLocalEventRepository,
    createRemoteEventRepository,
  });

  return function getEventRepository(sessionExists: boolean): EventRepository {
    return getEventRepositoryBySource(getEventRepositorySource(sessionExists));
  };
}
