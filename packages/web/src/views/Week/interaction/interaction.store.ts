import { useSyncExternalStore } from "react";
import {
  type InteractionPointer,
  type InteractionState,
} from "./interaction.types";

type InteractionListener = () => void;
type InteractionStatePatch = Partial<InteractionState>;
type InteractionStateUpdater = (
  snapshot: InteractionState,
) => InteractionStatePatch | InteractionState;

export interface InteractionStore {
  getSnapshot: () => InteractionState;
  reset: () => void;
  setState: (update: InteractionStatePatch | InteractionStateUpdater) => void;
  subscribe: (listener: InteractionListener) => () => void;
  updatePointer: (pointer: InteractionPointer) => void;
}

const createInteractionState = (
  overrides: InteractionStatePatch = {},
): InteractionState => ({
  mode: overrides.mode ?? "idle",
  pointer: overrides.pointer ?? null,
  draft: overrides.draft ?? null,
  scroll: {
    velocityY: overrides.scroll?.velocityY ?? 0,
  },
  edge: {
    side: overrides.edge?.side ?? null,
    progress: overrides.edge?.progress ?? 0,
  },
});

export const initialInteractionState = createInteractionState();

export const createInteractionStore = (
  initialState: InteractionStatePatch = {},
): InteractionStore => {
  let state = createInteractionState(initialState);
  const listeners = new Set<InteractionListener>();

  const emit = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const setState: InteractionStore["setState"] = (update) => {
    const patch = typeof update === "function" ? update(state) : update;
    const nextState = createInteractionState({
      ...state,
      ...patch,
    });

    if (Object.is(nextState, state)) {
      return;
    }

    state = nextState;
    emit();
  };

  return {
    getSnapshot: () => state,
    reset: () => {
      state = initialInteractionState;
      emit();
    },
    setState,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    updatePointer: (pointer) => {
      setState({ pointer });
    },
  };
};

export const useInteractionSnapshot = (store: InteractionStore) =>
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
