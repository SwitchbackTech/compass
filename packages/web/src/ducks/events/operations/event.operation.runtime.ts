import { type QueryClient } from "@tanstack/react-query";
import { type AnyAction } from "redux";
import {
  hasUserEverAuthenticated,
  markAnonymousCalendarChangeForSignUpPrompt,
} from "@web/auth/compass/state/auth.state.util";
import { isGoogleRevoked } from "@web/auth/google/state/google.auth.state";
import { session } from "@web/common/classes/Session";
import { type EventRepository } from "@web/common/repositories/event/event.repository.interface";
import {
  getEventRepository,
  getEventRepositorySource,
} from "@web/common/repositories/event/event.repository.util";
import { handleError } from "@web/common/utils/event/event.util";
import { type RootState } from "@web/store";

type RepositorySource = ReturnType<typeof getEventRepositorySource>;

export interface EventOperationRuntime {
  dispatch: (action: AnyAction) => unknown;
  getState: () => RootState;
  queryClient: QueryClient;
  signal: AbortSignal;
  doesSessionExist?: () => Promise<boolean>;
  getRepository?: (sessionExists: boolean) => EventRepository;
  getRepositorySource?: (sessionExists: boolean) => RepositorySource;
  reportError?: (error: Error) => void;
  hasUserEverAuthenticated?: () => boolean;
  isGoogleRevoked?: () => boolean;
  markAnonymousChange?: () => void;
}

export const doesSessionExist = (runtime: EventOperationRuntime) =>
  (runtime.doesSessionExist ?? session.doesSessionExist)();

export const repositoryFor = (
  runtime: EventOperationRuntime,
  sessionExists: boolean,
) => (runtime.getRepository ?? getEventRepository)(sessionExists);

export const repositorySourceFor = (
  runtime: EventOperationRuntime,
  sessionExists: boolean,
) => (runtime.getRepositorySource ?? getEventRepositorySource)(sessionExists);

export const reportOperationError = (
  runtime: EventOperationRuntime,
  error: unknown,
) => (runtime.reportError ?? handleError)(error as Error);

export const isOperationCancelled = (runtime: EventOperationRuntime) =>
  runtime.signal.aborted;

export const markAnonymousChangeAfterWrite = (
  runtime: EventOperationRuntime,
  sessionExists: boolean,
) => {
  if (sessionExists) return;
  if ((runtime.hasUserEverAuthenticated ?? hasUserEverAuthenticated)()) return;
  if ((runtime.isGoogleRevoked ?? isGoogleRevoked)()) return;
  (runtime.markAnonymousChange ?? markAnonymousCalendarChangeForSignUpPrompt)();
};
