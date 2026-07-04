import {
  seedStoresFromState,
  type TestAppState,
} from "@web/__tests__/utils/state/seed-stores";
import { initialDraftState } from "@web/events/stores/draft.store";

/**
 * Build a baseline test state (draft empty) merged with overrides. Pass the
 * result to the render helpers' `state` option or seed it directly via
 * seedStoresFromState().
 */
export const createInitialState = (
  partialState: Partial<TestAppState> = {},
): TestAppState => {
  return {
    events: {
      draft: initialDraftState,
    },
    ...partialState,
  };
};

/** Seed the Zustand stores directly (outside the render helpers). */
export const seedInitialState = (partialState: Partial<TestAppState> = {}) => {
  seedStoresFromState(createInitialState(partialState));
};
